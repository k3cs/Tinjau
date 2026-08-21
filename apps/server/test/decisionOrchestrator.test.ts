/**
 * The decision orchestrator (task T4.1).
 *
 * The four acceptance properties, each proven rather than asserted in prose:
 *
 *   1. the output carries inputs, rule version, state, reason, confidence band, expiry, the
 *      proposed bounded action, and an explanation;
 *   2. it is DETERMINISTIC — no clock, no randomness, no model call, and time enters only as an
 *      explicit parameter;
 *   3. it is IDEMPOTENT — the same event with the same inputs yields an identical
 *      `assessmentId`, and a continuing PROTECT keeps its ORIGINAL start;
 *   4. it FAILS CLOSED — missing or stale market data cannot create a new PROTECT, but cannot
 *      cancel one that is already running either.
 *
 * The market-confirmation result is constructed here from its exported type rather than by
 * calling the engine, so these tests exercise the orchestrator's own logic and do not move when
 * `market/confirm.ts` changes its thresholds. The four frozen scenarios go through the real
 * engine end to end in `decisionScenarios.test.ts`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { decide, DecisionInputError, type DecisionInput } from "../src/decision/orchestrate.js";
import {
  FROZEN_ACTION_ENVELOPE as ENV,
  proposeBoundedFee,
  targetFeeForConfidence,
  decayedFee,
} from "../src/decision/envelope.js";
import { FROZEN_PROMOTION_CONFIG as CFG } from "../src/risk/promotionConfig.js";
import { normalizeClaims, type RawClaimInput } from "../src/evidence/normalize.js";
import { buildEvidenceGraph } from "../src/evidence/graph.js";
import { resolveAsset } from "../src/evidence/assets.js";
import type { ConfirmationResult } from "../src/market/confirm.js";
import type { ConfirmationStatus } from "../src/risk/types.js";

/** 2026-08-15T13:00:00Z — one hour after the synthetic claims below were published. */
const NOW = 1_786_798_800;
const CHAIN_ID = 196;
const REGISTRY = "0x00000000000000000000000000000000000000c1" as const;
const NVDA = "0xa8ddb5cd96b5222afe198316e9a57caa642850d5";

// ---------------------------------------------------------------------------
// Input builders
// ---------------------------------------------------------------------------

function rawClaim(over: Partial<RawClaimInput> = {}): RawClaimInput {
  return {
    claimId: "claim-1",
    sourceClass: "NEWS",
    dataMode: "REPLAY",
    sourceUrl: "https://example.com/one",
    sourceId: "example.com/one",
    publisherOrAuthor: "Reuters",
    publishedAt: "2026-08-15T12:00:00Z",
    publishedAtPrecision: "SECOND",
    company: "NVIDIA CORPORATION",
    tokenSymbol: "wNVDAx",
    tokenAddress: NVDA,
    eventType: "CONTINGENT_FINANCIAL_OBLIGATION",
    claimTextOrPointer: "NVIDIA agreed to guarantee a data-centre lease obligation.",
    independenceGroup: "news:reuters",
    relation: "ORIGIN",
    officialConfirmation: false,
    expiresAt: null,
    materiality: "MATERIAL",
    ...over,
  };
}

/**
 * Two genuinely independent origins, which is what non-official PROTECT requires.
 *
 * Publisher names are drawn from the alias table `evidence/graph.ts` uses, so the derived
 * origin keys really are distinct rather than two `unrecognised:` keys that happen to differ.
 */
function twoOriginClaims(): RawClaimInput[] {
  return [
    rawClaim({ claimId: "claim-1", publisherOrAuthor: "Reuters", sourceId: "reuters.com/one" }),
    rawClaim({
      claimId: "claim-2",
      publisherOrAuthor: "Bloomberg",
      sourceId: "bloomberg.com/two",
      sourceUrl: "https://example.com/two",
      independenceGroup: "news:bloomberg",
      claimTextOrPointer: "Bloomberg reporters confirmed the guarantee independently.",
    }),
  ];
}

/**
 * A `ConfirmationResult` built from the exported type.
 *
 * Only the fields the orchestrator reads carry meaningful values; the rest are filled to satisfy
 * the interface. Nothing here re-implements a market rule.
 */
