import type { MissionAction, MissionDefinition, MissionSessionState } from "@/lib/demo/mission-types";

export function DemoStageRail({ mission, state, dispatch }: { mission: MissionDefinition; state: MissionSessionState; dispatch: React.Dispatch<MissionAction> }) {
  return (
    <nav aria-label="Mission progress" className="overflow-x-auto border-y border-edge" tabIndex={0}>
      <ol className="flex min-w-max">
        {mission.stages.map((stage) => {
          const complete = state.completedStageIds.includes(stage.id);
          const current = state.currentStageId === stage.id;
          const locked = !complete && !current;
          return (
            <li key={stage.id} className="border-r border-edge last:border-r-0">
              <button type="button" disabled={locked} onClick={() => dispatch({ type: "STAGE_REVISITED", stageId: stage.id })} aria-current={current ? "step" : undefined} title={locked ? "Complete the current objective to unlock this stage" : undefined} className={`flex min-h-16 min-w-36 items-center gap-3 px-4 text-left transition-colors duration-150 ease-tinjau ${current ? "bg-signal text-black" : complete ? "bg-surface text-ink hover:bg-surface-raised" : "cursor-not-allowed bg-canvas text-ink-muted opacity-55"}`}>
                <span className="font-data text-[10px]">{String(stage.index).padStart(2, "0")}</span><span className="text-xs font-semibold">{stage.label}</span>
                {locked && <svg aria-hidden viewBox="0 0 16 16" className="ml-auto h-3.5 w-3.5" fill="none"><rect x="3.5" y="7" width="9" height="6" stroke="currentColor" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" /></svg>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
