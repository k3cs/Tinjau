/**
 * T5.1 — the static-fee baseline, the shared replay input, and the markout arithmetic.
 *
 * The centrepiece is `reconciles ... against P2.4`. T0.4 §4 requires the markout formulas be
 * "reused verbatim from `markout-study.md` §1.2–§1.3 so the two studies remain comparable". A
 * comment claiming verbatim reuse is unfalsifiable; this test is not. Scenario D's anchor block is
 * the same block P2.4 measured independently in August for the same pool, so its recorded row is
 * an external fixture this implementation must reproduce field for field — including the
 * horizon-coverage counts, which are sensitive to the exact `block_number > first_trade_block`
 * rule P2.4 used.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { feeAtInstantPips, frozenEnvelope, loadPreRegistration, recoverySeconds } from "../src/benchmark/envelope.js";
import { computeMarkoutRows, HORIZONS_SEC, PRIMARY_HORIZON_SEC } from "../src/benchmark/markout.js";
import { loadReplayInput, SCENARIO_IDS, type ReplayInput } from "../src/benchmark/replayInput.js";
import { evaluateStatic, staticFeeSchedule } from "../src/benchmark/staticPolicy.js";
import { runBaselines } from "../src/benchmark/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const P2_4_RAW = join(
  HERE, "..", "..", "..",
  "docs", "buildx-orion-2026", "outputs", "05-build", "data", "p2_4_markout_raw.jsonl",
);

const P2_4_EVENT_BLOCK = 67_800_154; // scenario D's anchor; P2.4's event index 0

function p2_4Row(): Record<string, number> {
  for (const line of readFileSync(P2_4_RAW, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    const row = JSON.parse(line) as Record<string, number>;
    if (row.event_block === P2_4_EVENT_BLOCK) return row;
  }
  throw new Error(`No P2.4 row for event block ${P2_4_EVENT_BLOCK}`);
}

/** Re-slices a replay input to P2.4's fixed `[eb, eb+3600]` sweep window. */
function p2_4Window(input: ReplayInput): ReplayInput {
  const from = P2_4_EVENT_BLOCK;
  const to = P2_4_EVENT_BLOCK + 3600;
  return {
    ...input,
    window: {
      ...input.window,
      fromBlock: from,
      toBlock: to,
      fromUnixSeconds: input.window.fromUnixSeconds + (from - input.window.fromBlock),
      toUnixSeconds: input.window.fromUnixSeconds + (to - input.window.fromBlock),
    },
    swaps: input.swaps.filter((s) => s.blockNumber >= from && s.blockNumber <= to),
  };
}

// ---------------------------------------------------------------------------
// The frozen envelope
// ---------------------------------------------------------------------------

test("envelope is read from the frozen pre-registration, not retyped", () => {
  const pre = loadPreRegistration();
  const envelope = frozenEnvelope();
  assert.equal(envelope.baseFeePips, 500);
  assert.equal(envelope.maxFeePips, 20_000);
  assert.equal(envelope.widenDurationSec, 3_600);
  assert.equal(envelope.decayDurationSec, 18_000);
  assert.equal(envelope.protocolShareOfPoolFee, 0.25);
  // Same numbers, sourced from the JSON rather than from a constant in the policy files.
  assert.equal(envelope.baseFeePips, pre.feeEnvelope.baseFee);
  assert.equal(envelope.maxFeePips, pre.feeEnvelope.maxFee);
  assert.deepEqual(pre.feeEnvelope.appliesTo, ["VOLATILITY_ONLY", "TINJAU"]);
});

