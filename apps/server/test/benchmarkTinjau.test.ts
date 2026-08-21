/**
 * T5.3 — the Tinjau arm.
 *
 * The two properties that make this arm trustworthy are both here:
 *
 *   1. It measures the REAL engine. `evaluateTinjau` at the frozen 200 bps must reproduce
 *      `decision/scenarioRunner.runScenario`'s own `Decision` field for field. If the production
 *      runner changes, this fails — so the benchmark cannot drift into measuring a private
 *      reimplementation of Tinjau while reporting it as the product.
 *
 *   2. It shares the baselines' envelope. `decision/envelope.decayedFee` (the mirror of
 *      `TinjauRiskPolicy.decayedFee`) and the benchmark's own `feeAtInstantPips` are proven to be
 *      the same curve at the frozen envelope, so "same ceiling, same widen and decay" is checked
 *      rather than asserted.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { blockToUnixSeconds, type SwapWindowFixture } from "../src/market/poolTelemetry.js";
import {
  decayedFee,
  FROZEN_ACTION_ENVELOPE,
  runScenario,
  targetFeeForConfidence,
  type FrozenScenario,
} from "../src/decision/index.js";
import { feeAtInstantPips, frozenEnvelope, recoverySeconds } from "../src/benchmark/envelope.js";
import { loadReplayInput, SCENARIO_IDS, type ScenarioId } from "../src/benchmark/replayInput.js";
import {
  evaluateDrawdownGrid,
  evaluateTinjau,
  MIN_DRAWDOWN_BPS_GRID,
  tinjauFeeSchedule,
  toResult,
  type MinDrawdownBps,
} from "../src/benchmark/tinjauPolicy.js";
import { computeMarkoutRows } from "../src/benchmark/markout.js";
import { runBenchmark } from "../src/benchmark/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(HERE, "..", "scenarios");
const FIXTURES_DIR = join(HERE, "..", "src", "market", "fixtures");

const SCENARIO_FILES: Record<ScenarioId, [string, string]> = {
  "A-rumor-watch": ["scenario-a-rumor-watch.json", "pool-scenario-a-swaps.json"],
  "B-confirmed-protect": ["scenario-b-confirmed-protect.json", "pool-scenario-b-swaps.json"],
  "C-two-origins-hard-case": ["scenario-c-two-origins-hard-case.json", "pool-scenario-c-swaps.json"],
  "D-neutral-normal": ["scenario-d-neutral-normal.json", "pool-scenario-d-swaps.json"],
};

function load(id: ScenarioId): { scenario: FrozenScenario; window: SwapWindowFixture } {
  const [sf, pf] = SCENARIO_FILES[id];
  return {
    scenario: JSON.parse(readFileSync(join(SCENARIOS_DIR, sf), "utf8")) as FrozenScenario,
    window: JSON.parse(readFileSync(join(FIXTURES_DIR, pf), "utf8")) as SwapWindowFixture,
  };
}

// ---------------------------------------------------------------------------
// 1. It is the real engine
// ---------------------------------------------------------------------------

test("at the frozen 200 bps the benchmark arm reproduces runScenario's Decision exactly", () => {
  for (const id of SCENARIO_IDS) {
    const { scenario, window } = load(id);
    const production = runScenario(scenario, window);
    const expected = toResult(production, 200, blockToUnixSeconds(window.toBlock));
    const actual = evaluateTinjau(id, 200);
    assert.deepEqual(
      actual,
      expected,
      `${id}: the benchmark's wiring has drifted from decision/scenarioRunner.ts. The benchmark ` +
        `must measure the product, not a copy of it.`,
    );
  }
});

test("the decision carries the frozen rule versions, per T0.4 §6.3 binding rule 3", () => {
  const result = evaluateTinjau("B-confirmed-protect", 200);
  assert.equal(result.ruleVersions.minDrawdownBps, 200);
  for (const key of ["schema", "policy", "confirmation", "evidenceCommitment", "assessmentId"] as const) {
    assert.ok(
      typeof result.ruleVersions[key] === "string" && result.ruleVersions[key].length > 0,
      `${key} version missing`,
    );
  }
  assert.match(result.ruleVersions.confirmation, /tinjau\.confirm/);
});

// ---------------------------------------------------------------------------
// 2. Same envelope as the baselines
// ---------------------------------------------------------------------------

test("Tinjau's deployed decay curve and the benchmark's are the same function", () => {
  const benchEnv = frozenEnvelope();
  assert.equal(benchEnv.baseFeePips, FROZEN_ACTION_ENVELOPE.baseFee);
  assert.equal(benchEnv.maxFeePips, FROZEN_ACTION_ENVELOPE.maxFee);
  assert.equal(benchEnv.widenDurationSec, FROZEN_ACTION_ENVELOPE.widenDurationSec);
  assert.equal(benchEnv.decayDurationSec, FROZEN_ACTION_ENVELOPE.decayDurationSec);
  assert.equal(recoverySeconds(benchEnv), FROZEN_ACTION_ENVELOPE.maxProtectDurationSec);

  const T = 1_000_000;
  const episodes = [{ triggerAtUnixSeconds: T, recoveredAtUnixSeconds: T + recoverySeconds(benchEnv) }];
  for (let elapsed = 0; elapsed <= 24_000; elapsed += 37) {
    assert.equal(
      decayedFee(benchEnv.maxFeePips, elapsed, FROZEN_ACTION_ENVELOPE),
      feeAtInstantPips(T + elapsed, episodes, benchEnv),
      `curves diverge at elapsed=${elapsed}`,
    );
  }
});

test("the ceiling is shared even though Tinjau may propose less than it", () => {
  // T0.4 §2 requires the same CEILING, not the same proposal. Confidence modulates how much
  // protection Tinjau asks for; it never lets Tinjau exceed the ceiling the baseline can reach.
  assert.equal(targetFeeForConfidence("HIGH"), FROZEN_ACTION_ENVELOPE.maxFee);
  assert.ok(targetFeeForConfidence("MEDIUM") < FROZEN_ACTION_ENVELOPE.maxFee);
  assert.ok(targetFeeForConfidence("LOW") < targetFeeForConfidence("MEDIUM"));
  assert.ok(targetFeeForConfidence("LOW") > FROZEN_ACTION_ENVELOPE.baseFee);
});

// ---------------------------------------------------------------------------
// 3. The AMD-001 grid
// ---------------------------------------------------------------------------

test("the drawdown grid is 150/200/300 and every scenario is reported at all three", () => {
  assert.deepEqual([...MIN_DRAWDOWN_BPS_GRID], [150, 200, 300]);
  const artifact = runBenchmark();
  assert.deepEqual(artifact.minDrawdownBpsGrid, [150, 200, 300]);
  for (const scenario of artifact.scenarios) {
    const values = artifact.rows
      .filter((r) => r.scenarioId === scenario.scenarioId && r.policyId === "TINJAU")
      .map((r) => r.parameters.minDrawdownBps);
    assert.deepEqual(
      values.sort((a, b) => (a as number) - (b as number)),
      [150, 200, 300],
      scenario.scenarioId,
    );
  }
});

test("the grid varies only minDrawdownBps: nothing else in the config moves", () => {
  for (const id of SCENARIO_IDS) {
    const results = evaluateDrawdownGrid(id);
    const versions = results.map((r) => {
      const { minDrawdownBps, ...rest } = r.ruleVersions;
      void minDrawdownBps;
      return JSON.stringify(rest);
    });
    assert.equal(new Set(versions).size, 1, `${id}: a version other than the grid value changed`);
  }
});

// ---------------------------------------------------------------------------
// 4. What Tinjau actually did
// ---------------------------------------------------------------------------

/**
 * The headline result of the whole benchmark, and it is not the flattering one.
 *
 * Tinjau declines to protect on every frozen scenario at every threshold in the grid. Scenario B —
 * the confirmed-event showcase — resolves to WATCH because its 235 bps drawdown does not persist
 * (T3.3's finding, republished here unchanged). D is declined twice over, on materiality and on
 * persistence. So Tinjau's replayed economics are identical to STATIC rather than better than it.
 *
 * The grid earns its keep here: the state is the same at 150, 200 and 300 bps, so the result
 * demonstrably does not hang on the one threshold a reviewer would most suspect.
 */
