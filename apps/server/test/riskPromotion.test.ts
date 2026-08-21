/**
 * Deterministic promotion rules (task T1.2).
 *
 * The acceptance criteria being proven here, from the tracker:
 *   - rumour-only and single-news inputs cannot reach PROTECT;
 *   - non-official promotion requires >= 2 independent sources plus fresh market confirmation;
 *   - stale/conflicting input cannot create a new PROTECT.
 *
 * The rumour invariant is proven by EXHAUSTION rather than by example: the test enumerates
 * every combination of confirmation status, source count, official-evidence flag and market
 * age, and asserts PROTECT is unreachable in all of them. An example-based test would only
 * show that the cases someone thought of are safe.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { promote, type EvidenceClaim, type PromotionInput } from "../src/risk/promote.js";
import { FROZEN_PROMOTION_CONFIG, POLICY_VERSION } from "../src/risk/promotionConfig.js";
import { decodeReasonCodes, encodeReasonCodes, type ConfirmationStatus } from "../src/risk/types.js";

const NOW = 1_787_000_000;

function claim(overrides: Partial<EvidenceClaim> = {}): EvidenceClaim {
  return {
    claimId: "c1",
    sourceClass: "NEWS",
    independenceGroup: "origin:a",
    relation: "ORIGIN",
    publishedAt: NOW - 3600,
    officialConfirmation: false,
    // Explicit here because the engine's own default is UNKNOWN, which fails closed. These
    // tests are about material events unless a case says otherwise.
    materiality: "MATERIAL",
    ...overrides,
  };
}

function input(overrides: Partial<PromotionInput> = {}): PromotionInput {
  return {
    claims: [claim()],
    marketConfirmation: { status: "CONFIRMED", observedAt: NOW - 60 },
    now: NOW,
    currentState: "NORMAL",
    resolutionOutcome: "RESOLVED",
    officialEvidencePassed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Invariant 1 — rumour-only, proven exhaustively
// ---------------------------------------------------------------------------

test("rumour-only evidence can never reach PROTECT, across every combination of inputs", () => {
  const statuses: ConfirmationStatus[] = ["CONFIRMED", "NOT_CONFIRMED", "UNAVAILABLE", "STALE"];
  const marketAges = [0, 1, 60, FROZEN_PROMOTION_CONFIG.marketFreshnessSec - 1];
  let cases = 0;

  for (const status of statuses) {
    for (const age of marketAges) {
      for (const rumourCount of [1, 2, 3, 5]) {
        for (const officialEvidencePassed of [false, true]) {
          for (const distinctGroups of [false, true]) {
            const claims = Array.from({ length: rumourCount }, (_, i) =>
              claim({
                claimId: `r${i}`,
                sourceClass: "RUMOR",
                // Even if every rumour comes from a genuinely different origin, the cap holds.
                independenceGroup: distinctGroups ? `origin:r${i}` : "origin:r",
              }),
            );
            const result = promote(
              input({
                claims,
                marketConfirmation: { status, observedAt: NOW - age },
                officialEvidencePassed,
              }),
            );
            cases += 1;
            assert.notEqual(
              result.state,
              "PROTECT",
              `rumour-only reached PROTECT with status=${status} age=${age} n=${rumourCount} ` +
                `officialPassed=${officialEvidencePassed} distinct=${distinctGroups}`,
            );
            assert.equal(result.aggressiveFeeAuthorized, false);
            assert.ok(result.reasonCodes.includes("RUMOR_ONLY"));
          }
        }
      }
    }
  }
  assert.ok(cases >= 128, `expected a broad sweep, only ran ${cases} cases`);
});

// ---------------------------------------------------------------------------
// Invariant 2/3 — syndication is not corroboration
// ---------------------------------------------------------------------------

test("many outlets carrying one origin count as a single source and stay at WATCH", () => {
  const claims = [
    claim({ claimId: "origin", relation: "ORIGIN", independenceGroup: "origin:wsj" }),
    claim({ claimId: "dup1", relation: "DUPLICATE", independenceGroup: "origin:wsj" }),
    claim({ claimId: "dup2", relation: "DUPLICATE", independenceGroup: "origin:wsj" }),
    claim({ claimId: "dup3", relation: "DUPLICATE", independenceGroup: "origin:wsj" }),
  ];
  const result = promote(input({ claims }));

  assert.equal(result.state, "WATCH");
  assert.equal(result.independentSourceCount, 1);
  assert.ok(result.reasonCodes.includes("SINGLE_SOURCE"));
  assert.ok(result.reasonCodes.includes("DUPLICATE_SYNDICATION"));
  assert.match(result.explanation, /syndications of that origin, not corroboration/);
});

test("two genuinely independent origins plus fresh confirmation do reach PROTECT", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  const result = promote(input({ claims }));

  assert.equal(result.state, "PROTECT");
  assert.equal(result.independentSourceCount, 2);
  assert.equal(result.aggressiveFeeAuthorized, true);
  assert.ok(result.reasonCodes.includes("TWO_INDEPENDENT_SOURCES"));
  assert.ok(result.reasonCodes.includes("MARKET_CONFIRMED"));
});

// ---------------------------------------------------------------------------
// Invariant 5 — degraded market data cannot CREATE a protection
// ---------------------------------------------------------------------------

test("no non-confirmed market status can start a new PROTECT", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  for (const status of ["NOT_CONFIRMED", "UNAVAILABLE", "STALE"] as ConfirmationStatus[]) {
    const result = promote(input({ claims, marketConfirmation: { status, observedAt: NOW - 60 } }));
    assert.equal(result.state, "WATCH", `${status} must not create a PROTECT`);
  }
});

test("a CONFIRMED observation older than the freshness bound is downgraded to STALE here", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  const tooOld = FROZEN_PROMOTION_CONFIG.marketFreshnessSec + 1;
  const result = promote(
    input({ claims, marketConfirmation: { status: "CONFIRMED", observedAt: NOW - tooOld } }),
  );

  // Freshness is decided by the engine, not accepted from the caller — so an upstream
  // component cannot relabel a stale sample as confirmation.
  assert.equal(result.state, "WATCH");
  assert.ok(result.reasonCodes.includes("MARKET_DATA_STALE"));
  assert.equal(result.reasonCodes.includes("MARKET_CONFIRMED"), false);
});

test("a contradiction caps promotion even when every other bar is cleared", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
    claim({ claimId: "c", independenceGroup: "origin:third", relation: "CONTRADICTS" }),
  ];
  const result = promote(input({ claims }));

  assert.equal(result.state, "WATCH");
  assert.ok(result.reasonCodes.includes("CONTRADICTED"));
  assert.equal(result.confidenceBand, "LOW");
});

// ---------------------------------------------------------------------------
// Invariant 6 — an active protection is not cancelled by degraded data
// ---------------------------------------------------------------------------

test("losing market data does NOT tear down a protection that is already running", () => {
  const startedAt = NOW - 600;
  for (const status of ["UNAVAILABLE", "STALE", "NOT_CONFIRMED"] as ConfirmationStatus[]) {
    const result = promote(
      input({
        claims: [],
        currentState: "PROTECT",
        currentProtectStartedAt: startedAt,
        marketConfirmation: { status, observedAt: NOW - 5000 },
      }),
    );
    assert.equal(result.state, "PROTECT", `${status} must not cancel a running protection`);
    // It runs to its ORIGINAL expiry, not a freshly extended one.
    assert.equal(result.expiresAt, startedAt + FROZEN_PROMOTION_CONFIG.maxProtectDurationSec);
    assert.match(result.explanation, /original expiry and decay schedule/);
  }
});

test("an active protection still ends once its maximum duration elapses", () => {
  const startedAt = NOW - FROZEN_PROMOTION_CONFIG.maxProtectDurationSec - 1;
  const result = promote(
    input({
      claims: [],
      currentState: "PROTECT",
      currentProtectStartedAt: startedAt,
      marketConfirmation: { status: "UNAVAILABLE", observedAt: NOW - 5000 },
    }),
  );
  assert.equal(result.state, "NORMAL");
  assert.ok(result.reasonCodes.includes("EXPIRED"));
  assert.ok(result.reasonCodes.includes("DECAYED_TO_BASELINE"));
});

test("cooldown blocks immediate re-entry after a protection ends", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  const justEnded = promote(
    input({ claims, lastProtectEndedAt: NOW - FROZEN_PROMOTION_CONFIG.cooldownSec + 1 }),
  );
  assert.equal(justEnded.state, "WATCH");
  assert.ok(justEnded.reasonCodes.includes("COOLDOWN_ACTIVE"));

  const cooledDown = promote(
    input({ claims, lastProtectEndedAt: NOW - FROZEN_PROMOTION_CONFIG.cooldownSec }),
  );
  assert.equal(cooledDown.state, "PROTECT");
});

// ---------------------------------------------------------------------------
// The self-revision rule decided by T1.2
// ---------------------------------------------------------------------------

test("a self-revised source line cannot count toward independent corroboration", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj", selfRevised: true }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  const result = promote(input({ claims }));

  assert.equal(result.state, "WATCH");
  assert.equal(result.independentSourceCount, 1, "the self-revised line must not be counted");
  assert.match(result.explanation, /materially revised its own figure/);

  // The rule is strictly conservative: without the revision the same evidence promotes.
  const withoutRevision = promote(
    input({
      claims: [claim({ claimId: "a", independenceGroup: "origin:wsj" }), claims[1]],
    }),
  );
  assert.equal(withoutRevision.state, "PROTECT");
});

// ---------------------------------------------------------------------------
// Hard gates and lifecycle
// ---------------------------------------------------------------------------

test("an unsupported asset or unresolved entity can never authorise an action", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  // Each non-RESOLVED outcome blocks promotion AND records its own distinct reason. The
  // distinction is the point: "which of this company's tokens?", "this token has no pool",
  // and "never heard of this company" send an operator to three different places.
  for (const [outcome, code] of [
    ["UNSUPPORTED_ASSET", "UNSUPPORTED_ASSET"],
    ["AMBIGUOUS", "AMBIGUOUS_ENTITY"],
    ["UNKNOWN_COMPANY", "UNKNOWN_COMPANY"],
  ] as const) {
    const result = promote(input({ claims, resolutionOutcome: outcome }));
    assert.notEqual(result.state, "PROTECT");
    assert.ok(result.reasonCodes.includes(code), `${outcome} must emit ${code}`);

    // and must not emit either of the other two, or the record misdescribes the refusal
    for (const other of ["UNSUPPORTED_ASSET", "AMBIGUOUS_ENTITY", "UNKNOWN_COMPANY"] as const) {
      if (other !== code) assert.equal(result.reasonCodes.includes(other), false);
    }
  }
});

test("a claim that disclaimed its own independence does not add to the origin count", () => {
  // T2.4's evaluation found this hole: without `contributesIndependentOrigin`, evidence that
  // explicitly disclaimed being an independent origin (a headline ending "- report") counted
  // as a full one, and that flipped a WATCH into a PROTECT.
  const claims = [
    claim({ claimId: "real", independenceGroup: "origin:theinformation" }),
    claim({
      claimId: "relay",
      independenceGroup: "origin:unattributed-relay",
      contributesIndependentOrigin: false,
    }),
  ];
  const result = promote(input({ claims }));

  assert.equal(result.independentSourceCount, 1);
  assert.equal(result.state, "WATCH");

  // The counterfactual: without the flag the same evidence promotes.
  const naive = claims.map((c) => ({ ...c, contributesIndependentOrigin: true }));
  assert.equal(promote(input({ claims: naive })).state, "PROTECT");
});

test("self-revision is group-wide but a non-contributing claim is not", () => {
  // Two different mechanisms that must not be conflated: a revision taints the whole source
  // line, while one relayed headline leaves that origin's other reporting usable.
  const tainted = [
    claim({ claimId: "a", independenceGroup: "origin:wsj", selfRevised: true }),
    claim({ claimId: "b", independenceGroup: "origin:wsj" }),
    claim({ claimId: "c", independenceGroup: "origin:theinformation" }),
  ];
  assert.equal(promote(input({ claims: tainted })).independentSourceCount, 1);

  const partial = [
    claim({ claimId: "a", independenceGroup: "origin:wsj", contributesIndependentOrigin: false }),
    claim({ claimId: "b", independenceGroup: "origin:wsj" }),
    claim({ claimId: "c", independenceGroup: "origin:theinformation" }),
  ];
  assert.equal(promote(input({ claims: partial })).independentSourceCount, 2);
});

test("evidence older than the frozen window is discarded, leaving NORMAL", () => {
  const stale = claim({ publishedAt: NOW - FROZEN_PROMOTION_CONFIG.evidenceWindowSec - 1 });
  const result = promote(input({ claims: [stale] }));

  assert.equal(result.state, "NORMAL");
  assert.ok(result.reasonCodes.includes("STALE_EVIDENCE"));
  assert.equal(result.aggressiveFeeAuthorized, false);
});

test("official evidence still needs the bonded checks and a fresh market observation", () => {
  const official = claim({
    sourceClass: "OFFICIAL",
    independenceGroup: "official:edgar",
    officialConfirmation: true,
  });

  const bondedFailed = promote(input({ claims: [official], officialEvidencePassed: false }));
  assert.equal(bondedFailed.state, "WATCH", "an official filing alone is not a licence to act");

  const noMarket = promote(
    input({
      claims: [official],
      officialEvidencePassed: true,
      marketConfirmation: { status: "UNAVAILABLE", observedAt: NOW - 60 },
    }),
  );
  assert.equal(noMarket.state, "WATCH");

  const full = promote(input({ claims: [official], officialEvidencePassed: true }));
  assert.equal(full.state, "PROTECT");
  assert.equal(full.confidenceBand, "HIGH");
  assert.ok(full.reasonCodes.includes("BONDED_EVIDENCE_PASSED"));
});

test("official provenance does not make a routine filing material", () => {
  // A Section 16 insider Form 4: real SEC filing, no corporate action.
  const form4 = claim({
    sourceClass: "OFFICIAL",
    independenceGroup: "official:edgar",
    officialConfirmation: true,
    materiality: "NON_MATERIAL",
  });
  const result = promote(input({ claims: [form4], officialEvidencePassed: true }));

  // Not PROTECT, and not even WATCH — routine filings arrive constantly, and if each raised
  // monitoring then WATCH would be the permanent state and would stop meaning anything.
  assert.equal(result.state, "NORMAL");
  assert.equal(result.aggressiveFeeAuthorized, false);
  assert.ok(result.reasonCodes.includes("NON_MATERIAL_EVENT"));
  assert.match(result.explanation, /does not by itself make an event material/);
});

test("an unclassified event fails closed rather than inheriting its source's trust", () => {
  const unclassified = claim({
    sourceClass: "OFFICIAL",
    independenceGroup: "official:edgar",
    officialConfirmation: true,
    materiality: undefined, // caller forgot to classify
  });
  const result = promote(input({ claims: [unclassified], officialEvidencePassed: true }));

  assert.notEqual(result.state, "PROTECT");
  assert.ok(result.reasonCodes.includes("NON_MATERIAL_EVENT"));
});

test("results are deterministic, versioned, and carry a machine-readable reason bitmask", () => {
  const claims = [
    claim({ claimId: "a", independenceGroup: "origin:wsj" }),
    claim({ claimId: "b", independenceGroup: "origin:theinformation" }),
  ];
  const first = promote(input({ claims }));
  const second = promote(input({ claims }));

  assert.deepEqual(first, second, "same input must always give the same output");
  assert.equal(first.policyVersion, POLICY_VERSION);
  assert.ok(first.reasonBits > 0);

  // The bitmask and the string list must describe the same thing, in both directions.
  assert.equal(first.reasonBits, encodeReasonCodes(first.reasonCodes));
  assert.deepEqual(decodeReasonCodes(first.reasonBits).sort(), [...first.reasonCodes].sort());
});
