/**
 * The volatility-only baseline (task T5.2), specified by T0.4 §6.2.
 *
 * This is the policy that decides whether Tinjau earns its claim. "AI plus dynamic fee" is a
 * crowded category, so causal event awareness has to add measurable value beyond a controller
 * that watches price and flow. That makes this file adversarial to the product it sits in, and
 * it is written that way on purpose.
 *
 * ============================================================================
 * 1. EVIDENCE BLINDNESS IS STRUCTURAL, NOT A PROMISE
 * ============================================================================
 *
 * T0.4 §6.2: "Receives no filing, news, rumour, event-type, market-hours or corporate-action
 * input. Any leakage of evidence-derived state into this policy invalidates the comparison and
 * must fail a test."
 *
 * A comment saying "do not pass evidence here" would not survive one careless edit, and the
 * damage from that edit would be invisible: the baseline would simply look better, and the
 * comparison would silently stop measuring what it claims to measure. So three mechanisms are
 * stacked, each of which independently blocks the leak:
 *
 *   (a) The policy's input type is opaque. `VolatilityOnlyInput` carries a brand keyed by a
 *       module-private `unique symbol`, so no code outside this file can write an object literal
 *       that satisfies it. The only way to obtain one is `projectVolatilityOnlyInput`, which
 *       constructs a fresh object from an explicit key list and copies nothing else.
 *
 *   (b) The projection is numeric-only. Every leaf of the projected input is a finite number, and
 *       `assertMarketOnly` re-checks that at run time on every call, along with exact key-set
 *       equality. Evidence smuggled in as a string, an enum, a nested object or an extra field
 *       throws rather than being read. A number cannot carry a source class or an event type; the
 *       key-set check blocks the remaining trick of smuggling meaning through an extra number.
 *
 *   (c) The anchor is withheld. The decision anchor is a filing/news timestamp — evidence, even
 *       though it is numeric — so it is deliberately absent from the projection. `actionLatency`
 *       is computed *after* the policy returns, by the scoring layer, from a trigger time the
 *       policy chose without ever seeing the anchor.
 *
 * What is *not* withheld, and should not be: the replay window itself is anchored on the event
 * (anchor − 60 min .. anchor + 6 h). T0.4 §1 requires identical windows for all three policies,
 * so the window boundaries are common ground rather than a leak. The meaningful line is the raw
 * anchor instant, and that is the line drawn here.
 *
 * ============================================================================
 * 2. `k` IS NOT CHOSEN
 * ============================================================================
 *
 * T0.4 §6.2 and deviation `[design]` (2026-08-20): `k` is a judgment call, so every event is
 * reported at `k ∈ {2, 3, 5}`, all three, and the headline uses all three. `evaluateKGrid` runs
 * the whole grid and there is no exported single-`k` entry point that could be used to publish
 * one row. Reporting a single `k` would let the strongest be selected after the fact.
 *
 * ============================================================================
 * 3. SILENCE IS NOT A DECISION NOT TO ACT
 * ============================================================================
 *
 * T0.4 §6.2's degenerate-input rule: a window that cannot support the estimator is
 * `INDETERMINATE`, never "did not trigger". Scenario A's window contains zero swaps; that is a
 * measured absence (0 RPC range errors), and recording it as a non-trigger would credit the
 * baseline with restraint it never exercised.
 *
 * DETERMINISM. Pure. No clock, no network, no randomness; the same input always produces the
 * same output.
 */

import { feeAtInstantPips, recoverySeconds, type FeeEnvelope, type FeeEpisode } from "./envelope.js";
import { priceFromSqrtPriceX96 } from "../market/poolTelemetry.js";
import type { FeeRatePipsAt } from "./markout.js";
import type { ReplayInput } from "./replayInput.js";

export const VOLATILITY_POLICY_ID = "VOLATILITY_ONLY" as const;
export const VOLATILITY_METHOD_VERSION = "tinjau.benchmark-volatility-only/1.0.0";

/** T0.4 §6.2, frozen. Not tunable from outside this module. */
export const SHORT_WINDOW_SEC = 900;
export const REFERENCE_WINDOW_SEC = 86_400;
/** The full grid. Every event is reported at all three. */
export const K_GRID = [2, 3, 5] as const;
export type K = (typeof K_GRID)[number];