test("Tinjau does not promote on any scenario at any threshold in the grid", () => {
  const expectedStates: Record<ScenarioId, string> = {
    "A-rumor-watch": "WATCH",
    "B-confirmed-protect": "WATCH",
    "C-two-origins-hard-case": "WATCH",
    "D-neutral-normal": "NORMAL",
  };
  for (const id of SCENARIO_IDS) {
    for (const bps of MIN_DRAWDOWN_BPS_GRID) {
      const result = evaluateTinjau(id, bps as MinDrawdownBps);
      assert.equal(result.state, expectedStates[id], `${id} @ ${bps} bps`);
      assert.equal(result.actionAuthorized, false, `${id} @ ${bps} bps`);
      assert.equal(result.requestedFeePips, null, `${id} @ ${bps} bps`);
      assert.equal(result.protectStartedAt, null, `${id} @ ${bps} bps`);
      assert.deepEqual(result.episodes, [], `${id} @ ${bps} bps`);
    }
  }
});

test("the rumour invariant holds: scenario A never reaches PROTECT", () => {
  // T0.4 §9 lists "TINJAU reaches PROTECT on scenario A" as a failure condition.
  for (const bps of MIN_DRAWDOWN_BPS_GRID) {
    const result = evaluateTinjau("A-rumor-watch", bps as MinDrawdownBps);
    assert.notEqual(result.state, "PROTECT");
    assert.equal(result.confirmationStatus, "UNAVAILABLE");
  }
});

