/**
 * Degraded-data and manipulation cases for the market-confirmation stack (task T3.4).
 *
 * Acceptance from the tracker:
 *   > Cover wick, stale OKX sample, delayed RPC, thin test liquidity, missing route, and
 *   > conflicting signals. Every degraded case produces `unavailable`, `WATCH`, or continued
 *   > bounded expiry as specified — never unsupported promotion.
 *
 * ---------------------------------------------------------------------------------------
 * TWO DEFECTS WERE FOUND HERE AND ARE NOW CLOSED. Rule `tinjau.confirm/2.0.0`.
 *
 *   F1 (critical) — `velocity` bypassed the anti-wick gate entirely.
 *   F2 (high)     — anti-wick sampled persistence at exactly ONE point in time.
 *
 * They were first committed as `{ todo: true }` tests asserting the CORRECT behaviour, because
 * a test asserting the buggy behaviour would go green and look like coverage while blessing a
 * bug. The engine was then fixed: anti-wick became a NECESSARY condition for any `CONFIRMED`,
 * and persistence became the MEDIAN retention across the hold interval. §8 holds those four
 * tests as ordinary regression assertions, and §9 proves the gate did not become inert in the
 * process — replacing a false positive with a blanket refusal would be no better.
 *
 * Both are detailed in `docs/buildx-orion-2026/outputs/04-planning/t3-4-degraded-cases.md`.
 * ---------------------------------------------------------------------------------------
 *
 * Fixtures are built in code rather than loaded from disk wherever the adversarial shape IS
 * the point of the test — a reader should not have to open a JSON file to see what was fed in.
 * The two findings additionally have committed `degraded-*.json` fixtures as standalone
 * evidence.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  confirmMarket,
  buildConfirmationInput,
  evaluateAntiWick,
  type ConfirmationInput,
  type PricePoint,
} from "../src/market/confirm.js";
import {
  computePoolTelemetry,
  type SwapWindowFixture,
} from "../src/market/poolTelemetry.js";
import { confirmationCeiling, type ReferencePriceResult } from "../src/market/okxReference.js";
import { FROZEN_CONFIRMATION_CONFIG } from "../src/market/confirmationConfig.js";
import type { ConfirmationStatus } from "../src/risk/types.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "market", "fixtures");

/** X Layer produces exactly one block per second; this is the frozen relation. */
const BLOCK_OFFSET = 1_718_769_036;
const toBlock = (unixSeconds: number) => unixSeconds - BLOCK_OFFSET;

/** An arbitrary anchor instant. Nothing depends on its value. */
const T0 = 1_787_000_000;

/** The real chain-196 pool's descriptor, so synthetic windows share its arithmetic. */
const POOL = {
  chainId: 196,
  pool: "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2",
  token0: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
  token0Symbol: "USDG",
  token0Decimals: 6,
  token1: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
  token1Symbol: "wNVDAx",
  token1Decimals: 18,
  feePips: 500,
  tickSpacing: 10,
  liquiditySource: "THIRD_PARTY" as const,
  quoteIsToken0: true,
};

/**
 * Inverse of `priceFromSqrtPriceX96` for this pool's orientation.
 *
 * P = 1 / (raw * 10^(dec0-dec1)) with quoteIsToken0, so raw = 10^12 / P.
 */
function sqrtPriceFor(price: number): string {
  return BigInt(Math.floor(Math.sqrt(1e12 / price) * 2 ** 96)).toString();
}

/** Builds a synthetic swap window from an ordered list of `[unixSeconds, price]` points. */
function windowOf(points: readonly [number, number][], rpcRangeErrors = 0): SwapWindowFixture {
  const from = (points.length > 0 ? points[0][0] : T0) - 60;
  const to = (points.length > 0 ? points[points.length - 1][0] : T0) + 60;
  return {
    ...POOL,
    scenarioId: "SYNTHETIC",
    fromBlock: toBlock(from),
    toBlock: toBlock(to),
    fromIso: new Date(from * 1000).toISOString(),
    toIso: new Date(to * 1000).toISOString(),
    rpcRangeErrors,
    swapCount: points.length,
    swaps: points.map(([t, p], i) => [
      toBlock(t),
      i,
      "-1000000",
      "4000000000000000",
      sqrtPriceFor(p),
      "1000000000000",
      0,
    ]),
  } as SwapWindowFixture;
}

interface Segments {
  preCount: number;
  postCount: number;
  preSeconds: number;
  postSeconds: number;
}

function inputFor(
  fixture: SwapWindowFixture,
  now: number,
  segments: Segments,
  okx: ReferencePriceResult | null = null,
): ConfirmationInput {
  const pricePath: PricePoint[] = fixture.swaps.map((row) => ({
    blockNumber: Number(row[0]),
    unixSeconds: Number(row[0]) + BLOCK_OFFSET,
    price: 1e12 / (Number(row[4]) / 2 ** 96) ** 2,
  }));
  return {
    anchorUnixSeconds: T0,
    nowUnixSeconds: now,
    telemetry: computePoolTelemetry(fixture, { nowUnixSeconds: now }),
    pricePath,
    preAnchorSwapCount: segments.preCount,
    preAnchorSeconds: segments.preSeconds,
    postAnchorSwapCount: segments.postCount,
    postAnchorSeconds: segments.postSeconds,
    okx,
    usReferenceMarketOpen: false,
  };
}

/** A flat pre-anchor baseline: 20 trades over an hour, all at one price. */
function flatBaseline(price = 200): [number, number][] {
  return Array.from({ length: 20 }, (_, i) => [T0 - 3600 + i * 180, price] as [number, number]);
}

// ===========================================================================================
// 1. Wick — a single short-lived spike must not be sufficient
// ===========================================================================================