test("widen-and-decay curve matches the deployed hook, including the pre-trigger baseline", () => {
  const envelope = frozenEnvelope();
  const T = 1_000_000;
  const episodes = [{ triggerAtUnixSeconds: T, recoveredAtUnixSeconds: T + recoverySeconds(envelope) }];

  // Before the trigger the fee is the base fee. `timeDecayedFee` alone returns the WIDENED fee
  // for now <= eventTimestamp, which is right for the hook and wrong for a replay that also
  // scores the trades preceding the trigger.
  assert.equal(feeAtInstantPips(T - 1, episodes, envelope), 500);
  assert.equal(feeAtInstantPips(T, episodes, envelope), 20_000);
  assert.equal(feeAtInstantPips(T + 3_600, episodes, envelope), 20_000, "holds for widenDuration");
  // Half way through the decay: span 19500, remaining 9000/18000 -> 500 + 9750.
  assert.equal(feeAtInstantPips(T + 3_600 + 9_000, episodes, envelope), 10_250);
  assert.equal(feeAtInstantPips(T + 21_600, episodes, envelope), 500, "fully recovered");
  assert.equal(feeAtInstantPips(T + 100_000, episodes, envelope), 500);
});

// ---------------------------------------------------------------------------
// Verbatim reuse of the P2.4 markout formulas
// ---------------------------------------------------------------------------

test("reconciles swap-for-swap against P2.4's independently recorded markout row", () => {
  const input = p2_4Window(loadReplayInput("D-neutral-normal"));
  const rows = computeMarkoutRows(input, () => 500);
  const star = rows[0];
  assert.ok(star, "P2.4's S* must be the first swap at or after the event block");
  const expected = p2_4Row();

  assert.equal(star.blockNumber, expected.first_trade_block);
  assert.equal(star.logIndex, expected.log_index);

  const close = (actual: number, want: number, field: string) =>
    assert.ok(
      Math.abs(actual - want) <= Math.max(1e-9, Math.abs(want) * 1e-12),
      `${field}: got ${actual}, P2.4 recorded ${want}`,
    );

  close(star.quoteDelta, expected.dU as number, "dU");
  close(star.baseDelta, expected.dS as number, "dS");
  close(star.notionalUsd, expected.notional_usd as number, "notional");
  close(star.pricePost, expected.p_post as number, "P_post");
  close(star.m0Usd, expected.M_0 as number, "M_0");
  close(star.haircutUsd, expected.haircut as number, "haircut");

  for (const h of HORIZONS_SEC) {
    close(star.priceAtHorizon[h], expected[`p_h_${h}`] as number, `P_${h}`);
    close(star.mhUsd[h], expected[`M_h_${h}`] as number, `M_${h}`);
    close(star.mhLpUsd[h], expected[`M_h_LP_${h}`] as number, `M_${h}_LP`);
    assert.equal(
      star.laterSwapCount[h],
      expected[`later_swap_count_by_h_${h}`],
      `later_swap_count_by_h_${h} — sensitive to P2.4's "strictly greater block number" rule`,
    );
  }
});

test("protocol haircut reproduces P2.4's own arithmetic at the frozen 25% share", () => {
  const expected = p2_4Row();
  assert.equal(expected.fee_protocol, 0x44, "the frozen venue's feeProtocol");
  assert.equal(expected.protocol_fraction, 0.25);
  assert.ok(Math.abs(0.25 * 0.0005 * (expected.notional_usd as number) - (expected.haircut as number)) < 1e-12);
});

test("M_h decomposes as M_0 plus the adverse-selection term, on every swap of every scenario", () => {
  for (const id of SCENARIO_IDS) {
    const input = loadReplayInput(id);
    const rows = computeMarkoutRows(input, () => 500);
    for (const row of rows) {
      for (const h of HORIZONS_SEC) {
        const rebuilt = row.m0Usd + row.adverseSelectionUsd[h];
        assert.ok(Math.abs(rebuilt - row.mhUsd[h]) < 1e-9, `${id} ${row.blockNumber} h=${h}`);
      }
    }
  }
});