test("the materiality semantics hold: scenario D stays NORMAL and is declined twice", () => {
  // T0.4 §9 lists "TINJAU promotes on scenario D" as a failure condition. It does not promote,
  // and the reason codes show it refused on materiality as well as on the market.
  const result = evaluateTinjau("D-neutral-normal", 200);
  assert.equal(result.state, "NORMAL");
  assert.ok(result.reasonCodes.includes("NON_MATERIAL_EVENT"));
  assert.ok(result.reasonCodes.includes("MARKET_NOT_CONFIRMED"));
});

test("declining to protect means the base fee on every swap of every window", () => {
  for (const id of SCENARIO_IDS) {
    const input = loadReplayInput(id);
    for (const result of evaluateDrawdownGrid(id)) {
      const rows = computeMarkoutRows(input, tinjauFeeSchedule(result, input));
      for (const row of rows) {
        assert.equal(row.feePips, 500, `${id} @ ${result.minDrawdownBps} block ${row.blockNumber}`);
      }
    }
  }
});

test("Tinjau's fee schedule would follow the deployed curve if it did protect", () => {
  // Constructed, not observed: no frozen scenario produces a PROTECT, so the protecting branch
  // would otherwise be untested. Marked as constructed so it is never read as a result.
  const input = loadReplayInput("D-neutral-normal");
  const start = input.window.fromUnixSeconds + 3_000;
  const constructed = {
    ...evaluateTinjau("D-neutral-normal", 200),
    state: "PROTECT",
    actionAuthorized: true,
    requestedFeePips: 13_500,
    protectStartedAt: start,
  };
  const fee = tinjauFeeSchedule(constructed, input);
  assert.equal(fee(start - 1), 500, "base fee before protection starts");
  assert.equal(fee(start), 13_500);
  assert.equal(fee(start + 3_600), 13_500, "held for widenDuration");
  assert.equal(fee(start + 21_600), 500, "fully recovered at the duration cap");
  assert.ok(fee(start + 3_600 + 9_000) > 500 && fee(start + 3_600 + 9_000) < 13_500, "mid-decay");
});

// ---------------------------------------------------------------------------
// 5. Identity and determinism
// ---------------------------------------------------------------------------

test("the Tinjau arm scores the same replay input as the baselines", () => {
  const artifact = runBenchmark();
  for (const scenario of artifact.scenarios) {
    const fingerprints = new Set(
      artifact.rows
        .filter((r) => r.scenarioId === scenario.scenarioId)
        .map((r) => r.replayInputFingerprint),
    );
    assert.equal(
      fingerprints.size,
      1,
      `${scenario.scenarioId}: STATIC, VOLATILITY_ONLY and TINJAU must all score one replay`,
    );
    assert.equal([...fingerprints][0], scenario.replayInputFingerprint);
  }
});

test("M_0 is identical across all three policies, so all three saw the same trades", () => {
  const artifact = runBenchmark();
  for (const scenario of artifact.scenarios) {
    const values = new Set(
      artifact.rows
        .filter((r) => r.scenarioId === scenario.scenarioId && r.economics !== null)
        .map((r) => r.economics?.markoutM0Usd.value),
    );
    if (values.size === 0) continue;
    assert.equal(values.size, 1, scenario.scenarioId);
  }
});

test("the Tinjau arm is deterministic", () => {
  for (const id of SCENARIO_IDS) {
    assert.equal(JSON.stringify(evaluateDrawdownGrid(id)), JSON.stringify(evaluateDrawdownGrid(id)), id);
  }
});