test("the anti-wick gate rejects a fall that fully retraces", () => {
  // Peak 200, trough 190 (-500 bps), then fully recovered and held there.
  //
  // The recovery starts inside the 300s hold interval on purpose: since rule 2.0.0 retention is
  // a median ACROSS that interval, so a path whose first post-trough observation lands after it
  // is `evaluated: false` (fail-closed) rather than a wick. Both outcomes refuse; this case is
  // specifically about the wick.
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190],
    ...Array.from({ length: 20 }, (_, i) => [T0 + 60 + i * 60, 200] as [number, number]),
  ];

  const outcome = evaluateAntiWick(inputFor(windowOf(points), T0 + 1600, {
    preCount: 20, postCount: 21, preSeconds: 3600, postSeconds: 1600,
  }).pricePath, FROZEN_CONFIRMATION_CONFIG);

  assert.equal(outcome.evaluated, true);
  assert.equal(outcome.held, false, "a full retrace is the definition of a wick");
  assert.equal(outcome.retention, 0);
  assert.match(outcome.explanation, /This was a wick/);
});

test("the drawdown signal does not fire on a wick, however large the fall", () => {
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 180], // -1000 bps, five times the floor
    ...Array.from({ length: 20 }, (_, i) => [T0 + 60 + i * 60, 200] as [number, number]),
  ];
  // Velocity held flat so only the drawdown path is under test here.
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1600, {
      preCount: 20, postCount: 21, preSeconds: 3600, postSeconds: 3600,
    }),
  );

  assert.ok(result.signals.drawdown.value! >= FROZEN_CONFIRMATION_CONFIG.minDrawdownBps);
  assert.equal(result.signals.drawdown.fired, false, "size alone must not fire the signal");
  assert.ok(result.reasonCodes.includes("ANTI_WICK_FAILED"));
});

test("the retention boundary is exact on both sides", () => {
  // Fall of 10 (200 -> 190). Retaining exactly half means the price sits at 195 afterwards.
  const build = (priceAfter: number) => {
    const points: [number, number][] = [
      ...flatBaseline(),
      [T0 + 10, 190],
      ...Array.from({ length: 20 }, (_, i) => [T0 + 60 + i * 60, priceAfter] as [number, number]),
    ];
    return evaluateAntiWick(
      inputFor(windowOf(points), T0 + 1600, {
        preCount: 20, postCount: 21, preSeconds: 3600, postSeconds: 3600,
      }).pricePath,
      FROZEN_CONFIRMATION_CONFIG,
    );
  };

  const justBelow = build(195.1); // 49% retained
  assert.equal(justBelow.held, false);
  assert.ok(justBelow.retention! < FROZEN_CONFIRMATION_CONFIG.antiWickRetentionFraction);

  const exactlyAt = build(195); // 50% retained — the boundary is inclusive
  assert.equal(exactlyAt.held, true);

  const justAbove = build(194.9); // 51% retained
  assert.equal(justAbove.held, true);
});

test("a move that never falls has nothing to persist", () => {
  const rising: [number, number][] = Array.from(
    { length: 40 },
    (_, i) => [T0 + i * 60, 200 + i] as [number, number],
  );
  const outcome = evaluateAntiWick(
    inputFor(windowOf(rising), T0 + 2400, {
      preCount: 0, postCount: 40, preSeconds: 3600, postSeconds: 2400,
    }).pricePath,
    FROZEN_CONFIRMATION_CONFIG,
  );

  assert.equal(outcome.held, false);
  assert.match(outcome.explanation, /never fell/);
});

test("persistence cannot be assumed when the window ends before the hold elapses", () => {
  // Trough at +10, window ends at +200 — less than the 300s hold. Not knowing is not the
  // same as having persisted, so this must fail closed rather than pass on optimism.
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190],
    [T0 + 100, 190],
    [T0 + 200, 190],
  ];
  const outcome = evaluateAntiWick(
    inputFor(windowOf(points), T0 + 260, {
      preCount: 20, postCount: 3, preSeconds: 3600, postSeconds: 260,
    }).pricePath,
    FROZEN_CONFIRMATION_CONFIG,
  );

  assert.equal(outcome.evaluated, false);
  assert.equal(outcome.held, false);
  assert.match(outcome.explanation, /Not knowing is not the same as having persisted/);
});

// ===========================================================================================
// 2. Stale and unavailable OKX reference
// ===========================================================================================

function okxResult(availability: "AVAILABLE" | "STALE" | "UNAVAILABLE", price = "200"): ReferencePriceResult {
  return {
    availability,
    reason: availability === "AVAILABLE" ? "OK" : "NO_SAMPLE_AT_OR_BEFORE_QUERY_TIME",
    explanation: `synthetic ${availability}`,
    sample:
      availability === "UNAVAILABLE"
        ? null
        : {
            instrument: "wNVDAx",
            chain: "xlayer",
            address: POOL.token1,
            price,
            priceUnit: "USD",
            sourceTimeSec: T0 - 60,
            ingestedAtSec: T0 - 40,
            ingestionLagSec: 20,
          },
    observedAt: availability === "UNAVAILABLE" ? null : T0 - 60,
    ageSec: availability === "STALE" ? 99_999 : 60,
    maxAgeSec: FROZEN_CONFIRMATION_CONFIG.freshnessSeconds,
    rejects: [],
  } as ReferencePriceResult;
}

