/**
 * Per-swap markout and fee revenue under a policy's fee schedule (T0.4 §4, §7).
 *
 * THE FORMULAS ARE REUSED, NOT REDESIGNED
 *
 * T0.4 §4 says the markout arithmetic is "reused verbatim from `markout-study.md` §1.2–§1.3 so
 * the two studies remain comparable". This file implements exactly those formulas, and
 * `test/benchmarkMarkout.test.ts` reconciles it swap-for-swap against P2.4's own recorded output
 * (`p2_4_markout_raw.jsonl`) for the one event the two studies share — scenario D's anchor block,
 * which P2.4 measured independently in August. If a later edit changes the arithmetic, that
 * reconciliation fails, which is a stronger guarantee than a comment claiming verbatim reuse.
 *
 * The price function is imported from `market/poolTelemetry.ts` rather than copied, for the same
 * reason: a second, subtly different price function would make every cross-reference between the
 * studies meaningless.
 *
 * WHERE THE POLICIES ACTUALLY DIVERGE
 *
 * T0.4 §4: "`feeRate` is the fee the policy under test would have charged on that swap, not the
 * pool's actual 0.05%. This is the single place where the three policies diverge arithmetically."
 *
 * Read literally — and it is implemented literally here — that means `M_0` and `M_h` are
 * identical across policies, and only the protocol-fee haircut differs. A fee-raising policy
 * therefore shows a *larger* haircut and a *lower* `M_h_LP`. That is a property of the frozen
 * method, not a bug in this file, and it is why T0.4 §5 insists fee revenue is reported
 * separately from markout: the fee-raising upside lives entirely in the fee-revenue column,
 * while the markout column carries only the protocol's larger cut of that fee. Netting the two
 * into one number would hide which side of the §5 bias each half came from.
 */

import { priceFromSqrtPriceX96, swapAmounts, type RawSwap } from "../market/poolTelemetry.js";
import type { ReplayInput } from "./replayInput.js";

/** Horizons in seconds. Frozen by T0.4 §4; primary is 3600. */
export const HORIZONS_SEC = [60, 300, 900, 1800, 3600] as const;
export const PRIMARY_HORIZON_SEC = 3600;
export type Horizon = (typeof HORIZONS_SEC)[number];

/** A fee schedule: the fee in pips a policy charges at an instant. */
export type FeeRatePipsAt = (unixSeconds: number) => number;