/**
 * Grid spacing at which `rv_short` is sampled, in seconds.
 *
 * T0.4 §6.2 fixes the statistic and the two window lengths but not the sampling scheme. Sampling
 * on a fixed 60-second clock grid is chosen over sampling at each trade because a trade-sampled
 * median is weighted by trade arrival: a busy hour would contribute more observations to the
 * reference and drag the median toward busy-period volatility. A clock grid makes the reference a
 * time-median, independent of how the flow happened to cluster. Recorded as a resolution of an
 * under-specification, not as a free parameter — see `t5-1-t5-2-baselines.md` §5.
 */
export const GRID_SEC = 60;

/** `rv_short` needs at least this many price observations in its trailing window to exist. */
export const MIN_PRICES_FOR_RV = 2;
/**
 * The reference median needs at least this many defined `rv_short` observations.
 *
 * Two, which is the smallest number for which a median is not simply the single sample itself.
 * No larger coverage threshold is imposed, because any number invented now would be a threshold
 * the pre-registration does not contain, and a stricter one would silence the comparator on thin
 * windows — which is the direction that flatters Tinjau. Coverage is reported on every row
 * instead, so a reviewer can apply their own threshold to published numbers.
 */
export const MIN_REFERENCE_OBSERVATIONS = 2;

// ---------------------------------------------------------------------------
// The opaque, evidence-incapable input
// ---------------------------------------------------------------------------

declare const VOLATILITY_INPUT_BRAND: unique symbol;

/** One price observation. Two numbers, nothing else — see §1(b) of the file header. */
export interface VolatilityPricePoint {
  unixSeconds: number;
  price: number;
}

/**
 * Everything the volatility baseline is allowed to see.
 *
 * Opaque by construction: the brand key is a module-private symbol, so this type cannot be
 * satisfied by an object literal written anywhere else. `projectVolatilityOnlyInput` is the only
 * constructor.
 */
export interface VolatilityOnlyInput {
  readonly [VOLATILITY_INPUT_BRAND]: true;
  readonly pricePath: readonly VolatilityPricePoint[];
  readonly windowFromUnixSeconds: number;
  readonly windowToUnixSeconds: number;
}

const ALLOWED_TOP_LEVEL_KEYS = ["pricePath", "windowFromUnixSeconds", "windowToUnixSeconds"] as const;
const ALLOWED_POINT_KEYS = ["unixSeconds", "price"] as const;

/**
 * Projects the shared replay input down to market data only.
 *
 * Constructs a fresh object from a fixed key list rather than spreading and deleting. A
 * spread-then-delete projection carries every future field through by default and only drops the
 * ones someone remembered to name; this one carries nothing through by default and only admits
 * the ones named here.
 */
export function projectVolatilityOnlyInput(input: ReplayInput): VolatilityOnlyInput {
  const pricePath: VolatilityPricePoint[] = input.swaps.map((swap) => ({
    unixSeconds: input.window.fromUnixSeconds + (swap.blockNumber - input.window.fromBlock),
    price: priceFromSqrtPriceX96(swap.sqrtPriceX96, input.pool),
  }));
  const projected = {
    pricePath,
    windowFromUnixSeconds: input.window.fromUnixSeconds,
    windowToUnixSeconds: input.window.toUnixSeconds,
  };
  assertMarketOnly(projected);
  return projected as unknown as VolatilityOnlyInput;
}

/**
 * Throws unless the value is market data and only market data.
 *
 * Called on construction *and* on every policy run, so a value mutated between the two is caught
 * at the point of use rather than trusted because it was valid once.
 */