test("a stale OKX sample is never treated as an available reference leg", () => {
  const points = [...flatBaseline(), ...Array.from({ length: 20 },
    (_, i) => [T0 + i * 30, 200] as [number, number])];

  for (const availability of ["STALE", "UNAVAILABLE"] as const) {
    const result = confirmMarket(
      inputFor(windowOf(points), T0 + 600, {
        preCount: 20, postCount: 20, preSeconds: 3600, postSeconds: 600,
      }, okxResult(availability)),
    );

    assert.equal(result.okxLegAvailable, false, `${availability} must not read as available`);
    assert.equal(result.dualLegConfirmed, false);
    assert.equal(result.signals.basis.evaluated, false, "no basis may be computed without a leg");
    assert.ok(result.reasonCodes.includes("MARKET_DATA_UNAVAILABLE"));
  }
});

test("the OKX module's ceiling can never open the confirmation path", () => {
  // Exhaustive over the availability domain: no input yields CONFIRMED or NOT_CONFIRMED.
  const ceilings = (["AVAILABLE", "STALE", "UNAVAILABLE"] as const).map(confirmationCeiling);
  assert.deepEqual(ceilings, [null, "STALE", "UNAVAILABLE"]);
  for (const c of ceilings) {
    assert.notEqual(c, "CONFIRMED", "the data layer must not manufacture CONFIRMED");
    assert.notEqual(c, "NOT_CONFIRMED", "'did not corroborate' is a judgment only T3.3 makes");
  }
});

test("a single-leg confirmation is structurally marked as such", () => {
  // A genuine, persistent fall with the OKX leg absent. It may confirm, but it must not be
  // describable as dual-leg — that field is what stops an artifact overclaiming.
  const points: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 30 }, (_, i) => [T0 + 10 + i * 60, 194] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1810, {
      preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 1810,
    }),
  );

  assert.equal(result.status, "CONFIRMED");
  assert.equal(result.okxLegAvailable, false);
  assert.equal(result.dualLegConfirmed, false, "single-leg must never read as dual-leg");
  assert.match(result.explanation, /must not be described as dual-leg/);
});

// ===========================================================================================
// 3. Delayed / failing RPC — a holed window
// ===========================================================================================

test("an RPC-holed window is flagged, and a negative from it is not a clean negative", () => {
  const points = [...flatBaseline(), ...Array.from({ length: 20 },
    (_, i) => [T0 + i * 30, 200] as [number, number])];
  const holed = confirmMarket(
    inputFor(windowOf(points, 3), T0 + 600, {
      preCount: 20, postCount: 20, preSeconds: 3600, postSeconds: 3600,
    }),
  );

  assert.equal(holed.status, "NOT_CONFIRMED");
  assert.equal(holed.windowComplete, false);
  assert.match(holed.explanation, /not a clean one/);
});

test("a complete window records windowComplete, so the two are distinguishable", () => {
  const points = [...flatBaseline(), ...Array.from({ length: 20 },
    (_, i) => [T0 + i * 30, 200] as [number, number])];
  const clean = confirmMarket(
    inputFor(windowOf(points, 0), T0 + 600, {
      preCount: 20, postCount: 20, preSeconds: 3600, postSeconds: 3600,
    }),
  );

  assert.equal(clean.windowComplete, true);
  assert.doesNotMatch(clean.explanation, /not a clean one/);
});

test("a partial read cannot invent a stronger verdict than the complete window gives", () => {
  // Same flat price path; the holed variant simply has fewer observations. Dropping
  // observations must never manufacture a signal that the complete window did not show.
  // Counts are chosen to keep the velocity ratio at 1.33x — below its 2.0 threshold — so this
  // test isolates the effect of losing observations rather than tripping another signal.
  const longBaseline: [number, number][] = Array.from(
    { length: 60 }, (_, i) => [T0 - 3600 + i * 60, 200] as [number, number],
  );
  const full: [number, number][] = [
    ...longBaseline,
    ...Array.from({ length: 80 }, (_, i) => [T0 + i * 40, 200] as [number, number]),
  ];
  const sparse = full.filter((_, i) => i % 2 === 0); // 70 points — still above the sample floor

  const complete = confirmMarket(inputFor(windowOf(full, 0), T0 + 3200, {
    preCount: 60, postCount: 80, preSeconds: 3600, postSeconds: 3600,
  }));
  const holed = confirmMarket(inputFor(windowOf(sparse, 4), T0 + 3200, {
    preCount: 30, postCount: 40, preSeconds: 3600, postSeconds: 3600,
  }));

  assert.equal(complete.status, "NOT_CONFIRMED");
  assert.equal(holed.status, "NOT_CONFIRMED", "losing observations must not create a signal");
  assert.equal(holed.windowComplete, false);
});

test("a partial read that falls below the sample floor degrades to UNAVAILABLE, not upward", () => {
  // The fail-closed direction. Losing enough observations to drop under `minSwapsForVerdict`
  // must weaken the verdict to "we cannot say", never strengthen it — "we could not look" is
  // a more conservative answer than "we looked and saw nothing".
  const full: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 30 }, (_, i) => [T0 + i * 40, 200] as [number, number]),
  ];
  const sparse = full.filter((_, i) => i % 2 === 0); // 25 points — below the floor of 30

  const complete = confirmMarket(inputFor(windowOf(full, 0), T0 + 1200, {
    preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 3600,
  }));
  const holed = confirmMarket(inputFor(windowOf(sparse, 4), T0 + 1200, {
    preCount: 10, postCount: 15, preSeconds: 3600, postSeconds: 3600,
  }));

  assert.equal(complete.status, "NOT_CONFIRMED");
  assert.equal(holed.status, "UNAVAILABLE");
  assert.notEqual(holed.status, "CONFIRMED", "a hole must never open the confirmation path");
});

// ===========================================================================================
// 4. Thin liquidity — advisory only, never a gate
// ===========================================================================================