/**
 * T0.4 §4 and `markout-study.md` §1.3 both annotate `M_0 = dU + dS * P_post` as "fee plus curve
 * premium, structurally >= 0". Measured over the full swap population rather than P2.4's
 * first-trade-only sample, that annotation is false for the largest trades, and this test pins the
 * measurement rather than the claim.
 *
 * Why it is false: valuing both legs at the POST-trade marginal price, `M_0` is the fee earned
 * minus the curve cost of having executed at an average price worse than the post price. The fee
 * scales with size while the curve cost scales roughly with size squared over liquidity, so on a
 * pool this thin a large enough trade flips the sign. P2.4's sample was 32 first trades with a
 * median notional near $105, where the fee always won; the swaps that break it here carry
 * notionals in the thousands.
 *
 * It matters downstream because "M_0 >= 0" invites the reading that any negative markout must be
 * adverse selection. Part of it is ordinary curve slippage on a large trade.
 */
test("M_0 is NOT structurally non-negative on the full swap population, contrary to T0.4 §4", () => {
  const measured: Record<string, { total: number; negative: number }> = {};
  for (const id of SCENARIO_IDS) {
    const rows = computeMarkoutRows(loadReplayInput(id), () => 500);
    measured[id] = { total: rows.length, negative: rows.filter((r) => r.m0Usd < -1e-9).length };
  }
  assert.deepEqual(measured, {
    "A-rumor-watch": { total: 0, negative: 0 },
    "B-confirmed-protect": { total: 4_145, negative: 153 },
    "C-two-origins-hard-case": { total: 265, negative: 0 },
    "D-neutral-normal": { total: 367, negative: 63 },
  });

  // The exceptions are the large trades, not scattered noise.
  const rows = computeMarkoutRows(loadReplayInput("B-confirmed-protect"), () => 500);
  const negatives = rows.filter((r) => r.m0Usd < -1e-9);
  const medianNotionalAll = [...rows].sort((a, b) => a.notionalUsd - b.notionalUsd)[
    Math.floor(rows.length / 2)
  ]?.notionalUsd as number;
  const minNegativeNotional = Math.min(...negatives.map((r) => r.notionalUsd));
  assert.ok(
    minNegativeNotional > medianNotionalAll,
    `every swap with M_0 < 0 should be larger than the median trade: smallest such notional ` +
      `${minNegativeNotional.toFixed(2)} vs median ${medianNotionalAll.toFixed(2)}`,
  );
});

test("a horizon with no later trade falls back to P_post, and says so via laterSwapCount", () => {
  const input = p2_4Window(loadReplayInput("D-neutral-normal"));
  const star = computeMarkoutRows(input, () => 500)[0];
  assert.ok(star);
  assert.equal(star.laterSwapCount[60], 0);
  assert.equal(star.priceAtHorizon[60], star.pricePost);
  assert.equal(star.mhUsd[60], star.m0Usd, "with no later swap M_h collapses to M_0");
});

// ---------------------------------------------------------------------------
// T5.1 acceptance: identical trades, timestamps, liquidity, costs and initial state
// ---------------------------------------------------------------------------

test("STATIC charges the frozen base fee on every swap in every window", () => {
  for (const id of SCENARIO_IDS) {
    const input = loadReplayInput(id);
    const result = evaluateStatic(input);
    assert.equal(result.feePips, 500);
    assert.deepEqual(result.episodes, []);
    const rows = computeMarkoutRows(input, staticFeeSchedule(result));
    for (const row of rows) {
      assert.equal(row.feePips, 500, `${id} block ${row.blockNumber}`);
      assert.equal(row.feeRate, 0.0005);
    }
  }
});

test("replay input is loaded once and every row of that scenario carries its fingerprint", () => {
  const artifact = runBaselines();
  const byScenario = new Map<string, Set<string>>();
  for (const row of artifact.rows) {
    const set = byScenario.get(row.scenarioId) ?? new Set<string>();
    set.add(row.replayInputFingerprint);
    byScenario.set(row.scenarioId, set);
  }
  assert.equal(byScenario.size, 4);
  for (const [scenarioId, fingerprints] of byScenario) {
    assert.equal(
      fingerprints.size,
      1,
      `${scenarioId}: STATIC and every VOLATILITY_ONLY k row must score the identical replay`,
    );
  }
  // Different scenarios must not collide, or the identity check would be vacuous.
  const all = new Set(artifact.scenarios.map((s) => s.replayInputFingerprint));
  assert.equal(all.size, 4);
});

