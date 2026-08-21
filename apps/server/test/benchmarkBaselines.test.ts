/**
 * The T5.1 + T5.2 artifact as a whole: shape, markers, determinism, and the scope limit.
 *
 * The per-event rows are pinned to their measured values. Pinning them is what makes the
 * pre-registration enforceable rather than aspirational — if a later edit changes a threshold, an
 * estimator, or a window, these numbers move and the change is visible in a diff instead of being
 * absorbed into a headline.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { runBaselines, type BaselineArtifact } from "../src/benchmark/index.js";
import type { ScenarioPolicyRow } from "../src/benchmark/score.js";

const ARTIFACT = runBaselines();

function row(scenarioId: string, policyId: string, k?: number): ScenarioPolicyRow {
  const found = ARTIFACT.rows.find(
    (r) => r.scenarioId === scenarioId && r.policyId === policyId && r.parameters.k === k,
  );
  assert.ok(found, `no row for ${scenarioId}/${policyId}/k=${k}`);
  return found;
}

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

test("the artifact is versioned and covers all four scenarios at every parameter", () => {
  assert.equal(ARTIFACT.schemaVersion, "tinjau.benchmark-baselines/1.0.0");
  assert.deepEqual(ARTIFACT.producedByTasks, ["T5.1", "T5.2"]);
  assert.equal(ARTIFACT.preRegistration.schemaVersion, "tinjau.benchmark-preregistration/0.1.0");
  assert.equal(ARTIFACT.scenarios.length, 4);
  // T0.4 §8.5: "the artifact must contain a row for every (scenario, policy, k) triple that was
  // run". Four scenarios x (one STATIC + three volatility k values).
  assert.equal(ARTIFACT.rows.length, 16);
  for (const r of ARTIFACT.rows) {
    assert.equal(r.schemaVersion, "tinjau.benchmark-baseline-result/1.0.0");
  }
});

test("the result shape carries a parameter grid, not a single value per policy", () => {
  // Amendment AMD-001 extends grid discipline to Tinjau's own `minDrawdownBps` at 150/200/300.
  // T5.3 must be able to emit those rows into this shape without a schema change, so `parameters`
  // is a map. A fixed `k` field would have made the same mistake AMD-001 exists to correct.
  const volatility = row("D-neutral-normal", "VOLATILITY_ONLY", 2);
  assert.deepEqual(volatility.parameters, { k: 2 });
  assert.deepEqual(row("D-neutral-normal", "STATIC").parameters, {});

  const futureTinjauRow: Pick<ScenarioPolicyRow, "parameters"> = {
    parameters: { minDrawdownBps: 150 },
  };
  assert.deepEqual(futureTinjauRow.parameters, { minDrawdownBps: 150 });
});

test("every number in the artifact carries a unit and an OBSERVED/COUNTERFACTUAL marker", () => {
  const seen = { marked: 0, columns: 0 };

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`));
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;

    // A `Marked` value: value + unit + basis travelling together.
    if ("value" in record && "unit" in record && "basis" in record) {
      assert.ok(typeof record.unit === "string" && record.unit.length > 0, `${path}: empty unit`);
      assert.ok(
        record.basis === "OBSERVED" || record.basis === "COUNTERFACTUAL",
        `${path}: basis must be OBSERVED or COUNTERFACTUAL, got ${String(record.basis)}`,
      );
      assert.ok(
        record.value === null || typeof record.value === "number",
        `${path}: a marked value must be a number or an explicit null`,
      );
      if (record.value === null) {
        assert.ok(typeof record.note === "string" && record.note.length > 0, `${path}: null needs a reason`);
      }
      seen.marked++;
      return;
    }
    for (const [key, child] of Object.entries(record)) walk(child, `${path}.${key}`);
  };

  walk(ARTIFACT, "artifact");
  assert.ok(seen.marked > 100, `expected many marked values, saw ${seen.marked}`);

  // The columnar per-swap rows are marked once per column rather than once per cell.
  for (const r of ARTIFACT.rows) {
    if (r.economics === null) continue;
    seen.columns++;
    assert.equal(
      r.economics.perSwapColumns.length,
      r.economics.perSwap[0]?.length,
      `${r.scenarioId}: column descriptor and row width must agree`,
    );
    for (const column of r.economics.perSwapColumns) {
      assert.ok(column.unit.length > 0, `${r.scenarioId}: ${column.name} has no unit`);
      assert.ok(
        column.basis === "OBSERVED" || column.basis === "COUNTERFACTUAL",
        `${r.scenarioId}: ${column.name} has no basis`,
      );
    }
  }
  assert.equal(seen.columns, 12, "three economic scenarios x four policy rows");
});

test("fee revenue is OBSERVED only for STATIC, and markout is COUNTERFACTUAL throughout", () => {
  // T0.4 §7 exactly: feeRevenue is "counterfactual for every policy except STATIC", while
  // M_3600_LP carries no such exception. The asymmetry is the frozen table's, not this code's.
  for (const scenarioId of ["B-confirmed-protect", "C-two-origins-hard-case", "D-neutral-normal"]) {
    const staticRow = row(scenarioId, "STATIC");
    assert.equal(staticRow.economics?.feeRevenueGrossUsd.basis, "OBSERVED");
    assert.equal(staticRow.economics?.markoutPrimaryUsd.basis, "COUNTERFACTUAL");
    for (const k of [2, 3, 5]) {
      const vol = row(scenarioId, "VOLATILITY_ONLY", k);
      assert.equal(vol.economics?.feeRevenueGrossUsd.basis, "COUNTERFACTUAL");
      assert.equal(vol.economics?.markoutPrimaryUsd.basis, "COUNTERFACTUAL");
    }
  }
});

test("the counterfactual limitation travels with the numbers and refuses the word 'conservative'", () => {
  assert.match(ARTIFACT.counterfactualLimitation, /NET SIGN IS UNDETERMINED/);
  assert.match(ARTIFACT.counterfactualLimitation, /may not be described as conservative/);
  const feeNote = row("B-confirmed-protect", "VOLATILITY_ONLY", 2).economics?.feeRevenueGrossUsd.note;
  assert.match(String(feeNote), /Overstated/);
});

// ---------------------------------------------------------------------------
// Scope limit
// ---------------------------------------------------------------------------

test("the artifact contains no Tinjau row and no cross-policy comparison", () => {
  const policies = new Set(ARTIFACT.rows.map((r) => r.policyId));
  assert.deepEqual([...policies].sort(), ["STATIC", "VOLATILITY_ONLY"]);
  assert.match(ARTIFACT.scopeLimit, /No Tinjau row and no cross-policy comparison/);

  const forbidden = /(^|[^a-z])(vs|versus|delta|improvement|winner|beats|better|advantage|lossAvoided)/i;
  const walkKeys = (node: unknown, path: string): void => {
    if (Array.isArray(node)) return node.forEach((c, i) => walkKeys(c, `${path}[${i}]`));
    if (node === null || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      assert.doesNotMatch(key, forbidden, `${path}.${key} reads like a comparison`);
      walkKeys(child, `${path}.${key}`);
    }
  };
  walkKeys(ARTIFACT, "artifact");

  // False-positive cost is deliberately left uncosted: costing it means differencing two
  // policies' markout, which is T5.4's comparison, not T5.1/T5.2's.
  assert.equal(row("D-neutral-normal", "VOLATILITY_ONLY", 2).policyBehaviour.falsePositive.costUsd.value, null);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test("running the baselines twice produces byte-identical output", () => {
  assert.equal(JSON.stringify(runBaselines()), JSON.stringify(runBaselines()));
});

test("the fingerprint is stable, so a rerun is provably the same replay", () => {
  const again = runBaselines();
  for (let i = 0; i < ARTIFACT.scenarios.length; i++) {
    assert.equal(
      again.scenarios[i]?.replayInputFingerprint,
      ARTIFACT.scenarios[i]?.replayInputFingerprint,
    );
  }
});

// ---------------------------------------------------------------------------
// The per-event rows themselves
// ---------------------------------------------------------------------------

test("per-event rows: STATIC", () => {
  const expected: Record<string, { swaps: number; feeGross: string; m3600: string }> = {
    "B-confirmed-protect": { swaps: 4_145, feeGross: "339.0950", m3600: "229.7785" },
    "C-two-origins-hard-case": { swaps: 265, feeGross: "21.5106", m3600: "14.8909" },
    "D-neutral-normal": { swaps: 367, feeGross: "22.9443", m3600: "15.3307" },
  };
  for (const [scenarioId, want] of Object.entries(expected)) {
    const r = row(scenarioId, "STATIC");
    assert.equal(r.economics?.swapCount, want.swaps, scenarioId);
    assert.equal(r.economics?.feeRevenueGrossUsd.value?.toFixed(4), want.feeGross, scenarioId);
    assert.equal(r.economics?.markoutPrimaryUsd.value?.toFixed(4), want.m3600, scenarioId);
    assert.equal(r.policyBehaviour.triggerCount, 0);
    assert.equal(r.policyBehaviour.maxFeeReachedPips.value, 500);
    assert.equal(r.policyBehaviour.actionLatencySec.value, null);
  }
  assert.equal(row("A-rumor-watch", "STATIC").economics, null);
});

test("per-event rows: VOLATILITY_ONLY at every k", () => {
  const expected: Array<[string, number, string, number, number | null, string, string]> = [
    // scenario, k, status, triggers, actionLatencySec, feeGrossUsd, M_3600_LP
    // Scenario A has no economic row at all, so there is no figure to pin — `undefined` here is
    // the absence of the whole `economics` block, asserted directly just below.
    ["A-rumor-watch", 2, "INDETERMINATE", 0, null, "undefined", "undefined"],
    ["A-rumor-watch", 3, "INDETERMINATE", 0, null, "undefined", "undefined"],
    ["A-rumor-watch", 5, "INDETERMINATE", 0, null, "undefined", "undefined"],
    ["B-confirmed-protect", 2, "TRIGGERED", 1, -2_520, "10071.6906", "-2203.3704"],
    ["B-confirmed-protect", 3, "TRIGGERED", 1, -2_520, "10071.6906", "-2203.3704"],
    ["B-confirmed-protect", 5, "TRIGGERED", 1, -2_520, "10071.6906", "-2203.3704"],
    ["C-two-origins-hard-case", 2, "TRIGGERED", 2, -3_120, "641.5931", "-140.1297"],
    ["C-two-origins-hard-case", 3, "TRIGGERED", 1, 2_880, "473.7543", "-98.1700"],
    ["C-two-origins-hard-case", 5, "TRIGGERED", 1, 2_940, "427.2915", "-86.5543"],
    ["D-neutral-normal", 2, "TRIGGERED", 2, -3_000, "758.6653", "-168.5995"],
    ["D-neutral-normal", 3, "TRIGGERED", 1, 6_900, "409.1229", "-81.2139"],
    ["D-neutral-normal", 5, "TRIGGERED", 1, 19_680, "584.9017", "-125.1586"],
  ];

  for (const [scenarioId, k, status, triggers, latency, feeGross, m3600] of expected) {
    const r = row(scenarioId, "VOLATILITY_ONLY", k);
    const label = `${scenarioId} k=${k}`;
    assert.equal(r.policyBehaviour.status, status, label);
    assert.equal(r.policyBehaviour.triggerCount, triggers, label);
    assert.equal(r.policyBehaviour.actionLatencySec.value, latency, label);
    assert.equal(String(r.economics?.feeRevenueGrossUsd.value?.toFixed(4)), feeGross, label);
    assert.equal(String(r.economics?.markoutPrimaryUsd.value?.toFixed(4)), m3600, label);
  }
  for (const k of [2, 3, 5]) {
    assert.equal(row("A-rumor-watch", "VOLATILITY_ONLY", k).economics, null, `A k=${k}`);
  }
});

/**
 * The neutral control is the benchmark's false-positive probe. T3.2 measured scenario D (a routine
 * Form 4) at a 241 bps max drawdown against scenario B's 235 bps — the control moved more than the
 * material event — so a policy watching price alone was always liable to fire on it.
 *
 * This test records what actually happened, whatever it is. It is not an argument for anything:
 * the comparison that would turn it into one belongs to T5.4.
 */