test("thin exit depth is recorded as advisory and neither confirms nor blocks", () => {
  // A genuine persistent fall, so the verdict rests on drawdown. Exit depth must not change it.
  const points: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 30 }, (_, i) => [T0 + 10 + i * 60, 194] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1810, {
      preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 1810,
    }),
  );

  assert.equal(result.exitDepth.advisoryOnly, true);
  assert.equal(result.exitDepth.isLowerBound, true, "T3.2 measures depth as a lower bound");
  assert.match(result.exitDepth.note, /not proof that liquidity is genuinely thin/);
  // The verdict came from drawdown, not from depth.
  assert.equal(result.signals.drawdown.fired, true);
  assert.equal(result.status, "CONFIRMED");
});

test("the config forbids exit depth from confirming at all", () => {
  // The guarantee is structural rather than incidental: T3.2's lower-bound measurement
  // over-states risk, so letting it confirm would manufacture false positives.
  assert.equal(FROZEN_CONFIRMATION_CONFIG.exitDepthMayConfirm, false);
});

test("real scenario windows carry the lower-bound warning on their depth readings", () => {
  for (const scenario of ["b", "c", "d"]) {
    const fixture = JSON.parse(
      readFileSync(join(fixturesDir, `pool-scenario-${scenario}-swaps.json`), "utf8"),
    ) as SwapWindowFixture;
    const telemetry = computePoolTelemetry(fixture, {
      nowUnixSeconds: fixture.toBlock + BLOCK_OFFSET,
    });
    if (telemetry.exitDepth) {
      assert.equal(telemetry.exitDepth.isLowerBound, true, `scenario ${scenario}`);
    }
  }
});

// ===========================================================================================
// 5. Missing route / empty window
// ===========================================================================================

test("an empty window is UNAVAILABLE with no fabricated metrics", () => {
  const empty = windowOf([]);
  const input = inputFor(empty, T0, { preCount: 0, postCount: 0, preSeconds: 3600, postSeconds: 3600 });
  input.pricePath = [];
  const result = confirmMarket(input);

  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.signals.drawdown.value, null, "absence must not read as zero");
  assert.equal(result.signals.velocity.value, null);
  assert.equal(result.observedAtUnixSeconds, null);
  assert.equal(result.dualLegConfirmed, false);
});

test("scenario A's real empty window resolves to UNAVAILABLE", () => {
  const fixture = JSON.parse(
    readFileSync(join(fixturesDir, "pool-scenario-a-swaps.json"), "utf8"),
  ) as SwapWindowFixture;
  assert.equal(fixture.swapCount, 0);
  assert.equal(fixture.rpcRangeErrors, 0, "an observed absence, not a failed query");

  const anchor = Math.floor(Date.parse("2026-07-27T20:33:00Z") / 1000);
  const result = confirmMarket(
    buildConfirmationInput(fixture, {
      anchorUnixSeconds: anchor,
      nowUnixSeconds: fixture.toBlock + BLOCK_OFFSET,
    }),
  );

  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.signals.drawdown.value, null);
});

test("a window below the minimum sample yields no verdict", () => {
  const justUnder = FROZEN_CONFIRMATION_CONFIG.minSwapsForVerdict - 1;
  const points: [number, number][] = Array.from(
    { length: justUnder },
    (_, i) => [T0 + i * 20, 200 - i] as [number, number],
  );
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + justUnder * 20, {
      preCount: 0, postCount: justUnder, preSeconds: 3600, postSeconds: 600,
    }),
  );

  assert.equal(result.status, "UNAVAILABLE");
  assert.match(result.explanation, /below the 30 required/);
  assert.equal(result.signals.drawdown.evaluated, false);
});

// ===========================================================================================
// 6. Conflicting signals and clock skew
// ===========================================================================================

test("a future-dated observation fails closed rather than reading as maximally fresh", () => {
  const points = [...flatBaseline(), ...Array.from({ length: 20 },
    (_, i) => [T0 + i * 30, 200] as [number, number])];
  // `now` is BEFORE the last observation — negative age.
  const result = confirmMarket(
    inputFor(windowOf(points), T0 - 5000, {
      preCount: 20, postCount: 20, preSeconds: 3600, postSeconds: 600,
    }),
  );

  assert.equal(result.fresh, false, "negative age must not satisfy the freshness bound");
  assert.equal(result.status, "STALE");
  assert.ok(result.ageSeconds! < 0);
});

test("an observation older than the freshness bound cannot satisfy a gate", () => {
  const points = Array.from({ length: 40 },
    (_, i) => [T0 - 7200 + i * 60, 200 - i] as [number, number]);
  const result = confirmMarket(
    inputFor(windowOf(points), T0, {
      preCount: 10, postCount: 30, preSeconds: 3600, postSeconds: 600,
    }),
  );

  assert.equal(result.status, "STALE");
  assert.ok(result.ageSeconds! > FROZEN_CONFIRMATION_CONFIG.freshnessSeconds);
  assert.equal(result.signals.drawdown.evaluated, false, "a stale window is not scored");
});

test("a zero pre-anchor baseline yields no velocity ratio rather than infinite abnormality", () => {
  const points: [number, number][] = Array.from(
    { length: 40 },
    (_, i) => [T0 + i * 15, 200] as [number, number],
  );
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 600, {
      preCount: 0, postCount: 40, preSeconds: 3600, postSeconds: 600,
    }),
  );

  assert.equal(result.signals.velocity.value, null);
  assert.equal(result.signals.velocity.fired, false, "no baseline means nothing to call abnormal");
  assert.match(result.signals.velocity.explanation, /no baseline/);
});