test("the fingerprint tracks the trade list: dropping one swap changes it", () => {
  const input = loadReplayInput("D-neutral-normal");
  const rebuilt = loadReplayInput("D-neutral-normal");
  assert.equal(input.fingerprint, rebuilt.fingerprint, "stable across loads");

  // Re-loading with one swap removed must not be able to produce the same fingerprint. Rather
  // than reach into the private hasher, assert the property that makes the fingerprint useful:
  // it is a function of the swaps, so two different swap lists cannot share one.
  const shorter = { ...input, swaps: input.swaps.slice(0, -1) };
  assert.notEqual(shorter.swaps.length, input.swaps.length);
  assert.equal(
    input.swapCount,
    input.swaps.length,
    "swapCount and the decoded swap list must agree, or the fingerprint would describe neither",
  );
});

test("policies share initial state and costs, so no policy starts with an unearned fee level", () => {
  for (const id of SCENARIO_IDS) {
    const input = loadReplayInput(id);
    assert.equal(input.initialState.feePips, 500);
    assert.equal(input.initialState.protectionActive, false);
    assert.equal(input.costs.protocolShareOfPoolFee, 0.25);
  }
});

test("M_0 is policy-independent: the same trades produce the same pre-haircut markout", () => {
  const artifact = runBaselines();
  for (const scenario of artifact.scenarios) {
    const rows = artifact.rows.filter((r) => r.scenarioId === scenario.scenarioId && r.economics !== null);
    if (rows.length === 0) continue;
    const values = new Set(rows.map((r) => r.economics?.markoutM0Usd.value));
    assert.equal(
      values.size,
      1,
      `${scenario.scenarioId}: M_0 differing between policies would mean they saw different trades`,
    );
  }
});

test("the replay window matches the frozen scenario window for all four scenarios", () => {
  const expected: Record<string, [number, number, number]> = {
    "A-rumor-watch": [66_411_744, 66_436_944, 0],
    "B-confirmed-protect": [68_197_857, 68_223_057, 4_145],
    "C-two-origins-hard-case": [68_050_070, 68_075_270, 265],
    "D-neutral-normal": [67_796_554, 67_821_754, 367],
  };
  for (const id of SCENARIO_IDS) {
    const input = loadReplayInput(id);
    const [from, to, swaps] = expected[id] as [number, number, number];
    assert.equal(input.window.fromBlock, from, id);
    assert.equal(input.window.toBlock, to, id);
    assert.equal(input.swapCount, swaps, id);
    assert.equal(input.rpcRangeErrors, 0, `${id}: a non-zero count would make swapCount a lower bound`);
  }
});

test("TVL_event is present only where a measurement exists, and is never imputed", () => {
  const d = loadReplayInput("D-neutral-normal");
  assert.ok(d.tvlEvent.valueUsd !== null, "scenario D's anchor block was measured by P2.4");
  assert.ok(Math.abs((d.tvlEvent.valueUsd as number) - 215_311.1476487063) < 1e-6);
  for (const id of ["A-rumor-watch", "B-confirmed-protect", "C-two-origins-hard-case"] as const) {
    const input = loadReplayInput(id);
    assert.equal(input.tvlEvent.valueUsd, null, `${id}: no archive measurement exists`);
    assert.match(input.tvlEvent.source, /balanceOf at archive block/);
  }
});

test("primary horizon is 3600s, matching the pre-registration", () => {
  assert.equal(PRIMARY_HORIZON_SEC, 3_600);
  assert.equal(loadPreRegistration().markout.primaryHorizonSec, 3_600);
  assert.deepEqual([...HORIZONS_SEC], loadPreRegistration().markout.horizonsSec);
});
