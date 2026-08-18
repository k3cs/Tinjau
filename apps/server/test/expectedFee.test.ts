/**
 * Pins `expectedFee.ts` (task P4.4's pure TS reimplementation of
 * `contracts/src/AfterhoursFeePolicy.sol`) against exact vectors mirrored from
 * `contracts/test/AfterhoursFeePolicy.t.sol` and `AfterhoursFeeHook.t.sol`, plus the live
 * hook config on X Layer Testnet (chain 1952), re-verified via `cast call` during P4.4
 * planning: `baseFee=500, maxFee=20000, widenDuration=3600 (1h), decayDuration=18000 (5h)`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_TYPE, computeFee, concernTier, type FieldAgreement, type SeverityGrade } from "../src/chain/expectedFee.js";

const BASE_FEE = 500n;
const MAX_FEE = 20_000n;
const WIDEN_DURATION = 3_600n; // 1 hour — live hook.widenDuration()
const DECAY_DURATION = 18_000n; // 5 hours — live hook.decayDuration()

function fullAgreement(): FieldAgreement {
  return {
    eventTypeAgreement: 3,
    effectiveDateAgreement: 3,
    declaredAmountAgreement: 3,
    affectedTokenAgreement: 3,
    nextEventDateAgreement: 3,
  };
}

function weakAgreement(): FieldAgreement {
  return {
    eventTypeAgreement: 1,
    effectiveDateAgreement: 1,
    declaredAmountAgreement: 1,
    affectedTokenAgreement: 1,
    nextEventDateAgreement: 1,
  };
}

function severity(s: number): SeverityGrade {
  return { severity: s, confidence: 90 };
}

test("computeFee: hasEvent=false always returns baseFee", () => {
  const fee = computeFee({
    eventType: EVENT_TYPE.Unknown,
    agreement: fullAgreement(),
    severity: severity(0),
    isDisputedUnresolved: false,
    eventTimestamp: 0n,
    hasEvent: false,
    nowTimestamp: 1_000_000n,
    baseFee: BASE_FEE,
    maxFee: MAX_FEE,
    widenDuration: WIDEN_DURATION,
    decayDuration: DECAY_DURATION,
  });
  assert.equal(fee, BASE_FEE);
});

// --- tier ladder, full agreement, neutral severity, fully widened (elapsed=0) ---
// span = 20000-500 = 19500; tier0=500, tier1=500+19500*1/3=7000, tier2=500+19500*2/3=13500,
// tier3=500+19500=20000.
const TIER_LADDER: Array<[string, number, bigint]> = [
  ["Unknown -> tier 0", EVENT_TYPE.Unknown, 500n],
  ["Form8K_Material -> tier 1", EVENT_TYPE.Form8K_Material, 7_000n],
  ["Form8K_MAndA -> tier 2", EVENT_TYPE.Form8K_MAndA, 13_500n],
  ["Form8K_Bankruptcy -> tier 3", EVENT_TYPE.Form8K_Bankruptcy, 20_000n],
];

for (const [label, eventType, expectedFee] of TIER_LADDER) {
  test(`computeFee tier ladder (full agreement, neutral severity, t=0): ${label}`, () => {
    const fee = computeFee({
      eventType: eventType as (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE],
      agreement: fullAgreement(),
      severity: severity(0),
      isDisputedUnresolved: false,
      eventTimestamp: 1_000n,
      hasEvent: true,
      nowTimestamp: 1_000n, // same block as post -> fully widened
      baseFee: BASE_FEE,
      maxFee: MAX_FEE,
      widenDuration: WIDEN_DURATION,
      decayDuration: DECAY_DURATION,
    });
    assert.equal(fee, expectedFee);
  });
}

test("concernTier: minCoreAgreement<2 bumps tier by exactly 1", () => {
  const tierFull = concernTier(EVENT_TYPE.Form8K_Earnings, fullAgreement(), false);
  const tierWeak = concernTier(EVENT_TYPE.Form8K_Earnings, weakAgreement(), false);
  assert.equal(tierFull, 1);
  assert.equal(tierWeak, 2, "weak per-field agreement should bump concern tier up by exactly one");
});

test("concernTier: bump is capped at MAX_TIER=3 even with weak agreement + open dispute on an already tier-3 event", () => {
  const tier = concernTier(EVENT_TYPE.Form8K_Bankruptcy, weakAgreement(), true);
  assert.equal(tier, 3);
});

test("computeFee: full decay (now = eventTimestamp + widenDuration + decayDuration + 1) returns baseFee regardless of tier", () => {
  const eventTimestamp = 1_000n;
  const fee = computeFee({
    eventType: EVENT_TYPE.Form8K_Bankruptcy, // tier 3 — would otherwise be maxFee
    agreement: fullAgreement(),
    severity: severity(0),
    isDisputedUnresolved: false,
    eventTimestamp,
    hasEvent: true,
    nowTimestamp: eventTimestamp + WIDEN_DURATION + DECAY_DURATION + 1n,
    baseFee: BASE_FEE,
    maxFee: MAX_FEE,
    widenDuration: WIDEN_DURATION,
    decayDuration: DECAY_DURATION,
  });
  assert.equal(fee, BASE_FEE);
});

test("computeFee: adversarial max positive severity (127) on tier-3/fully-widened stays clamped at maxFee", () => {
  const fee = computeFee({
    eventType: EVENT_TYPE.Form8K_Bankruptcy,
    agreement: weakAgreement(), // would bump tier further if not already capped
    severity: severity(127), // beyond the documented +100 ceiling
    isDisputedUnresolved: true, // another would-be tier bump
    eventTimestamp: 1_000n,
    hasEvent: true,
    nowTimestamp: 1_000n,
    baseFee: BASE_FEE,
    maxFee: MAX_FEE,
    widenDuration: WIDEN_DURATION,
    decayDuration: DECAY_DURATION,
  });
  assert.equal(fee, MAX_FEE, "max positive severity plus already-maxed fee must clamp at maxFee, not overshoot");
  assert.ok(fee >= BASE_FEE && fee <= MAX_FEE);
});

test("computeFee: adversarial max negative severity (-128) on tier-0/fully-decayed stays clamped at baseFee", () => {
  const fee = computeFee({
    eventType: EVENT_TYPE.Unknown,
    agreement: fullAgreement(),
    severity: severity(-128), // beyond the documented -100 floor
    isDisputedUnresolved: false,
    eventTimestamp: 1_000n,
    hasEvent: true,
    nowTimestamp: 1_000n + WIDEN_DURATION + DECAY_DURATION + 1n, // fully decayed too
    baseFee: BASE_FEE,
    maxFee: MAX_FEE,
    widenDuration: WIDEN_DURATION,
    decayDuration: DECAY_DURATION,
  });
  assert.equal(fee, BASE_FEE, "max negative severity plus already-minimum fee must clamp at baseFee, not underflow");
  assert.ok(fee >= BASE_FEE && fee <= MAX_FEE);
});

// --- The actual P4.4 positive-arm prediction: Form8K_Bankruptcy, full agreement, fully
// widened (elapsed=0), severity=-90 -> tier3 anchor (20000) nudged down by the bounded
// severity swing: swing = severity * bandWidth * 2000 / (100 * 10000)
//              = -90 * 19500 * 2000 / 1000000 = -3510
// candidate = 20000 - 3510 = 16490 (within [500, 20000], no clamping needed).
test("computeFee: Form8K_Bankruptcy + severity=-90 + full plateau (elapsed=0) === 16490 (the P4.4 positive-arm prediction)", () => {
  const fee = computeFee({
    eventType: EVENT_TYPE.Form8K_Bankruptcy,
    agreement: fullAgreement(),
    severity: severity(-90),
    isDisputedUnresolved: false,
    eventTimestamp: 5_000n,
    hasEvent: true,
    nowTimestamp: 5_000n, // t=0 elapsed, fully widened
    baseFee: BASE_FEE,
    maxFee: MAX_FEE,
    widenDuration: WIDEN_DURATION,
    decayDuration: DECAY_DURATION,
  });
  assert.equal(fee, 16_490n);
});
