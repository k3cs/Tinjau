/**
 * The frontend view model, server side (tracker §0.24).
 *
 * These interfaces are a transcription of §0.24 and of
 * `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/risk-record.schema.json`. They are
 * NOT a place to add fields: the schema declares `additionalProperties: false`, and the
 * frontend's own validator (`apps/web/src/lib/risk/validate.ts`) rejects any key it does not
 * know. Anything the orchestrator wants to expose beyond §0.24 travels on the `Decision`
 * wrapper in `orchestrate.ts`, never inside `RiskRecordView`.
 *
 * `test/decisionSchema.test.ts` validates real orchestrator output against the published JSON
 * Schema file, so this transcription is checked rather than trusted.
 */

import type {
  ConfidenceBand,
  ConfirmationStatus,
  DataMode,
  ReasonCode,
  RiskState,
  SourceClass,
} from "../risk/types.js";

export type EvidenceRelation = "ORIGIN" | "SUPPORTS" | "CONTRADICTS" | "DUPLICATE";
export type ActionStatus = "NONE" | "PENDING" | "APPLIED" | "FAILED" | "EXPIRED" | "DECAYED";

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
  tokenAddress: `0x${string}`;
  eventType: string;
  claimTextOrPointer: string;
  independenceGroup: string;
  relation: EvidenceRelation;
  officialConfirmation: boolean;
  expiresAt: string | null;
}

export interface MarketConfirmationView {
  status: ConfirmationStatus;
  /**
   * When the market was actually observed, or `null` when there is no observation to stamp.
   *
   * Nullable since schema `risk-record/1.0.1.json`. Substituting the assessment instant would
   * let a consumer computing `age = now - observedAt` read a leg that was never observed as
   * perfectly fresh — the same failure shape T3.1 removed by measuring OKX freshness from
   * source time rather than ingestion time. An absence must not be representable as a reading.
   */
  observedAt: string | null;
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
  txHash: `0x${string}` | null;
  failureReason: string | null;
}

export interface RiskRecordView {
  schemaVersion: string;
  assessmentId: string;
  assetAddress: `0x${string}`;
  tokenSymbol: string;
  poolIdOrAddress: string;
  state: RiskState;
  reasonCodes: ReasonCode[];
  humanExplanation: string;
  evidenceCommitment: `0x${string}`;
  confidenceBand: ConfidenceBand;
  assessedAt: string;
  expiresAt: string;
  policyVersion: string;
  dataMode: DataMode;
  evidence: EvidenceClaimView[];
  marketConfirmation: MarketConfirmationView;
  action: RiskActionView;
}
