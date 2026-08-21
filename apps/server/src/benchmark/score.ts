/**
 * Scores one policy over one frozen scenario, and marks every number it emits (T0.4 §7, §8).
 *
 * T0.4 §7: "Every field in the published artifact carries an explicit `basis: OBSERVED |
 * COUNTERFACTUAL` marker. There is no unmarked number."
 *
 * Two shapes carry that marker here. Scenario-level metrics are `Marked` objects holding value,
 * unit and basis together, so the three can never be separated in transit. Per-swap rows are
 * columnar — thousands of repeated `{value, unit, basis}` wrappers would bloat the artifact
 * without adding information — and every column is described once in `perSwapColumns` with its
 * own name, unit and basis. That is the same convention the pool fixtures already use for their
 * `_columns` descriptor, so a reader meets one pattern rather than two.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 *
 * It computes no comparison between policies. Not a difference, not a ratio, not a winner. Rows
 * are produced independently and keyed by policy; T5.3 and T5.4 own the comparison, and they run
 * after T4.5. Producing a comparison before the Tinjau path exists would create exactly the
 * opportunity for result-driven choices the pre-registration exists to prevent.
 *
 * It also leaves `falsePositive.costUsd` null. Costing a false positive means differencing two
 * policies' markout, which is a comparison — T5.4's job, not this file's.
 */

import { computeMarkoutRows, HORIZONS_SEC, PRIMARY_HORIZON_SEC, type FeeRatePipsAt, type Horizon, type SwapMarkoutRow } from "./markout.js";
import { feeAtInstantPips, recoverySeconds, type FeeEpisode } from "./envelope.js";
import type { ReplayInput } from "./replayInput.js";

export const RESULT_SCHEMA_VERSION = "tinjau.benchmark-baseline-result/1.0.0";

export type Basis = "OBSERVED" | "COUNTERFACTUAL";

/** A number that carries its unit and its observed/counterfactual status. */
export interface Marked<TUnit extends string> {
  value: number | null;
  unit: TUnit;
  basis: Basis;
  /** Present when the value is null, or when the number needs a caveat to be read correctly. */
  note?: string;
}

function marked<TUnit extends string>(
  value: number | null,
  unit: TUnit,
  basis: Basis,
  note?: string,
): Marked<TUnit> {
  return note === undefined ? { value, unit, basis } : { value, unit, basis, note };
}

export interface ColumnDescriptor {
  name: string;
  unit: string;
  basis: Basis;
}

export type FalsePositiveLabel =
  | "FALSE_POSITIVE"
  | "TRUE_NEGATIVE"
  | "NOT_DETERMINABLE"
  | "NO_ECONOMIC_ROW";

export interface FalsePositiveAssessment {
  label: FalsePositiveLabel;
  fired: boolean;
  costUsd: Marked<"USD">;
  reason: string;
}

export interface DistributionStats {
  count: number;
  min: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  max: number | null;
  mean: number | null;
  sum: number | null;
  method: string;
}

export interface TailConcentration {
  /** Most negative single-swap `M_3600_LP` in the window, USD. */
  worstSwapUsd: number | null;
  worstSwapBlockNumber: number | null;
  worstSwapLogIndex: number | null;
  /** Second most negative, so the "two most extreme swaps" T0.4 §8.2 asks for are both present. */
  secondWorstSwapUsd: number | null;
  secondWorstSwapBlockNumber: number | null;
  secondWorstSwapLogIndex: number | null;
  /** Sum of the worst 5% of swaps by `M_3600_LP`, USD. */
  worst5PctUsd: number | null;
  worst5PctSwapCount: number;
  /** Worst swap's share of the window total. Null when the total is not negative. */
  worstSwapShareOfTotal: number | null;
  worst5PctShareOfTotal: number | null;
  note: string;
}

export interface ScenarioPolicyRow {
  schemaVersion: typeof RESULT_SCHEMA_VERSION;
  scenarioId: string;
  policyId: string;
  methodVersion: string;
  /**
   * Free-form parameter grid for this row.
   *
   * `{ k: 2 }` for the volatility baseline, `{}` for static. Deliberately a map rather than a
   * fixed field so T5.3 can carry Tinjau's `minDrawdownBps` grid (amendment AMD-001) in the same
   * shape without a schema change — a grid must be able to grow, because AMD-001 exists precisely
   * because a single value was going to be published where a grid belonged.
   */
  parameters: Record<string, number>;
  /** Identity proof that this row and every other row scored the same replay. */
  replayInputFingerprint: string;
  /** `null` when this scenario carries no economic row. */
  economics: EconomicRow | null;
  /** Present on every row, including ones with null economics. */
  policyBehaviour: PolicyBehaviourRow;
  notes: string[];
}

