import { COMPARISON, type ComparisonCell, type MetricBasisId } from "./artifacts";

export const COMPARISON_DOC = COMPARISON;

export const K_GRID = COMPARISON.method.kGrid;
export const DRAWDOWN_GRID = COMPARISON.method.minDrawdownBpsGrid;

export const SCENARIO_ROWS = COMPARISON.eventSelection.scenarios;

export const BASIS_ORDER: MetricBasisId[] = ["PRE_REGISTERED", "AMD_002_CONSISTENT"];

export const BASIS_LABEL: Record<MetricBasisId, string> = {
  PRE_REGISTERED: "Pre-registered basis",
  AMD_002_CONSISTENT: "AMD-002 basis (post-hoc)",
};

/**
 * One grid point, carrying both metric bases side by side.
 *
 * They are kept together deliberately. Every comparable cell flips its verdict
 * between the two, so a component that could render one without the other would
 * be able to pick a winner by choosing an arithmetic convention. Making the
 * pair the unit of data removes that option from the UI.
 */
export interface CellPair {
  scenarioId: string;
  k: number;
  minDrawdownBps: number;
  byBasis: Record<MetricBasisId, ComparisonCell | undefined>;
  /** True when the two bases disagree about who did better. */
  signFlips: boolean;
  comparable: boolean;
}

export function cellPair(
  scenarioId: string,
  k: number,
  minDrawdownBps: number,
): CellPair {
  const matches = COMPARISON.comparisonCells.filter(
    (cell) =>
      cell.scenarioId === scenarioId &&
      cell.k === k &&
      cell.minDrawdownBps === minDrawdownBps,
  );
  const byBasis = {
    PRE_REGISTERED: matches.find((cell) => cell.metricBasis === "PRE_REGISTERED"),
    AMD_002_CONSISTENT: matches.find((cell) => cell.metricBasis === "AMD_002_CONSISTENT"),
  };
  const pre = byBasis.PRE_REGISTERED;
  const amd = byBasis.AMD_002_CONSISTENT;
  const comparable = pre?.vsVolatilityOnly !== "NOT_COMPARABLE";
  return {
    scenarioId,
    k,
    minDrawdownBps,
    byBasis,
    comparable,
    signFlips:
      comparable &&
      pre !== undefined &&
      amd !== undefined &&
      pre.vsVolatilityOnly !== amd.vsVolatilityOnly,
  };
}

/** How many comparable cells flip sign between the two bases. */
export function signFlipCount(): { flipped: number; comparable: number } {
  let flipped = 0;
  let comparable = 0;
  for (const scenario of SCENARIO_ROWS) {
    for (const k of K_GRID) {
      for (const bps of DRAWDOWN_GRID) {
        const pair = cellPair(scenario.scenarioId, k, bps);
        if (!pair.comparable) continue;
        comparable += 1;
        if (pair.signFlips) flipped += 1;
      }
    }
  }
  return { flipped, comparable };
}

export function formatUsd(value: number | null): string {
  if (value === null) return "No economic row";
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export type { ComparisonCell, MetricBasisId };
