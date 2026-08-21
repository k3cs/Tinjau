import Link from "next/link";
import type { MissionAction, MissionDefinition, MissionSessionState } from "@/lib/demo/mission-types";

export function MissionRecap({ mission, state, dispatch }: { mission: MissionDefinition; state: MissionSessionState; dispatch: React.Dispatch<MissionAction> }) {
  return (
    <section className="border border-edge bg-canvas" aria-labelledby="mission-recap-title">
      <div className="grid gap-8 border-b border-edge px-5 py-8 sm:px-6 lg:grid-cols-[1fr_0.5fr]">
        <div><h2 id="mission-recap-title" className="font-display text-4xl font-bold tracking-display">Mission complete: {mission.title}</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">You revealed {state.revealedOutputIds.length} system outputs and tested {state.decisions.filter((decision) => decision.outcome !== "ACCEPTED").length} guardrails.</p></div>
        <p className="font-data text-[11px] leading-relaxed text-ink-muted">The recap records what you attempted. It does not upgrade replay into live evidence or pending capability into implementation.</p>
      </div>
      <ol className="divide-y divide-edge">
        {state.decisions.map((decision, index) => <li key={`${decision.stageId}-${decision.choiceId}-${index}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[4rem_1fr_auto] sm:px-6"><span className="font-data text-[10px] text-ink-muted">{String(index + 1).padStart(2, "0")}</span><span className="text-sm text-ink-secondary">{decision.label}</span><span className={`font-data text-[10px] font-semibold ${decision.outcome === "ACCEPTED" ? "text-normal" : decision.outcome === "REJECTED" ? "text-watch" : "text-ink-muted"}`}>{decision.outcome}{decision.reasonCode ? ` · ${decision.reasonCode}` : ""}</span></li>)}
      </ol>
      <div className="grid border-t border-edge sm:grid-cols-3">
        <Link href="/proof" className="inline-flex min-h-14 items-center justify-center bg-signal px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-150 ease-tinjau hover:bg-white">Inspect Proof of Work ↗</Link>
        <button type="button" onClick={() => dispatch({ type: "MISSION_RESTARTED" })} className="min-h-14 border-t border-edge px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 ease-tinjau hover:bg-surface sm:border-l sm:border-t-0">Restart mission</button>
        <button type="button" onClick={() => dispatch({ type: "MISSION_EXITED" })} className="min-h-14 border-t border-edge px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 ease-tinjau hover:bg-surface sm:border-l sm:border-t-0">Choose another scenario</button>
      </div>
    </section>
  );
}
