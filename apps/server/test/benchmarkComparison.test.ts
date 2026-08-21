/**
 * T5.3 / T5.4 — the three-policy comparison, AMD-002, and the claim gate.
 *
 * Two things this file exists to make impossible:
 *
 *   1. **Publishing a favourable subset.** T0.4 §8.5 forbids omitting a comparison in which
 *      `VOLATILITY_ONLY` matches or beats `TINJAU`. The cell count is pinned, and the verdict
 *      distribution is pinned on *both* metric bases — including the one on which Tinjau loses
 *      every comparable cell.
 *
 *   2. **A post-hoc metric opening the claim gate.** AMD-002 was derived after the baselines
 *      existed. `evaluateClaimGate` reads pre-registered cells only, and a test feeds it a
 *      doctored set in which the post-hoc basis would pass, to prove the exclusion is structural
 *      rather than incidental.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBenchmark } from "../src/benchmark/index.js";
import { buildComparisonCells, evaluateClaimGate, type ComparisonCell } from "../src/benchmark/compare.js";
import { computeMarkoutRows, PRIMARY_HORIZON_SEC, type Horizon } from "../src/benchmark/markout.js";
import { loadReplayInput, SCENARIO_IDS } from "../src/benchmark/replayInput.js";
import { artifactForDisk, ARTIFACT_PATH, emit } from "../src/benchmark/emit.js";

const ARTIFACT = runBenchmark();

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

test("every (scenario x policy x parameter) row and every comparison cell is present", () => {
  // 4 scenarios x (1 STATIC + 3 volatility k + 3 Tinjau thresholds).
  assert.equal(ARTIFACT.rows.length, 28);
  // 4 scenarios x 3 k x 3 thresholds x 2 metric bases.
  assert.equal(ARTIFACT.cells.length, 72);
  assert.equal(ARTIFACT.schemaVersion, "tinjau.three-policy-benchmark/1.0.0");
  assert.deepEqual([...new Set(ARTIFACT.rows.map((r) => r.policyId))].sort(), [
    "STATIC",
    "TINJAU",
    "VOLATILITY_ONLY",
  ]);
});

test("no favourable subset: the verdict distribution is pinned on BOTH metric bases", () => {
  const tally = (basis: string) => {
    const counts = new Map<string, number>();
    for (const c of ARTIFACT.cells.filter((x) => x.metricBasis === basis)) {
      const key = `${c.vsStatic}|${c.vsVolatilityOnly}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Object.fromEntries([...counts].sort());
  };

  assert.deepEqual(tally("PRE_REGISTERED"), {
    "NOT_COMPARABLE|NOT_COMPARABLE": 9,
    "TINJAU_TIES|TINJAU_BEATS": 27,
  });

  // The unflattering half, pinned with exactly the same prominence.
  assert.deepEqual(tally("AMD_002_CONSISTENT"), {
    "NOT_COMPARABLE|NOT_COMPARABLE": 9,
    "TINJAU_TIES|TINJAU_LOSES": 27,
  });
});

/**
 * The sign of the Tinjau-versus-volatility comparison is decided entirely by which fee basis the
 * metric uses, and neither basis is clean. 27 cells flip from `TINJAU_BEATS` to `TINJAU_LOSES` on
 * the same trades, the same triggers and the same fee schedules.
 *
 * This is the honest summary of what the benchmark can currently establish about markout: not
 * much. It is pinned as a test so it cannot quietly stop being said.
 */
test("the two metric bases give exactly opposite verdicts on the same data", () => {
  for (const pre of ARTIFACT.cells.filter((c) => c.metricBasis === "PRE_REGISTERED")) {
    const post = ARTIFACT.cells.find(
      (c) =>
        c.metricBasis === "AMD_002_CONSISTENT" &&
        c.scenarioId === pre.scenarioId &&
        c.k === pre.k &&
        c.minDrawdownBps === pre.minDrawdownBps,
    );
    assert.ok(post);
    if (pre.vsVolatilityOnly === "NOT_COMPARABLE") {
      assert.equal(post.vsVolatilityOnly, "NOT_COMPARABLE");
      continue;
    }
    assert.equal(pre.vsVolatilityOnly, "TINJAU_BEATS");
    assert.equal(post.vsVolatilityOnly, "TINJAU_LOSES");
  }
});

