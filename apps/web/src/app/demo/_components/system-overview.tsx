import { CapabilityBadge } from "@/components/capability-badge";
import { DataModeLabel } from "@/components/data-mode-label";
import type { DemoSceneId } from "@/lib/demo/walkthrough";
import type { DemoScenario } from "@/lib/risk/model";

export function SystemOverview({ scene, scenario }: { scene: DemoSceneId; scenario?: DemoScenario }) {
  return (
    <section className="grid border border-edge bg-canvas lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="demo-title">
      <div className="border-b border-edge p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
        <p className="data-label text-signal">Guided system trace</p>
        <h1 id="demo-title" className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight tracking-display text-ink sm:text-5xl">
          {scene === "rumor" && "Rumor enters. Authority does not."}
          {scene === "confirmed" && "Official evidence still needs the market gate."}
          {scene === "comparison" && "Same input. Three policies. No predetermined winner."}
        </h1>
        <p className="mt-5 max-w-[72ch] leading-7 text-ink-secondary">
          {scene === "rumor" && "Trace a simulated X-shaped claim through retrieval, evidence processing, deterministic WATCH, blocked fee action, and suppressed publication."}
          {scene === "confirmed" && "Inspect the source-pinned SEC path and the exact handoff boundary that prevents the UI from claiming a completed PROTECT action."}
          {scene === "comparison" && "Inspect the preregistered method and matched-input identity before any benchmark result or winner language can appear."}
        </p>
      </div>
      <div className="bg-canvas-soft p-6 sm:p-8 lg:p-10">
        <p className="data-label text-ink-muted">{scenario ? "Current decision" : "Demo truth"}</p>
        {scenario && (
          <div className="mt-4 border-l-2 border-watch pl-4">
            <p className="font-display text-4xl font-semibold tracking-display text-watch">{scenario.record.state}</p>
            <p className="mt-2 font-data text-[11px] font-semibold uppercase tracking-[0.06em] text-ink">Aggressive fee not authorized</p>
            <p className="mt-1 text-xs text-ink-muted">{scenario.record.action.status === "NONE" ? "No action requested" : scenario.record.action.status}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <CapabilityBadge maturity={scene === "comparison" ? "PENDING" : "IMPLEMENTED"} />
          <DataModeLabel mode={scene === "rumor" ? "SIMULATED" : "REPLAY"} />
        </div>
        <dl className="mt-6 divide-y divide-edge border-y border-edge font-data text-[11px]">
          <div className="flex justify-between gap-3 py-3"><dt className="text-ink-muted">Asset</dt><dd className="text-ink-secondary">{scenario?.record.tokenSymbol ?? "wNVDAx"}</dd></div>
          <div className="flex justify-between gap-3 py-3"><dt className="text-ink-muted">Network context</dt><dd className="text-right text-ink-secondary">X Layer · 196 replay</dd></div>
          <div className="flex justify-between gap-3 py-3"><dt className="text-ink-muted">Action proof</dt><dd className="text-right text-watch">Not delivered</dd></div>
        </dl>
      </div>
    </section>
  );
}