export interface SwapMarkoutRow {
  blockNumber: number;
  logIndex: number;
  unixSeconds: number;
  /** Signed quote-side (USDG) delta, human units. Positive = into the pool. */
  quoteDelta: number;
  /** Signed base-side (wNVDAx) delta, human units. Positive = into the pool. */
  baseDelta: number;
  /** `abs(dU)`, USD. */
  notionalUsd: number;
  /** Price implied by this swap's own `sqrtPriceX96`, quote per base. */
  pricePost: number;
  /** Fee this policy would have charged on this swap, pips. */
  feePips: number;
  /** The same fee as a rate. 500 pips -> 0.0005. */
  feeRate: number;
  /** Gross fee charged on the swap's input leg, USD. */
  feeGrossUsd: number;
  /** LP's share of that fee, USD, after the protocol take. */
  feeToLpUsd: number;
  /** Protocol's share, USD. Equals the haircut subtracted from every horizon. */
  haircutUsd: number;
  /**
   * The fee the pool ACTUALLY charged on this swap, pips. Read from the venue, not assumed.
   *
   * Needed only by the AMD-002 consistent-basis metric, which has to know which fee is already
   * baked into `dU` and `dS`.
   */
  observedFeePips: number;
  observedFeeRate: number;
  /** Gross fee the pool really collected on the input leg, USD. */
  observedFeeGrossUsd: number;
  /**
   * `(feeRate - observedFeeRate) * |inputUSD|` — the incremental gross fee this policy's schedule
   * would have charged over the one the pool really charged. Zero whenever the policy is at the
   * pool's own fee. **AMD-002, post-hoc.** See `mhLpConsistentUsd`.
   */
  feeUpliftUsd: number;
  /** `dU + dS * P_post`. Fee plus curve premium; NOT structurally >= 0 — see the test of that name. */
  m0Usd: number;
  /** `dU + dS * P_h` at each horizon, gross of the haircut. */
  mhUsd: Record<Horizon, number>;
  /** `M_h - haircut`. The **pre-registered** metric. */
  mhLpUsd: Record<Horizon, number>;
  /**
   * `M_h_LP + feeUplift`. **POST-HOC AMENDMENT AMD-002 — never describe this as pre-registered.**
   *
   * Direction of effect, stated before any value: it is >= `mhLpUsd` for every policy charging at
   * or above the pool's own fee, so it **flatters every fee-raising policy**, Tinjau included.
   *
   * Derivation. The frozen metric mixes two fee bases in one number: the credit side
   * `(dU + dS * P_h)` embeds the fee the pool really charged (`observedFeeRate`), while the debit
   * side subtracts `0.25 * feeRate * |inputUSD|` at the *counterfactual* fee. The LP is therefore
   * debited a protocol cut of a fee it is never credited with earning. Putting both sides on the
   * counterfactual basis means removing the observed fee from the credit side and adding the
   * counterfactual one:
   *
   *   M_h_LP_consistent = M_h  - f_o*|inputUSD|          # take out the fee the pool really took
   *                            + f_p*|inputUSD|          # put in the one this policy would take
   *                            - 0.25*f_p*|inputUSD|     # the protocol's cut of that
   *                     = M_h_LP + (f_p - f_o)*|inputUSD|
   *
   * WHAT IT ASSUMES ABOUT THE OBSERVED FEE EMBEDDED IN `dU`. Two things, and the second is false:
   *
   *  1. The pool's realised fee on this swap is exactly `f_o * |inputUSD|` with
   *     `inputUSD = dU if dU > 0 else dS * P_post` — T0.4 §4's own input definition, so the
   *     credit and debit sides use one definition rather than two. On a v3 pool the fee is taken
   *     from the gross input, which is what the `Swap` log records, so this holds up to per-tick
   *     rounding inside the swap loop (`markout-study.md` §5.3 puts that error below 0.01% of the
   *     fee).
   *  2. The same trade would have moved the same tokens under a different fee, with only the fee
   *     component rescaled. **This is false in two independent ways**, and neither is repaired
   *     here:
   *       - behaviourally, a 2% fee deters trades a 0.05% fee attracts (T0.4 §5, unchanged);
   *       - mechanically, v3 deducts the fee from the input BEFORE the remainder reaches the
   *         curve, so a higher fee would send less to the curve, move the price less, and hand
   *         the LP back more of the base asset than this arithmetic credits. That second effect
   *         runs the opposite way to the first.
   *
   * So this metric does not remove the counterfactual bias — it **relocates** it. The frozen
   * metric quarantined the fee-raising upside in a separate column, as T0.4 §5's first binding
   * consequence requires, and mechanically penalised fee-raising in the headline. This one pulls
   * that upside into the headline and mechanically rewards fee-raising. The truth is bracketed
   * between the two and the bracket is wide.
   *
   * Because of that, and because it was derived after results existed, it **may not open the
   * claim gate**: `canClaimLossAvoided` stays governed by `mhLpUsd` alone.
   */
  mhLpConsistentUsd: Record<Horizon, number>;
  /** `M_h - M_0`, the adverse-selection term. */
  adverseSelectionUsd: Record<Horizon, number>;
  /** Swaps strictly after this one, at or before `t* + h`. Zero means `P_h` fell back to `P_post`. */
  laterSwapCount: Record<Horizon, number>;
  /** Price used at each horizon. */
  priceAtHorizon: Record<Horizon, number>;
}

/**
 * Scores every swap in the replay window under one policy's fee schedule.
 *
 * `P_h` is the price implied by the **last swap with a strictly greater block number** at or
 * before `t* + h`, matching P2.4's `later = [d for d in decoded if d.block_number >
 * first_trade_block]`. Same-block swaps at a later `logIndex` are excluded there, so they are
 * excluded here; changing that would break the reconciliation and quietly redefine the horizon.
 *
 * Horizon lookups are bounded by the replay window. Near the window's end `t* + 3600` runs past
 * the last captured block, so `P_3600` falls back to whatever the window holds — the same
 * truncation P2.4 §1.3 documented, disclosed the same way, through `laterSwapCount`.
 */
