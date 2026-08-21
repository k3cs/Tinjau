import type { MissionStage } from "@/lib/demo/mission-types";
import { DecisionPanel } from "./decision-panel";

export function CoachConsole({ stage, onChoose }: { stage: MissionStage; onChoose: (choiceId: string) => void }) {
  return (
    <aside className="border border-edge bg-canvas" aria-labelledby="coach-console-title">
      <div className="flex min-h-14 items-center justify-between border-b border-edge px-4">
        <h2 id="coach-console-title" className="font-data text-xs font-semibold uppercase tracking-[0.06em] text-signal">Your guide</h2>
        <span className="font-data text-[10px] text-ink-muted">Stage {String(stage.index).padStart(2, "0")}</span>
      </div>
      <div className="divide-y divide-edge">
        <ConsoleField label="What happened" value={stage.whatHappened} />
        <ConsoleField label="Objective" value={stage.objective} strong />
        <ConsoleField label="What Tinjau knows" value={stage.known} />
        <ConsoleField label="What remains unknown" value={stage.unknown} />
        <ConsoleField label="Why it matters" value={stage.whyItMatters} />
      </div>
      <DecisionPanel choices={stage.choices} onChoose={onChoose} />
    </aside>
  );
}

function ConsoleField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <section className="px-4 py-4"><h3 className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">{label}</h3><p className={`mt-2 text-sm leading-relaxed ${strong ? "font-semibold text-ink" : "text-ink-secondary"}`}>{value}</p></section>;
}
