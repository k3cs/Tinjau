/**
 * Market-confirmation engine (task T3.3).
 *
 * Acceptance criteria being proven:
 *   - no single short-lived price spike is sufficient;
 *   - the confirmation reason and its contributing values are reproducible;
 *   - missing or stale data blocks a new PROTECT.
 *
 * The four frozen scenarios are pinned at the end. Those pins are REGRESSION guards, not
 * targets: if a threshold change alters them, T0.4 §6.3 requires the whole benchmark be
 * re-run and re-labelled rather than the pin be edited.
 *
 * Updated by T3.4 for rule `tinjau.confirm/2.0.0`. No threshold VALUE changed; the decision
 * rule did. Anti-wick is now necessary for EVERY signal rather than for drawdown alone (F1),
 * and persistence is the median retention across the hold interval rather than the value at one
 * endpoint (F2). All four frozen verdicts were re-run through the production adapter after the
 * change and are unchanged — the pins below are the evidence.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  confirmMarket,
  evaluateAntiWick,
  buildConfirmationInput,
  type ConfirmationInput,
  type PricePoint,
} from "../src/market/confirm.js";
import { FROZEN_CONFIRMATION_CONFIG as CFG } from "../src/market/confirmationConfig.js";
import { FROZEN_PROMOTION_CONFIG } from "../src/risk/promotionConfig.js";
import { blockToUnixSeconds, type PoolTelemetry } from "../src/market/poolTelemetry.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "market", "fixtures");
const readFixture = (id: string) =>
  JSON.parse(readFileSync(join(fixturesDir, `pool-scenario-${id}-swaps.json`), "utf8"));

const BLOCK0 = 68_000_000;
const T0 = blockToUnixSeconds(BLOCK0);

/**
 * Builds a price path from a list of price LEVELS, at one block per second.
 *
 * Each level is expanded into `perLevel` observations `stepSeconds` apart. The defaults give a
 * level a span of 180s — shorter than the 300s anti-wick hold — so the observations following a
 * trough fall INSIDE the hold interval and the interval is never empty.
 *
 * This shape matters since rule 2.0.0. Persistence is now the median retention across the whole
 * hold interval rather than the value at one endpoint, so a path with a single observation per
 * level would be `evaluated: false` everywhere and would test nothing about persistence at all.
 */
function path(levels: number[], perLevel = 3, stepSeconds = 60): PricePoint[] {
  const points: PricePoint[] = [];
  levels.forEach((price, levelIndex) => {
    for (let k = 0; k < perLevel; k += 1) {
      const i = levelIndex * perLevel + k;
      points.push({
        blockNumber: BLOCK0 + i * stepSeconds,
        unixSeconds: T0 + i * stepSeconds,
        price,
      });
    }
  });
  return points;
}

function telemetry(over: Partial<PoolTelemetry> = {}): PoolTelemetry {
  const measured = <U extends string>(value: number, unit: U) => ({
    value,
    unit,
    provenance: {
      blockNumber: BLOCK0,
      timestamp: new Date(T0 * 1000).toISOString(),
      logIndex: 0,
      chainId: 196,
      pool: "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2",
      liquiditySource: "THIRD_PARTY" as const,
    },
  });
  return {
    scenarioId: "synthetic",
    pool: {} as PoolTelemetry["pool"],
    fromBlock: BLOCK0,
    toBlock: BLOCK0 + 10_000,
    fromIso: new Date(T0 * 1000).toISOString(),
    toIso: new Date((T0 + 10_000) * 1000).toISOString(),
    marketDataStatus: "NOT_CONFIRMED",
    quality: "ADEQUATE",
    availabilityNote: "synthetic",
    swapCount: 500,
    rpcRangeErrors: 0,
    openPrice: measured(100, "quotePerBase"),
    closePrice: measured(100, "quotePerBase"),
    highPrice: measured(100, "quotePerBase"),
    lowPrice: measured(100, "quotePerBase"),
    maxDrawdownBps: measured(0, "bps"),
    netChangeBps: measured(0, "bps"),
    tradeVelocity: measured(1, "swapsPerMinute"),
    volumeQuote: measured(1000, "quoteTokens"),
    exitDepth: null,
    ...over,
  } as PoolTelemetry;
}