test("the neutral control's false-positive label is recorded at every k", () => {
  for (const k of [2, 3, 5]) {
    const r = row("D-neutral-normal", "VOLATILITY_ONLY", k);
    assert.equal(r.policyBehaviour.falsePositive.label, "FALSE_POSITIVE", `k=${k}`);
    assert.match(r.policyBehaviour.falsePositive.reason, /mustHoldRegardlessOfMarketData=true/);
  }
  assert.equal(row("D-neutral-normal", "STATIC").policyBehaviour.falsePositive.label, "TRUE_NEGATIVE");

  // B and C stay unlabelled: B's pre-registration is conditional on market confirmation and C's is
  // explicitly undecided, so a label would be a judgement the freeze withholds.
  for (const scenarioId of ["B-confirmed-protect", "C-two-origins-hard-case"]) {
    assert.equal(row(scenarioId, "VOLATILITY_ONLY", 2).policyBehaviour.falsePositive.label, "NOT_DETERMINABLE");
    assert.equal(row(scenarioId, "VOLATILITY_ONLY", 2).policyBehaviour.falseNegative.label, "NOT_DETERMINABLE");
  }
});

test("distribution and tail concentration are reported, not just a mean", () => {
  const r = row("B-confirmed-protect", "STATIC");
  const dist = r.economics?.distributionPrimaryUsd;
  assert.ok(dist);
  assert.equal(dist.count, 4_145);
  for (const key of ["min", "p25", "median", "p75", "max", "mean", "sum"] as const) {
    assert.ok(typeof dist[key] === "number", `${key} missing`);
  }
  assert.match(dist.method, /type-7/);

  const tail = r.economics?.tailConcentration;
  assert.ok(tail);
  assert.ok(typeof tail.worstSwapUsd === "number");
  assert.ok(typeof tail.secondWorstSwapUsd === "number", "T0.4 §8.2 wants the two most extreme swaps");
  assert.equal(tail.worst5PctSwapCount, Math.ceil(4_145 * 0.05));
  assert.ok((tail.worstSwapUsd as number) <= (tail.secondWorstSwapUsd as number));
});