/**
 * The AMD-002 consistent-basis block.
 *
 * Kept in its own object, separate from the pre-registered figures, so a consumer cannot pick up a
 * post-hoc number believing it was frozen in advance. `_label` and `_direction` travel with the
 * values and are asserted by test.
 */
export interface Amd002Block {
  _amendment: "AMD-002";
  _label: "POST_HOC_AMENDMENT";
  _notPreRegistered: string;
  /** Direction of effect, stated before the values, per the amendment's own constraint. */
  _direction: string;
  _mayOpenClaimGate: false;
  /** Gross fee the pool ACTUALLY charged over the window, at its real 500 pips. */
  observedFeeRevenueGrossUsd: Marked<"USD">;
  /** `(policy fee - observed fee) * |inputUSD|`, summed. Zero for any policy at the pool's fee. */
  feeUpliftUsd: Marked<"USD">;
  markoutPrimaryConsistentUsd: Marked<"USD">;
  markoutPrimaryConsistentBpsOfNotional: Marked<"bps">;
  markoutPrimaryConsistentBpsOfTvl: Marked<"bps">;
  markoutByHorizonConsistentUsd: Record<Horizon, Marked<"USD">>;
  distributionPrimaryConsistentUsd: DistributionStats;
}

export interface EconomicRow {
  swapCount: number;
  rpcRangeErrors: number;
  totalNotionalUsd: Marked<"USD">;
  feeRevenueGrossUsd: Marked<"USD">;
  feeRevenueToLpUsd: Marked<"USD">;
  protocolHaircutUsd: Marked<"USD">;
  primaryHorizonSec: number;
  markoutM0Usd: Marked<"USD">;
  /** The **pre-registered** primary metric. The only one the claim gate may read. */
  markoutPrimaryUsd: Marked<"USD">;
  markoutPrimaryBpsOfNotional: Marked<"bps">;
  markoutPrimaryBpsOfTvl: Marked<"bps">;
  adverseSelectionPrimaryUsd: Marked<"USD">;
  /** Every horizon, so a reader can see where the number came from. */
  markoutByHorizonUsd: Record<Horizon, Marked<"USD">>;
  horizonCoverage: Record<Horizon, { swapsWithLaterTrade: number; ofSwaps: number }>;
  distributionPrimaryUsd: DistributionStats;
  tailConcentration: TailConcentration;
  tvlEventUsd: Marked<"USD">;
  /** Post-hoc, never pre-registered, never claim-gate eligible. See `markout.ts`. */
  amd002ConsistentBasis: Amd002Block;
  perSwapColumns: ColumnDescriptor[];
  /** Columnar per-swap rows, in `perSwapColumns` order. */
  perSwap: (number)[][];
}

export interface PolicyBehaviourRow {
  status: string;
  statusReason: string;
  actionLatencySec: Marked<"seconds">;
  maxFeeReachedPips: Marked<"pips">;
  protectionDurationSec: Marked<"seconds">;
  timeToDecaySec: Marked<"seconds">;
  triggerCount: number;
  episodes: FeeEpisode[];
  falsePositive: FalsePositiveAssessment;
  falseNegative: FalsePositiveAssessment;
}

export interface ScoreOptions {
  policyId: string;
  methodVersion: string;
  parameters: Record<string, number>;
  status: string;
  statusReason: string;
  episodes: readonly FeeEpisode[];
  feeAt: FeeRatePipsAt;
  /** How the frozen scenario pre-registered this event, used only for labelling after the fact. */
  materiality: MaterialityLabel;
  notes?: string[];
}

export interface MaterialityLabel {
  /** `true` when the frozen scenario says no aggressive protection is warranted, unconditionally. */
  aggressiveProtectionWarranted: boolean | null;
  reason: string;
}

