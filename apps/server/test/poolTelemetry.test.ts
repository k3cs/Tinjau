/**
 * X Layer pool telemetry and executable exit depth (task T3.2).
 *
 * Acceptance criteria being proven:
 *   - every metric carries block/time provenance and units;
 *   - builder-controlled liquidity is labelled;
 *   - RPC retry and range limits are handled.
 *
 * Everything runs against committed fixtures captured from chain 196 — no test here touches
 * the network. The one function that does I/O takes its transport as a parameter, so the
 * retry and chunking behaviour is exercised with a fake that can be made to fail on demand.
 *
 * The load-bearing case is scenario A. Its window contains zero swaps, and the suite asserts
 * that this surfaces as an explicit `UNAVAILABLE` with every derived metric `null` — never a
 * price of zero, never an empty-but-successful result.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePoolTelemetry,
  computeExitDepth,
  decodeFixtureSwaps,
  priceFromSqrtPriceX96,
  swapAmounts,
  quoteExit,
  fetchSwapWindow,
  blockToUnixSeconds,
  unixSecondsToBlock,
  blockToIso,
  sqrtPriceX96AtTick,
  XLAYER_BLOCK_TIMESTAMP_OFFSET,
  THIN_WINDOW_SWAP_THRESHOLD,
  MAX_LOG_RANGE_BLOCKS,
  SWAP_TOPIC0,
  type SwapWindowFixture,
  type PoolDescriptor,
  type Measured,
  type RawSwap,
} from "../src/market/poolTelemetry.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "market", "fixtures");

function loadFixture(scenario: string): SwapWindowFixture {
  return JSON.parse(
    readFileSync(join(fixturesDir, `pool-scenario-${scenario}-swaps.json`), "utf8"),
  ) as SwapWindowFixture;
}

function hasFixture(scenario: string): boolean {
  return existsSync(join(fixturesDir, `pool-scenario-${scenario}-swaps.json`));
}

const A = loadFixture("a");
const C = loadFixture("c");
const D = loadFixture("d");

// ---------------------------------------------------------------------------
// Scenario A — an observed absence, not a fabricated zero
// ---------------------------------------------------------------------------

test("a window with zero swaps reports UNAVAILABLE and derives nothing", () => {
  assert.equal(A.swapCount, 0, "scenario A's window is empty; that is the point of this case");

  const t = computePoolTelemetry(A);

  assert.equal(t.marketDataStatus, "UNAVAILABLE");
  assert.equal(t.quality, "INSUFFICIENT");
  assert.equal(t.swapCount, 0);

  // Every derived metric must be null. A zero here would be indistinguishable from a real
  // measurement of zero, and the two mean completely different things.
  assert.equal(t.openPrice, null);
  assert.equal(t.closePrice, null);
  assert.equal(t.highPrice, null);
  assert.equal(t.lowPrice, null);
  assert.equal(t.maxDrawdownBps, null);
  assert.equal(t.netChangeBps, null);
  assert.equal(t.tradeVelocity, null);
  assert.equal(t.volumeQuote, null);
  assert.equal(t.exitDepth, null);

  // And the note must say this was observed, not that the query failed.
  assert.match(t.availabilityNote, /observed absence, not a failed query/);
  assert.equal(t.rpcRangeErrors, 0, "no range failed, so the emptiness is real");
});

test("a window with a single swap still refuses to derive window metrics", () => {
  // One observation cannot produce a drawdown or a velocity — there is no interval.
  const oneSwap: SwapWindowFixture = { ...D, swaps: D.swaps.slice(0, 1), swapCount: 1 };
  const t = computePoolTelemetry(oneSwap);

  assert.equal(t.marketDataStatus, "UNAVAILABLE");
  assert.equal(t.quality, "INSUFFICIENT");
  assert.equal(t.maxDrawdownBps, null);
  assert.equal(t.tradeVelocity, null);
  assert.match(t.availabilityNote, /below the 2 needed/);
});

// ---------------------------------------------------------------------------
// Telemetry never confirms
// ---------------------------------------------------------------------------

test("telemetry never returns CONFIRMED, whatever the data looks like", () => {
  // The one value that opens the aggressive fee path must be unreachable from the data layer.
  // Confirmation is the confirmation engine's decision (T3.3), and making that structural
  // means telemetry cannot manufacture one even by accident.
  for (const fixture of [A, C, D]) {
    const t = computePoolTelemetry(fixture);
    assert.notEqual(t.marketDataStatus, "CONFIRMED", `${fixture.scenarioId} returned CONFIRMED`);
  }
});

test("an observation older than the freshness bound is reported STALE", () => {
  const lastBlock = Number(D.swaps[D.swaps.length - 1][0]);
  const observedAt = blockToUnixSeconds(lastBlock);

  const fresh = computePoolTelemetry(D, { nowUnixSeconds: observedAt + 60 });
  assert.equal(fresh.marketDataStatus, "NOT_CONFIRMED");

  const stale = computePoolTelemetry(D, { nowUnixSeconds: observedAt + 16 * 60 });
  assert.equal(stale.marketDataStatus, "STALE");
  assert.match(stale.availabilityNote, /beyond the 900s freshness bound/);

  // Clock skew must fail closed rather than read as fresh.
  const skewed = computePoolTelemetry(D, { nowUnixSeconds: observedAt - 60 });
  assert.equal(skewed.marketDataStatus, "STALE");
});

// ---------------------------------------------------------------------------
// Provenance and units on every metric
// ---------------------------------------------------------------------------

test("every emitted metric carries a block, a timestamp, a unit, and its pool", () => {
  const t = computePoolTelemetry(D);
  const metrics: [string, Measured<string> | null][] = [
    ["openPrice", t.openPrice],
    ["closePrice", t.closePrice],
    ["highPrice", t.highPrice],
    ["lowPrice", t.lowPrice],
    ["maxDrawdownBps", t.maxDrawdownBps],
    ["netChangeBps", t.netChangeBps],
    ["tradeVelocity", t.tradeVelocity],
    ["volumeQuote", t.volumeQuote],
    ["exitDepth.spotPrice", t.exitDepth!.spotPrice],
    ["exitDepth.liquidity", t.exitDepth!.liquidity],
    ["exitDepth.maxSellWithinTickRange", t.exitDepth!.maxSellWithinTickRange],
    ["exitDepth.maxSellProceeds", t.exitDepth!.maxSellProceeds],
  ];

  for (const [name, m] of metrics) {
    assert.ok(m, `${name} is missing`);
    assert.ok(Number.isFinite(m.value), `${name} is not a finite number`);
    assert.ok(m.unit.length > 0, `${name} has no unit`);
    assert.ok(m.provenance.blockNumber > 0, `${name} has no block`);
    assert.match(m.provenance.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${name} timestamp`);
    assert.equal(m.provenance.chainId, 196, `${name} chainId`);
    assert.equal(m.provenance.pool.toLowerCase(), D.pool.toLowerCase(), `${name} pool`);

    // The block a metric claims must actually be inside the window it was derived from.
    assert.ok(
      m.provenance.blockNumber >= D.fromBlock && m.provenance.blockNumber <= D.toBlock,
      `${name} cites block ${m.provenance.blockNumber} outside the window`,
    );
  }
});

test("units name what each number actually is", () => {
  const t = computePoolTelemetry(D);
  assert.equal(t.openPrice!.unit, "quotePerBase");
  assert.equal(t.maxDrawdownBps!.unit, "bps");
  assert.equal(t.tradeVelocity!.unit, "swapsPerMinute");
  assert.equal(t.volumeQuote!.unit, "quoteTokens");
  assert.equal(t.exitDepth!.liquidity.unit, "rawL");
  assert.equal(t.exitDepth!.maxSellWithinTickRange.unit, "baseTokens");
});

// ---------------------------------------------------------------------------
// Liquidity source labelling
// ---------------------------------------------------------------------------

test("chain-196 liquidity is labelled third-party on every metric", () => {
  const t = computePoolTelemetry(D);
  assert.equal(D.liquiditySource, "THIRD_PARTY");
  assert.equal(t.openPrice!.provenance.liquiditySource, "THIRD_PARTY");
  assert.equal(t.exitDepth!.spotPrice.provenance.liquiditySource, "THIRD_PARTY");
});

test("builder-controlled liquidity propagates its label into every metric", () => {
  // The chain-1952 demo pool is the team's own. Tracker §15 requires it never be presented as
  // evidence about a real market, so the label has to travel with each number rather than
  // living only in a README.
  const builderPool: SwapWindowFixture = {
    ...D,
    chainId: 1952,
    liquiditySource: "BUILDER_CONTROLLED",
    pool: "0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080",
  };
  const t = computePoolTelemetry(builderPool);

  for (const m of [t.openPrice!, t.volumeQuote!, t.exitDepth!.liquidity]) {
    assert.equal(m.provenance.liquiditySource, "BUILDER_CONTROLLED");
    assert.equal(m.provenance.chainId, 1952);
  }
});

// ---------------------------------------------------------------------------
// Price arithmetic matches the pinned formula
// ---------------------------------------------------------------------------

test("price is derived by the formula the benchmark pins, with orientation from the pool", () => {
  const swaps = decodeFixtureSwaps(D);
  const price = priceFromSqrtPriceX96(swaps[0].sqrtPriceX96, D);

  // NVDA traded around $220-230 in this window; a price near 0.0045 would mean the quote
  // orientation was inverted, which is the exact failure `quoteIsToken0` exists to prevent.
  assert.ok(price > 150 && price < 350, `price ${price} is not a plausible NVDA quote`);

  // Inverting the orientation must invert the price, proving the flag is load-bearing.
  const inverted = priceFromSqrtPriceX96(swaps[0].sqrtPriceX96, { ...D, quoteIsToken0: false });
  assert.ok(Math.abs(inverted - 1 / price) / (1 / price) < 1e-9);
});

test("the fixture's quote orientation was derived live, not assumed", () => {
  assert.equal(D.quoteIsToken0, true);
  assert.equal(D.token0Symbol, "USDG");
  assert.equal(D.token1Symbol, "wNVDAx");
  assert.match(String((D as any)._quoteDerivation), /Derived live/);
});

test("swap amounts are signed, scaled by decimals, and split quote from base", () => {
  const swaps = decodeFixtureSwaps(D);
  const buy = swaps.find((s) => Number(s.amount0) > 0)!;
  const { quoteDelta, baseDelta } = swapAmounts(buy, D);

  // Quote in, base out: the signs must be opposite.
  assert.ok(quoteDelta > 0, "quote flowed into the pool");
  assert.ok(baseDelta < 0, "base flowed out");

  // The implied price of the trade should sit near the pool's spot price.
  const implied = Math.abs(quoteDelta / baseDelta);
  const spot = priceFromSqrtPriceX96(buy.sqrtPriceX96, D);
  assert.ok(Math.abs(implied - spot) / spot < 0.05, `implied ${implied} vs spot ${spot}`);
});

// ---------------------------------------------------------------------------
// Executable exit depth
// ---------------------------------------------------------------------------

test("a size inside the current tick range quotes exactly, with slippage below spot", () => {
  const swaps = decodeFixtureSwaps(D);
  const last = swaps[swaps.length - 1];
  const depth = computeExitDepth(last, D, [], D.toBlock);

  const small = depth.maxSellWithinTickRange.value / 4;
  const quote = quoteExit(last, D, small);

  assert.equal(quote.status, "EXACT");
  assert.ok(quote.proceedsQuote! > 0);
  // A seller always realises less than spot — that is what slippage means. A negative value
  // would mean the pool paid a premium for taking size, which cannot happen.
  assert.ok(quote.slippageBps! > 0, "selling into the pool must cost something");
  assert.ok(quote.realisedPrice! < depth.spotPrice.value);
});

test("a size that would cross a tick boundary refuses to quote rather than extrapolating", () => {
  const swaps = decodeFixtureSwaps(D);
  const last = swaps[swaps.length - 1];
  const depth = computeExitDepth(last, D, [], D.toBlock);

  const tooBig = depth.maxSellWithinTickRange.value * 10;
  const quote = quoteExit(last, D, tooBig);

  assert.equal(quote.status, "OUT_OF_RANGE");
  assert.equal(quote.proceedsQuote, null);
  assert.equal(quote.realisedPrice, null);
  assert.equal(quote.slippageBps, null);
  // An admitted gap beats an approximation presented as a quote.
  assert.match(quote.explanation, /tick bitmap/);
});

test("exit depth declares itself a lower bound, because it under-states depth", () => {
  const t = computePoolTelemetry(D);
  const depth = t.exitDepth!;

  assert.equal(depth.isLowerBound, true);
  // The direction of the error matters and must be stated: under-stating depth over-states
  // risk, so a thin reading here is not proof that exit liquidity is genuinely thin.
  assert.match(depth.method, /UNDER-states available depth, which OVER-states risk/);
});

test("larger exit sizes realise strictly worse prices", () => {
  const swaps = decodeFixtureSwaps(D);
  const last = swaps[swaps.length - 1];
  const max = computeExitDepth(last, D, [], D.toBlock).maxSellWithinTickRange.value;

  const sizes = [max / 8, max / 4, max / 2];
  const realised = sizes.map((s) => quoteExit(last, D, s).realisedPrice!);

  for (let i = 1; i < realised.length; i++) {
    assert.ok(realised[i] < realised[i - 1], `size ${sizes[i]} did not realise a worse price`);
  }
});

test("a pool reporting no in-range liquidity cannot be quoted", () => {
  const swaps = decodeFixtureSwaps(D);
  const dry: RawSwap = { ...swaps[0], liquidity: "0" };

  const quote = quoteExit(dry, D, 1);
  assert.equal(quote.status, "UNAVAILABLE");
  assert.equal(quote.proceedsQuote, null);
  assert.match(quote.explanation, /no in-range liquidity/);
});

test("the real pool is thin enough that ordinary exit sizes are unquotable", () => {
  // A finding, not a defect: within one tick range this pool holds well under 1 wNVDAx of
  // depth. Recorded as a test so a future capture that quietly changed this is visible.
  const t = computePoolTelemetry(D);
  const max = t.exitDepth!.maxSellWithinTickRange.value;
  assert.ok(max < 5, `expected a thin pool, got ${max} base tokens of in-range depth`);
  assert.ok(max > 0);
});

// ---------------------------------------------------------------------------
// Thin-liquidity labelling
// ---------------------------------------------------------------------------

test("scenario C's weekend window is flagged THIN with the caveat spelled out", () => {
  const t = computePoolTelemetry(C);

  assert.equal(t.swapCount, 265);
  assert.equal(t.quality, "THIN");
  assert.ok(t.swapCount < THIN_WINDOW_SWAP_THRESHOLD);
  assert.match(t.availabilityNote, /noisy and must be reported with that caveat/);
});

test("a window with holes warns that its swap count is a lower bound", () => {
  const holed: SwapWindowFixture = { ...D, rpcRangeErrors: 3 };
  const t = computePoolTelemetry(holed);

  assert.equal(t.rpcRangeErrors, 3);
  assert.match(t.availabilityNote, /3 block range\(s\) failed every retry/);
  assert.match(t.availabilityNote, /lower bound/);
});

// ---------------------------------------------------------------------------
// Window statistics
// ---------------------------------------------------------------------------

test("high, low and drawdown are mutually consistent", () => {
  const t = computePoolTelemetry(D);

  assert.ok(t.highPrice!.value >= t.lowPrice!.value);
  assert.ok(t.openPrice!.value >= t.lowPrice!.value && t.openPrice!.value <= t.highPrice!.value);
  assert.ok(t.closePrice!.value >= t.lowPrice!.value && t.closePrice!.value <= t.highPrice!.value);

  // Drawdown is peak-to-trough, so it can never exceed the full high-to-low fall.
  const maxPossible = ((t.highPrice!.value - t.lowPrice!.value) / t.highPrice!.value) * 10_000;
  assert.ok(t.maxDrawdownBps!.value >= 0);
  assert.ok(t.maxDrawdownBps!.value <= maxPossible + 1e-6);
});

test("velocity and volume are positive and derived from the window's own span", () => {
  const t = computePoolTelemetry(D);
  const swaps = decodeFixtureSwaps(D);

  const spanMinutes =
    (blockToUnixSeconds(swaps[swaps.length - 1].blockNumber) -
      blockToUnixSeconds(swaps[0].blockNumber)) /
    60;
  assert.ok(Math.abs(t.tradeVelocity!.value - swaps.length / spanMinutes) < 1e-9);
  assert.ok(t.volumeQuote!.value > 0);
});

test("results are deterministic — the same fixture always yields the same telemetry", () => {
  assert.deepEqual(computePoolTelemetry(D), computePoolTelemetry(D));
  assert.deepEqual(computePoolTelemetry(A), computePoolTelemetry(A));
});

// ---------------------------------------------------------------------------
// Block/time arithmetic
// ---------------------------------------------------------------------------

test("block and timestamp convert both ways against the verified offset", () => {
  assert.equal(XLAYER_BLOCK_TIMESTAMP_OFFSET, 1_718_769_036);
  assert.equal(blockToUnixSeconds(68_201_457), 1_786_970_493);
  assert.equal(unixSecondsToBlock(1_786_970_493), 68_201_457);
  assert.equal(blockToIso(68_201_457), "2026-08-17T12:41:33Z");

  // Scenario D's anchor, cross-checked against the frozen fixture's own window bounds.
  assert.equal(blockToIso(D.fromBlock), D.fromIso);
  assert.equal(blockToIso(D.toBlock), D.toIso);
});

test("the tick-to-sqrtPrice helper agrees with the price implied by observed swaps", () => {
  const swaps = decodeFixtureSwaps(D);
  for (const swap of swaps.slice(0, 25)) {
    const fromTick = sqrtPriceX96AtTick(swap.tick);
    const actual = Number(swap.sqrtPriceX96);
    // The observed sqrtPrice sits inside the tick it reports, so the two agree to within one
    // tick's width (0.01%). A larger gap would mean the tick math is wrong.
    assert.ok(
      Math.abs(fromTick - actual) / actual < 1e-4,
      `tick ${swap.tick} implies ${fromTick}, swap reported ${actual}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Fetching: chunking and retry, with an injected transport
// ---------------------------------------------------------------------------

const POOL: PoolDescriptor = D;

test("fetching chunks the range to the RPC's 100-block cap", async () => {
  const ranges: [number, number][] = [];
  const transport = async (method: string, params: any[]) => {
    assert.equal(method, "eth_getLogs");
    assert.equal(params[0].topics[0], SWAP_TOPIC0);
    ranges.push([Number(params[0].fromBlock), Number(params[0].toBlock)]);
    return [];
  };

  await fetchSwapWindow(transport, POOL, 1000, 1249);

  assert.equal(ranges.length, 3, "250 blocks must split into 3 chunks");
  for (const [from, to] of ranges) {
    assert.ok(to - from + 1 <= MAX_LOG_RANGE_BLOCKS, `chunk ${from}-${to} exceeds the cap`);
  }
  // The chunks must tile the range exactly: no gaps, no overlaps.
  assert.equal(ranges[0][0], 1000);
  assert.equal(ranges[ranges.length - 1][1], 1249);
  for (let i = 1; i < ranges.length; i++) {
    assert.equal(ranges[i][0], ranges[i - 1][1] + 1);
  }
});

test("a transient failure is retried and then succeeds", async () => {
  let attempts = 0;
  const transport = async () => {
    attempts++;
    if (attempts < 3) throw new Error("transient RPC failure");
    return [];
  };

  const result = await fetchSwapWindow(transport, POOL, 1000, 1099, {
    retries: 5,
    sleep: async () => {},
  });

  assert.equal(attempts, 3);
  assert.equal(result.rpcRangeErrors, 0, "a range that eventually succeeded is not an error");
});

test("a range that fails every retry is counted and skipped, not thrown", async () => {
  // A partial observation that says so beats no observation at all — but the count has to
  // travel with the data so a consumer knows the totals are a lower bound.
  let calls = 0;
  const transport = async (_m: string, params: any[]) => {
    calls++;
    if (Number(params[0].fromBlock) === 1100) throw new Error("permanently broken range");
    return [];
  };

  const result = await fetchSwapWindow(transport, POOL, 1000, 1199, {
    retries: 2,
    sleep: async () => {},
  });

  assert.equal(result.rpcRangeErrors, 1);
  assert.ok(calls > 2, "the failing range was retried before being given up on");
});

test("fetched logs are decoded and sorted by block then log index", async () => {
  const swaps = decodeFixtureSwaps(D);
  const sample = swaps.slice(0, 3);

  // Hand back the logs out of order to prove the sort is real.
  const transport = async () =>
    [...sample].reverse().map((s) => ({
      blockNumber: `0x${s.blockNumber.toString(16)}`,
      logIndex: `0x${s.logIndex.toString(16)}`,
      data:
        "0x" +
        [
          BigInt(s.amount0) < 0n
            ? (BigInt(s.amount0) + (1n << 256n)).toString(16).padStart(64, "0")
            : BigInt(s.amount0).toString(16).padStart(64, "0"),
          BigInt(s.amount1) < 0n
            ? (BigInt(s.amount1) + (1n << 256n)).toString(16).padStart(64, "0")
            : BigInt(s.amount1).toString(16).padStart(64, "0"),
          BigInt(s.sqrtPriceX96).toString(16).padStart(64, "0"),
          BigInt(s.liquidity).toString(16).padStart(64, "0"),
          (s.tick < 0 ? BigInt(s.tick) + (1n << 24n) : BigInt(s.tick)).toString(16).padStart(64, "0"),
        ].join(""),
    }));

  const result = await fetchSwapWindow(transport, POOL, 1000, 1099, { sleep: async () => {} });

  assert.equal(result.swaps.length, 3);
  for (let i = 1; i < result.swaps.length; i++) {
    const prev = result.swaps[i - 1];
    const cur = result.swaps[i];
    assert.ok(
      cur.blockNumber > prev.blockNumber ||
        (cur.blockNumber === prev.blockNumber && cur.logIndex > prev.logIndex),
      "swaps are not ordered",
    );
  }
  // Round-tripping through the encoder must reproduce the original values exactly, including
  // the signed amounts and the signed tick.
  assert.deepEqual(result.swaps, sample);
});

// ---------------------------------------------------------------------------
// Fixture integrity
// ---------------------------------------------------------------------------

test("every captured fixture matches the frozen window the manifest declares", () => {
  const expected: Record<string, { from: number; to: number; swaps: number }> = {
    a: { from: 66_411_744, to: 66_436_944, swaps: 0 },
    c: { from: 68_050_070, to: 68_075_270, swaps: 265 },
    d: { from: 67_796_554, to: 67_821_754, swaps: 367 },
    b: { from: 68_197_857, to: 68_223_057, swaps: 4145 },
  };

  for (const [scenario, want] of Object.entries(expected)) {
    if (!hasFixture(scenario)) continue; // large captures may land later
    const fixture = loadFixture(scenario);
    assert.equal(fixture.fromBlock, want.from, `${scenario} fromBlock`);
    assert.equal(fixture.toBlock, want.to, `${scenario} toBlock`);
    assert.equal(fixture.swaps.length, want.swaps, `${scenario} swap count`);
    assert.equal(fixture.swapCount, want.swaps);
    assert.equal(fixture.rpcRangeErrors, 0, `${scenario} was captured with holes`);

    // Pool identity must be identical across every window, or the scenarios are not
    // measuring the same market.
    assert.equal(fixture.pool.toLowerCase(), "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2");
    assert.equal(fixture.chainId, 196);
    assert.equal(fixture.liquiditySource, "THIRD_PARTY");
    assert.equal(fixture.quoteIsToken0, true);
    assert.equal(fixture.feePips, 500);
    assert.equal(fixture.tickSpacing, 10);
  }
});

test("fixture swaps are in order and inside their declared window", () => {
  for (const fixture of [C, D]) {
    const swaps = decodeFixtureSwaps(fixture);
    for (let i = 0; i < swaps.length; i++) {
      assert.ok(
        swaps[i].blockNumber >= fixture.fromBlock && swaps[i].blockNumber <= fixture.toBlock,
        `${fixture.scenarioId} swap ${i} is outside the window`,
      );
      if (i > 0) {
        const prev = swaps[i - 1];
        assert.ok(
          swaps[i].blockNumber > prev.blockNumber ||
            (swaps[i].blockNumber === prev.blockNumber && swaps[i].logIndex > prev.logIndex),
          `${fixture.scenarioId} swap ${i} is out of order`,
        );
      }
    }
  }
});
