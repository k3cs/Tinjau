"use client";

import { useEffect, useState } from "react";
import { fetchAllEvents, upcomingEvents, type RegistryEvent } from "@/lib/chain/registry";
import { eventTypeLabel } from "@/lib/chain/eventTypes";
import { formatUnixDate, relativeToNow, truncateHash } from "@/lib/format";
import { findTrackedTokenByTestnetAddress } from "@/lib/chain/tokenAddresses";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; events: RegistryEvent[] };

export function ForwardCalendar() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchAllEvents()
      .then((events) => {
        if (cancelled) return;
        const now = Math.floor(Date.now() / 1000);
        setState({ status: "ready", events: upcomingEvents(events, now) });
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

  if (state.events.length === 0) {
    return (
      <div className="mt-8 border border-dock-line bg-dock-raised p-8 text-center">
        <p className="font-stencil text-lg tracking-stencil text-bone">SCHEDULE EMPTY</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-bone-muted">
          No posted event currently carries a future-dated field — no announced dividend date, split
          effective date, or earnings time is on the registry today. The one live entry (MSTR
          capital-raise, id 1) declared no <code className="text-tracking">nextEventDate</code>. This
          calendar reads live: the moment a filing posts one, it appears here with no code change.
        </p>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="mt-8 divide-y divide-dock-line border border-dock-line">
      {state.events.map((re) => {
        const tracked = findTrackedTokenByTestnetAddress(re.event.token);
        return (
          <div key={re.id.toString()} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-dock-raised p-4">
            <div className="w-24 text-center">
              <p className="tabular font-mono text-lg font-bold text-bone">{formatUnixDate(re.event.nextEventDate)}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-kraft-light">
                {relativeToNow(re.event.nextEventDate, now)}
              </p>
            </div>
            <div>
              <p className="font-mono text-sm text-bone">
                <span className="font-bold">{tracked?.symbol ?? "?"}</span> — {eventTypeLabel(re.event.eventType)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-bone-muted">
                From manifest № {re.id.toString().padStart(4, "0")} · source {truncateHash(re.event.sourceContentHash)}
              </p>
            </div>
            <a
              href={re.event.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-tracking underline decoration-tracking/40 underline-offset-4 hover:text-bone"
            >
              Source ↗
            </a>
          </div>
        );
      })}
    </div>
  );
}
