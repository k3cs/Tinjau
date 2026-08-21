import type { MissionAction, MissionDefinition, MissionSessionState } from "@/lib/demo/mission-types";
import { CoachConsole } from "./coach-console";
import { DemoStageRail } from "./demo-stage-rail";
import { MissionRecap } from "./mission-recap";
import { ProgressiveOutput } from "./progressive-output";

export function GuidedMissionShell({ mission, state, dispatch }: { mission: MissionDefinition; state: MissionSessionState; dispatch: React.Dispatch<MissionAction> }) {
  const stage = mission.stages.find((item) => item.id === state.currentStageId) ?? mission.stages[0];
  const currentPosition = mission.stages.findIndex((item) => item.id === stage.id) + 1;
  return (
    <main className="demo-shell">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="grid gap-5 border-b border-edge pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="font-data text-[10px] uppercase tracking-[0.06em] text-signal">{mission.label} · Field exercise</p><h1 className="mt-3 font-display text-3xl font-bold tracking-display sm:text-4xl">{mission.title}</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-secondary">{mission.objective}</p></div>
          <div className="flex items-center justify-between gap-8 border-t border-edge pt-4 font-data text-[11px] lg:border-t-0 lg:pt-0"><span className="text-ink-muted">Progress</span><span>{String(currentPosition).padStart(2, "0")} / {String(mission.stages.length).padStart(2, "0")}</span></div>
        </header>
        <div className="mt-5"><DemoStageRail mission={mission} state={state} dispatch={dispatch} /></div>
        <div className="mt-5">
          {state.status === "COMPLETE" ? <MissionRecap mission={mission} state={state} dispatch={dispatch} /> : <div className="grid gap-5 xl:grid-cols-[23rem_1fr] xl:items-start"><CoachConsole stage={stage} onChoose={(choiceId) => dispatch({ type: "CHOICE_SELECTED", choiceId })} /><ProgressiveOutput mission={mission} revealedOutputIds={state.revealedOutputIds} /></div>}
        </div>
      </div>
    </main>
  );
}
