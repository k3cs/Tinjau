"use client";

import { useEffect, useReducer, useState } from "react";
import { getMissionDefinition } from "@/lib/demo/missions";
import { INITIAL_MISSION_STATE, missionReducer } from "@/lib/demo/mission-reducer";
import { readMissionSession, writeMissionSession } from "@/lib/demo/mission-storage";
import type { MissionId } from "@/lib/demo/mission-types";
import { GuidedMissionShell } from "./guided-mission-shell";
import { MissionSelect } from "./mission-select";
import { StateExplanationModal } from "./state-explanation-modal";

export function DemoExperience() {
  const [state, dispatch] = useReducer(missionReducer, INITIAL_MISSION_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    dispatch({ type: "SESSION_RESTORED", state: readMissionSession() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeMissionSession(state);
    const nextUrl = state.missionId && state.currentStageId
      ? `/demo?mission=${state.missionId}&stage=${state.currentStageId}`
      : "/demo";
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [hydrated, state]);

  if (!hydrated) {
    return (
      <main className="demo-shell flex items-center justify-center px-4" aria-busy="true">
        <p className="font-data text-xs uppercase tracking-[0.06em] text-ink-muted">Restoring mission session…</p>
      </main>
    );
  }

  if (!state.missionId || state.status === "SELECTING") {
    return <MissionSelect onSelect={(missionId: MissionId) => dispatch({ type: "MISSION_SELECTED", missionId })} />;
  }

  const mission = getMissionDefinition(state.missionId);
  return (
    <>
      <GuidedMissionShell mission={mission} state={state} dispatch={dispatch} />
      {state.pendingModal && <StateExplanationModal modal={state.pendingModal} onClose={() => dispatch({ type: "MODAL_ACKNOWLEDGED" })} />}
    </>
  );
}
