/**
 * The decision orchestrator (task T4.1).
 *
 * Combines the structured Evidence Graph (T2.x) and the market-confirmation verdict (T3.x) into
 * one signed, explainable assessment: a §0.24 `RiskRecordView` for consumers, plus the exact
 * EIP-712 struct `TinjauRiskRegistry.postAssessment` expects.
 *
 * ---------------------------------------------------------------------------------------
 * TRUST BOUNDARY (§0.6). This module composes deterministic components and adds no judgement
 * of its own. It contains:
 *
 *   - no model call,
 *   - no network call,
 *   - no clock read (`now` is a required argument),
 *   - no randomness, and
 *   - no threshold that is not already frozen in `promotionConfig.ts`, `confirmationConfig.ts`,
 *     or `envelope.ts`.
 *
 * The same inputs always produce byte-identical output, including the `assessmentId` and the
 * signature. `test/decisionOrchestrator.test.ts` proves this rather than asserting it in prose.
 * ---------------------------------------------------------------------------------------
 *
 * WHERE EACH DECISION IS ACTUALLY MADE — this file makes none of them:
 *
 *   state / reasons / confidence / expiry   -> `risk/promote.ts`   (T1.2, frozen thresholds)
 *   independence / self-revision / recency  -> `evidence/graph.ts` (T2.3)
 *   which claims may corroborate            -> `evidence/evaluate.ts#wireGraphIntoPromotion`
 *   asset -> token -> pool resolution       -> `evidence/assets.ts` (T2.2)
 *   market verdict                          -> `market/confirm.ts` (T3.3)
 *   fee band and duration cap               -> `contracts/.../TinjauRiskPolicy.sol` (T1.3)
 *
 * What this file adds is composition, an evidence commitment, a stable identity, and the ABI
 * shape — plus one defensive downgrade documented at `effectiveConfirmationStatus` below.
 */

import { keccak256, toBytes, pad } from "viem";

import {
  CONFIDENCE_BAND_ORDINALS,
  CONFIRMATION_STATUS_ORDINALS,
  DATA_MODE_ORDINALS,
  RISK_SCHEMA_VERSION,
  RISK_STATE_ORDINALS,
  encodeReasonCodes,
  type ConfidenceBand,
  type ConfirmationStatus,
  type DataMode,
  type ReasonCode,
  type RiskState,
} from "../risk/types.js";
import { promote, type PromotionResult } from "../risk/promote.js";
import { FROZEN_PROMOTION_CONFIG, type PromotionConfig } from "../risk/promotionConfig.js";
import type { NormalizedClaim } from "../evidence/normalize.js";
import type { EvidenceGraph } from "../evidence/graph.js";
import { wireGraphIntoPromotion, type WiredClaim } from "../evidence/evaluate.js";
import type { Resolution } from "../evidence/assets.js";
import type { ConfirmationResult, ConfirmationInput } from "../market/confirm.js";

import {
  FROZEN_ACTION_ENVELOPE,
  proposeBoundedFee,
  targetFeeForConfidence,
  type ActionEnvelope,
} from "./envelope.js";
import { EVIDENCE_COMMITMENT_VERSION, evidenceCommitment } from "./commitment.js";
import {
  assessmentDigest,
  assessmentDomain,
  type AssessmentDomain,
  type AssessmentStruct,
} from "./eip712.js";
import type {
  EvidenceClaimView,
  MarketConfirmationView,
  RiskActionView,
  RiskRecordView,
} from "./viewModel.js";

export const ASSESSMENT_ID_VERSION = "tinjau.assessment-id/1.0.0";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * The four codes the confirmation engine emits to state its own verdict.
 *
 * They are dropped when the market reasons are merged into the record, because `promote()`
 * re-derives the EFFECTIVE status after applying its own freshness bound and emits the
 * corresponding code itself. Keeping both would let a record carry `MARKET_CONFIRMED` and
 * `MARKET_DATA_STALE` at the same time, which is not a nuance, it is a contradiction.
 * Every other market code — `ANTI_WICK_FAILED`, `THIN_EXIT_DEPTH`, `REFERENCE_MARKET_CLOSED`,
 * `INSUFFICIENT_SAMPLE` — is a diagnostic that survives the merge, because it says WHY.
 */