function confirmation(over: Partial<ConfirmationResult> = {}): ConfirmationResult {
  const signal = (value: number | null) => ({
    fired: false,
    evaluated: value !== null,
    value,
    unit: "bps",
    threshold: 200,
    explanation: "synthetic",
  });

  return {
    status: "CONFIRMED",
    ruleVersion: "tinjau.confirmation/test",
    reasonCodes: ["MARKET_CONFIRMED", "REFERENCE_MARKET_CLOSED"],
    explanation: "Synthetic confirmation result.",
    observedAtUnixSeconds: NOW - 60,
    observedAtIso: new Date((NOW - 60) * 1000).toISOString(),
    blockNumber: 68_000_000,
    fresh: true,
    ageSeconds: 60,
    signals: { drawdown: signal(250), velocity: signal(1.5), basis: signal(null) },
    // Only `held` is read by the orchestrator. The cast keeps this helper from having to track
    // every diagnostic field `market/confirm.ts` adds to its own anti-wick outcome — that module
    // is owned elsewhere and is actively changing.
    antiWick: {
      evaluated: true,
      held: true,
      retention: 0.8,
      peakPrice: 230,
      troughPrice: 224,
      priceAfterHold: 225,
      troughAt: null,
      checkedAt: null,
      holdSeconds: 300,
      explanation: "synthetic",
    } as unknown as ConfirmationResult["antiWick"],
    exitDepth: {
      maxSellWithinTickRange: null,
      isLowerBound: true,
      advisoryOnly: true,
      note: "synthetic",
    },
    okxLegAvailable: false,
    dualLegConfirmed: false,
    windowComplete: true,
    usReferenceMarketOpen: false,
    thresholds: {} as ConfirmationResult["thresholds"],
    ...over,
  };
}

function input(over: Partial<DecisionInput> = {}): DecisionInput {
  const raws = over.claims ? [] : twoOriginClaims();
  const claims = over.claims ?? normalizeClaims(raws);
  const now = over.now ?? NOW;
  return {
    eventKey: "event:test-1",
    now,
    claims,
    graph: over.graph ?? buildEvidenceGraph(claims, now, CFG.evidenceWindowSec),
    resolution: resolveAsset("NVIDIA CORPORATION", "wNVDAx", NVDA),
    confirmation: confirmation(),
    officialEvidencePassed: false,
    chainId: CHAIN_ID,
    registryAddress: REGISTRY,
    ...over,
  };
}

/** Rebuilds the graph so it is always derived from the claims actually being assessed. */
function forClaims(raws: RawClaimInput[], over: Partial<DecisionInput> = {}): DecisionInput {
  const now = over.now ?? NOW;
  const claims = normalizeClaims(raws);
  return input({ ...over, now, claims, graph: buildEvidenceGraph(claims, now, CFG.evidenceWindowSec) });
}

// ---------------------------------------------------------------------------
// 1. The output carries everything the acceptance criterion names
// ---------------------------------------------------------------------------

