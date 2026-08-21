import { getMissionDefinition } from "./missions";
import type { MissionAction, MissionSessionState } from "./mission-types";

export const INITIAL_MISSION_STATE: MissionSessionState = {
  schemaVersion: 1,
  status: "SELECTING",
  missionId: null,
  currentStageId: null,
  completedStageIds: [],
  decisions: [],
  revealedOutputIds: [],
  replayEnabled: false,
  pendingModal: null,
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function missionReducer(state: MissionSessionState, action: MissionAction): MissionSessionState {
  if (action.type === "MISSION_SELECTED") {
    const mission = getMissionDefinition(action.missionId);
    return { ...INITIAL_MISSION_STATE, status: "ACTIVE", missionId: mission.id, currentStageId: mission.firstStageId };
  }

  if (action.type === "SESSION_RESTORED") return action.state;
  if (action.type === "MISSION_EXITED") return INITIAL_MISSION_STATE;
  if (action.type === "MODAL_ACKNOWLEDGED") return { ...state, pendingModal: null };

  if (action.type === "MISSION_RESTARTED") {
    if (!state.missionId) return INITIAL_MISSION_STATE;
    const mission = getMissionDefinition(state.missionId);
    return { ...INITIAL_MISSION_STATE, status: "ACTIVE", missionId: mission.id, currentStageId: mission.firstStageId };
  }

  if (!state.missionId || !state.currentStageId) return state;
  const mission = getMissionDefinition(state.missionId);

  if (action.type === "STAGE_REVISITED") {
    const canVisit = action.stageId === state.currentStageId || state.completedStageIds.includes(action.stageId);
    return canVisit ? { ...state, currentStageId: action.stageId, pendingModal: null } : state;
  }

  if (action.type === "CHOICE_SELECTED") {
    const stage = mission.stages.find((item) => item.id === state.currentStageId);
    const choice = stage?.choices.find((item) => item.id === action.choiceId);
    if (!stage || !choice) return state;

    const decision = {
      stageId: stage.id,
      choiceId: choice.id,
      label: choice.label,
      outcome: choice.outcome,
      reasonCode: choice.reasonCode,
    };

    if (choice.outcome !== "ACCEPTED") {
      return {
        ...state,
        decisions: [...state.decisions, decision],
        revealedOutputIds: unique([...state.revealedOutputIds, ...choice.reveal]),
        pendingModal: choice.modal ?? null,
      };
    }

    return {
      ...state,
      status: choice.completeMission ? "COMPLETE" : "ACTIVE",
      currentStageId: choice.nextStageId ?? state.currentStageId,
      completedStageIds: unique([...state.completedStageIds, stage.id]),
      decisions: [...state.decisions, decision],
      revealedOutputIds: unique([...state.revealedOutputIds, ...choice.reveal]),
      replayEnabled: state.replayEnabled || Boolean(choice.enableReplay),
      pendingModal: choice.modal ?? null,
    };
  }

  return state;
}