const CONFIRMATION_STATUS_CODES: ReadonlySet<ReasonCode> = new Set<ReasonCode>([
  "MARKET_CONFIRMED",
  "MARKET_NOT_CONFIRMED",
  "MARKET_DATA_STALE",
  "MARKET_DATA_UNAVAILABLE",
]);

export interface CurrentRegistryState {
  /** The state currently recorded on chain for this (asset, pool). */
  state: RiskState;
  /** When the running protection STARTED, not when it was last refreshed. Epoch seconds. */
  protectStartedAt?: number;
  /** When the previous protection ended, for cooldown. Epoch seconds. */
  lastProtectEndedAt?: number;
}

export interface DecisionInput {
  /**
   * Stable identity of the EVENT being assessed, supplied by the caller (a cluster key from
   * `evidence/cluster.ts`, or a frozen scenario id). Two assessments of the same event share
   * this; two different events must not. It is a component of `assessmentId`, which is what
   * makes "retrying the same event" a meaningful phrase.
   */
  eventKey: string;
  /** Epoch seconds. The ONLY time source in this module. Never defaulted to a clock read. */
  now: number;

  claims: readonly NormalizedClaim[];
  graph: EvidenceGraph;
  resolution: Resolution;
  confirmation: ConfirmationResult;
  /**
   * The input the confirmation verdict was computed from, when the caller still has it.
   *
   * Optional and read-only. It supplies two display values the result does not carry — the last
   * observed pool price and the OKX reference price — and nothing else. No decision reads it.
   */
  confirmationInput?: Pick<ConfirmationInput, "pricePath" | "okx"> | null;

  /** Whether the bonded parse-agreement path passed. Only meaningful for OFFICIAL evidence. */
  officialEvidencePassed: boolean;

  current?: CurrentRegistryState;

  chainId: number;
  registryAddress: `0x${string}`;
  /** The v4 pool id, when one is known. Defaults to the pool address left-padded to 32 bytes. */
  poolId?: `0x${string}`;

  /**
   * An optional fee request. May only LOWER the policy target; a higher value is clamped down.
   * `undefined`/`null` means "no preference", which proposes the policy target itself.
   */
  requestedFeeProposal?: number | null;

  envelope?: ActionEnvelope;
  promotionConfig?: PromotionConfig;
  /** Seconds the signed assessment stays submittable. Defaults to the record's own expiry. */
  deadlineSec?: number;
}

export interface Decision {
  /** The §0.24 view model. Validates against `frontend-handoff/risk-record.schema.json`. */
  record: RiskRecordView;
  /** Exactly what `postAssessment` takes. */
  assessment: AssessmentStruct;
  domain: AssessmentDomain;
  /** The EIP-712 digest a signature must cover. */
  digest: `0x${string}`;

  eventKey: string;
  assessmentId: `0x${string}`;
  /** Derived from `assessmentId`, so re-posting an identical assessment is a nonce collision. */
  nonce: bigint;

  /**
   * Whether this assessment can be submitted on chain at all.
   *
   * False when the asset/pool did not resolve: the registry rejects an unsupported asset
   * outright, and a record naming a pool nobody vetted is worse than no record. A non-postable
   * decision is still a complete, explainable `RiskRecordView` — that IS the fail-closed
   * behaviour, not a degraded version of it.
   */
  postable: boolean;

  /** Original start of a running protection, kept across refreshes. Null outside PROTECT. */
  protectStartedAt: number | null;
  /** Seconds of protection budget left, given the original start. Null outside PROTECT. */
  remainingProtectSec: number | null;

  /** The policy target for this confidence band. `record.action.requestedFee` never exceeds it. */
  policyTargetFee: number;

  /** The promotion engine's full result, for auditing without re-running it. */
  promotion: PromotionResult;
  /** The claims as the promotion engine saw them, including why any was disqualified. */
  wiredClaims: WiredClaim[];
  /** The confirmation status actually acted on, after freshness and the defensive downgrade. */
  effectiveConfirmation: ConfirmationStatus;