test("the record carries state, reasons, confidence, expiry, versions, action and explanation", () => {
  const decision = decide(forClaims(twoOriginClaims()));
  const r = decision.record;

  assert.equal(r.schemaVersion, "tinjau.risk/1.0.0");
  assert.equal(r.policyVersion, "tinjau.policy/1.0.0");
  assert.ok(["NORMAL", "WATCH", "PROTECT"].includes(r.state));
  assert.ok(r.reasonCodes.length > 0, "a record that explains nothing fails §0.12");
  assert.ok(["LOW", "MEDIUM", "HIGH"].includes(r.confidenceBand));
  assert.ok(Date.parse(r.expiresAt) > Date.parse(r.assessedAt));
  assert.ok(r.humanExplanation.length > 40);
  assert.match(r.evidenceCommitment, /^0x[0-9a-f]{64}$/);
  assert.equal(r.evidence.length, 2, "the inputs travel with the record");

  // The rule versions of all four layers, so a reader can tell which rules produced this.
  assert.equal(decision.ruleVersions.schema, "tinjau.risk/1.0.0");
  assert.equal(decision.ruleVersions.policy, "tinjau.policy/1.0.0");
  assert.equal(decision.ruleVersions.confirmation, "tinjau.confirmation/test");
  assert.equal(decision.ruleVersions.evidenceCommitment, "tinjau.evidence-commitment/1.0.0");
  assert.equal(decision.ruleVersions.assessmentId, "tinjau.assessment-id/1.0.0");

  // The on-chain struct is built from the same values, not from a second derivation.
  assert.equal(decision.assessment.evidenceCommitment, r.evidenceCommitment);
  assert.equal(Number(decision.assessment.assessedAt), Math.floor(Date.parse(r.assessedAt) / 1000));
  assert.equal(Number(decision.assessment.expiresAt), Math.floor(Date.parse(r.expiresAt) / 1000));
  assert.match(decision.digest, /^0x[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------
// 2. Determinism
// ---------------------------------------------------------------------------

test("the same inputs always produce the same output, field for field", () => {
  const build = () => decide(forClaims(twoOriginClaims()));
  const first = build();
  const second = build();

  assert.deepEqual(first.record, second.record);
  assert.deepEqual(first.assessment, second.assessment);
  assert.equal(first.assessmentId, second.assessmentId);
  assert.equal(first.digest, second.digest);
  assert.equal(JSON.stringify(first.record), JSON.stringify(second.record));
});

test("time enters only as a parameter: nothing changes when the wall clock does", async () => {
  // The real proof that no clock is read. Two calls separated by actual elapsed time, with the
  // same `now`, must be byte-identical.
  const first = decide(forClaims(twoOriginClaims()));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const second = decide(forClaims(twoOriginClaims()));

  assert.equal(first.assessmentId, second.assessmentId);
  assert.deepEqual(first.record, second.record);
});

test("a different `now` produces a different assessment, and says so in the record", () => {
  const early = decide(forClaims(twoOriginClaims(), { now: NOW }));
  const later = decide(forClaims(twoOriginClaims(), { now: NOW + 1 }));

  assert.notEqual(early.assessmentId, later.assessmentId);
  assert.notEqual(early.record.assessedAt, later.record.assessedAt);
});

test("`now` is required and is never defaulted to a clock read", () => {
  assert.throws(() => decide(input({ now: Number.NaN })), DecisionInputError);
  assert.throws(() => decide(input({ now: -1 })), DecisionInputError);
  assert.throws(() => decide(input({ now: 1.5 })), DecisionInputError);
  assert.throws(() => decide(input({ eventKey: "  " })), DecisionInputError);
});

test("every decision-relevant field is covered by the assessmentId", () => {
  const base = decide(forClaims(twoOriginClaims()));

  const differentEvent = decide(forClaims(twoOriginClaims(), { eventKey: "event:test-2" }));
  assert.notEqual(base.assessmentId, differentEvent.assessmentId, "eventKey");

  const differentChain = decide(forClaims(twoOriginClaims(), { chainId: 1 }));
  assert.notEqual(base.assessmentId, differentChain.assessmentId, "chainId");

  const differentRegistry = decide(
    forClaims(twoOriginClaims(), {
      registryAddress: "0x00000000000000000000000000000000000000c2",
    }),
  );
  assert.notEqual(base.assessmentId, differentRegistry.assessmentId, "registryAddress");

  const differentEvidence = decide(
    forClaims([
      ...twoOriginClaims(),
      rawClaim({ claimId: "claim-3", sourceId: "example.com/three", publisherOrAuthor: "CNBC" }),
    ]),
  );
  assert.notEqual(base.assessmentId, differentEvidence.assessmentId, "evidence set");

  const differentMarket = decide(
    forClaims(twoOriginClaims(), { confirmation: confirmation({ status: "NOT_CONFIRMED" }) }),
  );
  assert.notEqual(base.assessmentId, differentMarket.assessmentId, "market status");
});

// ---------------------------------------------------------------------------
// 3. Idempotency, and the no-ratcheting rule
// ---------------------------------------------------------------------------

test("retrying the same event with the same inputs is idempotent", () => {
  // The acceptance criterion, stated directly. Ten retries, one identity.
  const ids = new Set<string>();
  const nonces = new Set<bigint>();
  for (let i = 0; i < 10; i += 1) {
    const decision = decide(forClaims(twoOriginClaims()));
    ids.add(decision.assessmentId);
    nonces.add(decision.nonce);
  }
  assert.equal(ids.size, 1);
  assert.equal(nonces.size, 1, "a derived nonce means a retry collides on chain instead of writing twice");
});

test("a continuing PROTECT keeps its ORIGINAL start, so refreshing cannot extend the cap", () => {
  // The exact failure this guards against: an assessment refreshed every minute that restamps
  // `protectStartedAt` would push the maximum-duration cap forward forever, and the bounded
  // action would quietly become a permanent one. It mirrors the registry's own rule.
  const started = NOW;
  const first = decide(
    forClaims(twoOriginClaims(), { now: started, officialEvidencePassed: false }),
  );
  assert.equal(first.record.state, "PROTECT", "the base case must actually protect");
  assert.equal(first.protectStartedAt, started);

  const originalExpiry = first.record.expiresAt;

  for (const elapsed of [60, 120, 600, 3_600, 18_000]) {
    const refreshed = decide(
      forClaims(twoOriginClaims(), {
        now: started + elapsed,
        current: { state: "PROTECT", protectStartedAt: started },
      }),
    );

    assert.equal(refreshed.record.state, "PROTECT");
    assert.equal(refreshed.protectStartedAt, started, `restamped the start after ${elapsed}s`);
    assert.equal(
      refreshed.record.expiresAt,
      originalExpiry,
      `expiry moved after ${elapsed}s of refreshes; the duration cap was ratcheted forward`,
    );
    assert.equal(
      refreshed.remainingProtectSec,
      ENV.maxProtectDurationSec - elapsed,
      "the remaining budget must shrink with elapsed time, not reset",
    );
  }
});

test("a refresh at the duration cap stops protecting rather than starting a new interval", () => {
  const started = NOW;
  const atCap = decide(
    forClaims(twoOriginClaims(), {
      now: started + ENV.maxProtectDurationSec,
      current: { state: "PROTECT", protectStartedAt: started },
      // Cooldown from the interval that just ended, exactly as the registry would record it.
      confirmation: confirmation({ status: "NOT_CONFIRMED" }),
    }),
  );

  assert.notEqual(atCap.record.state, "PROTECT");
  assert.ok(atCap.record.reasonCodes.includes("EXPIRED"));
  assert.ok(atCap.record.reasonCodes.includes("DECAYED_TO_BASELINE"));
  assert.equal(atCap.protectStartedAt, null);
  assert.equal(atCap.record.action.authorized, false);
});

// ---------------------------------------------------------------------------
// 4. Fail closed — and the invariant that is easy to get backwards
// ---------------------------------------------------------------------------

const DEGRADED: ConfirmationStatus[] = ["NOT_CONFIRMED", "UNAVAILABLE", "STALE"];

test("degraded market data can never CREATE a new PROTECT", () => {
  for (const status of DEGRADED) {
    const decision = decide(
      forClaims(twoOriginClaims(), { confirmation: confirmation({ status }) }),
    );
    assert.notEqual(decision.record.state, "PROTECT", `market ${status} created a protection`);
    assert.equal(decision.record.action.authorized, false);
    assert.equal(decision.record.action.requestedFee, null);
    assert.equal(decision.record.action.status, "NONE");
  }
});

test("degraded market data does NOT cancel a protection already running", () => {
  // §0.7's invariant 6. Cancelling early would hand an attacker a way to disable the pool's
  // defence by degrading one feed, which is the opposite of failing closed.
  const started = NOW;
  for (const status of DEGRADED) {
    const decision = decide(
      forClaims(twoOriginClaims(), {
        now: started + 600,
        current: { state: "PROTECT", protectStartedAt: started },
        confirmation: confirmation({ status }),
      }),
    );

    assert.equal(decision.record.state, "PROTECT", `market ${status} cancelled a live protection`);
    assert.equal(decision.protectStartedAt, started, "and it kept its original start");
    assert.equal(
      decision.record.expiresAt,
      new Date((started + ENV.maxProtectDurationSec) * 1000).toISOString(),
      "the original expiry schedule continues unchanged",
    );
  }
});

test("a CONFIRMED verdict older than the freshness bound is downgraded to STALE", () => {
  // Freshness is decided by the promotion engine, not accepted from the market layer, so a
  // stale sample cannot be relabelled upstream.
  const stale = decide(
    forClaims(twoOriginClaims(), {
      confirmation: confirmation({ observedAtUnixSeconds: NOW - CFG.marketFreshnessSec - 1 }),
    }),
  );

  assert.equal(stale.effectiveConfirmation, "STALE");
  assert.equal(stale.record.marketConfirmation.status, "STALE");
  assert.equal(stale.record.marketConfirmation.fresh, false);
  assert.notEqual(stale.record.state, "PROTECT");
  assert.ok(stale.record.reasonCodes.includes("MARKET_DATA_STALE"));
  assert.equal(
    stale.record.reasonCodes.includes("MARKET_CONFIRMED"),
    false,
    "a record must not claim MARKET_CONFIRMED beside MARKET_DATA_STALE",
  );
});

test("a CONFIRMED verdict with no observation timestamp fails closed to UNAVAILABLE", () => {
  // A defensive guard against a future change in `market/confirm.ts`, which this task does not
  // own. An unfreshenable confirmation is exactly what §0.7 refuses to promote on.
  const decision = decide(
    forClaims(twoOriginClaims(), {
      confirmation: confirmation({ observedAtUnixSeconds: null, blockNumber: null }),
    }),
  );

  assert.equal(decision.effectiveConfirmation, "UNAVAILABLE");
  assert.notEqual(decision.record.state, "PROTECT");
  assert.ok(decision.record.reasonCodes.includes("MARKET_DATA_UNAVAILABLE"));
});

test("rumour-only evidence never authorises the action, whatever the market says", () => {
  const rumours = [
    rawClaim({
      claimId: "rumour-1",
      sourceClass: "RUMOR",
      dataMode: "SIMULATED",
      sourceUrl: null,
      sourceId: "simulated://test/rumour-1",
      publisherOrAuthor: null,
      independenceGroup: "simulated:social",
    }),
  ];

  for (const status of ["CONFIRMED", ...DEGRADED] as ConfirmationStatus[]) {
    const decision = decide(
      forClaims(rumours, {
        confirmation: confirmation({ status }),
        officialEvidencePassed: true,
      }),
    );
    assert.notEqual(decision.record.state, "PROTECT");
    assert.equal(decision.record.action.authorized, false);
    assert.ok(decision.record.reasonCodes.includes("RUMOR_ONLY"));
  }
});

// ---------------------------------------------------------------------------
// 5. Reason-code fidelity (§0.12) — each refusal describes itself
// ---------------------------------------------------------------------------

test("each unresolved-asset outcome emits its own reason code and none of the others", () => {
  // The defect this repeats-check exists for: an earlier agent emitted `UNSUPPORTED_ASSET` for
  // an unknown company, which sends an operator looking for a pool that was never the problem.
  const cases = [
    {
      label: "unknown company",
      resolution: resolveAsset("ACME HOLDINGS", null, null),
      expect: "UNKNOWN_COMPANY" as const,
      forbidden: ["UNSUPPORTED_ASSET", "AMBIGUOUS_ENTITY"] as const,
    },
    {
      label: "known company, token with no pool",
      resolution: resolveAsset("NVIDIA CORPORATION", "NVDAx", null),
      expect: "UNSUPPORTED_ASSET" as const,
      forbidden: ["UNKNOWN_COMPANY", "AMBIGUOUS_ENTITY"] as const,
    },
  ];

  for (const c of cases) {
    const decision = decide(forClaims(twoOriginClaims(), { resolution: c.resolution }));
    assert.ok(
      decision.record.reasonCodes.includes(c.expect),
      `${c.label} did not emit ${c.expect}`,
    );
    for (const forbidden of c.forbidden) {
      assert.equal(
        decision.record.reasonCodes.includes(forbidden),
        false,
        `${c.label} wrongly emitted ${forbidden}`,
      );
    }
    assert.notEqual(decision.record.state, "PROTECT");
    assert.equal(decision.postable, false, "an unresolved asset must not be marked postable");
    assert.ok(decision.record.humanExplanation.includes("registry only accepts assessments"));
  }
});

test("the market engine's diagnostic reasons survive the merge, its verdict codes do not", () => {
  const decision = decide(
    forClaims(twoOriginClaims(), {
      confirmation: confirmation({
        status: "NOT_CONFIRMED",
        reasonCodes: [
          "MARKET_NOT_CONFIRMED",
          "ANTI_WICK_FAILED",
          "THIN_EXIT_DEPTH",
          "REFERENCE_MARKET_CLOSED",
          "INSUFFICIENT_SAMPLE",
        ],
      }),
    }),
  );

  // Diagnostics say WHY, and belong on the record.
  for (const code of ["ANTI_WICK_FAILED", "THIN_EXIT_DEPTH", "REFERENCE_MARKET_CLOSED", "INSUFFICIENT_SAMPLE"]) {
    assert.ok(decision.record.reasonCodes.includes(code as never), `${code} was dropped`);
  }
  // The verdict itself comes from the promotion engine, which applies its own freshness bound.
  assert.ok(decision.record.reasonCodes.includes("MARKET_NOT_CONFIRMED"));
  assert.equal(decision.record.reasonCodes.length, new Set(decision.record.reasonCodes).size);

  // The full market result is preserved separately, unedited.
  assert.ok(decision.record.marketConfirmation.reasonCodes.includes("MARKET_NOT_CONFIRMED"));
});

test("reason codes are sorted, unique, and round-trip through the on-chain bitmask", () => {
  const decision = decide(forClaims(twoOriginClaims()));
  const codes = decision.record.reasonCodes;

  assert.deepEqual(codes, [...codes].sort(), "unsorted codes make two identical records differ");
  assert.equal(codes.length, new Set(codes).size);
  assert.ok(decision.assessment.reasonBits > 0);
  assert.ok(decision.assessment.reasonBits <= 0xffffffff);
});

// ---------------------------------------------------------------------------
// 6. The bounded action is a PROPOSAL, and it can only lower the fee
// ---------------------------------------------------------------------------

test("the envelope is the deployed one, and the proposal never exceeds the policy target", () => {
  assert.deepEqual(
    { base: ENV.baseFee, max: ENV.maxFee, widen: ENV.widenDurationSec, decay: ENV.decayDurationSec },
    { base: 500, max: 20_000, widen: 3_600, decay: 18_000 },
    "tracker §0.11's deployed envelope",
  );

  assert.equal(targetFeeForConfidence("LOW"), 7_000);
  assert.equal(targetFeeForConfidence("MEDIUM"), 13_500);
  assert.equal(targetFeeForConfidence("HIGH"), 20_000);

  for (const band of ["LOW", "MEDIUM", "HIGH"] as const) {
    const target = targetFeeForConfidence(band);
    assert.equal(proposeBoundedFee(band, null), target, "no preference means the policy target");
    assert.equal(proposeBoundedFee(band, target - 1), target - 1, "a lower request is honoured");
    assert.equal(
      proposeBoundedFee(band, target + 1),
      target,
      "T1.3 guarantee 4: a proposal may only LOWER the fee, never raise it",
    );
    assert.equal(proposeBoundedFee(band, 0), ENV.baseFee, "and never below the base fee");
    assert.equal(proposeBoundedFee(band, 1_000_000), target, "an absurd request is clamped down");
  }
});

test("a caller cannot raise the fee through the orchestrator either", () => {
  const decision = decide(forClaims(twoOriginClaims(), { requestedFeeProposal: 20_000 }));
  assert.equal(decision.record.state, "PROTECT");
  assert.equal(
    Number(decision.record.action.requestedFee),
    decision.policyTargetFee,
    "the request was clamped to the policy target for this confidence band",
  );
  assert.ok(Number(decision.record.action.requestedFee) <= ENV.maxFee);
  assert.equal(decision.assessment.requestedFee, decision.policyTargetFee);
});

test("the action is PENDING, never APPLIED — this assessment applies nothing", () => {
  const decision = decide(forClaims(twoOriginClaims()));
  assert.equal(decision.record.action.status, "PENDING");
  assert.equal(decision.record.action.appliedFee, null);
  assert.equal(decision.record.action.txHash, null);
  assert.equal(decision.record.action.maximumDurationSec, ENV.maxProtectDurationSec);
});

test("the decay preview returns to baseline within the envelope", () => {
  const target = targetFeeForConfidence("HIGH");
  assert.equal(decayedFee(target, 0), target);
  assert.equal(decayedFee(target, ENV.widenDurationSec), target);
  assert.ok(decayedFee(target, ENV.widenDurationSec + 9_000) < target);
  assert.equal(decayedFee(target, ENV.maxProtectDurationSec), ENV.baseFee);
  assert.equal(decayedFee(target, ENV.maxProtectDurationSec + 1), ENV.baseFee);
});

// ---------------------------------------------------------------------------
// 7. The record-level dataMode is the cautious one
// ---------------------------------------------------------------------------

test("one simulated claim makes the whole record read SIMULATED", () => {
  // Deliberately over-states how synthetic the record is. §0.8 forbids a simulated input from
  // being presentable as observed, and the exact per-claim truth is never lost.
  const mixed = [
    rawClaim({ claimId: "claim-1", dataMode: "REPLAY" }),
    rawClaim({
      claimId: "claim-2",
      dataMode: "SIMULATED",
      sourceUrl: null,
      sourceId: "simulated://test/two",
      publisherOrAuthor: null,
    }),
  ];
  const decision = decide(forClaims(mixed));

  assert.equal(decision.record.dataMode, "SIMULATED");
  assert.deepEqual(
    decision.record.evidence.map((e) => e.dataMode),
    ["REPLAY", "SIMULATED"],
    "per-claim modes stay exact",
  );
});