function input(over: Partial<ConfirmationInput> = {}): ConfirmationInput {
  const merged = {
    anchorUnixSeconds: T0,
    telemetry: telemetry(),
    pricePath: path([100, 100, 100]),
    preAnchorSwapCount: 100,
    preAnchorSeconds: 3600,
    postAnchorSwapCount: 400,
    postAnchorSeconds: 21_600,
    okx: null,
    usReferenceMarketOpen: false,
    ...over,
  };
  // Derived from the FINAL path, not the default one. A case that overrides `pricePath` would
  // otherwise inherit a `now` that predates its own last observation and fail closed as STALE,
  // masking whatever the case was actually testing.
  const last = merged.pricePath[merged.pricePath.length - 1];
  return {
    nowUnixSeconds: over.nowUnixSeconds ?? (last ? last.unixSeconds + 10 : T0),
    ...merged,
  } as ConfirmationInput;
}

// ---------------------------------------------------------------------------
// The thresholds are frozen and anchored, not free-floating
// ---------------------------------------------------------------------------

test("freshness is inherited from T1.2 rather than being a second, divergent number", () => {
  // Two different answers to "how old is too old" would let a sample be fresh to one layer
  // and stale to the other.
  assert.equal(CFG.freshnessSeconds, FROZEN_PROMOTION_CONFIG.marketFreshnessSec);
});

test("the drawdown floor equals the deployed policy's maximum fee", () => {
  // 20_000 pips = 2% = 200bps. Invoking a 2% fee against a smaller dislocation is incoherent,
  // which is what makes this an economic anchor rather than an arbitrary percentile.
  assert.equal(CFG.minDrawdownBps, 200);
});

test("the config is frozen at runtime", () => {
  assert.throws(() => {
    (CFG as { minDrawdownBps: number }).minDrawdownBps = 1;
  });
});

// ---------------------------------------------------------------------------
// Anti-wick — the mechanism that satisfies "no single spike is sufficient"
// ---------------------------------------------------------------------------

test("a spike that fully retraces is rejected as a wick", () => {
  // Down 10% then straight back. The touch happened; the dislocation did not.
  const p = path([100, 100, 90, 100, 100]);
  const outcome = evaluateAntiWick(p, CFG);

  assert.equal(outcome.evaluated, true);
  assert.equal(outcome.held, false);
  assert.ok(outcome.retention !== null && outcome.retention < 0.5);
  assert.match(outcome.explanation, /This was a wick/);
});

test("a move that holds is accepted", () => {
  const p = path([100, 100, 90, 90, 90]);
  const outcome = evaluateAntiWick(p, CFG);

  assert.equal(outcome.held, true);
  assert.equal(outcome.retention, 1);
  assert.match(outcome.explanation, /still intact/);
});

test("a half-retrace sits exactly on the boundary and is accepted", () => {
  const p = path([100, 100, 90, 95, 95]);
  const outcome = evaluateAntiWick(p, CFG);
  assert.equal(outcome.retention, 0.5);
  assert.equal(outcome.held, true);
});

test("anti-wick fails closed when the window ends before the hold elapses", () => {
  // Trough in the final second: persistence was never observed. Not knowing that a move
  // persisted is not the same as it having persisted.
  const p = [
    { blockNumber: BLOCK0, unixSeconds: T0, price: 100 },
    { blockNumber: BLOCK0 + 1, unixSeconds: T0 + 1, price: 90 },
  ];
  const outcome = evaluateAntiWick(p, CFG);

  assert.equal(outcome.evaluated, false);
  assert.equal(outcome.held, false);
  assert.match(outcome.explanation, /Not knowing is not the same as having persisted/);
});

test("a large drawdown that fails anti-wick cannot confirm", () => {
  const result = confirmMarket(
    input({
      telemetry: telemetry({ maxDrawdownBps: { value: 900, unit: "bps" } as never }),
      pricePath: path([100, 100, 90, 100, 100]),
    }),
  );

  assert.equal(result.status, "NOT_CONFIRMED");
  assert.equal(result.signals.drawdown.evaluated, true);
  assert.equal(result.signals.drawdown.fired, false, "a 900bps wick must not confirm");
  assert.ok(result.reasonCodes.includes("ANTI_WICK_FAILED"));
});