test("INDETERMINATE volatility rows are NOT_COMPARABLE, never scored as a Tinjau win", () => {
  const aCells = ARTIFACT.cells.filter((c) => c.scenarioId === "A-rumor-watch");
  assert.equal(aCells.length, 18);
  for (const cell of aCells) {
    assert.equal(cell.vsVolatilityOnly, "NOT_COMPARABLE");
    assert.equal(cell.volatilityStatus, "INDETERMINATE");
    assert.equal(cell.tinjauUsd, null);
  }
});

// ---------------------------------------------------------------------------
// AMD-002
// ---------------------------------------------------------------------------

test("AMD-002 is labelled post-hoc everywhere it appears, with its direction stated first", () => {
  const amendment = ARTIFACT.amendments.find((a) => a.id === "AMD-002");
  assert.ok(amendment);
  assert.match(amendment.summary, /POST-HOC/);
  assert.match(amendment.direction, /flatters every fee-raising policy/i);
  assert.match(amendment.claimGateEffect, /stays false/i);

  for (const row of ARTIFACT.rows) {
    if (row.economics === null) continue;
    const block = row.economics.amd002ConsistentBasis;
    assert.equal(block._amendment, "AMD-002");
    assert.equal(block._label, "POST_HOC_AMENDMENT");
    assert.equal(block._mayOpenClaimGate, false);
    assert.match(block._notPreRegistered, /never be described as pre-registered/);
    assert.match(block._direction, /STATED BEFORE THE VALUES/);
    assert.match(block._direction, /relocates it/);
  }

  // The per-swap column carries the label too, so a columnar consumer cannot lose it.
  const columns = ARTIFACT.rows.find((r) => r.economics !== null)?.economics?.perSwapColumns ?? [];
  assert.ok(columns.some((c) => c.name === "m3600LpConsistentUsd_AMD002_POST_HOC"));
});

test("the consistent basis differs from the frozen metric by exactly the fee uplift", () => {
  // The derivation, checked rather than trusted:
  //   M_h_LP_consistent = M_h_LP + (f_p - f_o) * |inputUSD|
  const input = loadReplayInput("B-confirmed-protect");
  const rows = computeMarkoutRows(input, () => 20_000);
  for (const row of rows.slice(0, 200)) {
    for (const h of [60, 3600] as Horizon[]) {
      assert.ok(
        Math.abs(row.mhLpConsistentUsd[h] - (row.mhLpUsd[h] + row.feeUpliftUsd)) < 1e-9,
        `block ${row.blockNumber} h=${h}`,
      );
    }
    assert.ok(
      Math.abs(row.feeUpliftUsd - (row.feeGrossUsd - row.observedFeeGrossUsd)) < 1e-9,
      "uplift must be the incremental gross fee",
    );
  }
});

test("the two bases coincide exactly for any policy sitting at the pool's own fee", () => {
  // STATIC and, on this event set, TINJAU. A non-zero difference there would mean the correction
  // was doing something other than restating the fee basis.
  for (const row of ARTIFACT.rows) {
    if (row.economics === null) continue;
    if (row.policyId === "VOLATILITY_ONLY" && row.policyBehaviour.triggerCount > 0) continue;
    assert.equal(
      row.economics.amd002ConsistentBasis.feeUpliftUsd.value,
      0,
      `${row.scenarioId} ${row.policyId}: uplift should be zero at the pool's own fee`,
    );
    assert.equal(
      row.economics.amd002ConsistentBasis.markoutPrimaryConsistentUsd.value,
      row.economics.markoutPrimaryUsd.value,
      `${row.scenarioId} ${row.policyId}`,
    );
  }
});

test("the correction is signed: it can only raise the markout of a fee-raising policy", () => {
  for (const row of ARTIFACT.rows) {
    if (row.economics === null) continue;
    const frozen = row.economics.markoutPrimaryUsd.value as number;
    const consistent = row.economics.amd002ConsistentBasis.markoutPrimaryConsistentUsd.value as number;
    assert.ok(
      consistent >= frozen - 1e-9,
      `${row.scenarioId} ${row.policyId}: the amendment must never lower a policy's markout`,
    );
  }
});

