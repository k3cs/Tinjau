/**
 * T5.2 — the volatility-only baseline.
 *
 * Four properties are proven here, and each is a requirement the pre-registration makes
 * machine-checkable rather than a matter of good intentions:
 *
 *   1. EVIDENCE BLINDNESS IS STRUCTURAL. Not "we do not pass evidence" but "evidence cannot be
 *      passed". Proven three ways: the input type cannot be satisfied by a literal (a compile
 *      error, pinned with `@ts-expect-error`), the runtime guard rejects anything that is not
 *      numeric market data, and — the strongest of the three — attaching a full evidence payload
 *      to the replay input leaves the policy's output byte-identical.
 *
 *   2. `k` IS NEVER CHOSEN. Every event is reported at `k ∈ {2,3,5}`, all three.
 *
 *   3. SILENCE IS NOT RESTRAINT. A window that cannot support the estimator is `INDETERMINATE`,
 *      never "did not trigger". Scenario A's window has zero swaps.
 *
 *   4. DETERMINISM. Same input, byte-identical output.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { frozenEnvelope } from "../src/benchmark/envelope.js";
import { loadReplayInput, SCENARIO_IDS, type ReplayInput } from "../src/benchmark/replayInput.js";
import {
  assertMarketOnly,
  buildGrid,
  evaluateKGrid,
  GRID_SEC,
  K_GRID,
  MIN_REFERENCE_OBSERVATIONS,
  projectVolatilityOnlyInput,
  realisedVolatility,
  REFERENCE_WINDOW_SEC,
  SHORT_WINDOW_SEC,
  volatilityFeeSchedule,
  type VolatilityOnlyInput,
} from "../src/benchmark/volatilityPolicy.js";
import { runBaselines } from "../src/benchmark/index.js";

const ENVELOPE = frozenEnvelope();
const Q96 = 2 ** 96;

/** Inverse of `priceFromSqrtPriceX96` for this venue (quote is token0, 6 / 18 decimals). */
function sqrtPriceX96ForPrice(price: number): string {
  const raw = 10 ** 12 / price;
  return (Math.sqrt(raw) * Q96).toFixed(0);
}

/**
 * A replay input built from a hand-written price series.
 *
 * Used only to prove that outcomes the frozen scenarios do not happen to produce are still
 * reachable. Without it, "scenario A is INDETERMINATE" would be consistent with a policy that
 * returns INDETERMINATE unconditionally.
 */