test("the same drawdown confirms once it persists", () => {
  const result = confirmMarket(
    input({
      telemetry: telemetry({ maxDrawdownBps: { value: 900, unit: "bps" } as never }),
      pricePath: path([100, 100, 90, 90, 90]),
    }),
  );

  assert.equal(result.status, "CONFIRMED");
  assert.equal(result.signals.drawdown.fired, true);
  assert.ok(result.reasonCodes.includes("MARKET_CONFIRMED"));
});

// ---------------------------------------------------------------------------
// Fail closed
// ---------------------------------------------------------------------------

test("too few trades yields UNAVAILABLE, never a verdict", () => {
  const result = confirmMarket(
    input({ telemetry: telemetry({ swapCount: CFG.minSwapsForVerdict - 1 }) }),
  );

  assert.equal(result.status, "UNAVAILABLE");
  // INSUFFICIENT_SAMPLE, not MARKET_DATA_UNAVAILABLE: "we looked and there is too little data"
  // and "we could not look" are different facts, and the record has to say which one this is.
  assert.ok(result.reasonCodes.includes("INSUFFICIENT_SAMPLE"));
  assert.equal(result.signals.drawdown.evaluated, false);
  assert.match(result.explanation, /artifact of/);
});

test("a stale observation yields STALE and never confirms", () => {
  const p = path([100, 100, 80, 80, 80]);
  const result = confirmMarket(
    input({
      pricePath: p,
      telemetry: telemetry({ maxDrawdownBps: { value: 2000, unit: "bps" } as never }),
      nowUnixSeconds: p[p.length - 1].unixSeconds + CFG.freshnessSeconds + 1,
    }),
  );

  assert.equal(result.status, "STALE");
  assert.equal(result.fresh, false);
  assert.ok(result.reasonCodes.includes("MARKET_DATA_STALE"));
});

test("no signal firing yields NOT_CONFIRMED rather than anything softer", () => {
  const result = confirmMarket(input());
  assert.equal(result.status, "NOT_CONFIRMED");
  assert.ok(result.reasonCodes.includes("MARKET_NOT_CONFIRMED"));
});

test("a zero pre-anchor baseline cannot make velocity abnormal", () => {
  // A pool with no prior trades may simply have just started trading. With no baseline,
  // nothing can be called abnormal against it.
  const result = confirmMarket(input({ preAnchorSwapCount: 0, postAnchorSwapCount: 5000 }));

  assert.equal(result.signals.velocity.evaluated, false);
  assert.equal(result.signals.velocity.fired, false);
  assert.equal(result.status, "NOT_CONFIRMED");
  assert.match(result.signals.velocity.explanation, /no baseline/);
});

// ---------------------------------------------------------------------------
// Anti-wick is NECESSARY for every signal, not only for drawdown (rule 2.0.0)
// ---------------------------------------------------------------------------

const DOUBLED_VELOCITY = {
  preAnchorSwapCount: 60,
  preAnchorSeconds: 3600,
  postAnchorSwapCount: 720,
  postAnchorSeconds: 21_600,
};

test("velocity corroborates a persistent dislocation and confirms alongside it", () => {
  const result = confirmMarket(
    input({ ...DOUBLED_VELOCITY, pricePath: path([100, 100, 90, 90, 90]) }),
  );

  assert.equal(result.signals.velocity.value, 2);
  assert.equal(result.antiWick.held, true, "the fall persisted");
  assert.equal(result.signals.velocity.fired, true);
  assert.equal(result.status, "CONFIRMED");
});

test("velocity alone cannot confirm: a doubled trade rate on a flat price is not a consequence", () => {
  // T3.4/F1. Under rule 1.0.0 this returned CONFIRMED. Doubling a trade rate costs no capital
  // and moves no price — wash trading between two addresses suffices — so it was the cheapest
  // manipulation surface in the stack and the only signal exempt from a persistence gate.
  const result = confirmMarket({
    ...input({ ...DOUBLED_VELOCITY, pricePath: path([100, 100, 100]) }),
  });

  assert.equal(result.signals.velocity.value, 2, "the rate really did double");
  assert.equal(result.antiWick.held, false, "but the price never moved, so nothing persisted");
  assert.equal(result.signals.velocity.fired, false);
  assert.equal(result.status, "NOT_CONFIRMED");
});

