/**
 * Frozen market-confirmation thresholds (task T3.3).
 *
 * T0.4 §6.3 is binding: thresholds are frozen in versioned configuration BEFORE any scenario's
 * market data is scored, and if one changes after a result is seen, every prior result is void
 * and the benchmark is re-run and re-labelled.
 *
 * Nothing here may be read from an environment variable, a model output, or a request
 * parameter. A threshold that can move at runtime is not a threshold.
 *
 * ⚠️ PARTIAL-CONTAMINATION DISCLOSURE — read `t3-3-confirmation-method.md` §1 before trusting
 * the word "blind" about this file. Every value below is derived from a pre-existing anchor
 * that has nothing to do with the four frozen windows, and the derivation chain is written out
 * so it can be audited for fitting. But the author had already seen summary metrics for those
 * windows in inherited context, so "pre-registered" is not the same guarantee here as it was
 * in T0.4, and the difference is stated rather than glossed.
 */

import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import { MINIMUM_SWAPS_FOR_METRICS } from "./poolTelemetry.js";

/**
 * Stamped into every confirmation result so a reader knows which rules produced it.
 *
 * ## 2.0.0 — T3.4 closes F1 and F2. **No threshold VALUE changed.**
 *
 * 200 bps, 300 s, 0.5, 30 swaps, 2.0x and 300 bps are all carried over untouched. What changed
 * is the decision rule that consumes them:
 *
 * 1. **Anti-wick is now a necessary condition for any `CONFIRMED`** (F1). It previously gated
 *    the drawdown signal alone, so a fully-retraced spike still confirmed whenever the volume
 *    burst that accompanies almost every spike fired the ungated velocity signal. Velocity and
 *    basis may now corroborate a persistent price dislocation; neither may substitute for one.
 * 2. **Persistence is measured across the whole hold interval, by median** (F2), instead of at
 *    the single observation nearest trough + hold. One trade timed at that instant used to read
 *    as full persistence.
 *
 * The bump is **major, not minor**, because a verdict can differ from 1.0.0 in *both*
 * directions. (1) is a strict narrowing, but (2) is two-sided: a move that stayed dislocated
 * throughout the hold and happened to bounce at the sampled instant was refused by 1.0.0 and is
 * accepted by 2.0.0. A result stamped 1.0.0 was therefore produced by different rules, and no
 * label short of a major bump says that unambiguously.
 */
export const CONFIRMATION_RULE_VERSION = "tinjau.confirm/2.0.0";

export interface ConfirmationConfig {
  readonly ruleVersion: string;

  /** Observations older than this cannot satisfy a promotion gate. */
  readonly freshnessSeconds: number;

  /** Minimum peak-to-trough fall, in basis points, for a price move to count as a signal. */
  readonly minDrawdownBps: number;

  /** How long after the extreme the move must still hold for it not to be a wick. */
  readonly antiWickHoldSeconds: number;

  /** Fraction of the fall that must still be intact after the hold period. 0.5 = half. */
  readonly antiWickRetentionFraction: number;

  /**
   * Fewest observations that must fall inside the hold interval for persistence to be
   * assessable at all. Below it the outcome is `evaluated: false`, never `held: true`.
   *
   * Not a new tuned threshold: it is `poolTelemetry`'s pre-existing `MINIMUM_SWAPS_FOR_METRICS`
   * (2), which already governs "may a window metric be emitted at all". Retention across an
   * interval is such a metric, and one point is exactly the defective behaviour T3.4/F2
   * removed — a single observation is a sample, not an interval.
   */
  readonly antiWickMinSamples: number;

  /** Below this many swaps, no confirmation verdict may be formed at all. */
  readonly minSwapsForVerdict: number;

  /** Post-anchor trade rate must be at least this multiple of the pre-anchor rate. */
  readonly minVelocityRatio: number;

  /**
   * Divergence between the OKX reference and the pool, in bps, that counts as a signal.
   *
   * ⚠️ NEVER EXERCISED against real data. The OKX index leg is `UNAVAILABLE` for all four
   * frozen anchors and cannot be backfilled (SVC-003). This value is carried so the code path
   * exists and is tested synthetically, but it has no empirical grounding and must be
   * re-derived before anyone relies on a basis-driven confirmation.
   */
  readonly minBasisBps: number;