// ---------------------------------------------------------------------------
// The claim gate
// ---------------------------------------------------------------------------

test("canClaimLossAvoided is false, and records which condition failed", () => {
  const gate = ARTIFACT.claimGate;
  assert.equal(gate.value, false);
  assert.equal(gate.metricBasis, "PRE_REGISTERED");
  assert.deepEqual(gate.failedConditionIds, ["beats-both-at-every-k-and-threshold"]);

  const failed = gate.conditions.find((c) => c.id === "beats-both-at-every-k-and-threshold");
  assert.ok(failed);
  assert.equal(failed.passed, false);
  // Tinjau ties STATIC because it never leaves the base fee. A tie is not a win.
  assert.match(failed.detail, /27 TINJAU_TIES/);
  assert.match(failed.detail, /strictly greater/);

  // Condition 4 is a process fact and says so rather than pretending to be a check.
  const process = gate.conditions.find((c) => c.id === "thresholds-unmodified-after-results");
  assert.equal(process?.passed, null);
  assert.match(String(process?.detail), /PROCESS FACT, NOT A COMPUTATION/);
});

test("the claim gate structurally cannot read the post-hoc basis", () => {
  // Doctor the cells so the POST-HOC basis would sail through and the pre-registered one still
  // fails. If the gate ever read the wrong basis, this flips to true.
  const doctored: ComparisonCell[] = ARTIFACT.cells.map((c) =>
    c.metricBasis === "AMD_002_CONSISTENT" && c.vsStatic !== "NOT_COMPARABLE"
      ? { ...c, vsStatic: "TINJAU_BEATS", vsVolatilityOnly: "TINJAU_BEATS" }
      : c,
  );
  assert.equal(evaluateClaimGate(doctored).value, false);

  // And the converse, so the test is not vacuous: making the PRE_REGISTERED cells winners does
  // move condition 2.
  const preRegWins: ComparisonCell[] = ARTIFACT.cells.map((c) =>
    c.metricBasis === "PRE_REGISTERED" && c.vsStatic !== "NOT_COMPARABLE"
      ? { ...c, vsStatic: "TINJAU_BEATS", vsVolatilityOnly: "TINJAU_BEATS" }
      : c,
  );
  const moved = evaluateClaimGate(preRegWins).conditions.find(
    (c) => c.id === "beats-both-at-every-k-and-threshold",
  );
  assert.equal(moved?.passed, true);
});

test("a tie does not count as a win", () => {
  const cells = buildComparisonCells(ARTIFACT.rows);
  const ties = cells.filter((c) => c.vsStatic === "TINJAU_TIES");
  assert.ok(ties.length > 0, "this event set must contain ties, or the test proves nothing");
  for (const tie of ties) {
    assert.equal(tie.tinjauUsd, tie.staticUsd);
  }
  assert.equal(evaluateClaimGate(cells).value, false);
});

// ---------------------------------------------------------------------------
// Headline findings and the emitted artifact
// ---------------------------------------------------------------------------

test("the headline findings carry the unflattering results, not only the favourable one", () => {
  const findings = ARTIFACT.headlineFindings.join(" ");
  assert.match(findings, /does not promote to PROTECT on any of the four frozen scenarios/);
  assert.match(findings, /identical to STATIC rather than better than it/);
  assert.match(findings, /VOLATILITY_ONLY beats TINJAU on every economic scenario/);
  assert.match(findings, /canClaimLossAvoided is FALSE/);
  // Carried forward from T5.1/T5.2 rather than quietly dropped.
  assert.match(findings, /false positive at 2, 3 and 5/);
  assert.match(findings, /216 of 4,777 swaps/);
});

test("the counterfactual limitation still refuses the word 'conservative'", () => {
  assert.match(ARTIFACT.counterfactualLimitation, /NET SIGN IS UNDETERMINED/);
  assert.match(ARTIFACT.counterfactualLimitation, /may not be described as conservative/);
});