test("conflicting signals do not average into a confirmation", () => {
  // Drawdown clears the floor but is a wick; velocity collapses to a third of baseline.
  // Neither signal is entitled to fire, so the verdict must be negative.
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190],
    ...Array.from({ length: 12 }, (_, i) => [T0 + 60 + i * 120, 200] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1800, {
      preCount: 20, postCount: 13, preSeconds: 3600, postSeconds: 7200,
    }),
  );

  assert.equal(result.signals.drawdown.fired, false, "wick");
  assert.equal(result.signals.velocity.fired, false, "activity fell");
  assert.equal(result.status, "NOT_CONFIRMED");
});

// ===========================================================================================
// 7. The structural guarantee: only T3.3 may say CONFIRMED
// ===========================================================================================

test("pool telemetry never returns CONFIRMED, on any fixture including adversarial ones", () => {
  const adversarial: SwapWindowFixture[] = [
    windowOf([]),
    windowOf([[T0, 200]]),
    windowOf(Array.from({ length: 200 }, (_, i) => [T0 + i, 200 - i * 0.5] as [number, number])),
    windowOf(Array.from({ length: 50 }, (_, i) => [T0 + i * 10, 1e6] as [number, number])),
    windowOf(Array.from({ length: 50 }, (_, i) => [T0 + i * 10, 1e-6] as [number, number])),
  ];

  const seen = new Set<ConfirmationStatus>();
  for (const fixture of adversarial) {
    seen.add(computePoolTelemetry(fixture, { nowUnixSeconds: T0 + 10_000 }).marketDataStatus);
  }
  for (const scenario of ["a", "b", "c", "d"]) {
    const fixture = JSON.parse(
      readFileSync(join(fixturesDir, `pool-scenario-${scenario}-swaps.json`), "utf8"),
    ) as SwapWindowFixture;
    seen.add(
      computePoolTelemetry(fixture, { nowUnixSeconds: fixture.toBlock + BLOCK_OFFSET })
        .marketDataStatus,
    );
  }

  assert.equal(seen.has("CONFIRMED"), false, "the data layer must not manufacture CONFIRMED");
  assert.ok(seen.size > 1, "the sweep should exercise more than one outcome");
});

// ===========================================================================================
// 8. F1 and F2 — the two defects, now CLOSED under rule `tinjau.confirm/2.0.0`
// ===========================================================================================

/**
 * These four tests were committed as `{ todo: true }` assertions of the CORRECT behaviour while
 * the engine was still defective. The engine was fixed in T3.4 and the markers are off; they
 * are ordinary regression tests now.
 *
 *   F1 (critical) — `velocity` bypassed the anti-wick gate entirely.
 *   F2 (high)     — anti-wick sampled persistence at exactly ONE point in time.
 *
 * The fix: anti-wick is a NECESSARY condition for any `CONFIRMED`, and persistence is the
 * MEDIAN retention across the whole hold interval rather than the value at one endpoint.
 * `§9` below proves the gate did not simply become inert.
 */

/**
 * F1 (CRITICAL, closed). Under 1.0.0 the verdict was `drawdown.fired || velocity.fired ||
 * basis.fired` and the gate applied to `drawdown` alone, so a price spike that fully retraced
 * still confirmed: the burst of trading that accompanies virtually every spike fired the
 * ungated `velocity` signal instead.
 */
test("F1: a fully-retraced spike must not confirm, even when it brings a trading burst", () => {
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190], // -500 bps
    ...Array.from({ length: 20 }, (_, i) => [T0 + 20 + i * 60, 200] as [number, number]),
  ];
  // Post-anchor trading is ~3x the pre-anchor rate, as a real spike's burst would be.
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1240, {
      preCount: 20, postCount: 21, preSeconds: 3600, postSeconds: 1240,
    }),
  );

  assert.equal(result.antiWick.held, false, "the fall fully retraced");
  assert.equal(result.signals.drawdown.fired, false, "and the drawdown signal correctly refused");
  // The velocity ratio genuinely cleared its own bar, so this proves the GATE, not an accident
  // of the fixture. Under 1.0.0 this alone made the verdict CONFIRMED.
  assert.ok(
    result.signals.velocity.value! >= FROZEN_CONFIRMATION_CONFIG.minVelocityRatio,
    "the trading burst really did double the rate",
  );
  assert.equal(result.signals.velocity.fired, false, "but it may not count without persistence");
  assert.equal(result.status, "NOT_CONFIRMED");
  assert.ok(result.reasonCodes.includes("ANTI_WICK_FAILED"));
  assert.match(result.explanation, /can never create one/);
});

/**
 * F1b. The same defect in its purest form: velocity confirmed with a COMPLETELY FLAT price.
 * No drawdown at all, no dislocation of any kind — only a burst of trades.
 */
test("F1b: a trading burst with no price movement whatsoever must not confirm", () => {
  const points: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 30 }, (_, i) => [T0 + i * 20, 200] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 600, {
      preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 600,
    }),
  );

  assert.equal(result.signals.drawdown.value, 0, "the price never moved");
  assert.ok(result.signals.velocity.value! >= FROZEN_CONFIRMATION_CONFIG.minVelocityRatio);
  assert.equal(result.antiWick.held, false, "a flat price has no dislocation to persist");
  assert.match(result.antiWick.explanation, /never fell/);
  assert.equal(
    result.status,
    "NOT_CONFIRMED",
    "a market with a flat price has not corroborated anything",
  );
});

/**
 * Both defects, replayed through `buildConfirmationInput` — the same adapter production would
 * use — rather than through this file's synthetic helper.
 *
 * This is the check that matters most: it proves the fix is a property of the engine and not an
 * artifact of how the tests construct their inputs. Both fixtures returned `CONFIRMED` here
 * under rule 1.0.0.
 */