export function assertMarketOnly(value: unknown): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("VOLATILITY_ONLY input must be a plain object.");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const allowed = [...ALLOWED_TOP_LEVEL_KEYS].sort();
  if (keys.length !== allowed.length || keys.some((k, i) => k !== allowed[i])) {
    throw new Error(
      `VOLATILITY_ONLY input carries keys [${keys.join(", ")}] but only ` +
        `[${allowed.join(", ")}] are permitted. T0.4 §6.2 forbids any filing, news, rumour, ` +
        `event-type, market-hours or corporate-action input reaching this policy; an unexpected ` +
        `field is treated as leakage rather than as harmless extra data.`,
    );
  }
  requireFiniteNumber(record.windowFromUnixSeconds, "windowFromUnixSeconds");
  requireFiniteNumber(record.windowToUnixSeconds, "windowToUnixSeconds");

  const path = record.pricePath;
  if (!Array.isArray(path)) throw new Error("VOLATILITY_ONLY input pricePath must be an array.");
  for (let i = 0; i < path.length; i++) {
    const point = path[i] as unknown;
    if (point === null || typeof point !== "object" || Array.isArray(point)) {
      throw new Error(`VOLATILITY_ONLY pricePath[${i}] must be a plain object.`);
    }
    const pointKeys = Object.keys(point as Record<string, unknown>).sort();
    const allowedPointKeys = [...ALLOWED_POINT_KEYS].sort();
    if (
      pointKeys.length !== allowedPointKeys.length ||
      pointKeys.some((k, j) => k !== allowedPointKeys[j])
    ) {
      throw new Error(
        `VOLATILITY_ONLY pricePath[${i}] carries keys [${pointKeys.join(", ")}] but only ` +
          `[${allowedPointKeys.join(", ")}] are permitted.`,
      );
    }
    requireFiniteNumber((point as Record<string, unknown>).unixSeconds, `pricePath[${i}].unixSeconds`);
    requireFiniteNumber((point as Record<string, unknown>).price, `pricePath[${i}].price`);
  }
}

function requireFiniteNumber(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `VOLATILITY_ONLY input field ${field} must be a finite number, received ` +
        `${typeof value === "number" ? String(value) : typeof value}. Only numeric market ` +
        `observations may reach this policy: a string, enum or object here is how an event type ` +
        `or source class would leak in, and a non-finite number is not an observation at all.`,
    );
  }
}

// ---------------------------------------------------------------------------
// The estimator
// ---------------------------------------------------------------------------

/**
 * Realised volatility of the price path over `(t - SHORT_WINDOW_SEC, t]`.
 *
 * T0.4 §6.2 names "realised volatility of pool mid-price" without pinning an estimator, so this
 * uses the plainest one available: the square root of the sum of squared log returns between
 * consecutive observations in the window. No mean subtraction and no annualisation, both of which
 * would add a parameter without adding information at this horizon. Returns `null` when the
 * window holds fewer than `MIN_PRICES_FOR_RV` observations, so "no estimate" is distinguishable
 * from "an estimate of zero".
 *
 * Unit: dimensionless, log-return units accumulated over a 15-minute window.
 */
export function realisedVolatility(prices: readonly number[]): number | null {
  if (prices.length < MIN_PRICES_FOR_RV) return null;
  let sum = 0;
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1] as number;
    const curr = prices[i] as number;
    if (!(prev > 0) || !(curr > 0)) return null;
    const r = Math.log(curr / prev);
    sum += r * r;
  }
  return Math.sqrt(sum);
}

export interface GridObservation {
  unixSeconds: number;
  /** `null` when the trailing short window held too few observations. */
  rvShort: number | null;
  /** Median of the strictly-trailing defined `rv_short` values. `null` when too few exist. */
  rvRef: number | null;
  /** How many defined `rv_short` values the reference median was taken over. */
  referenceObservations: number;
  /** Seconds of reference actually available at this grid point, capped at `REFERENCE_WINDOW_SEC`. */
  referenceCoverageSec: number;
}

/**
 * Samples `rv_short` and the reference median on the fixed clock grid.
 *
 * The reference is *strictly* trailing: the observation being tested is not part of its own
 * baseline. "Trailing 24 hours" reads that way, and including the current sample would damp the
 * very spike the trigger exists to detect.
 */