const PER_SWAP_COLUMNS: ColumnDescriptor[] = [
  { name: "blockNumber", unit: "block", basis: "OBSERVED" },
  { name: "logIndex", unit: "index", basis: "OBSERVED" },
  { name: "unixSeconds", unit: "seconds", basis: "OBSERVED" },
  { name: "quoteDelta", unit: "USDG", basis: "OBSERVED" },
  { name: "baseDelta", unit: "wNVDAx", basis: "OBSERVED" },
  { name: "pricePost", unit: "quotePerBase", basis: "OBSERVED" },
  { name: "feePips", unit: "pips", basis: "COUNTERFACTUAL" },
  { name: "feeGrossUsd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "feeToLpUsd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "haircutUsd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "m0Usd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "m3600Usd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "m3600LpUsd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "m3600LpConsistentUsd_AMD002_POST_HOC", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "adverseSelection3600Usd", unit: "USD", basis: "COUNTERFACTUAL" },
  { name: "laterSwapCount3600", unit: "count", basis: "OBSERVED" },
];

/**
 * Builds one (scenario, policy, parameters) row.
 *
 * `basis` assignment follows T0.4 §7 literally, including one asymmetry the table contains:
 * `feeRevenue` is "counterfactual for every policy except `STATIC`", while `M_3600_LP` is marked
 * counterfactual with no exception. Under `STATIC` the markout is arguably as observed as the fee
 * revenue is — the fee rate used is the pool's real one — but the frozen table says
 * counterfactual, so counterfactual is what is emitted. Deviating would mean re-labelling a
 * published metric after the method was frozen. The discrepancy is recorded in
 * `t5-1-t5-2-baselines.md` §5 instead.
 */