function syntheticInput(prices: readonly number[], startBlock = 68_000_000): ReplayInput {
  const template = loadReplayInput("D-neutral-normal");
  const swaps = prices.map((price, i) => ({
    blockNumber: startBlock + i * 30,
    logIndex: 0,
    amount0: "1000000",
    amount1: "-1000000000000000",
    sqrtPriceX96: sqrtPriceX96ForPrice(price),
    liquidity: "1000000000000000000",
    tick: 0,
  }));
  const fromBlock = startBlock;
  const toBlock = startBlock + Math.max(1, prices.length) * 30;
  return {
    ...template,
    swaps,
    swapCount: swaps.length,
    window: {
      ...template.window,
      fromBlock,
      toBlock,
      fromUnixSeconds: fromBlock,
      toUnixSeconds: toBlock,
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Evidence blindness — structural
// ---------------------------------------------------------------------------

test("the volatility input type cannot be satisfied by an object literal", () => {
  // The brand key is a module-private `unique symbol`, so no code outside `volatilityPolicy.ts`
  // can write a value of this type. This is the compile-time half of the blindness guarantee:
  // if the brand were ever removed, `tsc --noEmit` fails on the unused `@ts-expect-error`.
  // @ts-expect-error - VolatilityOnlyInput is opaque; projectVolatilityOnlyInput is the only constructor.
  const forged: VolatilityOnlyInput = {
    pricePath: [{ unixSeconds: 1, price: 2 }],
    windowFromUnixSeconds: 0,
    windowToUnixSeconds: 10,
  };
  assert.ok(forged);
});

test("the projection admits exactly three market fields and copies nothing else", () => {
  const input = loadReplayInput("D-neutral-normal");
  const projected = projectVolatilityOnlyInput(input) as unknown as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(projected).sort(),
    ["pricePath", "windowFromUnixSeconds", "windowToUnixSeconds"],
  );
  const path = projected.pricePath as Array<Record<string, unknown>>;
  for (const point of path) {
    assert.deepEqual(Object.keys(point).sort(), ["price", "unixSeconds"]);
  }
  // No scenario id, no anchor, no source class, no event type — and no string anywhere at all.
  const serialised = JSON.stringify(projected);
  assert.doesNotMatch(serialised, /[a-zA-Z]{3,}":\s*"/, "no string-valued field may survive projection");
  assert.doesNotMatch(serialised, /rumor|rumour|scenario|anchor|OFFICIAL|NEWS|8-K|Form 4/i);
});

test("the runtime guard refuses every shape evidence could arrive in", () => {
  const base = projectVolatilityOnlyInput(loadReplayInput("D-neutral-normal")) as unknown as Record<
    string,
    unknown
  >;

  const leaks: Array<[string, unknown]> = [
    ["an extra evidence field", { ...base, sourceClass: "RUMOR" }],
    ["an extra field with a harmless-looking name", { ...base, eventType: 4 }],
    ["the decision anchor smuggled in as a number", { ...base, anchorUnixSeconds: 1_755_469_390 }],
    ["a string where a number belongs", { ...base, windowFromUnixSeconds: "68050070" }],
    ["a nested object", { ...base, windowToUnixSeconds: { value: 1 } }],
    ["a price point carrying an event type", {
      ...base,
      pricePath: [{ unixSeconds: 1, price: 2, eventType: "8-K" }],
    }],
    ["a price point that is a string", { ...base, pricePath: ["RUMOR"] }],
    ["a non-object", "RUMOR"],
    ["an array", [1, 2, 3]],
    ["a NaN price", { ...base, pricePath: [{ unixSeconds: 1, price: Number.NaN }] }],
  ];

  for (const [label, leak] of leaks) {
    assert.throws(() => assertMarketOnly(leak), /VOLATILITY_ONLY/, `should have refused: ${label}`);
  }
  assert.doesNotThrow(() => assertMarketOnly(base), "the legitimate projection must still pass");
});

test("the guard runs on every call, not only at construction", () => {
  const projected = projectVolatilityOnlyInput(loadReplayInput("D-neutral-normal"));
  // A caller that mutated the input after it was built is caught at the point of use.
  (projected as unknown as Record<string, unknown>).sourceClass = "OFFICIAL";
  assert.throws(() => evaluateKGrid(projected, ENVELOPE), /VOLATILITY_ONLY/);
});

test("attaching a full evidence payload to the replay input changes nothing the policy sees", () => {
  const clean = loadReplayInput("B-confirmed-protect");
  const contaminated = {
    ...clean,
    evidence: {
      sourceClass: "OFFICIAL",
      eventType: "8-K",
      accession: "0001045810-26-000069",
      claims: [{ claimId: "claim-b-001", publishedAt: "2026-08-17T12:41:33Z" }],
    },
    riskState: "PROTECT",
    materiality: "MATERIAL",
    usReferenceMarketOpen: false,
  } as unknown as ReplayInput;

  const before = JSON.stringify(evaluateKGrid(projectVolatilityOnlyInput(clean), ENVELOPE));
  const after = JSON.stringify(evaluateKGrid(projectVolatilityOnlyInput(contaminated), ENVELOPE));
  assert.equal(after, before, "evidence must not be able to reach this policy even indirectly");
});

test("moving the decision anchor does not move the volatility baseline", () => {
  // The anchor is a filing timestamp: evidence, even though it is a number. `actionLatency` is
  // computed by the scoring layer afterwards, so the trigger itself must be anchor-independent.
  const clean = loadReplayInput("D-neutral-normal");
  const shifted: ReplayInput = {
    ...clean,
    anchor: { ...clean.anchor, unixSeconds: clean.anchor.unixSeconds + 9_999 },
  };
  const before = JSON.stringify(evaluateKGrid(projectVolatilityOnlyInput(clean), ENVELOPE));
  const after = JSON.stringify(evaluateKGrid(projectVolatilityOnlyInput(shifted), ENVELOPE));
  assert.equal(after, before);
});

// ---------------------------------------------------------------------------
// 2. `k` is never chosen
// ---------------------------------------------------------------------------

test("k is the frozen grid {2,3,5} and every event is reported at all three", () => {
  assert.deepEqual([...K_GRID], [2, 3, 5]);
  const artifact = runBaselines();
  assert.deepEqual(artifact.kGrid, [2, 3, 5]);

  for (const scenario of artifact.scenarios) {
    const ks = artifact.rows
      .filter((r) => r.scenarioId === scenario.scenarioId && r.policyId === "VOLATILITY_ONLY")
      .map((r) => r.parameters.k);
    assert.deepEqual(
      ks.sort((a, b) => (a as number) - (b as number)),
      [2, 3, 5],
      `${scenario.scenarioId}: publishing fewer than all three k values would let the strongest ` +
        `be selected after the fact`,
    );
  }
});

test("evaluateKGrid is the only evaluation entry point, and it always returns the whole grid", () => {
  for (const id of SCENARIO_IDS) {
    const results = evaluateKGrid(projectVolatilityOnlyInput(loadReplayInput(id)), ENVELOPE);
    assert.equal(results.length, 3, id);
    assert.deepEqual(results.map((r) => r.k), [2, 3, 5], id);
  }
});

test("the trigger is monotone in k: a higher k can never fire earlier than a lower one", () => {
  // Not a threshold choice, a sanity property. If it failed, the grid would not be a sensitivity
  // analysis of one parameter but three unrelated policies wearing the same name.
  for (const id of SCENARIO_IDS) {
    const results = evaluateKGrid(projectVolatilityOnlyInput(loadReplayInput(id)), ENVELOPE);
    const firsts = results.map((r) => r.firstTriggerUnixSeconds);
    for (let i = 1; i < firsts.length; i++) {
      const lower = firsts[i - 1];
      const higher = firsts[i];
      if (lower === null || higher === null) continue;
      assert.ok(higher >= lower, `${id}: k=${results[i]?.k} fired before k=${results[i - 1]?.k}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3. Silence is not restraint
// ---------------------------------------------------------------------------

test("scenario A's empty window is INDETERMINATE at every k, never 'did not trigger'", () => {
  const input = loadReplayInput("A-rumor-watch");
  assert.equal(input.swapCount, 0);
  assert.equal(input.rpcRangeErrors, 0, "an observed absence, not a failed query");

  for (const result of evaluateKGrid(projectVolatilityOnlyInput(input), ENVELOPE)) {
    assert.equal(result.status, "INDETERMINATE", `k=${result.k}`);
    assert.notEqual(result.status, "NOT_TRIGGERED");
    assert.match(result.statusReason, /measured absence, not a decision not to act/);
    assert.deepEqual(result.episodes, []);
    assert.equal(result.firstTriggerUnixSeconds, null);
  }
});

test("scenario A carries no economic row for any policy", () => {
  const rows = runBaselines().rows.filter((r) => r.scenarioId === "A-rumor-watch");
  assert.equal(rows.length, 4, "one STATIC row plus three volatility k rows");
  for (const row of rows) {
    assert.equal(row.economics, null, `${row.policyId} ${JSON.stringify(row.parameters)}`);
    assert.equal(row.policyBehaviour.falsePositive.label, "NO_ECONOMIC_ROW");
    assert.match(row.notes.join(" "), /forbids widening the window/);
  }
});

test("a flat price path is INDETERMINATE for a different reason: the reference median is zero", () => {
  const flat = syntheticInput(new Array(200).fill(100));
  for (const result of evaluateKGrid(projectVolatilityOnlyInput(flat), ENVELOPE)) {
    assert.equal(result.status, "INDETERMINATE");
    assert.match(result.statusReason, /zero reference/);
    assert.ok(result.coverage.definedRvShortPoints > 0, "rv_short was estimable; the ratio was not");
  }
});

test("NOT_TRIGGERED is reachable, so INDETERMINATE is not simply what this policy always says", () => {
  // A steady saw-tooth: rv_short is roughly constant, so the ratio hovers near 1 and never
  // reaches even k=2.
  const steady = Array.from({ length: 400 }, (_, i) => 100 * (1 + (i % 2 === 0 ? 0.001 : -0.001)));
  const results = evaluateKGrid(projectVolatilityOnlyInput(syntheticInput(steady)), ENVELOPE);
  for (const result of results) {
    assert.equal(result.status, "NOT_TRIGGERED", `k=${result.k}`);
    assert.match(result.statusReason, /genuine non-trigger, distinct from INDETERMINATE/);
  }
});

test("TRIGGERED is reachable on a synthetic spike, and the fee follows the frozen envelope", () => {
  const calm = Array.from({ length: 400 }, (_, i) => 100 * (1 + (i % 2 === 0 ? 0.0005 : -0.0005)));
  const spiked = [...calm, ...Array.from({ length: 60 }, (_, i) => 100 * 0.995 ** (i + 1))];
  const results = evaluateKGrid(projectVolatilityOnlyInput(syntheticInput(spiked)), ENVELOPE);
  const k2 = results.find((r) => r.k === 2);
  assert.ok(k2);
  assert.equal(k2.status, "TRIGGERED");
  assert.ok(k2.firstTriggerUnixSeconds !== null);

  const fee = volatilityFeeSchedule(k2, ENVELOPE);
  const t = k2.firstTriggerUnixSeconds as number;
  assert.equal(fee(t - 1), 500);
  assert.equal(fee(t), 20_000);
  assert.equal(fee(t + 3_600), 20_000);
  assert.equal(fee(t + 21_600), 500);
});

// ---------------------------------------------------------------------------
// The estimator itself
// ---------------------------------------------------------------------------

test("frozen estimator parameters match T0.4 §6.2", () => {
  assert.equal(SHORT_WINDOW_SEC, 900);
  assert.equal(REFERENCE_WINDOW_SEC, 86_400);
  assert.equal(GRID_SEC, 60);
  assert.equal(MIN_REFERENCE_OBSERVATIONS, 2);
});

test("realised volatility returns null rather than zero when it cannot be estimated", () => {
  assert.equal(realisedVolatility([]), null);
  assert.equal(realisedVolatility([100]), null, "one price yields no return");
  assert.equal(realisedVolatility([100, 100]), 0, "two equal prices genuinely have zero volatility");
  assert.ok((realisedVolatility([100, 101, 100]) as number) > 0);
  assert.equal(realisedVolatility([100, 0]), null, "a non-positive price has no log return");
});

test("the reference median is strictly trailing: an observation is not part of its own baseline", () => {
  const rising = Array.from({ length: 100 }, (_, i) => 100 + i);
  const grid = buildGrid(projectVolatilityOnlyInput(syntheticInput(rising)));
  const first = grid.find((g) => g.rvRef !== null);
  assert.ok(first);
  assert.ok(first.referenceObservations >= MIN_REFERENCE_OBSERVATIONS);
  assert.ok(first.referenceCoverageSec > 0);
  assert.equal(grid[0]?.rvRef, null, "the first grid point has no trailing history at all");
});

test("reference coverage is disclosed, because a 7-hour window cannot supply a 24-hour reference", () => {
  for (const id of ["B-confirmed-protect", "C-two-origins-hard-case", "D-neutral-normal"] as const) {
    for (const result of evaluateKGrid(projectVolatilityOnlyInput(loadReplayInput(id)), ENVELOPE)) {
      assert.ok(result.coverage.maxReferenceCoverageSec > 0, id);
      assert.ok(
        result.coverage.maxReferenceCoverageRatio < 1,
        `${id}: the frozen windows are 25,200s, so full 24-hour coverage is impossible`,
      );
      assert.match(result.coverage.note, /disclosed shortfall, not a re-specification/);
    }
  }
});

// ---------------------------------------------------------------------------
// 4. Determinism
// ---------------------------------------------------------------------------

test("the volatility baseline is deterministic: same input, byte-identical output", () => {
  for (const id of SCENARIO_IDS) {
    const a = JSON.stringify(evaluateKGrid(projectVolatilityOnlyInput(loadReplayInput(id)), ENVELOPE));
    const b = JSON.stringify(evaluateKGrid(projectVolatilityOnlyInput(loadReplayInput(id)), ENVELOPE));
    assert.equal(a, b, id);
  }
});
