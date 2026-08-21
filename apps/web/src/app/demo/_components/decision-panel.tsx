import type { MissionChoice } from "@/lib/demo/mission-types";

const tone: Record<MissionChoice["outcome"], string> = {
  ACCEPTED: "border-signal bg-signal text-black hover:bg-signal-soft",
  REJECTED: "border-watch bg-watch/10 text-ink hover:bg-watch hover:text-black",
  UNAVAILABLE: "border-edge-strong bg-surface text-ink-secondary hover:border-white",
};

export function DecisionPanel({ choices, onChoose }: { choices: MissionChoice[]; onChoose: (choiceId: string) => void }) {
  return (
    <section className="border-t border-edge bg-canvas-soft px-4 py-5" aria-labelledby="decision-title">
      <h3 id="decision-title" className="font-data text-[10px] font-semibold uppercase tracking-[0.06em] text-ink">Choose the next action</h3>
      <div className="mt-4 space-y-3">
        {choices.map((choice) => (
          <button key={choice.id} type="button" onClick={() => onChoose(choice.id)} className={`min-h-14 w-full border px-4 py-3 text-left transition-colors duration-150 ease-tinjau ${tone[choice.outcome]}`}>
            <span className="flex items-center justify-between gap-4"><span className="font-data text-[11px] font-semibold uppercase tracking-[0.05em]">{choice.label}</span><span className="font-data text-[9px] uppercase tracking-[0.05em] opacity-70">{choice.outcome === "ACCEPTED" ? "Proceed" : choice.outcome === "REJECTED" ? "Try guardrail" : "Inspect limit"}</span></span>
            <span className="mt-2 block text-xs leading-relaxed opacity-75">{choice.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