  /**
   * Whether exit depth may CONFIRM. Deliberately false — see §4 of the method note.
   *
   * T3.2 measures exit depth as a lower bound, because liquidity only changes at initialized
   * ticks and a swap log does not reveal them. A lower bound under-states depth and therefore
   * over-states risk, so treating a thin reading as proof of thinness would manufacture false
   * positives. Exit depth is advisory only.
   */
  readonly exitDepthMayConfirm: boolean;

  /** Whether the OKX leg is required for a confirmation. Dien's decision: no. */
  readonly okxLegRequired: boolean;
}

export const FROZEN_CONFIRMATION_CONFIG: ConfirmationConfig = Object.freeze({
  ruleVersion: CONFIRMATION_RULE_VERSION,

  // Inherited verbatim from T1.2 rather than invented here. `promote()` already re-derives
  // freshness against this same bound, and two different numbers for "how old is too old"
  // would let a sample be fresh to one layer and stale to the other.
  freshnessSeconds: FROZEN_PROMOTION_CONFIG.marketFreshnessSec, // 900

  // 200 bps = 2%, which is exactly the deployed hook's `maxFee` (20_000 pips).
  //
  // The economic argument, and the reason this is not an arbitrary volatility percentile:
  // the only action this confirmation can authorise is a fee rising to at most 2%. Invoking a
  // 2% fee to defend against a dislocation smaller than 2% is incoherent — the defence would
  // cost LPs' counterparties more than the exposure it answers. So the natural floor for
  // "worth protecting against" is the point where the observed dislocation matches what the
  // maximum permitted fee could itself recover.
  //
  // The anchor is a constant that was deployed on chain long before these scenarios existed.
  minDrawdownBps: 200,

  // A wick is, by definition, a transient touch. The extreme must still hold five minutes
  // later. X Layer produces one block per second, so this is ~300 independent blocks — a
  // single trade, a single block, or a brief cascade cannot satisfy it.
  //
  // Five minutes is also short enough to stay responsive: the deployed policy holds a widened
  // fee for 3600s, so spending 300s establishing that the move is real costs about 8% of the
  // protection window.
  antiWickHoldSeconds: 300,

  // At least half the fall must still be intact after the hold period.
  //
  // Requiring the full move to persist would be wrong for a pool this thin, where a single
  // ordinary trade can bounce the price several bps. Requiring only a token fraction would
  // let a near-complete retrace pass as persistence. One half is the neutral split, and it is
  // a shape choice rather than a tuned value — there is no finer gradation available that
  // would be defensible.
  antiWickRetentionFraction: 0.5,

  // Two, inherited verbatim from `poolTelemetry.MINIMUM_SWAPS_FOR_METRICS` rather than chosen
  // here. Retention is now a statistic over the hold interval, and a statistic over one point
  // is the single-instant sampling that T3.4/F2 identified as manipulable by one trade. An
  // interval that contains fewer than two observations is not assessed at all.
  antiWickMinSamples: MINIMUM_SWAPS_FOR_METRICS,

  // Roughly one trade per fifteen minutes across a seven-hour window.
  //
  // Below this, a "price path" is a handful of points and a drawdown is an artifact of which
  // individual trades happened to land, not a property of the market. This is deliberately a
  // different threshold from `poolTelemetry`'s two constants: `MINIMUM_SWAPS_FOR_METRICS` (2)
  // governs whether a metric may be emitted at all, `THIN_WINDOW_SWAP_THRESHOLD` (420) only
  // attaches a warning label, and this one governs whether a VERDICT may be formed. A number
  // can be worth reporting and still be too sparse to act on.
  minSwapsForVerdict: 30,

  // Post-anchor trade intensity at least double the pre-anchor rate.
  //
  // Scale-free by construction, which matters because absolute velocity on this pool is low
  // and would need a per-pool constant. A doubling is the conventional plain-language
  // threshold for "abnormal activity", and each frozen window carries its own 60-minute
  // pre-anchor segment, so the baseline comes from the same pool and the same session rather
  // than from a global average.
  minVelocityRatio: 2.0,

  // See the field doc: carried, tested synthetically, never exercised against real data.
  minBasisBps: 300,

  // See the field doc and method note §4.
  exitDepthMayConfirm: false,

  // Dien's decision, recorded in the tracker's deviations log: the X Layer pool leg may
  // satisfy confirmation alone, with the OKX leg marked UNAVAILABLE and disclosed on every
  // record. The honest consequence is enforced by `dualLegConfirmed` in the result.
  okxLegRequired: false,
});
