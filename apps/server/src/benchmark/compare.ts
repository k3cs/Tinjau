/**
 * The three-policy comparison and the claim gate (tasks T5.3 / T5.4, T0.4 §8).
 *
 * WHY THIS FILE EXISTS ONLY NOW
 *
 * T5.1 and T5.2 deliberately produced no comparison. This file was written after both baselines
 * were frozen, both open method questions were settled, and AMD-002 was recorded — so no
 * implementation choice in the policies could have been steered by a comparison that did not yet
 * exist. The sequence is the evidence; the code cannot demonstrate it on its own.
 *
 * RULES THIS FILE ENFORCES
 *
 * 1. **Every cell is published.** T0.4 §8.5 forbids omitting a comparison in which
 *    `VOLATILITY_ONLY` matches or beats `TINJAU`. `cells` contains one entry for every
 *    (scenario × k × minDrawdownBps × metric basis) combination that was run — 4 × 3 × 3 × 2 = 72 —
 *    and a test asserts the count, so a favourable subset cannot be published as the whole.
 *
 * 2. **"Beats" means strictly greater.** A tie is not a win. This matters here: Tinjau never
 *    promotes on the frozen event set, so its fee schedule is identical to `STATIC`'s and its
 *    markout ties rather than beats.
 *
 * 3. **The claim gate reads the pre-registered metric only.** AMD-002's consistent-basis figures
 *    appear in `cells` for disclosure and are structurally excluded from `evaluateClaimGate`. A
 *    metric derived after seeing results cannot be allowed to authorise a claim, or the
 *    pre-registration is decorative.
 */

import type { ScenarioPolicyRow } from "./score.js";
import { K_GRID, type K } from "./volatilityPolicy.js";
import { MIN_DRAWDOWN_BPS_GRID, type MinDrawdownBps } from "./tinjauPolicy.js";

export const COMPARISON_SCHEMA_VERSION = "tinjau.benchmark-comparison/1.0.0";

/** Which metric a cell is computed on. The gate may only read `PRE_REGISTERED`. */
export type MetricBasis = "PRE_REGISTERED" | "AMD_002_CONSISTENT";

export type CellVerdict =
  | "TINJAU_BEATS"
  | "TINJAU_TIES"
  | "TINJAU_LOSES"
  | "NOT_COMPARABLE";

export interface ComparisonCell {
  scenarioId: string;
  k: K;
  minDrawdownBps: MinDrawdownBps;
  metric: "M_3600_LP";
  metricBasis: MetricBasis;
  unit: "USD";
  basis: "COUNTERFACTUAL";
  staticUsd: number | null;
  volatilityOnlyUsd: number | null;
  tinjauUsd: number | null;
  volatilityStatus: string;
  tinjauState: string;
  /** Strictly greater, per rule 2 above. `null` when either side has no economic row. */
  vsStatic: CellVerdict;
  vsVolatilityOnly: CellVerdict;
  note: string;
}

export interface ClaimGateCondition {
  id: string;
  text: string;
  /** `null` where the condition is a process fact rather than a computation. */
  passed: boolean | null;
  detail: string;
}

export interface ClaimGate {
  field: "canClaimLossAvoided";
  value: false | true;
  metricBasis: "PRE_REGISTERED";
  _amd002Excluded: string;
  conditions: ClaimGateCondition[];
  failedConditionIds: string[];
  summary: string;
}

function markout(row: ScenarioPolicyRow | undefined, metricBasis: MetricBasis): number | null {
  if (row === undefined || row.economics === null) return null;
  return metricBasis === "PRE_REGISTERED"
    ? row.economics.markoutPrimaryUsd.value
    : row.economics.amd002ConsistentBasis.markoutPrimaryConsistentUsd.value;
}

function verdict(tinjau: number | null, other: number | null, comparable: boolean): CellVerdict {
  if (!comparable || tinjau === null || other === null) return "NOT_COMPARABLE";
  if (tinjau > other) return "TINJAU_BEATS";
  if (tinjau === other) return "TINJAU_TIES";
  return "TINJAU_LOSES";
}

/**
 * Builds every comparison cell.
 *
 * A cell is `NOT_COMPARABLE` when the scenario carries no economic row, or when the volatility
 * baseline returned `INDETERMINATE` for that window. T0.4 §6.2 is explicit that
 * `INDETERMINATE` and "did not trigger" are different findings, so scoring an `INDETERMINATE`
 * row as a Tinjau win would manufacture a victory out of missing data.
 */