export function scoreScenarioPolicy(input: ReplayInput, options: ScoreOptions): ScenarioPolicyRow {
  const isStatic = options.policyId === "STATIC";
  const feeBasis: Basis = isStatic ? "OBSERVED" : "COUNTERFACTUAL";

  const rows = computeMarkoutRows(input, options.feeAt);
  const behaviour = describeBehaviour(input, options, rows);

  if (rows.length === 0) {
    return {
      schemaVersion: RESULT_SCHEMA_VERSION,
      scenarioId: input.scenarioId,
      policyId: options.policyId,
      methodVersion: options.methodVersion,
      parameters: options.parameters,
      replayInputFingerprint: input.fingerprint,
      economics: null,
      policyBehaviour: behaviour,
      notes: [
        `No swap occurred in blocks ${input.window.fromBlock}-${input.window.toBlock} ` +
          `(${input.rpcRangeErrors} RPC range errors), so this scenario carries no economic row. ` +
          `T0.4 §3 requires it to be reported with null economics rather than dropped or imputed, ` +
          `and T0.2's deviation log forbids widening the window to reach liquidity.`,
        ...(options.notes ?? []),
      ],
    };
  }

  const totalNotional = sum(rows.map((r) => r.notionalUsd));
  const feeGross = sum(rows.map((r) => r.feeGrossUsd));
  const feeToLp = sum(rows.map((r) => r.feeToLpUsd));
  const haircut = sum(rows.map((r) => r.haircutUsd));
  const m0 = sum(rows.map((r) => r.m0Usd));
  const primary = sum(rows.map((r) => r.mhLpUsd[PRIMARY_HORIZON_SEC as Horizon]));
  const primaryGross = sum(rows.map((r) => r.mhUsd[PRIMARY_HORIZON_SEC as Horizon]));
  const adverse = primaryGross - m0;

  const perSwapPrimary = rows.map((r) => r.mhLpUsd[PRIMARY_HORIZON_SEC as Horizon]);
  const perSwapConsistent = rows.map((r) => r.mhLpConsistentUsd[PRIMARY_HORIZON_SEC as Horizon]);
  const tvl = input.tvlEvent.valueUsd;
  const observedFeeGross = sum(rows.map((r) => r.observedFeeGrossUsd));
  const feeUplift = sum(rows.map((r) => r.feeUpliftUsd));
  const consistent = sum(perSwapConsistent);

  const markoutByHorizonUsd = {} as Record<Horizon, Marked<"USD">>;
  const markoutByHorizonConsistentUsd = {} as Record<Horizon, Marked<"USD">>;
  const horizonCoverage = {} as Record<Horizon, { swapsWithLaterTrade: number; ofSwaps: number }>;
  for (const h of HORIZONS_SEC) {
    markoutByHorizonUsd[h] = marked(sum(rows.map((r) => r.mhLpUsd[h])), "USD", "COUNTERFACTUAL");
    markoutByHorizonConsistentUsd[h] = marked(
      sum(rows.map((r) => r.mhLpConsistentUsd[h])),
      "USD",
      "COUNTERFACTUAL",
    );
    horizonCoverage[h] = {
      swapsWithLaterTrade: rows.filter((r) => r.laterSwapCount[h] > 0).length,
      ofSwaps: rows.length,
    };
  }

  const amd002: Amd002Block = {
    _amendment: "AMD-002",
    _label: "POST_HOC_AMENDMENT",
    _notPreRegistered:
      "Derived after the baseline results existed. Every figure in this block is post-hoc and " +
      "must never be described as pre-registered. The pre-registered primary metric is " +
      "`markoutPrimaryUsd`, which stays exactly as frozen.",
    _direction:
      "STATED BEFORE THE VALUES: this basis is >= the pre-registered metric for any policy " +
      "charging at or above the pool's own 500 pips, so it FLATTERS EVERY FEE-RAISING POLICY, " +
      "Tinjau included. It does not remove T0.4 §5's counterfactual bias — it relocates it. The " +
      "frozen metric quarantined fee-raising upside in a separate column and mechanically " +
      "penalised fee-raising in the headline; this one pulls that upside into the headline and " +
      "mechanically rewards fee-raising. The truth is bracketed between the two.",
    _mayOpenClaimGate: false,
    observedFeeRevenueGrossUsd: marked(
      observedFeeGross,
      "USD",
      "OBSERVED",
      `The fee the pool really charged, at its live ${input.pool.feePips} pips.`,
    ),
    feeUpliftUsd: marked(
      feeUplift,
      "USD",
      "COUNTERFACTUAL",
      "Incremental gross fee this schedule would have charged over the pool's own. Assumes zero " +
        "flow elasticity, which T0.4 §5 records as false and unmeasured.",
    ),
    markoutPrimaryConsistentUsd: marked(consistent, "USD", "COUNTERFACTUAL"),
    markoutPrimaryConsistentBpsOfNotional: marked(
      totalNotional > 0 ? (consistent / totalNotional) * 10_000 : null,
      "bps",
      "COUNTERFACTUAL",
      totalNotional > 0 ? undefined : "Total notional is zero, so the ratio is undefined.",
    ),
    markoutPrimaryConsistentBpsOfTvl: marked(
      tvl !== null && tvl > 0 ? (consistent / tvl) * 10_000 : null,
      "bps",
      "COUNTERFACTUAL",
      tvl !== null && tvl > 0 ? undefined : input.tvlEvent.source,
    ),
    markoutByHorizonConsistentUsd,
    distributionPrimaryConsistentUsd: describeDistribution(perSwapConsistent),
  };

  const economics: EconomicRow = {
    swapCount: rows.length,
    rpcRangeErrors: input.rpcRangeErrors,
    totalNotionalUsd: marked(totalNotional, "USD", "OBSERVED"),
    feeRevenueGrossUsd: marked(
      feeGross,
      "USD",
      feeBasis,
      isStatic
        ? "STATIC charges the pool's actual live fee, so this reconciles with what the pool really charged."
        : "Overstated: T0.4 §5 — trades that a higher fee would have deterred still pay it in this replay.",
    ),
    feeRevenueToLpUsd: marked(feeToLp, "USD", feeBasis),
    protocolHaircutUsd: marked(haircut, "USD", feeBasis),
    primaryHorizonSec: PRIMARY_HORIZON_SEC,
    markoutM0Usd: marked(m0, "USD", "COUNTERFACTUAL", "Identical across policies: only the haircut differs (T0.4 §4)."),
    markoutPrimaryUsd: marked(primary, "USD", "COUNTERFACTUAL"),
    markoutPrimaryBpsOfNotional: marked(
      totalNotional > 0 ? (primary / totalNotional) * 10_000 : null,
      "bps",
      "COUNTERFACTUAL",
      totalNotional > 0 ? undefined : "Total notional is zero, so the ratio is undefined.",
    ),
    markoutPrimaryBpsOfTvl: marked(
      tvl !== null && tvl > 0 ? (primary / tvl) * 10_000 : null,
      "bps",
      "COUNTERFACTUAL",
      tvl !== null && tvl > 0 ? undefined : input.tvlEvent.source,
    ),
    adverseSelectionPrimaryUsd: marked(adverse, "USD", "COUNTERFACTUAL"),
    markoutByHorizonUsd,
    horizonCoverage,
    distributionPrimaryUsd: describeDistribution(perSwapPrimary),
    tailConcentration: describeTail(rows),
    tvlEventUsd: marked(tvl, "USD", "OBSERVED", input.tvlEvent.source),
    amd002ConsistentBasis: amd002,
    perSwapColumns: PER_SWAP_COLUMNS,
    perSwap: rows.map((r) => [
      r.blockNumber,
      r.logIndex,
      r.unixSeconds,
      r.quoteDelta,
      r.baseDelta,
      r.pricePost,
      r.feePips,
      r.feeGrossUsd,
      r.feeToLpUsd,
      r.haircutUsd,
      r.m0Usd,
      r.mhUsd[PRIMARY_HORIZON_SEC as Horizon],
      r.mhLpUsd[PRIMARY_HORIZON_SEC as Horizon],
      r.mhLpConsistentUsd[PRIMARY_HORIZON_SEC as Horizon],
      r.adverseSelectionUsd[PRIMARY_HORIZON_SEC as Horizon],
      r.laterSwapCount[PRIMARY_HORIZON_SEC as Horizon],
    ]),
  };

  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    scenarioId: input.scenarioId,
    policyId: options.policyId,
    methodVersion: options.methodVersion,
    parameters: options.parameters,
    replayInputFingerprint: input.fingerprint,
    economics,
    policyBehaviour: behaviour,
    notes: options.notes ?? [],
  };
}