test("velocity cannot rescue a spike that the anti-wick gate refused", () => {
  // The realistic shape: a large fall that fully retraces, carrying the volume burst that
  // accompanies almost every real spike. The gate exists to reject exactly this.
  const result = confirmMarket(
    input({
      ...DOUBLED_VELOCITY,
      telemetry: telemetry({ maxDrawdownBps: { value: 900, unit: "bps" } as never }),
      pricePath: path([100, 100, 90, 100, 100]),
    }),
  );

  assert.equal(result.signals.drawdown.fired, false);
  assert.equal(result.signals.velocity.value, 2);
  assert.equal(result.signals.velocity.fired, false, "corroboration, never substitution");
  assert.equal(result.status, "NOT_CONFIRMED");
  assert.ok(result.reasonCodes.includes("ANTI_WICK_FAILED"));
  assert.match(result.explanation, /can never create one/);
});

// ---------------------------------------------------------------------------
// Exit depth is advisory only
// ---------------------------------------------------------------------------

test("thin exit depth is reported but can neither confirm nor block", () => {
  assert.equal(CFG.exitDepthMayConfirm, false);

  const thin = telemetry({
    exitDepth: {
      maxSellWithinTickRange: { value: 0.53, unit: "baseTokens" },
      isLowerBound: true,
    } as never,
  });

  // Advisory reason present, verdict unchanged by it.
  const result = confirmMarket(input({ telemetry: thin }));
  assert.ok(result.reasonCodes.includes("THIN_EXIT_DEPTH"));
  assert.equal(result.status, "NOT_CONFIRMED");
  assert.equal(result.exitDepth.advisoryOnly, true);
  assert.equal(result.exitDepth.isLowerBound, true);
  assert.match(result.exitDepth.note, /under-states depth and therefore over-states risk/);

  // And it must not block a confirmation that a real signal earns.
  const withSignal = confirmMarket(
    input({
      telemetry: { ...thin, maxDrawdownBps: { value: 900, unit: "bps" } } as never,
      pricePath: path([100, 100, 90, 90, 90]),
    }),
  );
  assert.equal(withSignal.status, "CONFIRMED");
});

// ---------------------------------------------------------------------------
// The OKX leg, and the field that cannot be glossed
// ---------------------------------------------------------------------------

test("a single-leg confirmation can never be described as dual-leg", () => {
  const result = confirmMarket(
    input({
      telemetry: telemetry({ maxDrawdownBps: { value: 900, unit: "bps" } as never }),
      pricePath: path([100, 100, 90, 90, 90]),
      okx: null,
    }),
  );

  assert.equal(result.status, "CONFIRMED");
  assert.equal(result.okxLegAvailable, false);
  assert.equal(result.dualLegConfirmed, false, "the OKX leg was unavailable");
  assert.match(result.explanation, /must not be described as dual-leg/);
});

test("dualLegConfirmed is true only when both legs are present and the verdict is CONFIRMED", () => {
  const okx = {
    availability: "AVAILABLE",
    sample: { price: "100" },
  } as never;

  const confirmed = confirmMarket(
    input({
      telemetry: telemetry({ maxDrawdownBps: { value: 900, unit: "bps" } as never }),
      pricePath: path([100, 100, 90, 90, 90]),
      okx,
    }),
  );
  assert.equal(confirmed.dualLegConfirmed, true);

  // Both legs present but no signal: still not a dual-leg confirmation, because it is not a
  // confirmation at all.
  const notConfirmed = confirmMarket(input({ okx }));
  assert.equal(notConfirmed.okxLegAvailable, true);
  assert.equal(notConfirmed.dualLegConfirmed, false);
});

test("the basis path works when the OKX leg is available", () => {
  // Pool falls to 90 and stays there against a reference of 100: a -1000bps basis, past the
  // 300bps floor, on top of a dislocation that persisted.
  const result = confirmMarket(
    input({
      pricePath: path([100, 100, 90, 90, 90]),
      okx: { availability: "AVAILABLE", sample: { price: "100" } } as never,
    }),
  );

  assert.equal(result.signals.basis.evaluated, true);
  assert.ok(Math.abs(result.signals.basis.value ?? 0) > CFG.minBasisBps);
  assert.equal(result.signals.basis.fired, true);
  assert.equal(result.status, "CONFIRMED");
});