export function buildComparisonCells(rows: readonly ScenarioPolicyRow[]): ComparisonCell[] {
  const scenarioIds = [...new Set(rows.map((r) => r.scenarioId))];
  const cells: ComparisonCell[] = [];

  for (const scenarioId of scenarioIds) {
    const inScenario = rows.filter((r) => r.scenarioId === scenarioId);
    const staticRow = inScenario.find((r) => r.policyId === "STATIC");
    const hasEconomics = staticRow?.economics !== null && staticRow !== undefined;

    for (const k of K_GRID) {
      const volRow = inScenario.find(
        (r) => r.policyId === "VOLATILITY_ONLY" && r.parameters.k === k,
      );
      const volIndeterminate = volRow?.policyBehaviour.status === "INDETERMINATE";

      for (const bps of MIN_DRAWDOWN_BPS_GRID) {
        const tinjauRow = inScenario.find(
          (r) => r.policyId === "TINJAU" && r.parameters.minDrawdownBps === bps,
        );

        for (const metricBasis of ["PRE_REGISTERED", "AMD_002_CONSISTENT"] as MetricBasis[]) {
          const s = markout(staticRow, metricBasis);
          const v = markout(volRow, metricBasis);
          const t = markout(tinjauRow, metricBasis);
          const comparable = hasEconomics && !volIndeterminate;

          cells.push({
            scenarioId,
            k,
            minDrawdownBps: bps,
            metric: "M_3600_LP",
            metricBasis,
            unit: "USD",
            basis: "COUNTERFACTUAL",
            staticUsd: s,
            volatilityOnlyUsd: v,
            tinjauUsd: t,
            volatilityStatus: volRow?.policyBehaviour.status ?? "MISSING",
            tinjauState: tinjauRow?.policyBehaviour.status ?? "MISSING",
            vsStatic: verdict(t, s, hasEconomics),
            vsVolatilityOnly: verdict(t, v, comparable),
            note: !hasEconomics
              ? "Scenario carries no economic row (zero swaps in the frozen window), so no " +
                "economic comparison exists. Reported, never dropped or imputed."
              : volIndeterminate
                ? "The volatility baseline is INDETERMINATE for this window, which T0.4 §6.2 " +
                  "distinguishes from 'did not trigger'. Scoring it as a Tinjau win would " +
                  "manufacture a victory out of missing data."
                : metricBasis === "AMD_002_CONSISTENT"
                  ? "POST-HOC AMD-002 basis. Flatters every fee-raising policy. Excluded from " +
                    "the claim gate by construction."
                  : "Pre-registered basis. This is the only basis the claim gate reads.",
          });
        }
      }
    }
  }
  return cells;
}

/**
 * Evaluates T0.4 §8.6's four conditions, as tightened by AMD-001.
 *
 * Reads `PRE_REGISTERED` cells only. Condition 4 is a process fact rather than a computation and
 * is reported as such rather than being dressed up as a machine check.
 */