  ruleVersions: {
    schema: string;
    policy: string;
    confirmation: string;
    evidenceCommitment: string;
    assessmentId: string;
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const iso = (epochSeconds: number): string => new Date(epochSeconds * 1000).toISOString();

/**
 * Formats a number for a §0.24 numeric-string field.
 *
 * The frontend validator accepts `/^-?\d+(?:\.\d+)?$/` only, so exponential notation is a
 * rejection rather than a display quirk. Anything that cannot be written in that form —
 * including a non-finite value or a magnitude past 1e15 — becomes `null`, which the schema
 * permits and which is honest: the field is unrepresentable, not zero.
 */
function numericString(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) >= 1e15) return null;
  if (Number.isInteger(value)) return String(value);
  const fixed = value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return fixed === "-0" ? "0" : fixed;
}

/** Passes a decimal string through verbatim when it is already in the accepted form. */
function numericStringPassthrough(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return /^-?\d+(?:\.\d+)?$/.test(value) ? value : null;
}

/**
 * The record-level `dataMode`, chosen as the LEAST live mode present in the evidence.
 *
 * Ranking: SIMULATED > REPLAY > OBSERVED > LIVE. Scenario A carries one simulated rumour beside
 * four genuinely replayed news claims, and this makes the whole record read `SIMULATED`.
 *
 * That deliberately over-states how synthetic the record is. The alternative under-states it,
 * and §0.8 is explicit that a simulated input must never be presentable as observed. The exact
 * per-claim truth is never lost: `evidence[].dataMode` carries each claim's own mode.
 */
function recordDataMode(claims: readonly NormalizedClaim[]): DataMode {
  const order: DataMode[] = ["SIMULATED", "REPLAY", "OBSERVED", "LIVE"];
  for (const mode of order) if (claims.some((c) => c.dataMode === mode)) return mode;
  return "REPLAY";
}

// ---------------------------------------------------------------------------
// The orchestrator
// ---------------------------------------------------------------------------

export class DecisionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionInputError";
  }
}