export function buildGrid(input: VolatilityOnlyInput): GridObservation[] {
  const path = input.pricePath;
  const observations: GridObservation[] = [];
  const defined: Array<{ unixSeconds: number; rv: number }> = [];

  let shortStart = 0;
  let shortEnd = 0;

  for (let t = input.windowFromUnixSeconds; t <= input.windowToUnixSeconds; t += GRID_SEC) {
    // Two moving pointers over the sorted path: the half-open trailing window (t-900, t].
    while (shortEnd < path.length && (path[shortEnd] as VolatilityPricePoint).unixSeconds <= t) shortEnd++;
    while (
      shortStart < shortEnd &&
      (path[shortStart] as VolatilityPricePoint).unixSeconds <= t - SHORT_WINDOW_SEC
    ) {
      shortStart++;
    }

    const windowPrices: number[] = [];
    for (let i = shortStart; i < shortEnd; i++) windowPrices.push((path[i] as VolatilityPricePoint).price);
    const rvShort = realisedVolatility(windowPrices);

    const referenceFloor = t - REFERENCE_WINDOW_SEC;
    const reference: number[] = [];
    let earliest = t;
    for (const d of defined) {
      if (d.unixSeconds >= referenceFloor && d.unixSeconds < t) {
        reference.push(d.rv);
        if (d.unixSeconds < earliest) earliest = d.unixSeconds;
      }
    }

    observations.push({
      unixSeconds: t,
      rvShort,
      rvRef: reference.length >= MIN_REFERENCE_OBSERVATIONS ? median(reference) : null,
      referenceObservations: reference.length,
      referenceCoverageSec: reference.length > 0 ? t - earliest : 0,
    });

    if (rvShort !== null) defined.push({ unixSeconds: t, rv: rvShort });
  }
  return observations;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

// ---------------------------------------------------------------------------
// The policy
// ---------------------------------------------------------------------------

export type VolatilityStatus = "TRIGGERED" | "NOT_TRIGGERED" | "INDETERMINATE";

export interface VolatilityTrigger {
  triggerAtUnixSeconds: number;
  rvShort: number;
  rvRef: number;
  ratio: number;
  recoveredAtUnixSeconds: number;
}

export interface VolatilityReferenceCoverage {
  /** Grid points sampled across the window. */
  gridPoints: number;
  /** Grid points at which `rv_short` could be estimated. */
  definedRvShortPoints: number;
  /** Grid points at which the trigger ratio was evaluable (reference present and positive). */
  evaluableRatioPoints: number;
  /** Grid points skipped because the reference median was exactly zero (ratio undefined). */
  zeroReferencePoints: number;
  /** Longest reference span actually available, seconds. */
  maxReferenceCoverageSec: number;
  /** That span as a fraction of the 86,400 s the pre-registration assumes. */
  maxReferenceCoverageRatio: number;
  /** Plain-language statement of what the coverage does and does not support. */
  note: string;
}

export interface VolatilityResult {
  policyId: typeof VOLATILITY_POLICY_ID;
  methodVersion: typeof VOLATILITY_METHOD_VERSION;
  k: K;
  status: VolatilityStatus;
  /** Why the status is what it is, in one machine-stable sentence. */
  statusReason: string;
  triggers: VolatilityTrigger[];
  /** `null` unless `status` is `TRIGGERED`. */
  firstTriggerUnixSeconds: number | null;
  coverage: VolatilityReferenceCoverage;
  /** Fee schedule the replay scorer applies. Empty when the policy never triggered. */
  episodes: FeeEpisode[];
}

/**
 * Runs the trigger at one `k`.
 *
 * Not exported as a public single-`k` entry point by design — `evaluateKGrid` is the public
 * surface, so a caller cannot publish one `k` without the other two.
 */
function evaluateAtK(
  input: VolatilityOnlyInput,
  k: K,
  envelope: FeeEnvelope,
  grid: readonly GridObservation[],
): VolatilityResult {
  const definedRvShortPoints = grid.filter((g) => g.rvShort !== null).length;
  const evaluablePoints = grid.filter((g) => g.rvShort !== null && g.rvRef !== null && g.rvRef > 0);
  const zeroReferencePoints = grid.filter((g) => g.rvShort !== null && g.rvRef !== null && g.rvRef === 0).length;
  const maxCoverage = grid.reduce((m, g) => Math.max(m, g.referenceCoverageSec), 0);

  const coverage: VolatilityReferenceCoverage = {
    gridPoints: grid.length,
    definedRvShortPoints,
    evaluableRatioPoints: evaluablePoints.length,
    zeroReferencePoints,
    maxReferenceCoverageSec: maxCoverage,
    maxReferenceCoverageRatio: maxCoverage / REFERENCE_WINDOW_SEC,
    note:
      `The pre-registration's reference statistic spans ${REFERENCE_WINDOW_SEC}s, but the frozen ` +
      `replay windows span 25,200s, so no scenario can supply a full 24-hour reference. The ` +
      `median here is taken over the ${maxCoverage}s that exist ` +
      `(${((maxCoverage / REFERENCE_WINDOW_SEC) * 100).toFixed(1)}% of the assumed span). This is a ` +
      `disclosed shortfall, not a re-specification: the alternative — refusing to estimate — would ` +
      `mark every scenario INDETERMINATE and silence the only competing policy in the benchmark.`,
  };

  const recovery = recoverySeconds(envelope);

  if (evaluablePoints.length === 0) {
    const reason =
      definedRvShortPoints === 0
        ? `No grid point had enough price observations to estimate rv_short: the window holds ` +
          `${input.pricePath.length} swap(s). This is a measured absence, not a decision not to act.`
        : `rv_short was estimable at ${definedRvShortPoints} grid point(s), but the trailing ` +
          `reference median was never both present and positive ` +
          `(${zeroReferencePoints} point(s) had a zero reference, where the ratio rv_short/rv_ref ` +
          `is undefined and any positive rv_short would trigger trivially).`;
    return {
      policyId: VOLATILITY_POLICY_ID,
      methodVersion: VOLATILITY_METHOD_VERSION,
      k,
      status: "INDETERMINATE",
      statusReason: reason,
      triggers: [],
      firstTriggerUnixSeconds: null,
      coverage,
      episodes: [],
    };
  }

  const triggers: VolatilityTrigger[] = [];
  let activeUntil = -Infinity;
  for (const point of evaluablePoints) {
    if (point.unixSeconds < activeUntil) continue; // still widened or decaying; no re-arming
    const rvShort = point.rvShort as number;
    const rvRef = point.rvRef as number;
    const ratio = rvShort / rvRef;
    if (ratio >= k) {
      const recoveredAt = point.unixSeconds + recovery;
      triggers.push({
        triggerAtUnixSeconds: point.unixSeconds,
        rvShort,
        rvRef,
        ratio,
        recoveredAtUnixSeconds: recoveredAt,
      });
      activeUntil = recoveredAt;
    }
  }

  const episodes: FeeEpisode[] = triggers.map((t) => ({
    triggerAtUnixSeconds: t.triggerAtUnixSeconds,
    recoveredAtUnixSeconds: t.recoveredAtUnixSeconds,
  }));

  return {
    policyId: VOLATILITY_POLICY_ID,
    methodVersion: VOLATILITY_METHOD_VERSION,
    k,
    status: triggers.length > 0 ? "TRIGGERED" : "NOT_TRIGGERED",
    statusReason:
      triggers.length > 0
        ? `rv_short reached ${triggers[0]?.ratio.toFixed(3)}x the trailing reference median at ` +
          `the first trigger, at or above k=${k}. ${triggers.length} episode(s) in the window.`
        : `The ratio rv_short/rv_ref was evaluable at ${evaluablePoints.length} grid point(s) and ` +
          `never reached k=${k}. This is a genuine non-trigger, distinct from INDETERMINATE.`,
    triggers,
    firstTriggerUnixSeconds: triggers.length > 0 ? (triggers[0] as VolatilityTrigger).triggerAtUnixSeconds : null,
    coverage,
    episodes,
  };
}

/**
 * Runs the whole `k` grid. The only public way to evaluate this policy.
 *
 * `assertMarketOnly` runs here rather than only at projection time so a caller who reached into
 * the input between construction and use is caught at the point of use.
 */
export function evaluateKGrid(input: VolatilityOnlyInput, envelope: FeeEnvelope): VolatilityResult[] {
  assertMarketOnly(input);
  const grid = buildGrid(input);
  return K_GRID.map((k) => evaluateAtK(input, k, envelope, grid));
}

/** The fee schedule a `VolatilityResult` implies. */
export function volatilityFeeSchedule(result: VolatilityResult, envelope: FeeEnvelope): FeeRatePipsAt {
  return (unixSeconds: number) => feeAtInstantPips(unixSeconds, result.episodes, envelope);
}