function describeBehaviour(
  input: ReplayInput,
  options: ScoreOptions,
  rows: readonly SwapMarkoutRow[],
): PolicyBehaviourRow {
  const episodes = [...options.episodes];
  const fired = episodes.length > 0;
  const first = episodes[0] ?? null;
  const recovery = recoverySeconds(input.envelope);

  // Max fee actually reached inside the window, sampled on the same grid the fee schedule uses.
  let maxFee = input.envelope.baseFeePips;
  for (const episode of episodes) {
    const sampleAt = Math.min(episode.triggerAtUnixSeconds, input.window.toUnixSeconds);
    maxFee = Math.max(maxFee, feeAtInstantPips(sampleAt, episodes, input.envelope));
  }
  if (rows.length > 0) {
    for (const r of rows) maxFee = Math.max(maxFee, r.feePips);
  }

  const protectionDuration = episodes.reduce((total, e) => {
    const start = Math.max(e.triggerAtUnixSeconds, input.window.fromUnixSeconds);
    const end = Math.min(e.recoveredAtUnixSeconds, input.window.toUnixSeconds);
    return total + Math.max(0, end - start);
  }, 0);

  const recoveredInsideWindow =
    first !== null && first.recoveredAtUnixSeconds <= input.window.toUnixSeconds;

  const warranted = options.materiality.aggressiveProtectionWarranted;
  const hasEconomics = rows.length > 0;

  const falsePositive: FalsePositiveAssessment = {
    label: !hasEconomics
      ? "NO_ECONOMIC_ROW"
      : warranted === null
        ? "NOT_DETERMINABLE"
        : warranted === false
          ? fired
            ? "FALSE_POSITIVE"
            : "TRUE_NEGATIVE"
          : "NOT_DETERMINABLE",
    fired,
    costUsd: marked(
      null,
      "USD",
      "COUNTERFACTUAL",
      "Costing a false positive requires differencing two policies' markout, which is a " +
        "cross-policy comparison. T5.4 owns that; T5.1/T5.2 stop at the per-event rows.",
    ),
    reason: options.materiality.reason,
  };

  const falseNegative: FalsePositiveAssessment = {
    label: !hasEconomics
      ? "NO_ECONOMIC_ROW"
      : warranted === true
        ? fired
          ? "TRUE_NEGATIVE"
          : "FALSE_POSITIVE"
        : "NOT_DETERMINABLE",
    fired,
    costUsd: marked(null, "USD", "COUNTERFACTUAL", "See falsePositive.costUsd."),
    reason:
      warranted === true
        ? options.materiality.reason
        : "The frozen scenario does not unconditionally assert that aggressive protection was " +
          "warranted here, so a missed trigger cannot be labelled a false negative without a " +
          "judgement the pre-registration does not supply.",
  };

  return {
    status: options.status,
    statusReason: options.statusReason,
    actionLatencySec: marked(
      first === null ? null : first.triggerAtUnixSeconds - input.anchor.unixSeconds,
      "seconds",
      "COUNTERFACTUAL",
      first === null
        ? "No fee change occurred in this window."
        : "Measured from the evidence anchor to the fee change. Negative means the policy fired " +
          "before the event, on pre-anchor price behaviour. The anchor is supplied by the scoring " +
          "layer after the policy returned; the policy itself never sees it.",
    ),
    maxFeeReachedPips: marked(maxFee, "pips", fired ? "COUNTERFACTUAL" : "OBSERVED"),
    protectionDurationSec: marked(
      protectionDuration,
      "seconds",
      "COUNTERFACTUAL",
      fired ? "Clipped to the replay window." : "No protection ran in this window.",
    ),
    timeToDecaySec: marked(
      first === null ? null : recoveredInsideWindow ? recovery : null,
      "seconds",
      "COUNTERFACTUAL",
      first === null
        ? "No protection ran."
        : recoveredInsideWindow
          ? "Trigger to full recovery at the base fee, per the deployed widen-and-decay curve."
          : `The replay window ends before the ${recovery}s recovery completes, so the observed ` +
            `decay time is truncated rather than measured.`,
    ),
    triggerCount: episodes.length,
    episodes,
    falsePositive,
    falseNegative,
  };
}

