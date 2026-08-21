/**
 * Market-confirmation engine (task T3.3).
 *
 * Answers one question: **is the market independently showing a consequence?**
 *
 * It is not a second opinion on the evidence and cannot rescue evidence that failed. §0.7
 * requires qualifying evidence first; a market move with no material corporate event behind it
 * is a market observation, not a corporate event.
 *
 * This module owns the `CONFIRMED` decision. `okxReference.ts` and `poolTelemetry.ts` are both
 * structurally incapable of returning it — the data layer must not be able to manufacture the
 * one value that opens the aggressive fee path — so the decision is made here, once, against
 * thresholds frozen in `confirmationConfig.ts` before any scenario was scored.
 *
 * Pure: `now` and the anchor arrive as arguments, there is no clock read, and the same input
 * always produces the same verdict. Every contributing observation is returned with its unit,
 * block, and timestamp so a reader can re-derive the verdict by hand.
 *
 * See `docs/buildx-orion-2026/outputs/04-planning/t3-3-confirmation-method.md` — especially §1,
 * which discloses that the "frozen blind" precondition only partially held.
 */

import type { ConfirmationStatus, ReasonCode } from "../risk/types.js";
import {
  computePoolTelemetry,
  decodeFixtureSwaps,
  priceFromSqrtPriceX96,
  blockToUnixSeconds,
  blockToIso,
  type PoolTelemetry,
  type SwapWindowFixture,
  type Measured,
} from "./poolTelemetry.js";
import type { ReferencePriceResult } from "./okxReference.js";
import { FROZEN_CONFIRMATION_CONFIG, type ConfirmationConfig } from "./confirmationConfig.js";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface PricePoint {
  blockNumber: number;
  unixSeconds: number;
  price: number;
}

export interface ConfirmationInput {
  /** Epoch seconds of the decision anchor. */
  anchorUnixSeconds: number;
  /** Epoch seconds the caller is assessing at. Passed in, never read from a clock. */
  nowUnixSeconds: number;
  /** Full-window telemetry from T3.2. */
  telemetry: PoolTelemetry;
  /** Ordered price path, used for the anti-wick persistence check. */
  pricePath: readonly PricePoint[];
  /** Swaps strictly before the anchor, and the span they cover. */
  preAnchorSwapCount: number;
  preAnchorSeconds: number;
  /** Swaps at or after the anchor, and the span they cover. */
  postAnchorSwapCount: number;
  postAnchorSeconds: number;
  /** The OKX reference leg, or null when it was never queried. */
  okx: ReferencePriceResult | null;
  /** Whether the US reference market was open at the anchor. Context, never a gate. */
  usReferenceMarketOpen: boolean;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export interface SignalOutcome {
  /** Whether this signal fired. */
  fired: boolean;
  /** Whether it could be evaluated at all. */
  evaluated: boolean;
  /** The measured value, null when it could not be computed. */
  value: number | null;
  unit: string;
  threshold: number;
  explanation: string;
}

export interface AntiWickOutcome {
  evaluated: boolean;
  held: boolean;
  /**
   * The governing retention: the **median** fraction of the fall still intact across the hold
   * interval. This is the value the gate compares against `antiWickRetentionFraction`.
   */
  retention: number | null;
  /**
   * How `retention` was derived. Stamped on the result so a stored outcome can never be
   * misread as rule 1.0.0's single-instant sample.
   */
  retentionMethod: "MEDIAN_OVER_HOLD_INTERVAL";
  /**
   * The lowest retention seen anywhere in the hold interval. Reported for transparency, never
   * consulted by the gate — see the method note §3.3a for why the minimum was rejected.
   */
  minRetention: number | null;
  /** Observations that fell strictly after the trough and no later than trough + hold. */
  samplesInHold: number;
  /** Fewest observations the interval must contain before it may be assessed at all. */
  minSamplesRequired: number;
  peakPrice: number | null;
  troughPrice: number | null;
  /** Price at the last observation inside the hold interval. */
  priceAfterHold: number | null;
  troughAt: string | null;
  /** ISO timestamp of the last observation inside the hold interval. */
  checkedAt: string | null;
  holdSeconds: number;
  explanation: string;
}

export interface ConfirmationResult {
  status: ConfirmationStatus;
  ruleVersion: string;

  /** Machine-readable reasons, in the shared `REASON_BITS` vocabulary. */
  reasonCodes: ReasonCode[];
  /** Plain-language statement of the verdict. Never the basis for any logic. */
  explanation: string;

