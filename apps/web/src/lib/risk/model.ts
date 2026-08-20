export const RISK_SCHEMA_VERSION = "tinjau.risk/1.0.0" as const;

export const RISK_STATES = ["NORMAL", "WATCH", "PROTECT"] as const;
export const SOURCE_CLASSES = ["OFFICIAL", "NEWS", "RUMOR"] as const;
export const DATA_MODES = ["LIVE", "OBSERVED", "REPLAY", "SIMULATED"] as const;
export const CONFIRMATION_STATUSES = [
  "CONFIRMED",
  "NOT_CONFIRMED",
  "UNAVAILABLE",
  "STALE",
] as const;
export const CONFIDENCE_BANDS = ["LOW", "MEDIUM", "HIGH"] as const;
export const EVIDENCE_RELATIONS = ["ORIGIN", "SUPPORTS", "CONTRADICTS", "DUPLICATE"] as const;
export const ACTION_STATUSES = ["NONE", "PENDING", "APPLIED", "FAILED", "EXPIRED", "DECAYED"] as const;

export const REASON_CODES = [
  "RUMOR_ONLY",
  "SINGLE_SOURCE",
  "DUPLICATE_SYNDICATION",
  "CONTRADICTED",
  "STALE_EVIDENCE",
  "NO_OFFICIAL_CONFIRMATION",
  "UNSUPPORTED_ASSET",
  "AMBIGUOUS_ENTITY",
  "MARKET_CONFIRMED",
  "MARKET_NOT_CONFIRMED",
  "MARKET_DATA_STALE",
  "MARKET_DATA_UNAVAILABLE",
  "ANTI_WICK_FAILED",
  "THIN_EXIT_DEPTH",
  "REFERENCE_MARKET_CLOSED",
  "OFFICIAL_FILING",
  "TWO_INDEPENDENT_SOURCES",
  "BONDED_EVIDENCE_PASSED",
  "NON_MATERIAL_EVENT",
  "EXPIRED",
  "DECAYED_TO_BASELINE",
  "COOLDOWN_ACTIVE",
  "PAUSED",
  "ACTION_FAILED",
] as const;

export type RiskState = (typeof RISK_STATES)[number];
export type SourceClass = (typeof SOURCE_CLASSES)[number];
export type DataMode = (typeof DATA_MODES)[number];
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];
export type EvidenceRelation = (typeof EVIDENCE_RELATIONS)[number];
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ReasonCode = (typeof REASON_CODES)[number];

export interface EvidenceClaimView {
  claimId: string;
  sourceClass: SourceClass;
  dataMode: DataMode;
  sourceUrl: string | null;
  sourceId: string;
  publisherOrAuthor: string | null;
  publishedAt: string;
  company: string;
  tokenSymbol: string;
  tokenAddress: string;
  eventType: string;
  claimTextOrPointer: string;
  independenceGroup: string;
  relation: EvidenceRelation;
  officialConfirmation: boolean;
  expiresAt: string | null;
}

export interface MarketConfirmationView {
  status: ConfirmationStatus;
  observedAt: string;
  blockNumber: string | null;
  fresh: boolean;
  antiWickSatisfied: boolean;
  okxReferencePrice: string | null;
  xLayerPoolPrice: string | null;
  basisBps: string | null;
  drawdownBps: string | null;
  tradeVelocity: string | null;
  executableExitDepth: string | null;
  reasonCodes: ReasonCode[];
}

export interface RiskActionView {
  authorized: boolean;
  status: ActionStatus;
  baseFee: string;
  maxFee: string;
  requestedFee: string | null;
  appliedFee: string | null;
  maximumDurationSec: number;
  txHash: string | null;
  failureReason: string | null;
}

export interface RiskRecordView {
  schemaVersion: typeof RISK_SCHEMA_VERSION;
  assessmentId: string;
  assetAddress: string;
  tokenSymbol: string;
  poolIdOrAddress: string;
  state: RiskState;
  reasonCodes: ReasonCode[];
  humanExplanation: string;
  evidenceCommitment: string;
  confidenceBand: ConfidenceBand;
  assessedAt: string;
  expiresAt: string;
  policyVersion: string;
  dataMode: DataMode;
  evidence: EvidenceClaimView[];
  marketConfirmation: MarketConfirmationView;
  action: RiskActionView;
}

export interface DemoScenario {
  slug: string;
  shortLabel: string;
  title: string;
  role: string;
  sourceFile: string;
  sourceChecksum: string;
  record: RiskRecordView;
  limitations: string[];
}
