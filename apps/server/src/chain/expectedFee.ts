/**
 * Pure TypeScript reimplementation of `contracts/src/AfterhoursFeePolicy.sol`'s fee math
 * (task P4.4). Exists so an off-chain script can predict "exactly the fee the policy
 * predicts" — not just "some fee changed" — for the synthetic-injection test's evidence
 * blocks, without needing a chain call for every what-if.
 *
 * Deliberately mirrors the Solidity source function-for-function (`concernTier`,
 * `targetFeeForTier`, `timeDecayedFee`, `computeFee`, `_clamp`), using `bigint` throughout
 * so integer division matches Solidity's truncating (toward-zero) semantics exactly —
 * JavaScript's `BigInt` division also truncates toward zero, so no adjustment is needed for
 * the signed `swing` term.
 *
 * Kept in sync by hand with `AfterhoursFeePolicy.sol`; if that file changes, update this one
 * to match (see `apps/server/test/expectedFee.test.ts`, which pins vectors mirrored from
 * `contracts/test/AfterhoursFeePolicy.t.sol`).
 */

/** Mirrors `EventStateRegistry.EventType` (contracts/src/EventStateRegistry.sol). */
export const EVENT_TYPE = {
  Unknown: 0,
  Form8K_Material: 1,
  Form8K_Earnings: 2,
  Form8K_Restatement: 3,
  Form8K_ExecutiveChange: 4,
  Form8K_Bankruptcy: 5,
  Form8K_MAndA: 6,
  Form8K_Delisting: 7,
  Form4_InsiderBuy: 8,
  Form4_InsiderSell: 9,
} as const;

export type EventTypeValue = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

/** Mirrors `EventStateRegistry.FieldAgreement` — each field 0-3 (count of the 3 independent
 * off-chain parses that agreed). */
export interface FieldAgreement {
  eventTypeAgreement: number;
  effectiveDateAgreement: number;
  declaredAmountAgreement: number;
  affectedTokenAgreement: number;
  nextEventDateAgreement: number;
}

/** Mirrors `EventStateRegistry.SeverityGrade`. `severity` is the full signed int8 range
 * (-128..127), NOT pre-clamped to the "documented" -100..100 range — see
 * `AfterhoursFeePolicy.sol`'s doc comment on why that's intentional. */
export interface SeverityGrade {
  severity: number;
  confidence: number;
}

/** Mirrors `AfterhoursFeePolicy.SEVERITY_INFLUENCE_BPS`. */
export const SEVERITY_INFLUENCE_BPS = 2000n;
/** Mirrors `AfterhoursFeePolicy.SEVERITY_RANGE`. */
export const SEVERITY_RANGE = 100n;
/** Mirrors `AfterhoursFeePolicy.MAX_TIER`. */
export const MAX_TIER = 3;

function min4(a: number, b: number, c: number, d: number): number {
  let m = a;
  if (b < m) m = b;
  if (c < m) m = c;
  if (d < m) m = d;
  return m;
}

/** Mirrors `AfterhoursFeePolicy.concernTier`. */
export function concernTier(
  eventType: EventTypeValue,
  agreement: FieldAgreement,
  isDisputedUnresolved: boolean,
): number {
  let tier: number;
  if (
    eventType === EVENT_TYPE.Form8K_Bankruptcy ||
    eventType === EVENT_TYPE.Form8K_Delisting ||
    eventType === EVENT_TYPE.Form8K_Restatement
  ) {
    tier = 3;
  } else if (eventType === EVENT_TYPE.Form8K_MAndA || eventType === EVENT_TYPE.Form8K_ExecutiveChange) {
    tier = 2;
  } else if (
    eventType === EVENT_TYPE.Form8K_Material ||
    eventType === EVENT_TYPE.Form8K_Earnings ||
    eventType === EVENT_TYPE.Form4_InsiderBuy ||
    eventType === EVENT_TYPE.Form4_InsiderSell
  ) {
    tier = 1;
  } else {
    tier = 0;
  }

  const minCoreAgreement = min4(
    agreement.eventTypeAgreement,
    agreement.effectiveDateAgreement,
    agreement.declaredAmountAgreement,
    agreement.affectedTokenAgreement,
  );
  const weakConsensus = minCoreAgreement < 2;

  if ((weakConsensus || isDisputedUnresolved) && tier < MAX_TIER) {
    tier += 1;
  }
  return tier;
}

/** Mirrors `AfterhoursFeePolicy.targetFeeForTier`. */
export function targetFeeForTier(tier: number, baseFee: bigint, maxFee: bigint): bigint {
  const t = BigInt(Math.min(tier, MAX_TIER));
  if (maxFee <= baseFee) return baseFee;
  const span = maxFee - baseFee;
  return baseFee + (span * t) / BigInt(MAX_TIER);
}

/** Mirrors `AfterhoursFeePolicy.timeDecayedFee`. */
export function timeDecayedFee(
  targetFee: bigint,
  baseFee: bigint,
  eventTimestamp: bigint,
  nowTimestamp: bigint,
  widenDuration: bigint,
  decayDuration: bigint,
): bigint {
  if (nowTimestamp <= eventTimestamp) return targetFee;
  const elapsed = nowTimestamp - eventTimestamp;

  if (elapsed <= widenDuration) return targetFee;

  const sinceDecayStart = elapsed - widenDuration;
  if (sinceDecayStart >= decayDuration || decayDuration === 0n) return baseFee;

  const span = targetFee - baseFee;
  const remaining = decayDuration - sinceDecayStart;
  const decayedSpan = (span * remaining) / decayDuration;
  return baseFee + decayedSpan;
}

/** Mirrors `AfterhoursFeePolicy._clamp`. */
export function clamp(candidate: bigint, lo: bigint, hi: bigint): bigint {
  if (candidate <= lo) return lo;
  if (candidate >= hi) return hi;
  return candidate;
}

export interface ComputeFeeParams {
  eventType: EventTypeValue;
  agreement: FieldAgreement;
  severity: SeverityGrade;
  isDisputedUnresolved: boolean;
  eventTimestamp: bigint;
  hasEvent: boolean;
  nowTimestamp: bigint;
  baseFee: bigint;
  maxFee: bigint;
  widenDuration: bigint;
  decayDuration: bigint;
}

/** Mirrors `AfterhoursFeePolicy.computeFee` end to end. Always returns a value within
 * `[baseFee, maxFee]` — see `apps/server/test/expectedFee.test.ts`'s adversarial-severity
 * vectors, mirrored from `AfterhoursFeePolicy.t.sol`'s fuzz test, for the property this
 * guarantees. */
export function computeFee(params: ComputeFeeParams): bigint {
  const { eventType, agreement, severity, isDisputedUnresolved, eventTimestamp, hasEvent, nowTimestamp, baseFee, maxFee, widenDuration, decayDuration } =
    params;

  if (!hasEvent || maxFee <= baseFee) return baseFee;

  const tier = concernTier(eventType, agreement, isDisputedUnresolved);
  const target = targetFeeForTier(tier, baseFee, maxFee);
  const anchor = timeDecayedFee(target, baseFee, eventTimestamp, nowTimestamp, widenDuration, decayDuration);

  const bandWidth = maxFee - baseFee;
  const swing = (BigInt(severity.severity) * bandWidth * SEVERITY_INFLUENCE_BPS) / (SEVERITY_RANGE * 10_000n);

  const candidate = anchor + swing;
  return clamp(candidate, baseFee, maxFee);
}