export function evaluateClaimGate(cells: readonly ComparisonCell[]): ClaimGate {
  const preReg = cells.filter((c) => c.metricBasis === "PRE_REGISTERED");
  const economic = preReg.filter((c) => c.vsStatic !== "NOT_COMPARABLE");
  const scenariosWithEconomics = [...new Set(economic.map((c) => c.scenarioId))];

  const c1: ClaimGateCondition = {
    id: "non-null-economic-row",
    text: "the scenario has a non-null economic row",
    passed: scenariosWithEconomics.length > 0,
    detail:
      `${scenariosWithEconomics.length} of ${new Set(preReg.map((c) => c.scenarioId)).size} ` +
      `scenarios carry an economic row (${scenariosWithEconomics.join(", ") || "none"}). ` +
      `Scenario A's frozen window contains zero swaps.`,
  };

  const comparable = preReg.filter(
    (c) => c.vsStatic !== "NOT_COMPARABLE" && c.vsVolatilityOnly !== "NOT_COMPARABLE",
  );
  const beatsAll =
    comparable.length > 0 &&
    comparable.every((c) => c.vsStatic === "TINJAU_BEATS" && c.vsVolatilityOnly === "TINJAU_BEATS");
  const failing = comparable.filter(
    (c) => c.vsStatic !== "TINJAU_BEATS" || c.vsVolatilityOnly !== "TINJAU_BEATS",
  );

  const c2: ClaimGateCondition = {
    id: "beats-both-at-every-k-and-threshold",
    text:
      "TINJAU beats both STATIC and VOLATILITY_ONLY at every k on the primary metric M_3600_LP, " +
      "and (AMD-001) at every minDrawdownBps in the grid",
    passed: beatsAll,
    detail: beatsAll
      ? `All ${comparable.length} comparable cells are TINJAU_BEATS on both comparators.`
      : `${failing.length} of ${comparable.length} comparable cells are not a win on both ` +
        `comparators. Against STATIC: ` +
        summarise(failing.map((c) => c.vsStatic)) +
        `. Against VOLATILITY_ONLY: ` +
        summarise(failing.map((c) => c.vsVolatilityOnly)) +
        `. "Beats" is strictly greater; a tie is not a win.`,
  };

  // Condition 3 only becomes meaningful once condition 2 holds — a margin over a comparator you
  // did not beat is not a margin. Reported as such rather than silently passing.
  const spreads = spreadByScenario(preReg);
  const c3: ClaimGateCondition = {
    id: "margin-exceeds-k-spread",
    text:
      "the margin exceeds the spread between the best and worst k for VOLATILITY_ONLY, so the " +
      "win is not smaller than the noise from an arbitrary threshold choice",
    passed: beatsAll ? marginExceedsSpread(preReg) : null,
    detail: beatsAll
      ? `Evaluated against the per-scenario k spread: ${describeSpreads(spreads)}.`
      : `Not evaluable: condition 2 failed, so there is no margin to measure. The per-scenario ` +
        `k spread for VOLATILITY_ONLY is ${describeSpreads(spreads)}, recorded for disclosure.`,
  };

  const c4: ClaimGateCondition = {
    id: "thresholds-unmodified-after-results",
    text: "the frozen threshold configuration was not modified after any result was seen",
    passed: null,
    detail:
      "PROCESS FACT, NOT A COMPUTATION — reported as unverifiable by code rather than dressed up " +
      "as a machine check. What can be stated: the promotion and confirmation configs are the " +
      "frozen T1.2/T3.3 versions recorded in every TINJAU row's `ruleVersions`; the only value " +
      "varied is `minDrawdownBps`, and that grid (150/200/300) was recorded as amendment AMD-001 " +
      "before any T5 result existed. AMD-002 added a metric, not a threshold, and is excluded " +
      "from this gate.",
  };

  const conditions = [c1, c2, c3, c4];
  const failed = conditions.filter((c) => c.passed === false).map((c) => c.id);

  return {
    field: "canClaimLossAvoided",
    value: conditions.every((c) => c.passed === true),
    metricBasis: "PRE_REGISTERED",
    _amd002Excluded:
      "AMD-002's consistent-basis metric is post-hoc and is structurally excluded from this gate. " +
      "A metric derived after seeing results cannot authorise a claim.",
    conditions,
    failedConditionIds: failed,
    summary:
      failed.length === 0 && conditions.every((c) => c.passed === true)
        ? "All conditions hold."
        : `canClaimLossAvoided is FALSE. Failed: ${failed.join(", ") || "none outright, but at " +
            "least one condition is not machine-verifiable"}. The loss-reduction claim stays ` +
          `disabled, per tracker §1's claim gate.`,
  };
}

function summarise(verdicts: readonly CellVerdict[]): string {
  const counts = new Map<CellVerdict, number>();
  for (const v of verdicts) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].map(([v, n]) => `${n} ${v}`).join(", ") || "none";
}

function spreadByScenario(cells: readonly ComparisonCell[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  for (const scenarioId of new Set(cells.map((c) => c.scenarioId))) {
    const values = cells
      .filter((c) => c.scenarioId === scenarioId && c.volatilityOnlyUsd !== null)
      .map((c) => c.volatilityOnlyUsd as number);
    out.set(scenarioId, values.length === 0 ? null : Math.max(...values) - Math.min(...values));
  }
  return out;
}

function describeSpreads(spreads: Map<string, number | null>): string {
  return [...spreads.entries()]
    .map(([id, s]) => `${id}: ${s === null ? "n/a" : `$${s.toFixed(4)}`}`)
    .join("; ");
}

function marginExceedsSpread(cells: readonly ComparisonCell[]): boolean {
  const spreads = spreadByScenario(cells);
  for (const cell of cells) {
    if (cell.vsVolatilityOnly === "NOT_COMPARABLE") continue;
    const spread = spreads.get(cell.scenarioId);
    if (spread === null || spread === undefined) continue;
    const margin = (cell.tinjauUsd as number) - (cell.volatilityOnlyUsd as number);
    if (!(margin > spread)) return false;
  }
  return true;
}
