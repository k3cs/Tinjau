/**
 * The bounded-action envelope, TypeScript side (task T4.1, consuming T1.3).
 *
 * `contracts/src/TinjauRiskPolicy.sol` is the enforcement point. Nothing here can widen a fee:
 * the contract recomputes its own target and intersects the proposal with it. This file exists
 * so the orchestrator can PROPOSE a value that the contract will actually accept, and so a
 * reader can see the proposal arithmetic without reading Solidity.
 *
 * The four envelope numbers are the ones already deployed on the historical hook
 * (`baseFee 500`, `maxFee 20000`, widen 3600 s, decay 18000 s) and are quoted in tracker §0.11.
 * They are frozen here for the same reason `promotionConfig.ts` freezes its thresholds: a value
 * that can move at runtime is not a bound.
 *
 * THE ONE RULE THAT MATTERS (T1.3 guarantee 4): a proposal may only LOWER the fee relative to
 * the policy target for the record's confidence band. It may never raise it. An off-chain
 * proposer — an LLM included — can ask for less protection than the rules allow and never for
 * more, so a compromised assessor's worst case is under-protection, not a drained pool.
 */

import type { ConfidenceBand } from "../risk/types.js";

export interface ActionEnvelope {
  /** Lower edge of the fee band, in Uniswap v4 pips. 500 = 0.05%. */
  readonly baseFee: number;
  /** Upper edge. 20000 = 2%. */
  readonly maxFee: number;
  /** Seconds held fully widened after protection starts. */
  readonly widenDurationSec: number;
  /** Seconds of linear decay back to `baseFee`. */
  readonly decayDurationSec: number;
  /** Hard cap on one protection interval. */
  readonly maxProtectDurationSec: number;
  /** Minimum gap before protection may re-arm. */
  readonly cooldownSec: number;
}

export const FROZEN_ACTION_ENVELOPE: ActionEnvelope = Object.freeze({
  baseFee: 500,
  maxFee: 20_000,
  widenDurationSec: 3_600,
  decayDurationSec: 18_000,
  // widen + decay, matching `FROZEN_PROMOTION_CONFIG.maxProtectDurationSec`. The Solidity
  // `validateEnvelope` refuses anything shorter, because a truncated decay curve would drop the
  // fee from mid-decay straight to baseline and the "deterministic recovery" claim would fail.
  maxProtectDurationSec: 3_600 + 18_000,
  cooldownSec: 3_600,
});

/**
 * Mirror of `TinjauRiskPolicy.targetFeeForConfidence`.
 *
 * Confidence modulates HOW MUCH protection, never WHETHER protection is allowed — that decision
 * belongs entirely to the deterministic promotion rules in `promote.ts`.
 *
 * Integer arithmetic, matching Solidity's truncating division exactly, so the proposal and the
 * on-chain target cannot differ by a rounding step.
 */
export function targetFeeForConfidence(
  band: ConfidenceBand,
  envelope: ActionEnvelope = FROZEN_ACTION_ENVELOPE,
): number {
  if (envelope.maxFee <= envelope.baseFee) return envelope.baseFee;
  const span = envelope.maxFee - envelope.baseFee;
  const numerator = band === "HIGH" ? 3 : band === "MEDIUM" ? 2 : 1;
  return envelope.baseFee + Math.floor((span * numerator) / 3);
}

/**
 * The fee this assessment PROPOSES, given the confidence band and an optional caller request.
 *
 * `requested === null` means "no preference": the proposal is the policy target itself.
 * A caller request is intersected with the target via `min`, never `max`. Asking for more than
 * the policy allows is not an error to report — it is silently reduced to what the policy
 * allows, exactly as the contract would do, so the two layers agree on the outcome.
 *
 * The result is also floored at `baseFee`: a request below the base fee cannot make the pool
 * cheaper than baseline, because the contract's `decayedFee` returns `baseFee` for any target
 * at or below it.
 */
export function proposeBoundedFee(
  band: ConfidenceBand,
  requested: number | null,
  envelope: ActionEnvelope = FROZEN_ACTION_ENVELOPE,
): number {
  const target = targetFeeForConfidence(band, envelope);
  if (requested === null) return target;
  if (!Number.isInteger(requested) || requested < 0) {
    throw new RangeError(`requested fee must be a non-negative integer, received ${requested}`);
  }
  // `min` is the whole guarantee. Written as an explicit clamp rather than a comparison chain
  // so no future edit can accidentally turn it into a `max`.
  return Math.min(Math.max(requested, envelope.baseFee), target);
}

/**
 * Mirror of `TinjauRiskPolicy.decayedFee`, for previewing what the pool will charge.
 *
 * Advisory only on this side: the contract recomputes it. It is here so a record can show an
 * operator what the fee will be five minutes from now without a chain read.
 */
export function decayedFee(
  targetFee: number,
  elapsedSec: number,
  envelope: ActionEnvelope = FROZEN_ACTION_ENVELOPE,
): number {
  if (targetFee <= envelope.baseFee) return envelope.baseFee;
  if (elapsedSec < 0) return envelope.baseFee;
  if (elapsedSec >= envelope.maxProtectDurationSec) return envelope.baseFee;
  if (elapsedSec <= envelope.widenDurationSec) return targetFee;

  const sinceDecayStart = elapsedSec - envelope.widenDurationSec;
  if (envelope.decayDurationSec === 0 || sinceDecayStart >= envelope.decayDurationSec) {
    return envelope.baseFee;
  }
  const span = targetFee - envelope.baseFee;
  const remaining = envelope.decayDurationSec - sinceDecayStart;
  return envelope.baseFee + Math.floor((span * remaining) / envelope.decayDurationSec);
}
