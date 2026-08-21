/**
 * Direct X Layer pool telemetry and executable exit depth (task T3.2).
 *
 * This module turns raw Uniswap v3 `Swap` logs into the market observations the confirmation
 * engine (T3.3) consumes: price, liquidity, trade velocity, short-window drawdown, and what a
 * seller could actually realise if they wanted out.
 *
 * THREE RULES THIS FILE IS BUILT AROUND
 *
 * 1. **Telemetry never returns `CONFIRMED`.** `marketDataStatus` is typed as the shared
 *    `ConfirmationStatus`, but this module only ever produces `UNAVAILABLE`, `STALE`, or
 *    `NOT_CONFIRMED`. Deciding that the market corroborates an event is T3.3's job. Making
 *    that structural means the data layer cannot manufacture a confirmation even by accident,
 *    which matters because `CONFIRMED` is the one value that opens the aggressive fee path.
 *
 * 2. **Every metric carries provenance and units.** A bare number is not an acceptable
 *    output here. Each observation records the block and timestamp it came from, and its
 *    unit is named in the type. A reviewer should never have to guess whether a figure is
 *    bps, USD, or a raw sqrt-price integer.
 *
 * 3. **Absence is reported, never fabricated.** Scenario A's window contains zero swaps. That
 *    is a real property of a pool that existed but had not begun trading, and it must surface
 *    as `UNAVAILABLE` with `swapCount: 0` — never as a price of zero, a drawdown of zero, or
 *    an empty-but-successful result. A zero that means "nothing happened" and a zero that
 *    means "we could not look" are different findings.
 *
 * DETERMINISM. Every exported function is pure: `now` and block numbers arrive as arguments,
 * nothing reads a clock, and no function performs I/O. The one function that touches the
 * network, `fetchSwapWindow`, takes its transport as a parameter so tests never need it.
 */

import type { ConfirmationStatus } from "../risk/types.js";

// ---------------------------------------------------------------------------
// Provenance primitives
// ---------------------------------------------------------------------------

/**
 * X Layer produced exactly one block per second across the entire frozen range, verified at
 * three separate blocks (T0.2 §6). This lets a block number and a wall-clock instant be
 * converted without an extra RPC round trip.
 *
 * It is an empirical property of this chain over this period, NOT a protocol guarantee. Any
 * consumer relying on it outside the frozen windows should re-verify.
 */
export const XLAYER_BLOCK_TIMESTAMP_OFFSET = 1_718_769_036;

export function blockToUnixSeconds(blockNumber: number): number {
  return blockNumber + XLAYER_BLOCK_TIMESTAMP_OFFSET;
}

export function unixSecondsToBlock(unixSeconds: number): number {
  return unixSeconds - XLAYER_BLOCK_TIMESTAMP_OFFSET;
}