  /** Epoch seconds of the observation the verdict rests on. */
  observedAtUnixSeconds: number | null;
  observedAtIso: string | null;
  blockNumber: number | null;
  fresh: boolean;
  ageSeconds: number | null;

  signals: {
    drawdown: SignalOutcome;
    velocity: SignalOutcome;
    basis: SignalOutcome;
  };
  antiWick: AntiWickOutcome;

  /**
   * Exit depth, recorded but ADVISORY ONLY.
   *
   * T3.2 measures it as a lower bound, which under-states depth and therefore over-states
   * risk. It can neither confirm nor block — see the method note §4.
   */
  exitDepth: {
    maxSellWithinTickRange: Measured<"baseTokens"> | null;
    isLowerBound: boolean;
    advisoryOnly: true;
    note: string;
  };

  /** Whether the OKX index leg was available at all. */
  okxLegAvailable: boolean;
  /**
   * True only when the verdict is CONFIRMED **and** both legs were available.
   *
   * This field exists so a single-leg confirmation cannot be described as a dual-leg one. No
   * artifact may claim "dual OKX/X Layer confirmation" where this is false.
   */
  dualLegConfirmed: boolean;

  /**
   * False when the window had unrecoverable RPC gaps.
   *
   * Asymmetric by design: a POSITIVE verdict from a holed window still stands, because the
   * move we observed genuinely happened. A NEGATIVE verdict is unreliable, because the extreme
   * may have fallen in a hole. So holes never block confirmation, and this field stops a
   * `NOT_CONFIRMED` from a holed window being read as a clean negative.
   */
  windowComplete: boolean;