test("every horizon reports its coverage, so a collapsed horizon is visible", () => {
  const r = row("B-confirmed-protect", "STATIC");
  const coverage = r.economics?.horizonCoverage;
  assert.ok(coverage);
  for (const h of [60, 300, 900, 1800, 3600] as const) {
    assert.equal(coverage[h].ofSwaps, 4_145);
    assert.ok(coverage[h].swapsWithLaterTrade >= 0);
  }
  assert.ok(
    coverage[3600].swapsWithLaterTrade <= 4_145,
    "swaps near the window end have no later trade at 3600s; the count discloses it",
  );
});

test("the fee never leaves the frozen envelope on any swap of any row", () => {
  for (const r of ARTIFACT.rows) {
    if (r.economics === null) continue;
    const feeIndex = r.economics.perSwapColumns.findIndex((c) => c.name === "feePips");
    for (const swapRow of r.economics.perSwap) {
      const fee = swapRow[feeIndex] as number;
      assert.ok(fee >= 500 && fee <= 20_000, `${r.scenarioId}: fee ${fee} outside [500, 20000]`);
    }
  }
});

test("bps-of-TVL is null wherever no TVL measurement exists, and never silently zero", () => {
  for (const scenarioId of ["B-confirmed-protect", "C-two-origins-hard-case"]) {
    const r = row(scenarioId, "STATIC");
    assert.equal(r.economics?.markoutPrimaryBpsOfTvl.value, null, scenarioId);
    assert.match(String(r.economics?.markoutPrimaryBpsOfTvl.note), /archive block/);
  }
  const d = row("D-neutral-normal", "STATIC");
  assert.ok(typeof d.economics?.markoutPrimaryBpsOfTvl.value === "number");
});

test("the artifact is JSON-serialisable and self-describing", () => {
  const parsed = JSON.parse(JSON.stringify(ARTIFACT)) as BaselineArtifact;
  assert.equal(parsed.rows.length, 16);
  assert.equal(parsed.preRegistration.document, "docs/buildx-orion-2026/outputs/04-planning/t0-4-benchmark-preregistration.md");
});
