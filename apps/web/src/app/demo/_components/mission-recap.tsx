import Link from "next/link";
import type { MissionAction, MissionDefinition, MissionSessionState } from "@/lib/demo/mission-types";

export function MissionRecap({ mission, state, dispatch }: { mission: MissionDefinition; state: MissionSessionState; dispatch: React.Dispatch<MissionAction> }) {
  const outputs = mission.stages.flatMap((stage) => stage.outputs).filter((output) => state.revealedOutputIds.includes(output.id));
  return (
    <section className="border border-edge bg-canvas" aria-labelledby="mission-recap-title">
      <div className="grid gap-8 border-b border-edge px-5 py-8 sm:px-6 lg:grid-cols-[1fr_0.5fr]">
        <div><h2 id="mission-recap-title" className="font-display text-4xl font-bold tracking-display">Mission complete: {mission.title}</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">You revealed {state.revealedOutputIds.length} system outputs and tested {state.decisions.filter((decision) => decision.outcome !== "ACCEPTED").length} guardrails.</p></div>
        <p className="font-data text-[11px] leading-relaxed text-ink-muted">The recap records what you attempted. It does not upgrade replay into live evidence or pending capability into implementation.</p>
      </div>
      <section className="border-b border-edge px-5 py-6 sm:px-6" aria-labelledby="recap-output-title">
        <h3 id="recap-output-title" className="font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-signal">System record</h3>
        <ol className="mt-4 divide-y divide-edge border-t border-edge">
          {outputs.map((output) => <li key={output.id} className="grid gap-2 py-3 sm:grid-cols-[0.4fr_1fr]"><span className="text-sm font-semibold">{output.title}</span><span className="text-sm leading-relaxed text-ink-muted">{output.summary}</span></li>)}
        </ol>
      </section>
      <ol className="divide-y divide-edge" aria-label="Mission decisions">
        {state.decisions.map((decision, index) => <li key={`${decision.stageId}-${decision.choiceId}-${index}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[4rem_1fr_auto] sm:px-6"><span className="font-data text-[10px] text-ink-muted">{String(index + 1).padStart(2, "0")}</span><span className="text-sm text-ink-secondary">{decision.label}</span><span className={`font-data text-[10px] font-semibold ${decision.outcome === "ACCEPTED" ? "text-normal" : decision.outcome === "REJECTED" ? "text-watch" : "text-ink-muted"}`}>{decision.outcome}{decision.reasonCode ? ` · ${decision.reasonCode}` : ""}</span></li>)}
      </ol>
      <div className="grid border-t border-edge sm:grid-cols-3">
        <Link href="/proof" className="inline-flex min-h-14 items-center justify-center gap-2 bg-signal px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-150 ease-tinjau hover:bg-signal-soft">Inspect Proof of Work<svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none"><path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.5" /></svg></Link>
        <button type="button" onClick={() => dispatch({ type: "MISSION_RESTARTED" })} className="min-h-14 border-t border-edge px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 ease-tinjau hover:bg-surface sm:border-l sm:border-t-0">Restart mission</button>
        <button type="button" onClick={() => dispatch({ type: "MISSION_EXITED" })} className="min-h-14 border-t border-edge px-5 font-data text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 ease-tinjau hover:bg-surface sm:border-l sm:border-t-0">Choose another scenario</button>
      </div>
    </section>
  );
}
