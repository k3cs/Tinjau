import type { DataMode, RiskState } from "@/lib/risk/model";

export type MissionId = "rumor" | "confirmed" | "comparison";
export type MissionStatus = "SELECTING" | "ACTIVE" | "COMPLETE";
export type ChoiceOutcome = "ACCEPTED" | "REJECTED" | "UNAVAILABLE";

export interface MissionOutput {
  id: string;
  kind: "SIGNAL" | "SOURCE" | "CLAIM" | "EVIDENCE" | "RISK" | "MARKET" | "RECORD" | "ACTION" | "RECOVERY" | "COMPARISON";
  title: string;
  summary: string;
  detail?: string[];
  dataMode?: DataMode;
  capabilityId?: string;
  renderKey?: string;
}

export interface MissionModal {
  id: string;
  title: string;
  previousState?: RiskState;
  nextState?: RiskState;
  cause: string;
  evidence: string;
  guardrail: string;
  allowed: string;
  prohibited: string;
  dataMode: DataMode;
  capabilityId: string;
}

export interface MissionChoice {
  id: string;
  label: string;
  description: string;
  outcome: ChoiceOutcome;
  reasonCode?: string;
  reveal: string[];
  nextStageId?: string;
  completeMission?: boolean;
  enableReplay?: boolean;
  modal?: MissionModal;
}

export interface MissionStage {
  id: string;
  index: number;
  label: string;
  whatHappened: string;
  objective: string;
  known: string;
  unknown: string;
  whyItMatters: string;
  choices: MissionChoice[];
  outputs: MissionOutput[];
}

export interface MissionDefinition {
  id: MissionId;
  label: string;
  title: string;
  objective: string;
  duration: string;
  dataMode: DataMode;
  firstStageId: string;
  stages: MissionStage[];
}

export interface MissionDecision {
  stageId: string;
  choiceId: string;
  label: string;
  outcome: ChoiceOutcome;
  reasonCode?: string;
}

export interface MissionSessionState {
  schemaVersion: 1;
  status: MissionStatus;
  missionId: MissionId | null;
  currentStageId: string | null;
  completedStageIds: string[];
  decisions: MissionDecision[];
  revealedOutputIds: string[];
  replayEnabled: boolean;
  pendingModal: MissionModal | null;
}

export type MissionAction =
  | { type: "MISSION_SELECTED"; missionId: MissionId }
  | { type: "CHOICE_SELECTED"; choiceId: string }
  | { type: "STAGE_REVISITED"; stageId: string }
  | { type: "MODAL_ACKNOWLEDGED" }
  | { type: "MISSION_RESTARTED" }
  | { type: "MISSION_EXITED" }
  | { type: "SESSION_RESTORED"; state: MissionSessionState };