export function blockToIso(blockNumber: number): string {
  return new Date(blockToUnixSeconds(blockNumber) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Where an observation came from. Attached to every metric this module emits. */
export interface Provenance {
  blockNumber: number;
  timestamp: string;
  /** Index of the log within its block, when the observation came from a specific swap. */
  logIndex: number | null;
  chainId: number;
  pool: string;
  /**
   * Whether this pool's liquidity is provided by third parties or by the Tinjau team.
   * The demo pool on chain 1952 is builder-controlled and must never be presented as
   * evidence about a real market (tracker §15).
   */
  liquiditySource: LiquiditySource;
}

export type LiquiditySource = "THIRD_PARTY" | "BUILDER_CONTROLLED";

/** A number that knows what it is. */
export interface Measured<TUnit extends string> {
  value: number;
  unit: TUnit;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Pool description and raw swaps
// ---------------------------------------------------------------------------

export interface PoolDescriptor {
  chainId: number;
  pool: string;
  token0: string;
  token0Symbol: string;
  token0Decimals: number;
  token1: string;
  token1Symbol: string;
  token1Decimals: number;
  feePips: number;
  tickSpacing: number;
  liquiditySource: LiquiditySource;
  /**
   * Whether the quote asset (the one prices are denominated in) is token0.
   *
   * Derived from a live `token0()` call at capture time, never hardcoded. Token ordering is
   * not uniform across X Layer's reference pools — `markout-study.md` §1.2 found 8 of 10 with
   * USDG as token0 and 2 with it as token1 — so assuming an order silently inverts prices for
   * whichever pools do not match.
   */
  quoteIsToken0: boolean;
}

/** One decoded Uniswap v3 `Swap` event. Amounts stay as strings until they are scaled. */
export interface RawSwap {
  blockNumber: number;
  logIndex: number;
  /** Signed, base units. Positive means the token flowed into the pool. */
  amount0: string;
  amount1: string;
  sqrtPriceX96: string;
  /** In-range liquidity `L` at the moment of the swap. */
  liquidity: string;
  tick: number;
}

/** A captured replay window, as committed under `src/market/fixtures/`. */
export interface SwapWindowFixture extends PoolDescriptor {
  scenarioId: string;
  fromBlock: number;
  toBlock: number;
  fromIso: string;
  toIso: string;
  /** Ranges that failed every retry. Non-zero means the window has holes. */
  rpcRangeErrors: number;
  swapCount: number;
  /** Compact rows in `_columns` order, sorted by `(blockNumber, logIndex)`. */
  swaps: (string | number)[][];
}

const Q96 = 2 ** 96;

/** Rehydrates the compact fixture rows into named fields. */
export function decodeFixtureSwaps(fixture: SwapWindowFixture): RawSwap[] {
  return fixture.swaps.map((row) => ({
    blockNumber: Number(row[0]),
    logIndex: Number(row[1]),
    amount0: String(row[2]),
    amount1: String(row[3]),
    sqrtPriceX96: String(row[4]),
    liquidity: String(row[5]),
    tick: Number(row[6]),
  }));
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

/**
 * Price implied by a `sqrtPriceX96`, in quote units per base unit.
 *
 * Reused verbatim from `markout-study.md` §1.2 and pinned by
 * `scenarios/benchmark-preregistration.json`. T0.4 requires the benchmark and this module use
 * the same arithmetic so the two studies stay comparable — a second, subtly different price
 * function would make every cross-reference between them meaningless.
 *
 *   raw             = (sqrtPriceX96 / 2**96) ** 2      # token1 per token0, base units
 *   human_t1_per_t0 = raw * 10 ** (dec0 - dec1)
 *   P               = 1 / human_t1_per_t0   if quote is token0
 *   P               =     human_t1_per_t0   otherwise
 */
export function priceFromSqrtPriceX96(sqrtPriceX96: string | bigint, pool: PoolDescriptor): number {
  const sqrt = Number(sqrtPriceX96);
  const raw = (sqrt / Q96) ** 2;
  const humanT1PerT0 = raw * 10 ** (pool.token0Decimals - pool.token1Decimals);
  return pool.quoteIsToken0 ? 1 / humanT1PerT0 : humanT1PerT0;
}

/** Signed pool-side amounts in human units. Positive means into the pool. */
export function swapAmounts(
  swap: RawSwap,
  pool: PoolDescriptor,
): { quoteDelta: number; baseDelta: number } {
  const a0 = Number(swap.amount0) / 10 ** pool.token0Decimals;
  const a1 = Number(swap.amount1) / 10 ** pool.token1Decimals;
  return pool.quoteIsToken0 ? { quoteDelta: a0, baseDelta: a1 } : { quoteDelta: a1, baseDelta: a0 };
}

// ---------------------------------------------------------------------------
// Executable exit depth
// ---------------------------------------------------------------------------

/** sqrt(1.0001^tick) * 2^96, matching Uniswap's `TickMath.getSqrtRatioAtTick`. */
export function sqrtPriceX96AtTick(tick: number): number {
  return Math.sqrt(1.0001 ** tick) * Q96;
}

export type ExitQuoteStatus =
  /** The whole size fits inside the current tick range, so the quote is exact. */
  | "EXACT"
  /** The size would cross a tick boundary where liquidity may change. Not quotable here. */
  | "OUT_OF_RANGE"
  /** No liquidity observation available at all. */
  | "UNAVAILABLE";

export interface ExitQuote {
  status: ExitQuoteStatus;
  /** Size the seller wants to exit, in base tokens. */
  sizeBase: number;
  /** Quote tokens they would receive, gross of the pool fee. `null` unless `EXACT`. */
  proceedsQuote: number | null;
  /** Realised average price, quote per base. `null` unless `EXACT`. */
  realisedPrice: number | null;
  /** Shortfall against the spot price, in basis points. `null` unless `EXACT`. */
  slippageBps: number | null;
  explanation: string;
}

export interface ExitDepth {
  /** Spot price before any exit, quote per base. */
  spotPrice: Measured<"quotePerBase">;
  /** In-range liquidity `L`, raw sqrt units. Not a token amount — see `maxSellWithinTickRange`. */
  liquidity: Measured<"rawL">;
  /**
   * The largest base-token sale that provably stays inside the current tick range.
   *
   * This is the honest boundary of what a single `Swap` log can tell us. Liquidity in v3 only
   * changes when the price crosses an *initialized* tick, and which ticks are initialized
   * cannot be read from a swap log — it needs the tick bitmap. So the nearest `tickSpacing`
   * boundary is used, which is a safe LOWER bound on where liquidity might change.
   */
  maxSellWithinTickRange: Measured<"baseTokens">;
  /** Quote proceeds if exactly `maxSellWithinTickRange` were sold. */
  maxSellProceeds: Measured<"quoteTokens">;
  /** Quotes at the probe sizes requested. */
  quotes: ExitQuote[];
  /**
   * True when this measurement is a lower bound rather than the true depth.
   *
   * Always true for the current method. Stated as a field rather than left to documentation
   * because the number is otherwise easy to read as the real answer — and it under-states
   * depth, which over-states risk. A consumer must not treat a thin lower-bound reading as
   * proof that exit liquidity is genuinely thin.
   */
  isLowerBound: boolean;
  method: string;
}

/**
 * Quotes an exit sale against the liquidity observed at one swap.
 *
 * Uses the exact v3 within-range invariants:
 *
 *   selling base into the pool moves sqrtP by  Δ(sqrtP) = Δbase / L      (base is token1)
 *   quote received                            = L * (1/sqrtP - 1/sqrtP') (quote is token0)
 *
 * and their mirror when the quote asset is token1 instead. These are exact while the price
 * stays inside one tick range; past a boundary the liquidity term changes and the arithmetic
 * silently stops describing reality. That is why anything crossing a boundary returns
 * `OUT_OF_RANGE` rather than an extrapolated figure: an approximation presented as a quote is
 * worse than an admitted gap.
 */
export function quoteExit(
  swap: RawSwap,
  pool: PoolDescriptor,
  sizeBase: number,
): Omit<ExitQuote, "sizeBase"> & { sizeBase: number } {
  const L = Number(swap.liquidity);
  const sqrtP = Number(swap.sqrtPriceX96);

  if (!Number.isFinite(L) || L <= 0) {
    return {
      status: "UNAVAILABLE",
      sizeBase,
      proceedsQuote: null,
      realisedPrice: null,
      slippageBps: null,
      explanation: "The pool reported no in-range liquidity, so no exit can be quoted.",
    };
  }

  const spot = priceFromSqrtPriceX96(swap.sqrtPriceX96, pool);
  const boundary = tickRangeBoundarySqrtPrice(swap, pool);
  const maxSize = maxSellWithinRange(L, sqrtP, boundary, pool);

  if (sizeBase > maxSize) {
    return {
      status: "OUT_OF_RANGE",
      sizeBase,
      proceedsQuote: null,
      realisedPrice: null,
      slippageBps: null,
      explanation:
        `Selling ${sizeBase} base tokens would move the price past the nearest tick boundary, ` +
        `where liquidity may change in ways a swap log cannot reveal. Only ${maxSize.toFixed(6)} ` +
        `can be quoted exactly. Reading the tick bitmap would be required to go further.`,
    };
  }

  const proceeds = quoteProceeds(L, sqrtP, sizeBase, pool);
  const realised = sizeBase > 0 ? proceeds / sizeBase : spot;
  const slippageBps = spot > 0 ? ((spot - realised) / spot) * 10_000 : 0;

  return {
    status: "EXACT",
    sizeBase,
    proceedsQuote: proceeds,
    realisedPrice: realised,
    slippageBps,
    explanation:
      `Exact within the current tick range: selling ${sizeBase} base tokens realises ` +
      `${proceeds.toFixed(2)} quote tokens at an average ${realised.toFixed(4)}, ` +
      `${slippageBps.toFixed(1)} bps below spot. Gross of the ${pool.feePips / 10_000}% pool fee.`,
  };
}

/**
 * sqrtPrice at the nearest tick-spacing boundary in the direction a sale would push it.
 *
 * Selling the base asset makes it cheaper. When the base asset is token1, the raw price
 * (token1 per token0) rises and the tick moves up; when it is token0, the tick moves down.
 */
function tickRangeBoundarySqrtPrice(swap: RawSwap, pool: PoolDescriptor): number {
  const spacing = pool.tickSpacing;
  const sellingRaisesTick = pool.quoteIsToken0; // base is token1
  const boundaryTick = sellingRaisesTick
    ? Math.floor(swap.tick / spacing) * spacing + spacing
    : Math.ceil(swap.tick / spacing) * spacing - spacing;
  return sqrtPriceX96AtTick(boundaryTick);
}

function maxSellWithinRange(
  L: number,
  sqrtP: number,
  sqrtBoundary: number,
  pool: PoolDescriptor,
): number {
  if (pool.quoteIsToken0) {
    // Base is token1: Δtoken1 = L * Δ(sqrtP / 2^96)
    return (L * (sqrtBoundary - sqrtP)) / Q96 / 10 ** pool.token1Decimals;
  }
  // Base is token0: Δtoken0 = L * Δ(1/sqrtP), scaled by 2^96
  return (L * Q96 * (1 / sqrtBoundary - 1 / sqrtP)) / 10 ** pool.token0Decimals;
}

function quoteProceeds(L: number, sqrtP: number, sizeBase: number, pool: PoolDescriptor): number {
  if (pool.quoteIsToken0) {
    const sizeRaw = sizeBase * 10 ** pool.token1Decimals;
    const sqrtNew = sqrtP + (sizeRaw * Q96) / L;
    const outRaw = L * Q96 * (1 / sqrtP - 1 / sqrtNew);
    return outRaw / 10 ** pool.token0Decimals;
  }
  const sizeRaw = sizeBase * 10 ** pool.token0Decimals;
  const sqrtNew = 1 / (1 / sqrtP + sizeRaw / (L * Q96));
  const outRaw = (L * (sqrtP - sqrtNew)) / Q96;
  return outRaw / 10 ** pool.token1Decimals;
}

// ---------------------------------------------------------------------------
// The window observation
// ---------------------------------------------------------------------------

/** How thin the window is, and therefore how much weight its derived metrics can bear. */
export type LiquidityQuality =
  /** Enough trades that velocity and drawdown mean something. */
  | "ADEQUATE"
  /** Trades exist but are sparse; derived metrics are noisy and must be reported as such. */
  | "THIN"
  /** Too few trades to derive anything. */
  | "INSUFFICIENT";

/**
 * Below this many swaps a window is `THIN`.
 *
 * Chosen as one trade per minute over a seven-hour window — a rate at which a short-window
 * drawdown is built from enough independent observations to be more than noise. Scenario C
 * (265 swaps over seven weekend hours) sits well below it and is correctly flagged.
 *
 * This threshold only ever attaches a warning label. It never gates a promotion, so it is not
 * a tunable that can change an outcome.
 */
export const THIN_WINDOW_SWAP_THRESHOLD = 420;

/** Fewer than this and no derived metric is emitted at all. */
export const MINIMUM_SWAPS_FOR_METRICS = 2;

export interface PoolTelemetry {
  scenarioId: string | null;
  pool: PoolDescriptor;
  fromBlock: number;
  toBlock: number;
  fromIso: string;
  toIso: string;

  /**
   * Availability verdict, in the shared `ConfirmationStatus` vocabulary.
   *
   * This module NEVER returns `CONFIRMED` — see the file header. `NOT_CONFIRMED` here means
   * "data is present and no verdict has been formed", which is T3.3's decision to make.
   */
  marketDataStatus: ConfirmationStatus;
  quality: LiquidityQuality;
  /** Human-readable statement of what the data does and does not support. */
  availabilityNote: string;

  swapCount: number;
  /** Ranges that failed every retry. Non-zero means the window has holes and is not complete. */
  rpcRangeErrors: number;

  /** Null whenever `quality` is `INSUFFICIENT` — absence is never rendered as zero. */
  openPrice: Measured<"quotePerBase"> | null;
  closePrice: Measured<"quotePerBase"> | null;
  highPrice: Measured<"quotePerBase"> | null;
  lowPrice: Measured<"quotePerBase"> | null;
  /** Largest peak-to-trough fall within the window. */
  maxDrawdownBps: Measured<"bps"> | null;
  /** Net price change across the window, signed. */
  netChangeBps: Measured<"bps"> | null;
  /** Trades per minute across the window. */
  tradeVelocity: Measured<"swapsPerMinute"> | null;
  /** Gross traded value, summed over the absolute quote leg of every swap. */
  volumeQuote: Measured<"quoteTokens"> | null;
  /** Exit depth measured at the last swap in the window. */
  exitDepth: ExitDepth | null;
}

export interface TelemetryOptions {
  /** Exit sizes to quote, in base tokens. */
  probeSizesBase?: number[];
  /** Wall-clock instant the caller is assessing at, epoch seconds. */
  nowUnixSeconds?: number;
  /** Observations older than this are `STALE`. Defaults to the T1.2 market freshness bound. */
  freshnessSeconds?: number;
}

/**
 * Default exit sizes to quote, in base tokens.
 *
 * Deliberately small. Measured against the real chain-196 pool, only ~0.53 wNVDAx (~$120)
 * can be sold before the price crosses a tick boundary, so probes of 1/10/100 would all
 * return `OUT_OF_RANGE` and tell a reader nothing. These sizes straddle that boundary so both
 * outcomes are visible: the small probe quotes exactly, the larger ones honestly refuse.
 */
const DEFAULT_PROBE_SIZES = [0.1, 1, 10];
/** Matches `FROZEN_PROMOTION_CONFIG.marketFreshnessSec` (T1.2): 15 minutes. */
const DEFAULT_FRESHNESS_SECONDS = 15 * 60;

function provenanceFor(swap: RawSwap | null, pool: PoolDescriptor, fallbackBlock: number): Provenance {
  const blockNumber = swap?.blockNumber ?? fallbackBlock;
  return {
    blockNumber,
    timestamp: blockToIso(blockNumber),
    logIndex: swap?.logIndex ?? null,
    chainId: pool.chainId,
    pool: pool.pool,
    liquiditySource: pool.liquiditySource,
  };
}

function measured<TUnit extends string>(
  value: number,
  unit: TUnit,
  swap: RawSwap | null,
  pool: PoolDescriptor,
  fallbackBlock: number,
): Measured<TUnit> {
  return { value, unit, provenance: provenanceFor(swap, pool, fallbackBlock) };
}

/**
 * Derives every window metric from a decoded swap series.
 *
 * Pure. `swaps` must be sorted by `(blockNumber, logIndex)`; the caller owns that ordering
 * because a re-sort here would silently mask a fixture captured out of order.
 */
export function computePoolTelemetry(
  fixture: SwapWindowFixture,
  options: TelemetryOptions = {},
): PoolTelemetry {
  const pool: PoolDescriptor = fixture;
  const swaps = decodeFixtureSwaps(fixture);
  const probes = options.probeSizesBase ?? DEFAULT_PROBE_SIZES;
  const freshness = options.freshnessSeconds ?? DEFAULT_FRESHNESS_SECONDS;

  const empty = {
    scenarioId: fixture.scenarioId ?? null,
    pool,
    fromBlock: fixture.fromBlock,
    toBlock: fixture.toBlock,
    fromIso: fixture.fromIso,
    toIso: fixture.toIso,
    swapCount: swaps.length,
    rpcRangeErrors: fixture.rpcRangeErrors,
    openPrice: null,
    closePrice: null,
    highPrice: null,
    lowPrice: null,
    maxDrawdownBps: null,
    netChangeBps: null,
    tradeVelocity: null,
    volumeQuote: null,
    exitDepth: null,
  };

  // The scenario-A case. A pool that existed but had not traded produces no observation at
  // all — not a price of zero, not a drawdown of zero. Everything derived stays null so a
  // consumer cannot mistake absence for a measurement.
  if (swaps.length < MINIMUM_SWAPS_FOR_METRICS) {
    return {
      ...empty,
      marketDataStatus: "UNAVAILABLE",
      quality: "INSUFFICIENT",
      availabilityNote:
        swaps.length === 0
          ? `No swaps occurred in blocks ${fixture.fromBlock}-${fixture.toBlock}. The pool held ` +
            `bytecode but was not trading, so no price, velocity, drawdown, or exit depth exists ` +
            `for this window. This is an observed absence, not a failed query ` +
            `(${fixture.rpcRangeErrors} range errors).`
          : `Only ${swaps.length} swap(s) in blocks ${fixture.fromBlock}-${fixture.toBlock}, below ` +
            `the ${MINIMUM_SWAPS_FOR_METRICS} needed to derive any window metric.`,
    };
  }

  const first = swaps[0];
  const last = swaps[swaps.length - 1];
  const prices = swaps.map((s) => ({ swap: s, price: priceFromSqrtPriceX96(s.sqrtPriceX96, pool) }));

  let high = prices[0];
  let low = prices[0];
  let peak = prices[0].price;
  let maxDrawdown = 0;
  let troughSwap = prices[0].swap;

  for (const point of prices) {
    if (point.price > high.price) high = point;
    if (point.price < low.price) low = point;
    if (point.price > peak) peak = point.price;
    const drawdown = peak > 0 ? ((peak - point.price) / peak) * 10_000 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughSwap = point.swap;
    }
  }

  const openPrice = prices[0].price;
  const closePrice = prices[prices.length - 1].price;
  const netChangeBps = openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 10_000 : 0;

  const elapsedSeconds = blockToUnixSeconds(last.blockNumber) - blockToUnixSeconds(first.blockNumber);
  const elapsedMinutes = elapsedSeconds / 60;
  const velocity = elapsedMinutes > 0 ? swaps.length / elapsedMinutes : 0;

  const volume = swaps.reduce((sum, s) => sum + Math.abs(swapAmounts(s, pool).quoteDelta), 0);

  const quality: LiquidityQuality =
    swaps.length < THIN_WINDOW_SWAP_THRESHOLD ? "THIN" : "ADEQUATE";

  // Freshness is decided here rather than accepted from a caller, matching how T1.2 handles
  // market confirmation: an upstream component must not be able to relabel a stale sample.
  const observedAt = blockToUnixSeconds(last.blockNumber);
  const age = options.nowUnixSeconds !== undefined ? options.nowUnixSeconds - observedAt : 0;
  const isStale = options.nowUnixSeconds !== undefined && (age < 0 || age > freshness);

  const thinNote =
    quality === "THIN"
      ? ` Only ${swaps.length} swaps over ${(elapsedSeconds / 3600).toFixed(1)} hours, below the ` +
        `${THIN_WINDOW_SWAP_THRESHOLD}-swap threshold: velocity, drawdown, and exit depth here are ` +
        `noisy and must be reported with that caveat.`
      : "";
  const holesNote =
    fixture.rpcRangeErrors > 0
      ? ` WARNING: ${fixture.rpcRangeErrors} block range(s) failed every retry, so this window has ` +
        `holes and its swap count is a lower bound.`
      : "";

  return {
    ...empty,
    marketDataStatus: isStale ? "STALE" : "NOT_CONFIRMED",
    quality,
    availabilityNote: isStale
      ? `The most recent swap is ${age}s old, beyond the ${freshness}s freshness bound, so this ` +
        `observation cannot support a new protection.${thinNote}${holesNote}`
      : `${swaps.length} swaps observed. Telemetry reports observations only and never returns ` +
        `CONFIRMED — whether the market corroborates an event is the confirmation engine's ` +
        `decision.${thinNote}${holesNote}`,

    openPrice: measured(openPrice, "quotePerBase", first, pool, fixture.fromBlock),
    closePrice: measured(closePrice, "quotePerBase", last, pool, fixture.toBlock),
    highPrice: measured(high.price, "quotePerBase", high.swap, pool, fixture.fromBlock),
    lowPrice: measured(low.price, "quotePerBase", low.swap, pool, fixture.fromBlock),
    maxDrawdownBps: measured(maxDrawdown, "bps", troughSwap, pool, fixture.fromBlock),
    netChangeBps: measured(netChangeBps, "bps", last, pool, fixture.toBlock),
    tradeVelocity: measured(velocity, "swapsPerMinute", last, pool, fixture.toBlock),
    volumeQuote: measured(volume, "quoteTokens", last, pool, fixture.toBlock),
    exitDepth: computeExitDepth(last, pool, probes, fixture.toBlock),
  };
}

export function computeExitDepth(
  swap: RawSwap,
  pool: PoolDescriptor,
  probeSizesBase: number[],
  fallbackBlock: number,
): ExitDepth {
  const L = Number(swap.liquidity);
  const sqrtP = Number(swap.sqrtPriceX96);
  const boundary = tickRangeBoundarySqrtPrice(swap, pool);
  const maxSize = L > 0 ? maxSellWithinRange(L, sqrtP, boundary, pool) : 0;
  const maxProceeds = L > 0 && maxSize > 0 ? quoteProceeds(L, sqrtP, maxSize, pool) : 0;

  return {
    spotPrice: measured(
      priceFromSqrtPriceX96(swap.sqrtPriceX96, pool),
      "quotePerBase",
      swap,
      pool,
      fallbackBlock,
    ),
    liquidity: measured(L, "rawL", swap, pool, fallbackBlock),
    maxSellWithinTickRange: measured(maxSize, "baseTokens", swap, pool, fallbackBlock),
    maxSellProceeds: measured(maxProceeds, "quoteTokens", swap, pool, fallbackBlock),
    quotes: probeSizesBase.map((size) => quoteExit(swap, pool, size)),
    isLowerBound: true,
    method:
      "Within-current-tick-range v3 invariants, using the in-range liquidity carried by the " +
      "swap log. Liquidity only changes at initialized ticks, which a swap log does not " +
      "reveal, so the nearest tickSpacing boundary is used as a safe lower bound. This " +
      "UNDER-states available depth, which OVER-states risk: a thin reading here is not by " +
      "itself proof that exit liquidity is genuinely thin.",
  };
}

// ---------------------------------------------------------------------------
// Fetching (the only impure function, and its transport is injected)
// ---------------------------------------------------------------------------

/** The RPC caps `eth_getLogs` at 100 blocks per call. */
export const MAX_LOG_RANGE_BLOCKS = 100;

export const SWAP_TOPIC0 =
  "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";

export interface JsonRpcTransport {
  (method: string, params: unknown[]): Promise<any>;
}

export interface FetchOptions {
  retries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

function decodeSwapLog(log: { blockNumber: string; logIndex: string; data: string }): RawSwap {
  const d = log.data.slice(2);
  const word = (i: number) => d.slice(i * 64, (i + 1) * 64);
  const signed256 = (hex: string): bigint => {
    const v = BigInt(`0x${hex}`);
    return v >= 1n << 255n ? v - (1n << 256n) : v;
  };
  const rawTick = Number(BigInt(`0x${word(4)}`));
  return {
    blockNumber: Number(BigInt(log.blockNumber)),
    logIndex: Number(BigInt(log.logIndex)),
    amount0: signed256(word(0)).toString(),
    amount1: signed256(word(1)).toString(),
    sqrtPriceX96: BigInt(`0x${word(2)}`).toString(),
    liquidity: BigInt(`0x${word(3)}`).toString(),
    tick: rawTick >= 2 ** 23 ? rawTick - 2 ** 24 : rawTick,
  };
}

/**
 * Fetches every `Swap` in a block range, chunked and retried.
 *
 * A chunk that fails every retry is counted in `rpcRangeErrors` and skipped rather than
 * aborting the sweep. A window with holes is still useful — a partial observation that says
 * so beats no observation — but the count must travel with the data so a consumer knows the
 * swap total is a lower bound.
 *
 * The RPC proved flaky in practice: capturing scenario A's 252 chunks needed 8 retries.
 */
export async function fetchSwapWindow(
  transport: JsonRpcTransport,
  pool: PoolDescriptor,
  fromBlock: number,
  toBlock: number,
  options: FetchOptions = {},
): Promise<{ swaps: RawSwap[]; rpcRangeErrors: number; rpcCalls: number }> {
  const retries = options.retries ?? 5;
  const baseDelay = options.baseDelayMs ?? 1000;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  const swaps: RawSwap[] = [];
  let rpcRangeErrors = 0;
  let rpcCalls = 0;

  for (let start = fromBlock; start <= toBlock; start += MAX_LOG_RANGE_BLOCKS) {
    const end = Math.min(start + MAX_LOG_RANGE_BLOCKS - 1, toBlock);
    let fetched = false;

    for (let attempt = 0; attempt <= retries && !fetched; attempt++) {
      try {
        rpcCalls++;
        const logs = await transport("eth_getLogs", [
          {
            address: pool.pool,
            topics: [SWAP_TOPIC0],
            fromBlock: `0x${start.toString(16)}`,
            toBlock: `0x${end.toString(16)}`,
          },
        ]);
        for (const log of logs ?? []) swaps.push(decodeSwapLog(log));
        fetched = true;
      } catch {
        if (attempt === retries) rpcRangeErrors++;
        else await sleep(baseDelay * (attempt + 1));
      }
    }
  }

  swaps.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
  return { swaps, rpcRangeErrors, rpcCalls };
}