test("the emitted artifact is deterministic and keeps every derived figure", () => {
  const first = JSON.stringify(artifactForDisk(runBenchmark()));
  const second = JSON.stringify(artifactForDisk(runBenchmark()));
  assert.equal(first, second);

  emit();
  const onDisk = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as {
    rows: Array<{ economics: Record<string, unknown> | null }>;
    cells: unknown[];
    claimGate: { value: boolean };
  };
  assert.equal(onDisk.cells.length, 72);
  assert.equal(onDisk.claimGate.value, false);

  const economic = onDisk.rows.filter((r) => r.economics !== null);
  assert.equal(economic.length, 21, "three economic scenarios x seven policy rows");
  for (const row of economic) {
    const e = row.economics as Record<string, unknown>;
    assert.equal(e.perSwap, undefined, "per-swap rows are omitted from the file");
    assert.ok(e.perSwapOmittedFromFile, "and the omission is declared");
    // Everything derived from them survives.
    for (const key of [
      "distributionPrimaryUsd",
      "tailConcentration",
      "horizonCoverage",
      "amd002ConsistentBasis",
      "perSwapColumns",
    ]) {
      assert.ok(e[key], `${key} missing from the emitted artifact`);
    }
  }
});

test("the artifact path is under 05-build and not frontend-handoff", () => {
  assert.match(ARTIFACT_PATH, /outputs\/05-build\/three-policy-benchmark\.json$/);
  assert.doesNotMatch(ARTIFACT_PATH, /frontend-handoff/);
});

test("per-scenario comparison values are pinned", () => {
  const cell = (scenarioId: string, k: number, bps: number, basis: string) => {
    const found = ARTIFACT.cells.find(
      (c) =>
        c.scenarioId === scenarioId &&
        c.k === k &&
        c.minDrawdownBps === bps &&
        c.metricBasis === basis,
    );
    assert.ok(found, `${scenarioId} k=${k} bps=${bps} ${basis}`);
    return found;
  };

  const b = cell("B-confirmed-protect", 2, 200, "PRE_REGISTERED");
  assert.equal(b.staticUsd?.toFixed(4), "229.7785");
  assert.equal(b.volatilityOnlyUsd?.toFixed(4), "-2203.3704");
  assert.equal(b.tinjauUsd?.toFixed(4), "229.7785");

  const bPost = cell("B-confirmed-protect", 2, 200, "AMD_002_CONSISTENT");
  assert.equal(bPost.volatilityOnlyUsd?.toFixed(4), "7529.2252");
  assert.equal(bPost.tinjauUsd?.toFixed(4), "229.7785");

  const d = cell("D-neutral-normal", 5, 300, "PRE_REGISTERED");
  assert.equal(d.staticUsd?.toFixed(4), "15.3307");
  assert.equal(d.volatilityOnlyUsd?.toFixed(4), "-125.1586");
  assert.equal(d.tinjauUsd?.toFixed(4), "15.3307");
});

test("Tinjau's economics equal STATIC's on every scenario, at every threshold", () => {
  // The direct consequence of never promoting. Stated as an equality rather than left implicit,
  // because "Tinjau matched the do-nothing policy" is the result, not a rounding artefact.
  for (const id of SCENARIO_IDS) {
    const rows = ARTIFACT.rows.filter((r) => r.scenarioId === id);
    const staticRow = rows.find((r) => r.policyId === "STATIC");
    for (const tinjau of rows.filter((r) => r.policyId === "TINJAU")) {
      assert.equal(
        tinjau.economics?.markoutPrimaryUsd.value ?? null,
        staticRow?.economics?.markoutPrimaryUsd.value ?? null,
        `${id} @ ${tinjau.parameters.minDrawdownBps}`,
      );
      assert.equal(
        tinjau.economics?.feeRevenueGrossUsd.value ?? null,
        staticRow?.economics?.feeRevenueGrossUsd.value ?? null,
        `${id} @ ${tinjau.parameters.minDrawdownBps}`,
      );
    }
  }
  assert.equal(PRIMARY_HORIZON_SEC, 3600);
});