  /** Context, not a gate — every frozen anchor lands with the US market shut. */
  usReferenceMarketOpen: boolean;
  /** Echoed so the verdict is reproducible without reading the config file. */
  thresholds: ConfirmationConfig;
}

// ---------------------------------------------------------------------------
// Anti-wick
// ---------------------------------------------------------------------------

/**
 * Checks that the largest fall in the window **stayed** in place across the hold interval.
 *
 * This is the mechanism that satisfies "no single short-lived price spike is sufficient", and
 * since rule 2.0.0 it is a hard gate on the whole verdict rather than on the drawdown signal
 * alone — see `confirmMarket`.
 *
 * ## Why the median, and not the minimum (T3.4/F2)
 *
 * Rule 1.0.0 read exactly one observation, the first at least `antiWickHoldSeconds` after the
 * trough, and computed retention from it. "Persisted" therefore meant "was dislocated at one
 * moment", and one trade timed at that instant bought full persistence.
 *
 * The fix measures retention at every observation inside the interval. Two summaries were
 * available and the choice is deliberate:
 *
 * - the **minimum** asks "was the dislocation never interrupted?", which is a different and
 *   strictly one-sided question. On a pool this thin a single counter-trade — an ordinary large
 *   buy, a stale-liquidity print, an upward wick — can retrace a large part of the fall for one
 *   observation. Under the minimum that one trade refuses an otherwise genuine dislocation,
 *   which hands an adversary a **single-trade suppression attack**: the exact mirror of the
 *   single-trade fabrication attack being removed here. Trading one manipulation surface for
 *   another is not a fix.
 * - the **median** asks "was the dislocation in place for most of the interval?", and one
 *   observation cannot move it in either direction.
 *
 * So the median. **What it costs, stated plainly:** an attacker who can hold the price down for
 * more than half of the 300-second interval still passes the gate. The median buys resistance
 * to single-observation manipulation, not to sustained manipulation — and sustaining a
 * dislocation for 150+ seconds requires real capital at risk, which is the cost the gate exists
 * to impose. It also refuses a genuine dislocation that begins retracing just before the
 * halfway point of the interval; that is a false negative, and it is the conservative direction.
 *
 * Like the retention fraction itself, the median is a shape choice rather than a tuned value:
 * there is no finer percentile that could be defended, and it was not selected by trying
 * summaries and observing outcomes.
 *
 * Fails closed in three ways: if the path is too short to locate a fall; if the window ends
 * before the hold period elapses; and if the interval contains fewer than
 * `antiWickMinSamples` observations. In all three we genuinely do not know whether the move
 * persisted, and not knowing is not the same as it having persisted.
 */
export function evaluateAntiWick(
  pricePath: readonly PricePoint[],
  config: ConfirmationConfig,
): AntiWickOutcome {
  const base: AntiWickOutcome = {
    evaluated: false,
    held: false,
    retention: null,
    retentionMethod: "MEDIAN_OVER_HOLD_INTERVAL",
    minRetention: null,
    samplesInHold: 0,
    minSamplesRequired: config.antiWickMinSamples,
    peakPrice: null,
    troughPrice: null,
    priceAfterHold: null,
    troughAt: null,
    checkedAt: null,
    holdSeconds: config.antiWickHoldSeconds,
    explanation: "",
  };

  if (pricePath.length < 2) {
    return { ...base, explanation: "Price path has fewer than two points; no fall can be located." };
  }

  // Largest peak-to-trough fall, scanning forward and carrying the running maximum.
  let runningPeak = pricePath[0];
  let bestPeak = pricePath[0];
  let bestTrough = pricePath[0];
  let bestFall = 0;

  for (const point of pricePath) {
    if (point.price > runningPeak.price) runningPeak = point;
    const fall = runningPeak.price - point.price;
    if (fall > bestFall) {
      bestFall = fall;
      bestPeak = runningPeak;
      bestTrough = point;
    }
  }

  if (bestFall <= 0) {
    return {
      ...base,
      evaluated: true,
      held: false,
      peakPrice: bestPeak.price,
      troughPrice: bestTrough.price,
      explanation: "Price never fell within the window, so there is no move to persist.",
    };
  }

  const holdEndsAt = bestTrough.unixSeconds + config.antiWickHoldSeconds;

  // The window must actually reach past the hold, or persistence was never observable at all.
  if (!pricePath.some((p) => p.unixSeconds >= holdEndsAt)) {
    return {
      ...base,
      evaluated: false,
      held: false,
      peakPrice: bestPeak.price,
      troughPrice: bestTrough.price,
      troughAt: blockToIso(bestTrough.blockNumber),
      explanation:
        `The window ends before ${config.antiWickHoldSeconds}s elapsed after the trough, so ` +
        `persistence could not be observed. Not knowing is not the same as having persisted.`,
    };
  }

  // Every observation strictly after the trough and no later than trough + hold. The trough
  // itself is excluded: it would contribute a retention of exactly 1 by construction and bias
  // the summary upward by one sample. Points beyond the interval answer "did it eventually
  // recover?", which is a different question and outside this gate's remit.
  const samples = pricePath.filter(
    (p) => p.unixSeconds > bestTrough.unixSeconds && p.unixSeconds <= holdEndsAt,
  );

  if (samples.length < config.antiWickMinSamples) {
    return {
      ...base,
      evaluated: false,
      held: false,
      samplesInHold: samples.length,
      peakPrice: bestPeak.price,
      troughPrice: bestTrough.price,
      troughAt: blockToIso(bestTrough.blockNumber),
      explanation:
        `Only ${samples.length} observation(s) fell inside the ${config.antiWickHoldSeconds}s ` +
        `hold interval, below the ${config.antiWickMinSamples} needed to say whether the move ` +
        `stayed in place. A statistic over one point is a sample, not an interval. Not knowing ` +
        `is not the same as having persisted.`,
    };
  }

  const retentions = samples.map((p) => (bestPeak.price - p.price) / bestFall);
  const sorted = [...retentions].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const retention =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const minRetention = sorted[0];
  const held = retention >= config.antiWickRetentionFraction;

  // Last by timestamp rather than by array position, so a path that is not strictly ordered
  // still reports the observation it claims to report.
  const lastInHold = samples.reduce((a, b) => (b.unixSeconds >= a.unixSeconds ? b : a));
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const required = `${(config.antiWickRetentionFraction * 100).toFixed(0)}%`;

  return {
    evaluated: true,
    held,
    retention,
    retentionMethod: "MEDIAN_OVER_HOLD_INTERVAL",
    minRetention,
    samplesInHold: samples.length,
    minSamplesRequired: config.antiWickMinSamples,
    peakPrice: bestPeak.price,
    troughPrice: bestTrough.price,
    priceAfterHold: lastInHold.price,
    troughAt: blockToIso(bestTrough.blockNumber),
    checkedAt: blockToIso(lastInHold.blockNumber),
    holdSeconds: config.antiWickHoldSeconds,
    explanation: held
      ? `${pct(retention)} of the fall was still intact at the median observation across the ` +
        `${config.antiWickHoldSeconds}s after the trough (${samples.length} observations, ` +
        `lowest ${pct(minRetention)}), at or above the ${required} required.`
      : `Only ${pct(retention)} of the fall remained at the median observation across the ` +
        `${config.antiWickHoldSeconds}s after the trough (${samples.length} observations, ` +
        `lowest ${pct(minRetention)}), below the ${required} required. This was a wick.`,
  };
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export function confirmMarket(
  input: ConfirmationInput,
  config: ConfirmationConfig = FROZEN_CONFIRMATION_CONFIG,
): ConfirmationResult {
  const reasons = new Set<ReasonCode>();
  const t = input.telemetry;

  const okxLegAvailable = input.okx?.availability === "AVAILABLE";
  if (!okxLegAvailable) reasons.add("MARKET_DATA_UNAVAILABLE");
  if (!input.usReferenceMarketOpen) reasons.add("REFERENCE_MARKET_CLOSED");

  const windowComplete = t.rpcRangeErrors === 0;

  // The observation the verdict rests on is the last swap in the window.
  const lastPoint = input.pricePath.length > 0 ? input.pricePath[input.pricePath.length - 1] : null;
  const observedAtUnixSeconds = lastPoint?.unixSeconds ?? null;
  const ageSeconds =
    observedAtUnixSeconds === null ? null : input.nowUnixSeconds - observedAtUnixSeconds;
  const fresh = ageSeconds !== null && ageSeconds >= 0 && ageSeconds <= config.freshnessSeconds;

  const exitDepth = {
    maxSellWithinTickRange: t.exitDepth?.maxSellWithinTickRange ?? null,
    isLowerBound: t.exitDepth?.isLowerBound ?? true,
    advisoryOnly: true as const,
    note:
      "Exit depth is a lower bound: liquidity only changes at initialized ticks, which a swap " +
      "log does not reveal. It under-states depth and therefore over-states risk, so it can " +
      "neither confirm nor block. A thin reading is not proof that liquidity is genuinely thin.",
  };
  // Advisory only, and emitted as such — never consulted by the verdict below.
  if (
    t.exitDepth &&
    t.exitDepth.maxSellWithinTickRange.value > 0 &&
    t.exitDepth.maxSellWithinTickRange.value < 1
  ) {
    reasons.add("THIN_EXIT_DEPTH");
  }

  const antiWick = evaluateAntiWick(input.pricePath, config);

  const blank = (unit: string, threshold: number, explanation: string): SignalOutcome => ({
    fired: false,
    evaluated: false,
    value: null,
    unit,
    threshold,
    explanation,
  });

  // ---- Gate 1: enough trades to form a verdict at all ------------------------------------
  if (t.swapCount < config.minSwapsForVerdict) {
    // INSUFFICIENT_SAMPLE, not MARKET_DATA_UNAVAILABLE. The status is `UNAVAILABLE` either way,
    // but "we looked, there is data, and there is too little of it" and "we could not look" are
    // different facts, and §0.12 requires the record to explain itself accurately.
    reasons.add("INSUFFICIENT_SAMPLE");
    return {
      status: "UNAVAILABLE",
      ruleVersion: config.ruleVersion,
      reasonCodes: [...reasons].sort(),
      explanation:
        `Only ${t.swapCount} swap(s) in the window, below the ${config.minSwapsForVerdict} ` +
        `required to form a verdict. A drawdown built from this few trades is an artifact of ` +
        `which trades happened to land, not a property of the market.`,
      observedAtUnixSeconds,
      observedAtIso: lastPoint ? blockToIso(lastPoint.blockNumber) : null,
      blockNumber: lastPoint?.blockNumber ?? null,
      fresh,
      ageSeconds,
      signals: {
        drawdown: blank("bps", config.minDrawdownBps, "Not evaluated: insufficient sample."),
        velocity: blank("ratio", config.minVelocityRatio, "Not evaluated: insufficient sample."),
        basis: blank("bps", config.minBasisBps, "Not evaluated: OKX leg unavailable."),
      },
      antiWick,
      exitDepth,
      okxLegAvailable,
      dualLegConfirmed: false,
      windowComplete,
      usReferenceMarketOpen: input.usReferenceMarketOpen,
      thresholds: config,
    };
  }

  // ---- Gate 2: freshness -----------------------------------------------------------------
  if (!fresh) {
    reasons.add("MARKET_DATA_STALE");
    return {
      status: "STALE",
      ruleVersion: config.ruleVersion,
      reasonCodes: [...reasons].sort(),
      explanation:
        `The most recent observation is ${ageSeconds}s old, beyond the ` +
        `${config.freshnessSeconds}s freshness bound. A stale observation describes a different ` +
        `market and can never satisfy a promotion gate.`,
      observedAtUnixSeconds,
      observedAtIso: lastPoint ? blockToIso(lastPoint.blockNumber) : null,
      blockNumber: lastPoint?.blockNumber ?? null,
      fresh,
      ageSeconds,
      signals: {
        drawdown: blank("bps", config.minDrawdownBps, "Not evaluated: observation is stale."),
        velocity: blank("ratio", config.minVelocityRatio, "Not evaluated: observation is stale."),
        basis: blank("bps", config.minBasisBps, "Not evaluated: OKX leg unavailable."),
      },
      antiWick,
      exitDepth,
      okxLegAvailable,
      dualLegConfirmed: false,
      windowComplete,
      usReferenceMarketOpen: input.usReferenceMarketOpen,
      thresholds: config,
    };
  }

  // ---- Anti-wick applies to every signal, not just drawdown (T3.4/F1) ----------------------
  //
  // `fired` means the same thing for all three signals: this signal is entitled to contribute
  // to the verdict. Meeting a threshold is necessary for that and no longer sufficient — the
  // gate that used to sit on `drawdown` alone now sits on all of them, so a signal's raw value
  // is reported next to the reason it was or was not allowed to count.
  const gateNote = (met: boolean): string =>
    met && !antiWick.held
      ? ` It cannot contribute to a verdict: the price dislocation did not persist. ${antiWick.explanation}`
      : "";

  // ---- Signal: drawdown, gated by anti-wick ------------------------------------------------
  const drawdownBps = t.maxDrawdownBps?.value ?? null;
  const drawdownMeetsSize = drawdownBps !== null && drawdownBps >= config.minDrawdownBps;
  const drawdownFired = drawdownMeetsSize && antiWick.held;

  const drawdown: SignalOutcome = {
    fired: drawdownFired,
    evaluated: drawdownBps !== null,
    value: drawdownBps,
    unit: "bps",
    threshold: config.minDrawdownBps,
    explanation:
      drawdownBps === null
        ? "No drawdown could be computed."
        : !drawdownMeetsSize
          ? `Drawdown of ${drawdownBps.toFixed(0)}bps is below the ${config.minDrawdownBps}bps floor.`
          : antiWick.held
            ? `Drawdown of ${drawdownBps.toFixed(0)}bps met the floor and persisted. ${antiWick.explanation}`
            : `Drawdown of ${drawdownBps.toFixed(0)}bps met the floor but did not persist. ${antiWick.explanation}`,
  };

  // ---- Signal: velocity ---------------------------------------------------------------------
  const preRate =
    input.preAnchorSeconds > 0 ? input.preAnchorSwapCount / (input.preAnchorSeconds / 60) : 0;
  const postRate =
    input.postAnchorSeconds > 0 ? input.postAnchorSwapCount / (input.postAnchorSeconds / 60) : 0;

  // A zero baseline fails closed rather than reading as infinite abnormality. A pool with no
  // pre-anchor trades may simply have just started trading, and we have no baseline to call
  // anything abnormal against.
  const ratio = preRate > 0 ? postRate / preRate : null;
  const velocityMeetsRatio = ratio !== null && ratio >= config.minVelocityRatio;
  const velocityFired = velocityMeetsRatio && antiWick.held;

  const velocity: SignalOutcome = {
    fired: velocityFired,
    evaluated: ratio !== null,
    value: ratio,
    unit: "ratio",
    threshold: config.minVelocityRatio,
    explanation:
      ratio === null
        ? "No pre-anchor trades, so there is no baseline to call activity abnormal against."
        : `Post-anchor trade rate is ${ratio.toFixed(2)}x the pre-anchor rate ` +
          `(${postRate.toFixed(2)} vs ${preRate.toFixed(2)} swaps/min).` +
          gateNote(velocityMeetsRatio),
  };

  // ---- Signal: basis (unreachable while the OKX leg is unavailable) --------------------------
  let basisValue: number | null = null;
  if (okxLegAvailable && input.okx?.sample && lastPoint) {
    const ref = Number(input.okx.sample.price);
    if (Number.isFinite(ref) && ref > 0) {
      basisValue = ((lastPoint.price - ref) / ref) * 10_000;
    }
  }
  const basisMeetsSize = basisValue !== null && Math.abs(basisValue) >= config.minBasisBps;
  const basisFired = basisMeetsSize && antiWick.held;
  const basis: SignalOutcome = {
    fired: basisFired,
    evaluated: basisValue !== null,
    value: basisValue,
    unit: "bps",
    threshold: config.minBasisBps,
    explanation:
      basisValue === null
        ? "Not evaluated: the OKX reference leg is unavailable, so no basis can be computed."
        : `Pool price diverges from the OKX reference by ${basisValue.toFixed(0)}bps.` +
          gateNote(basisMeetsSize),
  };

  // ---- Verdict --------------------------------------------------------------------------------
  //
  // Anti-wick is a NECESSARY condition for any CONFIRMED (T3.4/F1, rule 2.0.0).
  //
  // Under 1.0.0 the verdict was a bare disjunction and the gate applied to `drawdown` alone, so
  // a fully-retraced spike still confirmed: the burst of trading that accompanies almost every
  // spike fired the ungated `velocity` signal, and the very event the gate exists to reject
  // arrived carrying its own bypass. Velocity was also the cheapest surface in the stack — a
  // doubled trade rate costs no capital and no price impact.
  //
  // So velocity and basis may now CORROBORATE a persistent price dislocation. Neither may
  // SUBSTITUTE for one. Each `fired` above already embeds `antiWick.held`; the conjunction is
  // restated here so a future fourth signal cannot reopen the hole by forgetting the gate.
  const confirmed = antiWick.held && (drawdown.fired || velocity.fired || basis.fired);
  const firedNames = [
    drawdown.fired ? "drawdown" : null,
    velocity.fired ? "velocity" : null,
    basis.fired ? "basis" : null,
  ].filter((x): x is string => x !== null);

  // Which signals cleared their own bar, whether or not the gate let them count.
  const metNames = [
    drawdownMeetsSize ? "drawdown" : null,
    velocityMeetsRatio ? "velocity" : null,
    basisMeetsSize ? "basis" : null,
  ].filter((x): x is string => x !== null);

  // Two different refusals, and the difference is now machine-readable rather than only in prose.
  //
  //   ANTI_WICK_FAILED       — a POSITIVE finding: we watched the hold interval and the move
  //                            retraced, so it was a spike.
  //   PERSISTENCE_UNOBSERVED — the hold interval was unreachable (the window ended first) or too
  //                            sparse to summarise, so persistence was never observed either way.
  //
  // They are mutually exclusive by construction: one requires `evaluated: true`, the other
  // `evaluated: false`. Emitting ANTI_WICK_FAILED on an unobserved interval would assert a
  // retracement nobody saw, which is exactly the claim the gate refuses to make on its own
  // behalf. Both codes are orchestrator-owned (bits 12 and 22).
  const antiWickBlocked = metNames.length > 0 && !antiWick.held;
  if (antiWick.evaluated) {
    if (antiWickBlocked) reasons.add("ANTI_WICK_FAILED");
  } else {
    // Unconditional on whether a signal met its bar. "We could not tell whether the move
    // persisted" is a fact about the window, not about which signals happened to fire, and a
    // consumer reading a NOT_CONFIRMED needs it either way. Windows that never reached this
    // point already explain themselves (INSUFFICIENT_SAMPLE, MARKET_DATA_STALE).
    reasons.add("PERSISTENCE_UNOBSERVED");
  }

  reasons.add(confirmed ? "MARKET_CONFIRMED" : "MARKET_NOT_CONFIRMED");

  return {
    status: confirmed ? "CONFIRMED" : "NOT_CONFIRMED",
    ruleVersion: config.ruleVersion,
    reasonCodes: [...reasons].sort(),
    explanation: confirmed
      ? `Market confirmed on ${firedNames.join(" and ")}. ` +
        (okxLegAvailable
          ? ""
          : "The OKX reference leg was unavailable, so this is a single-leg (X Layer pool) " +
            "confirmation and must not be described as dual-leg.")
      : (antiWickBlocked
          ? `The ${metNames.join(" and ")} signal(s) cleared their own bar, but the price ` +
            (antiWick.evaluated
              ? `dislocation did not persist, so the market did not confirm. `
              : `dislocation could not be shown to persist, so the market did not confirm. `) +
            `${antiWick.explanation} ` +
            `A signal unaccompanied by a persistent price dislocation may corroborate a ` +
            `confirmation; it can never create one.`
          : `No confirmation signal fired.`) +
        (windowComplete
          ? ""
          : " ⚠️ The window had unrecoverable RPC gaps, so this negative is not a clean one — " +
            "the extreme may have fallen in a hole."),
    observedAtUnixSeconds,
    observedAtIso: lastPoint ? blockToIso(lastPoint.blockNumber) : null,
    blockNumber: lastPoint?.blockNumber ?? null,
    fresh,
    ageSeconds,
    signals: { drawdown, velocity, basis },
    antiWick,
    exitDepth,
    okxLegAvailable,
    dualLegConfirmed: confirmed && okxLegAvailable,
    windowComplete,
    usReferenceMarketOpen: input.usReferenceMarketOpen,
    thresholds: config,
  };
}

// ---------------------------------------------------------------------------
// Adapter — assembles an input from a captured swap window
// ---------------------------------------------------------------------------

export interface BuildInputOptions {
  anchorUnixSeconds: number;
  nowUnixSeconds: number;
  okx?: ReferencePriceResult | null;
  usReferenceMarketOpen?: boolean;
  /**
   * Assess using only data available up to this instant. Defaults to the window's end.
   *
   * A real protection system cannot see the future, and the frozen windows extend six hours
   * past their anchor. Evaluating the whole window answers "did the market eventually move?",
   * which is a retrospective question; truncating answers "had the market moved by the time we
   * had to decide?", which is the one that governs an action. Both are legitimate and they are
   * different, so the caller states which it is asking.
   */
  evaluateAtUnixSeconds?: number;
}

/**
 * Builds a `ConfirmationInput` from a captured window fixture.
 *
 * Kept separate from `confirmMarket` so the engine itself stays pure and testable with
 * synthetic inputs, rather than only through a fixture.
 */
export function buildConfirmationInput(
  fixture: SwapWindowFixture,
  options: BuildInputOptions,
): ConfirmationInput {
  const swaps = decodeFixtureSwaps(fixture);
  const windowFrom = blockToUnixSeconds(fixture.fromBlock);
  const windowTo = blockToUnixSeconds(fixture.toBlock);
  const evaluateAt = options.evaluateAtUnixSeconds ?? windowTo;

  const fullPath: PricePoint[] = swaps.map((s) => ({
    blockNumber: s.blockNumber,
    unixSeconds: blockToUnixSeconds(s.blockNumber),
    price: priceFromSqrtPriceX96(s.sqrtPriceX96, fixture),
  }));
  const pricePath = fullPath.filter((p) => p.unixSeconds <= evaluateAt);

  const anchor = options.anchorUnixSeconds;
  const pre = pricePath.filter((p) => p.unixSeconds < anchor);
  const post = pricePath.filter((p) => p.unixSeconds >= anchor);

  // Telemetry is recomputed over the truncated path so a truncated assessment never inherits
  // a drawdown from data it could not have seen.
  const truncated: SwapWindowFixture = {
    ...fixture,
    toBlock: Math.min(fixture.toBlock, Math.floor(evaluateAt) - 1_718_769_036),
    swaps: fixture.swaps.filter((row) => blockToUnixSeconds(Number(row[0])) <= evaluateAt),
    swapCount: pricePath.length,
  };

  return {
    anchorUnixSeconds: anchor,
    nowUnixSeconds: options.nowUnixSeconds,
    telemetry: computePoolTelemetry(truncated, { nowUnixSeconds: options.nowUnixSeconds }),
    pricePath,
    preAnchorSwapCount: pre.length,
    // The segment spans, not the observed trade span, so an empty segment still has a
    // denominator and a rate of zero rather than an undefined one.
    preAnchorSeconds: Math.max(0, anchor - windowFrom),
    postAnchorSwapCount: post.length,
    // Bounded by the evaluation instant, not the window end — otherwise a truncated assessment
    // would divide its trades by a span that had not elapsed yet and under-state velocity.
    postAnchorSeconds: Math.max(0, Math.min(windowTo, evaluateAt) - anchor),
    okx: options.okx ?? null,
    usReferenceMarketOpen: options.usReferenceMarketOpen ?? false,
  };
}