export function decide(input: DecisionInput): Decision {
  if (!Number.isFinite(input.now) || !Number.isInteger(input.now) || input.now < 0) {
    // No fallback to `Date.now()`. A missing timestamp is a caller bug, and silently reading a
    // clock here would make every downstream result unreproducible.
    throw new DecisionInputError(`now must be a non-negative integer epoch-seconds value`);
  }
  if (input.eventKey.trim().length === 0) {
    throw new DecisionInputError("eventKey must be a non-empty string");
  }

  const envelope = input.envelope ?? FROZEN_ACTION_ENVELOPE;
  const config = input.promotionConfig ?? FROZEN_PROMOTION_CONFIG;
  const now = input.now;

  // ---- 1. Evidence graph -> promotion input ---------------------------------------------
  const wiredClaims = wireGraphIntoPromotion(input.claims, input.graph);

  // ---- 2. The confirmation status actually acted on ---------------------------------------
  //
  // DEFENSIVE DOWNGRADE. A `CONFIRMED` verdict that carries no observation timestamp cannot be
  // checked for freshness, and an unfreshenable confirmation is exactly the shape the §0.7
  // invariant "stale/missing data cannot create a new PROTECT" exists to refuse. The current
  // engine cannot produce it — `CONFIRMED` is unreachable without a price path — so this is a
  // guard against a future change in a module this one does not own, not a live code path.
  let confirmationStatus: ConfirmationStatus = input.confirmation.status;
  const observedAt = input.confirmation.observedAtUnixSeconds;
  const unfreshenableConfirmation = confirmationStatus === "CONFIRMED" && observedAt === null;
  if (unfreshenableConfirmation) confirmationStatus = "UNAVAILABLE";

  const promotion = promote({
    claims: wiredClaims,
    marketConfirmation: {
      status: confirmationStatus,
      // When there is no observation the status is never CONFIRMED, so the freshness branch in
      // `promote` is unreachable and this value cannot affect the outcome. `now` is used rather
      // than a sentinel so the arithmetic stays defined.
      observedAt: observedAt ?? now,
    },
    now,
    currentState: input.current?.state ?? "NORMAL",
    currentProtectStartedAt: input.current?.protectStartedAt,
    lastProtectEndedAt: input.current?.lastProtectEndedAt,
    resolutionOutcome: input.resolution.outcome,
    officialEvidencePassed: input.officialEvidencePassed,
    config,
  });

  // `promote` decides the effective status internally (it downgrades a stale CONFIRMED). Mirror
  // that here so the record, the reason codes and the on-chain struct all agree on one value.
  const marketAge = now - (observedAt ?? now);
  const effectiveConfirmation: ConfirmationStatus =
    confirmationStatus === "CONFIRMED" && !(marketAge >= 0 && marketAge <= config.marketFreshnessSec)
      ? "STALE"
      : confirmationStatus;

  // ---- 3. Reason codes: promotion's, plus the market engine's diagnostics -----------------
  const reasonCodes = mergeReasonCodes(
    promotion.reasonCodes,
    input.confirmation.reasonCodes,
    unfreshenableConfirmation,
  );

  // ---- 4. Identity of the thing being protected -------------------------------------------
  const asset = input.resolution.asset;
  const firstClaim = input.claims[0];
  const assetAddress = (asset?.tokenAddress ??
    (firstClaim?.tokenAddress && /^0x[0-9a-fA-F]{40}$/.test(firstClaim.tokenAddress)
      ? (firstClaim.tokenAddress as `0x${string}`)
      : ZERO_ADDRESS)) as `0x${string}`;
  const tokenSymbol = asset?.tokenSymbol ?? firstClaim?.tokenSymbol ?? "UNKNOWN";
  // A record whose asset did not resolve still needs a non-empty pool field. `unresolved` is
  // the honest value, and it appears beside `UNSUPPORTED_ASSET` / `UNKNOWN_COMPANY` /
  // `AMBIGUOUS_ENTITY` in `reasonCodes`, which say which of the three refusals happened.
  const poolIdOrAddress = asset?.poolAddress ?? "unresolved";
  const poolId: `0x${string}` =
    input.poolId ??
    (asset?.poolAddress ? pad(asset.poolAddress, { size: 32 }) : (pad("0x00", { size: 32 }) as `0x${string}`));

  // ---- 5. Protection start: never ratcheted forward by a refresh ---------------------------
  //
  // This mirrors `TinjauRiskRegistry.postAssessment`, which keeps `cur.protectStartedAt` for a
  // continuing protection. If the orchestrator restamped the start on every refresh, an
  // assessment posted once a minute would push the maximum-duration cap forward forever and the
  // bounded action would quietly become a permanent one.
  const isProtect = promotion.state === "PROTECT";
  const continuing = isProtect && input.current?.state === "PROTECT" && !!input.current.protectStartedAt;
  const protectStartedAt = isProtect
    ? continuing
      ? (input.current!.protectStartedAt as number)
      : now
    : null;
  const remainingProtectSec =
    protectStartedAt === null
      ? null
      : Math.max(0, protectStartedAt + envelope.maxProtectDurationSec - now);

  // ---- 6. The bounded action PROPOSAL -------------------------------------------------------
  const policyTargetFee = targetFeeForConfidence(promotion.confidenceBand, envelope);
  const requestedFee = isProtect
    ? proposeBoundedFee(promotion.confidenceBand, input.requestedFeeProposal ?? null, envelope)
    : 0;

  // ---- 7. Views ------------------------------------------------------------------------------
  const evidence = input.claims.map(toEvidenceClaimView);
  const commitment = evidenceCommitment(assetAddress, poolIdOrAddress, evidence);

  // Freshness is the AND of both bounds. The market engine judges the observation's age at the
  // instant it was computed; the promotion engine re-judges it against `now`. A record that
  // reported only the first would claim `fresh: true` for an observation the promotion engine
  // had already discarded as too old to act on.
  const freshForThisAssessment =
    input.confirmation.fresh && marketAge >= 0 && marketAge <= config.marketFreshnessSec;

  const marketConfirmation = toMarketConfirmationView(
    input.confirmation,
    effectiveConfirmation,
    freshForThisAssessment,
    input.confirmationInput ?? null,
  );

  const action: RiskActionView = {
    authorized: isProtect,
    // PENDING, not APPLIED. This assessment is a proposal; T4.2 owns the transaction and is the
    // only thing entitled to write APPLIED, FAILED, or a tx hash.
    status: isProtect ? "PENDING" : "NONE",
    baseFee: String(envelope.baseFee),
    maxFee: String(envelope.maxFee),
    requestedFee: isProtect ? String(requestedFee) : null,
    appliedFee: null,
    maximumDurationSec: envelope.maxProtectDurationSec,
    txHash: null,
    failureReason: null,
  };

  const assessedAt = now;
  const expiresAt = promotion.expiresAt;
  if (expiresAt <= assessedAt) {
    // The registry reverts on this, and a record that expires before it is written explains
    // nothing. Better to fail here, where the cause is visible.
    throw new DecisionInputError(
      `computed expiry ${expiresAt} is not after the assessment time ${assessedAt}`,
    );
  }

  const humanExplanation = buildExplanation(
    promotion,
    input.confirmation,
    effectiveConfirmation,
    input.resolution,
    isProtect,
    requestedFee,
    policyTargetFee,
    continuing,
    remainingProtectSec,
  );

  const reasonBits = encodeReasonCodes(reasonCodes);

  const assessmentId = computeAssessmentId({
    eventKey: input.eventKey,
    chainId: input.chainId,
    registryAddress: input.registryAddress,
    assetAddress,
    poolId,
    state: promotion.state,
    reasonBits,
    confidenceBand: promotion.confidenceBand,
    dataMode: recordDataMode(input.claims),
    confirmation: effectiveConfirmation,
    assessedAt,
    expiresAt,
    protectStartedAt,
    evidenceCommitment: commitment,
    requestedFee,
    policyVersion: promotion.policyVersion,
    confirmationRuleVersion: input.confirmation.ruleVersion,
  });

  const record: RiskRecordView = {
    schemaVersion: RISK_SCHEMA_VERSION,
    assessmentId,
    assetAddress,
    tokenSymbol,
    poolIdOrAddress,
    state: promotion.state,
    reasonCodes,
    humanExplanation,
    evidenceCommitment: commitment,
    confidenceBand: promotion.confidenceBand,
    assessedAt: iso(assessedAt),
    expiresAt: iso(expiresAt),
    policyVersion: promotion.policyVersion,
    dataMode: recordDataMode(input.claims),
    evidence,
    marketConfirmation,
    action,
  };

  // The nonce is DERIVED, not counted. Two identical assessments therefore carry the same
  // nonce, and the registry's replay protection refuses the second — which is what idempotency
  // has to mean on chain: a retry cannot produce a second record.
  const nonce = BigInt(assessmentId.slice(0, 34));

  const domain = assessmentDomain(input.chainId, input.registryAddress);
  const assessment: AssessmentStruct = {
    asset: assetAddress,
    poolId,
    state: RISK_STATE_ORDINALS[promotion.state],
    confidence: CONFIDENCE_BAND_ORDINALS[promotion.confidenceBand],
    dataMode: DATA_MODE_ORDINALS[record.dataMode],
    confirmation: CONFIRMATION_STATUS_ORDINALS[effectiveConfirmation],
    reasonBits,
    assessedAt: BigInt(assessedAt),
    expiresAt: BigInt(expiresAt),
    evidenceCommitment: commitment,
    requestedFee,
    nonce,
    deadline: BigInt(
      input.deadlineSec === undefined ? expiresAt : Math.min(now + input.deadlineSec, expiresAt),
    ),
  };

  return {
    record,
    assessment,
    domain,
    digest: assessmentDigest(domain, assessment),
    eventKey: input.eventKey,
    assessmentId,
    nonce,
    postable: input.resolution.mayAuthorizeAction,
    protectStartedAt,
    remainingProtectSec,
    policyTargetFee,
    promotion,
    wiredClaims,
    effectiveConfirmation,
    ruleVersions: {
      schema: RISK_SCHEMA_VERSION,
      policy: promotion.policyVersion,
      confirmation: input.confirmation.ruleVersion,
      evidenceCommitment: EVIDENCE_COMMITMENT_VERSION,
      assessmentId: ASSESSMENT_ID_VERSION,
    },
  };
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function mergeReasonCodes(
  fromPromotion: readonly ReasonCode[],
  fromConfirmation: readonly ReasonCode[],
  unfreshenableConfirmation: boolean,
): ReasonCode[] {
  const merged = new Set<ReasonCode>(fromPromotion);
  for (const code of fromConfirmation) {
    if (CONFIRMATION_STATUS_CODES.has(code)) continue;
    merged.add(code);
  }
  if (unfreshenableConfirmation) merged.add("MARKET_DATA_UNAVAILABLE");
  return [...merged].sort();
}

function toEvidenceClaimView(claim: NormalizedClaim): EvidenceClaimView {
  return {
    claimId: claim.claimId,
    sourceClass: claim.sourceClass,
    dataMode: claim.dataMode,
    sourceUrl: claim.sourceUrl,
    sourceId: claim.sourceId,
    publisherOrAuthor: claim.publisherOrAuthor,
    publishedAt: claim.publishedAt,
    company: claim.company,
    tokenSymbol: claim.tokenSymbol,
    tokenAddress: (claim.tokenAddress ?? ZERO_ADDRESS) as `0x${string}`,
    eventType: claim.eventType,
    claimTextOrPointer: claim.claimTextOrPointer,
    independenceGroup: claim.independenceGroup,
    relation: claim.relation,
    officialConfirmation: claim.officialConfirmation,
    expiresAt: claim.expiresAt,
  };
}

function toMarketConfirmationView(
  result: ConfirmationResult,
  effectiveStatus: ConfirmationStatus,
  freshForThisAssessment: boolean,
  confirmationInput: Pick<ConfirmationInput, "pricePath" | "okx"> | null,
): MarketConfirmationView {
  const path = confirmationInput?.pricePath ?? [];
  const lastPoint = path.length > 0 ? path[path.length - 1] : null;
  const observed = result.observedAtUnixSeconds !== null;

  return {
    // The EFFECTIVE status, not the raw verdict. The record must state what it acted on, and
    // the on-chain struct carries the same value — a record showing CONFIRMED beside a
    // `WATCH` caused by staleness would be unreadable.
    status: effectiveStatus,
    // NULL when nothing was observed — a window with zero swaps, as in scenario A. Schema
    // 1.0.1 made this nullable precisely so an absence cannot be written as a reading:
    // stamping the assessment instant here would make `age = now - observedAt` evaluate to
    // zero, and a leg that was never looked at would read as perfectly fresh.
    observedAt: observed ? iso(result.observedAtUnixSeconds as number) : null,
    blockNumber: result.blockNumber === null ? null : String(result.blockNumber),
    // Forced false when there is no observation, rather than merely expected to be false. The
    // market module is owned elsewhere; nothing it returns should be able to make an
    // unobserved leg look fresh.
    fresh: observed ? freshForThisAssessment : false,
    antiWickSatisfied: result.antiWick.held,
    okxReferencePrice: numericStringPassthrough(confirmationInput?.okx?.sample?.price ?? null),
    xLayerPoolPrice: numericString(lastPoint?.price ?? null),
    basisBps: numericString(result.signals.basis.value),
    drawdownBps: numericString(result.signals.drawdown.value),
    tradeVelocity: numericString(result.signals.velocity.value),
    executableExitDepth: numericString(result.exitDepth.maxSellWithinTickRange?.value ?? null),
    reasonCodes: [...result.reasonCodes].sort(),
  };
}

function buildExplanation(
  promotion: PromotionResult,
  confirmation: ConfirmationResult,
  effectiveStatus: ConfirmationStatus,
  resolution: Resolution,
  isProtect: boolean,
  requestedFee: number,
  policyTargetFee: number,
  continuing: boolean,
  remainingProtectSec: number | null,
): string {
  const parts: string[] = [promotion.explanation];

  parts.push(
    `Market leg: ${effectiveStatus}. ${confirmation.explanation}` +
      (confirmation.okxLegAvailable
        ? ""
        : " The OKX reference leg was unavailable, so no artifact may describe this as dual-leg " +
          "OKX/X Layer confirmation."),
  );

  if (!resolution.mayAuthorizeAction) {
    parts.push(
      `Asset resolution: ${resolution.explanation} No assessment for this evidence can be posted ` +
        `on chain, because the registry only accepts assessments for a vetted asset.`,
    );
  }

  if (isProtect) {
    parts.push(
      `Bounded action PROPOSED (not applied): fee ${requestedFee} pips, which is at or below the ` +
        `policy target ${policyTargetFee} for confidence ${promotion.confidenceBand}. The contract ` +
        `recomputes its own target and may lower or reject this proposal; it can never raise it.` +
        (continuing
          ? ` This refreshes a protection that is already running, so it keeps its ORIGINAL start ` +
            `time and has ${remainingProtectSec}s of its bounded duration left. Refreshing does not ` +
            `extend the cap.`
          : ""),
    );
  } else {
    parts.push(
      `No bounded action is authorised in state ${promotion.state}: the aggressive fee path stays ` +
        `closed and the pool keeps its baseline fee.`,
    );
  }

  return parts.join(" ");
}

interface AssessmentIdParts {
  eventKey: string;
  chainId: number;
  registryAddress: string;
  assetAddress: string;
  poolId: string;
  state: RiskState;
  reasonBits: number;
  confidenceBand: ConfidenceBand;
  dataMode: DataMode;
  confirmation: ConfirmationStatus;
  assessedAt: number;
  expiresAt: number;
  protectStartedAt: number | null;
  evidenceCommitment: string;
  requestedFee: number;
  policyVersion: string;
  confirmationRuleVersion: string;
}

/**
 * `assessmentId = keccak256(utf8Bytes(preimage))`, where `preimage` is the twenty values below
 * in exactly this order, each followed by LF (0x0A) — including the last:
 *
 *    1  the literal `tinjau.assessment-id/1.0.0`
 *    2  eventKey, verbatim
 *    3  schemaVersion            (`tinjau.risk/1.0.0`)
 *    4  policyVersion            (`tinjau.policy/1.0.0`)
 *    5  confirmation ruleVersion (from the market engine's result)
 *    6  evidence-commitment version
 *    7  chainId, base-10
 *    8  registryAddress, lowercased
 *    9  assetAddress, lowercased
 *   10  poolId, lowercased
 *   11  reasonBits, base-10
 *   12  confidenceBand           (`LOW` / `MEDIUM` / `HIGH`)
 *   13  dataMode
 *   14  confirmation status, after freshness
 *   15  assessedAt, epoch seconds, base-10
 *   16  expiresAt, epoch seconds, base-10
 *   17  protectStartedAt, epoch seconds, or `0` when there is none
 *   18  evidenceCommitment, lowercased
 *   19  requestedFee, base-10
 *   20  state                    (`NORMAL` / `WATCH` / `PROTECT`)
 *
 * Two properties follow, and both are tested:
 *
 *   IDEMPOTENT — the same event assessed from the same inputs at the same instant produces a
 *   byte-identical id, because every input to the hash is a decision output or a frozen version
 *   string, and nothing here reads a clock or a counter.
 *
 *   SENSITIVE — any change that would alter what the pool does (state, reasons, confidence,
 *   expiry, fee, evidence set, or which chain and registry it is destined for) changes the id.
 *   Distinguishing two genuinely different assessments matters more than collapsing near-
 *   identical ones, so the field list errs toward including things.
 *
 * `now` enters only through `assessedAt`. Re-assessing the same event one second later is a
 * DIFFERENT assessment and gets a different id — which is correct, and is why a continuing
 * PROTECT's `protectStartedAt` is carried separately rather than being re-derived from `now`.
 */
function computeAssessmentId(p: AssessmentIdParts): `0x${string}` {
  const lines = [
    ASSESSMENT_ID_VERSION,
    p.eventKey,
    RISK_SCHEMA_VERSION,
    p.policyVersion,
    p.confirmationRuleVersion,
    EVIDENCE_COMMITMENT_VERSION,
    String(p.chainId),
    p.registryAddress.toLowerCase(),
    p.assetAddress.toLowerCase(),
    p.poolId.toLowerCase(),
    String(p.reasonBits),
    p.confidenceBand,
    p.dataMode,
    p.confirmation,
    String(p.assessedAt),
    String(p.expiresAt),
    String(p.protectStartedAt ?? 0),
    p.evidenceCommitment.toLowerCase(),
    String(p.requestedFee),
    p.state,
  ];
  return keccak256(toBytes(lines.map((l) => `${l}\n`).join("")));
}