function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Min / p25 / median / p75 / max, plus mean and sum.
 *
 * T0.4 §8.2 forbids reporting a mean alone. The mean is present but never on its own, and the
 * quantile method is stated because "median" over an even-length sample is not one thing.
 */
export function describeDistribution(values: readonly number[]): DistributionStats {
  const method =
    "Linear interpolation between order statistics (the R type-7 / numpy default). Stated " +
    "because p25 and the median of an even-length sample are method-dependent.";
  if (values.length === 0) {
    return { count: 0, min: null, p25: null, median: null, p75: null, max: null, mean: null, sum: null, method };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const total = sum(sorted);
  return {
    count: sorted.length,
    min: sorted[0] as number,
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1] as number,
    mean: total / sorted.length,
    sum: total,
    method,
  };
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 1) return sorted[0] as number;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const lower = sorted[lo] as number;
  const upper = sorted[hi] as number;
  return lo === hi ? lower : lower + (upper - lower) * (pos - lo);
}

/**
 * Tail concentration per T0.4 §8.3: how much of the total comes from the single worst swap and
 * from the worst 5%.
 *
 * A share is only meaningful when the total is a loss. When the window's total markout is zero or
 * positive, dividing a negative tail by it produces a number that looks like a percentage and is
 * not one, so the share is `null` with the reason attached and the raw dollar figures stand alone.
 */
export function describeTail(rows: readonly SwapMarkoutRow[]): TailConcentration {
  const h = PRIMARY_HORIZON_SEC as Horizon;
  const emptyNote = "No swaps, so no tail exists.";
  if (rows.length === 0) {
    return {
      worstSwapUsd: null,
      worstSwapBlockNumber: null,
      worstSwapLogIndex: null,
      secondWorstSwapUsd: null,
      secondWorstSwapBlockNumber: null,
      secondWorstSwapLogIndex: null,
      worst5PctUsd: null,
      worst5PctSwapCount: 0,
      worstSwapShareOfTotal: null,
      worst5PctShareOfTotal: null,
      note: emptyNote,
    };
  }

  const ordered = [...rows].sort((a, b) => a.mhLpUsd[h] - b.mhLpUsd[h]);
  const total = sum(rows.map((r) => r.mhLpUsd[h]));
  const worst = ordered[0] as SwapMarkoutRow;
  const second = ordered.length > 1 ? (ordered[1] as SwapMarkoutRow) : null;
  const tailCount = Math.max(1, Math.ceil(ordered.length * 0.05));
  const tailSum = sum(ordered.slice(0, tailCount).map((r) => r.mhLpUsd[h]));

  const shareable = total < 0;
  const shareNote = shareable
    ? "Shares are of the window's total markout, which is a net loss."
    : "The window's total markout is not negative, so a 'share of total' would not be a " +
      "percentage of a loss. Shares are null; the dollar figures stand on their own.";

  return {
    worstSwapUsd: worst.mhLpUsd[h],
    worstSwapBlockNumber: worst.blockNumber,
    worstSwapLogIndex: worst.logIndex,
    secondWorstSwapUsd: second === null ? null : second.mhLpUsd[h],
    secondWorstSwapBlockNumber: second === null ? null : second.blockNumber,
    secondWorstSwapLogIndex: second === null ? null : second.logIndex,
    worst5PctUsd: tailSum,
    worst5PctSwapCount: tailCount,
    worstSwapShareOfTotal: shareable ? worst.mhLpUsd[h] / total : null,
    worst5PctShareOfTotal: shareable ? tailSum / total : null,
    note: shareNote,
  };
}
