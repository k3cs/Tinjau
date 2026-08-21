import Link from "next/link";
import { DEMO_STAGES, getStageIndex, type DemoSceneId, type DemoStageId } from "@/lib/demo/walkthrough";

export function DemoStageRail({ scene, stage }: { scene: Exclude<DemoSceneId, "comparison">; stage: DemoStageId }) {
  const activeIndex = getStageIndex(stage);
  const previous = DEMO_STAGES[Math.max(0, activeIndex - 1)];
  const next = DEMO_STAGES[Math.min(DEMO_STAGES.length - 1, activeIndex + 1)];

  return (
    <section aria-label="Walkthrough stage controls" className="sticky top-28 z-30 border-y border-edge bg-canvas lg:top-16">
      <div className="overflow-x-auto">
        <ol className="flex min-w-max lg:min-w-0 lg:grid lg:grid-cols-9">
          {DEMO_STAGES.map((item, index) => {
            const active = item.id === stage;
            const passed = index < activeIndex;
            return (
              <li key={item.id} className="min-w-32 border-r border-edge last:border-r-0 lg:min-w-0">
                <Link
                  href={`/demo?scene=${scene}&stage=${item.id}`}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-h-16 flex-col justify-center px-3 transition-colors duration-100 ease-tinjau ${
                    active ? "bg-signal text-black" : passed ? "bg-canvas-soft text-ink" : "text-ink-muted hover:bg-canvas-soft hover:text-ink"
                  }`}
                >
                  <span className="font-data text-[9px] font-semibold">{item.index}</span>
                  <span className="mt-1 text-xs font-semibold">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="sr-only" role="status" aria-live="polite">Stage {activeIndex + 1} of {DEMO_STAGES.length}: {DEMO_STAGES[activeIndex].label}. {DEMO_STAGES[activeIndex].output}.</div>
      <div className="hidden border-t border-edge px-3 py-2 sm:flex sm:items-center sm:justify-between">
        <Link href={`/demo?scene=${scene}&stage=${previous.id}`} aria-disabled={activeIndex === 0} className={`inline-flex min-h-10 items-center px-2 font-data text-[10px] uppercase tracking-[0.06em] ${activeIndex === 0 ? "pointer-events-none text-ink-muted" : "text-ink-secondary hover:text-signal"}`}>← Previous</Link>
        <p className="font-data text-[10px] text-ink-muted">{DEMO_STAGES[activeIndex].output}</p>
        <Link href={`/demo?scene=${scene}&stage=${next.id}`} aria-disabled={activeIndex === DEMO_STAGES.length - 1} className={`inline-flex min-h-10 items-center px-2 font-data text-[10px] uppercase tracking-[0.06em] ${activeIndex === DEMO_STAGES.length - 1 ? "pointer-events-none text-ink-muted" : "text-ink-secondary hover:text-signal"}`}>Next →</Link>
      </div>
    </section>
  );
}
