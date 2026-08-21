import { getMissionDefinition } from "./missions";
import { INITIAL_MISSION_STATE } from "./mission-reducer";
import type { MissionId, MissionSessionState } from "./mission-types";

export const MISSION_STORAGE_KEY = "tinjau.guided-mission/v1";

function isMissionId(value: unknown): value is MissionId {
  return value === "rumor" || value === "confirmed" || value === "comparison";
}

export function validateStoredMissionState(value: unknown): MissionSessionState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<MissionSessionState>;
  if (state.schemaVersion !== 1 || !isMissionId(state.missionId)) return null;
  if (state.status !== "ACTIVE" && state.status !== "COMPLETE") return null;
  if (!Array.isArray(state.completedStageIds) || !Array.isArray(state.decisions) || !Array.isArray(state.revealedOutputIds)) return null;

  const mission = getMissionDefinition(state.missionId);
  const stageIds = new Set(mission.stages.map((stage) => stage.id));
  if (typeof state.currentStageId !== "string" || !stageIds.has(state.currentStageId)) return null;
  if (!state.completedStageIds.every((id) => stageIds.has(id))) return null;

  const completedIndexes = state.completedStageIds.map((id) => mission.stages.findIndex((stage) => stage.id === id));
  if (completedIndexes.some((index, position) => index !== position)) return null;

  return state as MissionSessionState;
}

export function readMissionSession(): MissionSessionState {
  if (typeof window === "undefined") return INITIAL_MISSION_STATE;
  try {
    const raw = window.sessionStorage.getItem(MISSION_STORAGE_KEY);
    if (!raw) return INITIAL_MISSION_STATE;
    return validateStoredMissionState(JSON.parse(raw)) ?? INITIAL_MISSION_STATE;
  } catch {
    return INITIAL_MISSION_STATE;
  }
}

export function writeMissionSession(state: MissionSessionState): void {
  if (typeof window === "undefined") return;
  if (state.status === "SELECTING") {
    window.sessionStorage.removeItem(MISSION_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(state));
}
