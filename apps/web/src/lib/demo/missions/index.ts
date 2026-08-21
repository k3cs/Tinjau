import type { MissionDefinition, MissionId } from "../mission-types";
import { COMPARISON_MISSION } from "./comparison";
import { CONFIRMED_MISSION } from "./confirmed";
import { RUMOR_MISSION } from "./rumor";

export const MISSIONS: MissionDefinition[] = [RUMOR_MISSION, CONFIRMED_MISSION, COMPARISON_MISSION];

export function getMissionDefinition(id: MissionId): MissionDefinition {
  const mission = MISSIONS.find((item) => item.id === id);
  if (!mission) throw new Error(`Unknown mission: ${id}`);
  return mission;
}