export function computeMarkoutRows(input: ReplayInput, feeAt: FeeRatePipsAt): SwapMarkoutRow[] {
  const swaps = input.swaps;
  const blocks = swaps.map((s) => s.blockNumber);
  const prices = swaps.map((s) => priceFromSqrtPriceX96(s.sqrtPriceX96, input.pool));
  const protocolShare = input.costs.protocolShareOfPoolFee;

  const rows: SwapMarkoutRow[] = [];
  for (let i = 0; i < swaps.length; i++) {
    const swap = swaps[i] as RawSwap;
    const unixSeconds = blockToSeconds(swap.blockNumber, input);
    const { quoteDelta, baseDelta } = swapAmounts(swap, input.pool);
    const pricePost = prices[i] as number;

    const feePips = feeAt(unixSeconds);
    const feeRate = feePips / 1_000_000;
    const observedFeePips = input.pool.feePips;
    const observedFeeRate = observedFeePips / 1_000_000;

    // T0.4 §4: inputUSD = dU if dU > 0 else dS * P_post.
    const inputUsd = quoteDelta > 0 ? quoteDelta : baseDelta * pricePost;
    const feeGrossUsd = feeRate * Math.abs(inputUsd);
    const haircutUsd = protocolShare * feeGrossUsd;
    const feeToLpUsd = feeGrossUsd - haircutUsd;
    const observedFeeGrossUsd = observedFeeRate * Math.abs(inputUsd);
    const feeUpliftUsd = feeGrossUsd - observedFeeGrossUsd;

    const m0Usd = quoteDelta + baseDelta * pricePost;

    // First index whose block is strictly greater than this swap's.
    const firstLater = upperBound(blocks, swap.blockNumber);

    const mhUsd = {} as Record<Horizon, number>;
    const mhLpUsd = {} as Record<Horizon, number>;
    const mhLpConsistentUsd = {} as Record<Horizon, number>;
    const adverseSelectionUsd = {} as Record<Horizon, number>;
    const laterSwapCount = {} as Record<Horizon, number>;
    const priceAtHorizon = {} as Record<Horizon, number>;

    for (const h of HORIZONS_SEC) {
      // X Layer produced exactly one block per second across the frozen range (T0.2 §6), so
      // `t* + h` is `block + h`. Same identity P2.4 used.
      const cutoffBlock = swap.blockNumber + h;
      const lastAtOrBefore = upperBound(blocks, cutoffBlock) - 1;
      const count = lastAtOrBefore >= firstLater ? lastAtOrBefore - firstLater + 1 : 0;
      const ph = count > 0 ? (prices[lastAtOrBefore] as number) : pricePost;
      const mh = quoteDelta + baseDelta * ph;

      priceAtHorizon[h] = ph;
      laterSwapCount[h] = count;
      mhUsd[h] = mh;
      mhLpUsd[h] = mh - haircutUsd;
      mhLpConsistentUsd[h] = mh - haircutUsd + feeUpliftUsd;
      adverseSelectionUsd[h] = mh - m0Usd;
    }

    rows.push({
      blockNumber: swap.blockNumber,
      logIndex: swap.logIndex,
      unixSeconds,
      quoteDelta,
      baseDelta,
      notionalUsd: Math.abs(quoteDelta),
      pricePost,
      feePips,
      feeRate,
      feeGrossUsd,
      feeToLpUsd,
      haircutUsd,
      observedFeePips,
      observedFeeRate,
      observedFeeGrossUsd,
      feeUpliftUsd,
      m0Usd,
      mhUsd,
      mhLpUsd,
      mhLpConsistentUsd,
      adverseSelectionUsd,
      laterSwapCount,
      priceAtHorizon,
    });
  }
  return rows;
}

function blockToSeconds(blockNumber: number, input: ReplayInput): number {
  return input.window.fromUnixSeconds + (blockNumber - input.window.fromBlock);
}

/** First index in the sorted array whose value is strictly greater than `target`. */
function upperBound(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((sorted[mid] as number) <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