test("F1+F2 are closed through the production adapter, not just the test harness", () => {
  for (const name of [
    "degraded-f1-wick-with-volume-burst",
    "degraded-f2-single-point-persistence",
  ]) {
    const fixture = JSON.parse(
      readFileSync(join(fixturesDir, `${name}.json`), "utf8"),
    ) as SwapWindowFixture & { _anchorUnixSeconds: number };

    const result = confirmMarket(
      buildConfirmationInput(fixture, {
        anchorUnixSeconds: fixture._anchorUnixSeconds,
        nowUnixSeconds: fixture.toBlock + BLOCK_OFFSET,
      }),
    );

    assert.equal(
      result.status,
      "NOT_CONFIRMED",
      `${name}: a retraced spike must not confirm through the production path either`,
    );
    assert.equal(result.antiWick.held, false, `${name}`);
    assert.equal(result.ruleVersion, "tinjau.confirm/2.0.0");
  }
});

/**
 * F2 (HIGH, closed). `evaluateAntiWick` used to sample persistence at exactly ONE point — the
 * first observation at least `antiWickHoldSeconds` after the trough. A single momentary re-dip
 * at that instant read as full persistence, even when the price recovered before it and
 * recovered again immediately after. Cost to an attacker: one trade.
 *
 * The control is the same path without that trade. Under 1.0.0 the control retained 0% and the
 * variant retained 98%; under 2.0.0 both are medians over the hold interval and both refuse.
 */
test("F2: persistence is assessed over the hold interval, not sampled at one instant", () => {
  const base: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190], // trough
    ...Array.from({ length: 5 }, (_, i) => [T0 + 60 + i * 50, 200] as [number, number]), // recovered
  ];
  const tail: [number, number][] = Array.from(
    { length: 12 }, (_, i) => [T0 + 380 + i * 60, 200] as [number, number], // still recovered
  );

  const control = evaluateAntiWick(
    inputFor(windowOf([...base, ...tail]), T0 + 1100, {
      preCount: 20, postCount: 18, preSeconds: 3600, postSeconds: 1100,
    }).pricePath,
    FROZEN_CONFIRMATION_CONFIG,
  );
  assert.equal(control.held, false, "control: the price recovered, so this is a wick");

  // One extra trade, timed at the old sampling instant. It is a single observation, so it
  // cannot move a median.
  const withDip = evaluateAntiWick(
    inputFor(windowOf([...base, [T0 + 315, 190.2], ...tail]), T0 + 1100, {
      preCount: 20, postCount: 19, preSeconds: 3600, postSeconds: 1100,
    }).pricePath,
    FROZEN_CONFIRMATION_CONFIG,
  );

  assert.equal(withDip.held, false, "one re-dip must not buy persistence");
  assert.equal(withDip.retentionMethod, "MEDIAN_OVER_HOLD_INTERVAL");
  assert.equal(control.retention, withDip.retention, "one extra trade changed nothing");
});

/**
 * F2b. The attack retimed to land INSIDE the hold interval rather than just past its end.
 * A median is indifferent to where the single observation sits; an endpoint sample was not.
 */
test("F2b: a re-dip anywhere inside the hold interval still cannot buy persistence", () => {
  const base: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190], // trough
    ...Array.from({ length: 5 }, (_, i) => [T0 + 60 + i * 50, 200] as [number, number]),
  ];
  const tail: [number, number][] = Array.from(
    { length: 12 }, (_, i) => [T0 + 380 + i * 60, 200] as [number, number],
  );

  for (const dipAt of [T0 + 65, T0 + 155, T0 + 260, T0 + 305]) {
    const withDip: [number, number][] = [
      ...base,
      [dipAt, 190.2] as [number, number],
      ...tail,
    ].sort((a, b) => a[0] - b[0]);
    const outcome = evaluateAntiWick(
      inputFor(windowOf(withDip), T0 + 1100, {
        preCount: 20, postCount: 19, preSeconds: 3600, postSeconds: 1100,
      }).pricePath,
      FROZEN_CONFIRMATION_CONFIG,
    );
    assert.equal(outcome.held, false, `a single re-dip at +${dipAt - T0}s must not hold`);
  }
});

/**
 * The fail-closed direction for the new interval. `retention` is now a statistic across the
 * hold interval, and a statistic over one point is exactly the defect that was removed — so an
 * interval too sparse to summarise is `evaluated: false`, never `held: true`.
 */
test("an interval with too few observations fails closed rather than reading as persistence", () => {
  // Trough at +10, then a single observation inside the 300s interval, then the window
  // continues well past it so the "window ended too early" branch is not what fires.
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 190],
    [T0 + 200, 190],
    ...Array.from({ length: 12 }, (_, i) => [T0 + 400 + i * 60, 190] as [number, number]),
  ];
  const outcome = evaluateAntiWick(
    inputFor(windowOf(points), T0 + 1200, {
      preCount: 20, postCount: 14, preSeconds: 3600, postSeconds: 1200,
    }).pricePath,
    FROZEN_CONFIRMATION_CONFIG,
  );

  assert.equal(outcome.samplesInHold, 1);
  assert.equal(outcome.evaluated, false, "one point is a sample, not an interval");
  assert.equal(outcome.held, false);
  assert.match(outcome.explanation, /Not knowing is not the same as having persisted/);
});

// ===========================================================================================
// 9. The gate must not be inert — a genuine dislocation still confirms
// ===========================================================================================

/**
 * Replacing a false-positive defect with a blanket refusal would be replacing one defect with
 * another. So the same shape that §8 refuses is run again with the ONE property that separates
 * a wick from a dislocation — the price stays down — and it must confirm.
 */