test("basis is gated by anti-wick too, which narrows it — a known and disclosed cost", () => {
  // A pool sitting persistently 1000bps below the reference, with a FLAT own-price path, has a
  // real dislocation but no peak-to-trough fall for the anti-wick gate to measure. Rule 2.0.0
  // therefore refuses it.
  //
  // This is a deliberate narrowing, not an oversight: T3.4 made anti-wick necessary for EVERY
  // path so that no signal can substitute for a persistent price dislocation, and the gate is
  // written against the pool's own price path. It fails closed, and the basis path has never
  // been exercised against real data (method note §3.6 — no OKX index covers any frozen
  // anchor), so nothing measured depends on it. It is pinned here so the narrowing cannot be
  // discovered by surprise later.
  const result = confirmMarket(
    input({
      pricePath: path([90, 90, 90]),
      okx: { availability: "AVAILABLE", sample: { price: "100" } } as never,
    }),
  );

  assert.ok(Math.abs(result.signals.basis.value ?? 0) > CFG.minBasisBps, "the basis is large");
  assert.equal(result.antiWick.held, false, "but the pool's own price never fell");
  assert.equal(result.signals.basis.fired, false);
  assert.equal(result.status, "NOT_CONFIRMED");
});

// ---------------------------------------------------------------------------
// Reproducibility and context
// ---------------------------------------------------------------------------

test("the verdict is deterministic and carries everything needed to re-derive it", () => {
  const i = input();
  assert.deepEqual(confirmMarket(i), confirmMarket(i));

  const r = confirmMarket(i);
  // Bumped from 1.0.0 by T3.4: `CONFIRMED` means something different now (anti-wick is
  // necessary for every path, and persistence is a median across the hold interval), and a
  // verdict can differ from 1.0.0 in BOTH directions, so the change is not a compatible
  // refinement. No threshold VALUE moved.
  assert.equal(r.ruleVersion, "tinjau.confirm/2.0.0");
  assert.equal(r.thresholds.minDrawdownBps, CFG.minDrawdownBps);
  assert.equal(r.antiWick.retentionMethod, "MEDIAN_OVER_HOLD_INTERVAL");
  assert.ok(r.observedAtIso !== null);
  assert.ok(r.blockNumber !== null);
  assert.equal(typeof r.ageSeconds, "number");
  for (const s of [r.signals.drawdown, r.signals.velocity, r.signals.basis]) {
    assert.ok(s.unit.length > 0);
    assert.ok(s.explanation.length > 0);
    assert.equal(typeof s.threshold, "number");
  }
});

test("a closed US reference market is recorded as context, never as a disqualifier", () => {
  const withSignal = {
    telemetry: telemetry({ maxDrawdownBps: { value: 900, unit: "bps" } as never }),
    pricePath: path([100, 100, 90, 90, 90]),
  };

  const closed = confirmMarket(input({ ...withSignal, usReferenceMarketOpen: false }));
  const open = confirmMarket(input({ ...withSignal, usReferenceMarketOpen: true }));

  assert.equal(closed.status, "CONFIRMED");
  assert.equal(open.status, closed.status, "market hours must not change the verdict");
  assert.ok(closed.reasonCodes.includes("REFERENCE_MARKET_CLOSED"));
  assert.equal(open.reasonCodes.includes("REFERENCE_MARKET_CLOSED"), false);
});

test("an incomplete window never blocks a confirmation, but is flagged on a negative", () => {
  // Asymmetric on purpose: the move we observed genuinely happened, but an extreme we did not
  // observe may have fallen in a hole.
  const holed = telemetry({ rpcRangeErrors: 3, maxDrawdownBps: { value: 900, unit: "bps" } as never });

  const confirmed = confirmMarket(input({ telemetry: holed, pricePath: path([100, 100, 90, 90, 90]) }));
  assert.equal(confirmed.status, "CONFIRMED");
  assert.equal(confirmed.windowComplete, false);

  const negative = confirmMarket(input({ telemetry: telemetry({ rpcRangeErrors: 3 }) }));
  assert.equal(negative.status, "NOT_CONFIRMED");
  assert.match(negative.explanation, /not a clean one/);
});

// ---------------------------------------------------------------------------
// The frozen scenarios — regression pins, not targets
// ---------------------------------------------------------------------------

