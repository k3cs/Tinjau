"use client";

import { useEffect, useState } from "react";
import { formatUnixSeconds } from "@/lib/format";

/**
 * Mirrors `apps/server/src/studies/scoreboardReaction.ts`'s `ReactionResult` and
 * `apps/server/src/scoreboard-api/server.ts`'s `ScoreboardEntry` (kept in sync manually —
 * same pattern already used for this project's two `registryAbi.ts` copies).
 */
type ReactionResult =
  | { state: "no_poller_coverage" }
  | { state: "insufficient_baseline" }
  | { state: "pending" }
  | { state: "no_reaction_in_window"; coverageFraction: number }
  | { state: "reacted"; reactionTimeSec: number; price: string; baseline: string; pctMove: number };

interface ScoreboardEntry {
  eventId: string;
  token: string;
  ticker: string | null;
  eventTypeLabel: string;
  postTimeSec: number;
  postTimeIso: string;
  reaction: ReactionResult;
}

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; entries: ScoreboardEntry[] };

function formatDuration(seconds: number): string {
  const abs = Math.max(0, Math.round(seconds));
  if (abs < 60) return `${abs}s`;
  const minutes = Math.floor(abs / 60);
  const remSeconds = abs % 60;
  if (minutes < 60) return remSeconds === 0 ? `${minutes}m` : `${minutes}m ${remSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes === 0 ? `${hours}h` : `${hours}h ${remMinutes}m`;
}

/** Plain-text label for the 4 non-"reacted" states — deliberately no stamp color, per
 * DESIGN.md's One Meaning Per Stamp Rule (clearance/duty/hold are reserved for their 3
 * existing meanings only; a scoreboard state isn't a 4th). */
function reactionStateLabel(reaction: ReactionResult): string {
  switch (reaction.state) {
    case "no_poller_coverage":
      return "No poller coverage";
    case "insufficient_baseline":
      return "Insufficient baseline";
    case "pending":
      return "Pending";
    case "no_reaction_in_window":
      return `No reaction in window (${Math.round(reaction.coverageFraction * 100)}% coverage)`;
    case "reacted":
      return "Reacted";
  }
}

export function ScoreboardTable() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/scoreboard")
      .then(async (res) => {
        if (!res.ok) throw new Error(`scoreboard API returned ${res.status}`);
        const data = (await res.json()) as ScoreboardEntry[];
        if (!cancelled) setState({ status: "ready", entries: data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse border border-dock-line bg-dock-raised" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-8 border border-duty/50 bg-duty-soft p-6 font-mono text-sm">
        <p className="uppercase tracking-[0.1em] text-duty">Read failed</p>
        <p className="mt-2 text-bone-muted">{state.message}</p>
      </div>
    );
  }

  if (state.entries.length === 0) {
    return (
      <div className="mt-8 border border-dock-line bg-dock-raised p-8 text-center">
        <p className="font-stencil text-lg tracking-stencil text-bone">SCOREBOARD EMPTY</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-bone-muted">
          No registry event has been posted yet. This scoreboard reads live: the moment one
          posts, it appears here with no code change.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-x-auto border border-dock-line">
      <table className="w-full min-w-[560px] border-collapse font-mono text-[12px] tabular-nums">
        <thead>
          <tr className="border-b border-dock-line bg-dock-raised text-left uppercase tracking-[0.08em] text-bone-muted">
            <th className="px-4 py-3 font-normal">Event</th>
            <th className="px-4 py-3 font-normal">Posted time</th>
            <th className="px-4 py-3 font-normal">First index reaction</th>
            <th className="px-4 py-3 font-normal">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dock-line">
          {state.entries.map((entry) => {
            const reaction = entry.reaction;
            return (
              <tr key={entry.eventId} className="bg-dock-raised align-top">
                <td className="px-4 py-3 text-bone">
                  <span className="font-bold">{entry.ticker ?? "?"}</span>
                  <span className="block text-[10px] normal-case tracking-normal text-bone-muted">{entry.eventTypeLabel}</span>
                </td>
                <td className="px-4 py-3 text-bone">{formatUnixSeconds(entry.postTimeSec)}</td>
                <td className="px-4 py-3">
                  {reaction.state === "reacted" ? (
                    <span className="text-bone">
                      {formatUnixSeconds(reaction.reactionTimeSec)}
                      <span className="block text-[10px] normal-case tracking-normal text-bone-muted">
                        {reaction.price} vs baseline {reaction.baseline} ({reaction.pctMove >= 0 ? "+" : ""}
                        {reaction.pctMove.toFixed(2)}%)
                      </span>
                    </span>
                  ) : (
                    <span className="normal-case tracking-normal text-bone-muted">{reactionStateLabel(reaction)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-bone-muted">
                  {reaction.state === "reacted" ? formatDuration(reaction.reactionTimeSec - entry.postTimeSec) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