test("a genuine persistent dislocation still confirms on drawdown", () => {
  // -300 bps, and it stays there for the whole hold interval and beyond.
  const points: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 30 }, (_, i) => [T0 + 10 + i * 60, 194] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1810, {
      preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 1810,
    }),
  );

  assert.equal(result.antiWick.held, true);
  assert.equal(result.antiWick.retention, 1, "none of the fall was given back");
  assert.ok(result.antiWick.samplesInHold >= FROZEN_CONFIRMATION_CONFIG.antiWickMinSamples);
  assert.equal(result.signals.drawdown.fired, true);
  assert.equal(result.status, "CONFIRMED");
  assert.ok(result.reasonCodes.includes("MARKET_CONFIRMED"));
  assert.equal(result.reasonCodes.includes("ANTI_WICK_FAILED"), false);
});

/**
 * The corroboration case: velocity may still contribute, and does, once a persistent price
 * dislocation is there for it to corroborate. This is the difference between "velocity is
 * gated" and "velocity is dead".
 */
test("velocity corroborates a persistent dislocation instead of substituting for one", () => {
  // Same persistent -300 bps fall, now with a trading burst on top of it.
  const points: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 60 }, (_, i) => [T0 + 10 + i * 20, 194] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1220, {
      preCount: 20, postCount: 60, preSeconds: 3600, postSeconds: 1220,
    }),
  );

  assert.ok(result.signals.velocity.value! >= FROZEN_CONFIRMATION_CONFIG.minVelocityRatio);
  assert.equal(result.antiWick.held, true);
  assert.equal(result.signals.velocity.fired, true, "with persistence present, it may count");
  assert.equal(result.status, "CONFIRMED");
});

/**
 * A tolerance check in the direction the MEDIAN was chosen for, and the reason the minimum was
 * rejected: one counter-trade inside the hold interval must not destroy a genuine dislocation.
 * Under a minimum-across-the-interval rule this single bounce would refuse, handing an
 * adversary a one-trade suppression attack mirroring the one F2 removed.
 */
test("a single counter-trade inside the hold interval does not destroy a real dislocation", () => {
  const points: [number, number][] = [
    ...flatBaseline(),
    ...Array.from({ length: 30 }, (_, i) => [T0 + 10 + i * 60, 194] as [number, number]),
  ];
  // One observation bounces almost all the way back, then the dislocation resumes.
  const withBounce = [...points, [T0 + 155, 199.9] as [number, number]].sort((a, b) => a[0] - b[0]);

  const outcome = evaluateAntiWick(
    inputFor(windowOf(withBounce), T0 + 1810, {
      preCount: 20, postCount: 31, preSeconds: 3600, postSeconds: 1810,
    }).pricePath,
    FROZEN_CONFIRMATION_CONFIG,
  );

  assert.ok(outcome.minRetention! < FROZEN_CONFIRMATION_CONFIG.antiWickRetentionFraction,
    "the minimum across the interval would have refused");
  assert.equal(outcome.held, true, "the median is not moved by one observation");
});

// ===========================================================================================
// 10. INSUFFICIENT_SAMPLE — "too few trades to judge" is not "could not look"
// ===========================================================================================

test("a below-floor window says INSUFFICIENT_SAMPLE, not just MARKET_DATA_UNAVAILABLE", () => {
  const justUnder = FROZEN_CONFIRMATION_CONFIG.minSwapsForVerdict - 1;
  const points: [number, number][] = Array.from(
    { length: justUnder },
    (_, i) => [T0 + i * 20, 200 - i] as [number, number],
  );
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + justUnder * 20, {
      preCount: 0, postCount: justUnder, preSeconds: 3600, postSeconds: 600,
    }),
  );

  // The status is unchanged — only the reason it gives for itself is now accurate.
  assert.equal(result.status, "UNAVAILABLE");
  assert.ok(result.reasonCodes.includes("INSUFFICIENT_SAMPLE"));
});

// ===========================================================================================
// 11. ANTI_WICK_FAILED vs PERSISTENCE_UNOBSERVED — "it retraced" is not "we could not tell"
// ===========================================================================================

/**
 * `ANTI_WICK_FAILED` (bit 12) is a POSITIVE finding: the hold interval was watched and the move
 * retraced, so it was a spike. `PERSISTENCE_UNOBSERVED` (bit 22) means the interval was
 * unreachable or too sparse, so persistence was never observed either way.
 *
 * Before bit 22 existed the second case explained itself only in prose. These tests are what
 * make the distinction machine-readable — and what stop the engine from asserting a retracement
 * nobody saw.
 */

/** ≥30 swaps and fresh, so gates 1 and 2 both pass and the verdict block is actually reached. */
function longBaselineAt(price: number, count = 35, step = 100): [number, number][] {
  return Array.from(
    { length: count },
    (_, i) => [T0 - step * count + i * step, price] as [number, number],
  );
}

test("a window that ends before the hold elapses says PERSISTENCE_UNOBSERVED, not ANTI_WICK_FAILED", () => {
  // A -500 bps fall that clears the drawdown floor, with the window ending 200s after the
  // trough — 100s short of the 300s hold. Nobody watched it retrace, so nobody may say it did.
  const points: [number, number][] = [
    ...longBaselineAt(200),
    [T0, 190],
    [T0 + 100, 190],
    [T0 + 200, 190],
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 260, {
      preCount: 35, postCount: 3, preSeconds: 3600, postSeconds: 260,
    }),
  );

  assert.equal(result.status, "NOT_CONFIRMED", "gates 1 and 2 passed; this is a real verdict");
  assert.equal(result.antiWick.evaluated, false);
  assert.ok(result.signals.drawdown.value! >= FROZEN_CONFIRMATION_CONFIG.minDrawdownBps,
    "a signal did clear its own bar, so the refusal is the gate's");
  assert.ok(result.reasonCodes.includes("PERSISTENCE_UNOBSERVED"));
  assert.equal(
    result.reasonCodes.includes("ANTI_WICK_FAILED"),
    false,
    "asserting a retracement nobody observed would be a claim we did not verify",
  );
  assert.match(result.explanation, /could not be shown to persist/);
});