const SCENARIOS = [
  { id: "a", label: "A", anchor: "2026-07-27T20:33:00Z", expected: "UNAVAILABLE" },
  { id: "b", label: "B", anchor: "2026-08-17T12:41:33Z", expected: "NOT_CONFIRMED" },
  { id: "c", label: "C", anchor: "2026-08-15T19:38:26Z", expected: "NOT_CONFIRMED" },
  { id: "d", label: "D", anchor: "2026-08-12T21:13:10Z", expected: "NOT_CONFIRMED" },
] as const;

test("no frozen scenario reaches CONFIRMED under the frozen thresholds", () => {
  for (const s of SCENARIOS) {
    const fixture = readFixture(s.id);
    const anchor = Math.floor(Date.parse(s.anchor) / 1000);
    const windowEnd = blockToUnixSeconds(fixture.toBlock);

    const result = confirmMarket(
      buildConfirmationInput(fixture, {
        anchorUnixSeconds: anchor,
        nowUnixSeconds: windowEnd,
        okx: null,
        usReferenceMarketOpen: false,
      }),
    );

    assert.equal(result.status, s.expected, `scenario ${s.label}`);
    assert.notEqual(result.status, "CONFIRMED", `scenario ${s.label} must not confirm`);
    // Every one of them is single-leg by necessity: no OKX index data covers any anchor.
    assert.equal(result.dualLegConfirmed, false);
    assert.equal(result.okxLegAvailable, false);
    assert.ok(result.reasonCodes.includes("REFERENCE_MARKET_CLOSED"));
  }
});

test("scenario B's 235bps drawdown is rejected because it did not persist", () => {
  // The centrepiece of the demo, and the reason it resolves to WATCH rather than PROTECT.
  // T0.2 pre-registered exactly this fallback and forbade working around it by loosening the
  // confirmation rules, so this test pins the honest outcome.
  const fixture = readFixture("b");
  const result = confirmMarket(
    buildConfirmationInput(fixture, {
      anchorUnixSeconds: Math.floor(Date.parse("2026-08-17T12:41:33Z") / 1000),
      nowUnixSeconds: blockToUnixSeconds(fixture.toBlock),
      okx: null,
    }),
  );

  assert.ok((result.signals.drawdown.value ?? 0) > CFG.minDrawdownBps, "the move was large enough");
  assert.equal(result.antiWick.held, false, "but it did not persist");
  assert.equal(result.signals.drawdown.fired, false);
  assert.equal(result.status, "NOT_CONFIRMED");
});

test("scenario A's empty window is UNAVAILABLE, distinct from a negative verdict", () => {
  const fixture = readFixture("a");
  const result = confirmMarket(
    buildConfirmationInput(fixture, {
      anchorUnixSeconds: Math.floor(Date.parse("2026-07-27T20:33:00Z") / 1000),
      nowUnixSeconds: blockToUnixSeconds(fixture.toBlock),
      okx: null,
    }),
  );

  // "We could not look" and "we looked and saw nothing" must never collapse into one.
  assert.equal(result.status, "UNAVAILABLE");
  assert.notEqual(result.status, "NOT_CONFIRMED");
  assert.equal(result.signals.drawdown.evaluated, false);
});

test("truncating to decision time never sees data the assessor could not have had", () => {
  const fixture = readFixture("b");
  const anchor = Math.floor(Date.parse("2026-08-17T12:41:33Z") / 1000);
  const decisionTime = anchor + CFG.freshnessSeconds;

  const truncated = buildConfirmationInput(fixture, {
    anchorUnixSeconds: anchor,
    nowUnixSeconds: decisionTime,
    evaluateAtUnixSeconds: decisionTime,
    okx: null,
  });
  const full = buildConfirmationInput(fixture, {
    anchorUnixSeconds: anchor,
    nowUnixSeconds: blockToUnixSeconds(fixture.toBlock),
    okx: null,
  });

  assert.ok(truncated.pricePath.length < full.pricePath.length);
  for (const p of truncated.pricePath) assert.ok(p.unixSeconds <= decisionTime);
  // Neither view confirms, so the demo's outcome does not hinge on which is chosen.
  assert.notEqual(confirmMarket(truncated).status, "CONFIRMED");
  assert.notEqual(confirmMarket(full).status, "CONFIRMED");
});