test("a hold interval too sparse to summarise also says PERSISTENCE_UNOBSERVED", () => {
  // The window DOES reach past trough + 300s, so the previous branch is not what fires. There
  // is simply one observation inside the interval, and one point is a sample, not an interval.
  const points: [number, number][] = [
    ...longBaselineAt(200),
    [T0, 190],
    [T0 + 200, 190],
    ...Array.from({ length: 6 }, (_, i) => [T0 + 400 + i * 60, 190] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 800, {
      preCount: 35, postCount: 8, preSeconds: 3600, postSeconds: 800,
    }),
  );

  assert.equal(result.antiWick.samplesInHold, 1);
  assert.equal(result.antiWick.evaluated, false);
  assert.equal(result.status, "NOT_CONFIRMED");
  assert.ok(result.reasonCodes.includes("PERSISTENCE_UNOBSERVED"));
  assert.equal(result.reasonCodes.includes("ANTI_WICK_FAILED"), false);
});

test("a measured retracement says ANTI_WICK_FAILED, not PERSISTENCE_UNOBSERVED", () => {
  // The mirror case: the interval was watched, and the move gave the fall back.
  const points: [number, number][] = [
    ...flatBaseline(),
    [T0 + 10, 180],
    ...Array.from({ length: 20 }, (_, i) => [T0 + 60 + i * 60, 200] as [number, number]),
  ];
  const result = confirmMarket(
    inputFor(windowOf(points), T0 + 1300, {
      preCount: 20, postCount: 21, preSeconds: 3600, postSeconds: 3600,
    }),
  );

  assert.equal(result.antiWick.evaluated, true);
  assert.equal(result.antiWick.held, false);
  assert.ok(result.reasonCodes.includes("ANTI_WICK_FAILED"));
  assert.equal(result.reasonCodes.includes("PERSISTENCE_UNOBSERVED"), false);
});

test("the two persistence codes are mutually exclusive on every shape tried", () => {
  // Structural rather than incidental: one requires `evaluated: true`, the other `false`. This
  // sweep is the check that the implementation actually matches that claim.
  const shapes: { label: string; points: [number, number][]; now: number; seg: Segments }[] = [
    {
      label: "measured retracement",
      points: [
        ...flatBaseline(),
        [T0 + 10, 180],
        ...Array.from({ length: 20 }, (_, i) => [T0 + 60 + i * 60, 200] as [number, number]),
      ],
      now: T0 + 1300,
      seg: { preCount: 20, postCount: 21, preSeconds: 3600, postSeconds: 3600 },
    },
    {
      label: "window ends before the hold",
      points: [...longBaselineAt(200), [T0, 190], [T0 + 100, 190], [T0 + 200, 190]],
      now: T0 + 260,
      seg: { preCount: 35, postCount: 3, preSeconds: 3600, postSeconds: 260 },
    },
    {
      label: "sparse hold interval",
      points: [
        ...longBaselineAt(200),
        [T0, 190],
        [T0 + 200, 190],
        ...Array.from({ length: 6 }, (_, i) => [T0 + 400 + i * 60, 190] as [number, number]),
      ],
      now: T0 + 800,
      seg: { preCount: 35, postCount: 8, preSeconds: 3600, postSeconds: 800 },
    },
    {
      label: "persistent dislocation",
      points: [
        ...flatBaseline(),
        ...Array.from({ length: 30 }, (_, i) => [T0 + 10 + i * 60, 194] as [number, number]),
      ],
      now: T0 + 1810,
      seg: { preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 1810 },
    },
    {
      label: "flat price with a trading burst",
      points: [
        ...flatBaseline(),
        ...Array.from({ length: 30 }, (_, i) => [T0 + i * 20, 200] as [number, number]),
      ],
      now: T0 + 600,
      seg: { preCount: 20, postCount: 30, preSeconds: 3600, postSeconds: 600 },
    },
  ];

  const seen = new Set<string>();
  for (const shape of shapes) {
    const result = confirmMarket(inputFor(windowOf(shape.points), shape.now, shape.seg));
    const failed = result.reasonCodes.includes("ANTI_WICK_FAILED");
    const unobserved = result.reasonCodes.includes("PERSISTENCE_UNOBSERVED");

    assert.equal(failed && unobserved, false, `${shape.label}: both codes fired at once`);
    // And each code agrees with the outcome it describes.
    if (failed) assert.equal(result.antiWick.evaluated, true, shape.label);
    if (unobserved) assert.equal(result.antiWick.evaluated, false, shape.label);
    if (failed) seen.add("failed");
    if (unobserved) seen.add("unobserved");
  }

  assert.equal(seen.size, 2, "the sweep must actually exercise both codes, not neither");
});

test("scenario A's empty window is INSUFFICIENT_SAMPLE too: it was looked at and found empty", () => {
  const fixture = JSON.parse(
    readFileSync(join(fixturesDir, "pool-scenario-a-swaps.json"), "utf8"),
  ) as SwapWindowFixture;
  const result = confirmMarket(
    buildConfirmationInput(fixture, {
      anchorUnixSeconds: Math.floor(Date.parse("2026-07-27T20:33:00Z") / 1000),
      nowUnixSeconds: fixture.toBlock + BLOCK_OFFSET,
    }),
  );

  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(fixture.rpcRangeErrors, 0, "the query succeeded; there simply were no trades");
  assert.ok(result.reasonCodes.includes("INSUFFICIENT_SAMPLE"));
});
