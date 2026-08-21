/**
 * The labelled evaluation set, executed against the real pipeline (task T2.4).
 *
 * Acceptance criteria being proven:
 *   - the evaluation reports extraction, clustering, entity resolution, independence,
 *     contradiction, rumour-to-WATCH and unsupported-PROTECT;
 *   - the target unsupported-PROTECT rate is zero.
 *
 * The set's own header says it plainly: a failing case is a finding about the code, never a
 * reason to edit the label. These tests are written so that a regression shows up as a named
 * case with an expected-vs-actual diff, not as an opaque boolean.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, formatReport, runCase, wireGraphIntoPromotion, type EvalSet } from "../src/evidence/evaluate.js";
import { normalizeClaim } from "../src/evidence/normalize.js";
import { buildEvidenceGraph } from "../src/evidence/graph.js";
import { promote } from "../src/risk/promote.js";
import { FROZEN_PROMOTION_CONFIG } from "../src/risk/promotionConfig.js";

const evalSetPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "eval",
  "evidence-eval-set.json",
);
const evalSet = JSON.parse(readFileSync(evalSetPath, "utf8")) as EvalSet;
const report = evaluate(evalSet);

// ---------------------------------------------------------------------------
// The critical metric
// ---------------------------------------------------------------------------

test("unsupportedProtectRate is exactly zero", () => {
  // Not a quality target. A single failure means a case whose gold state was NORMAL or WATCH
  // reached PROTECT — which is a broken safety invariant, not a missed accuracy goal.
  assert.equal(
    report.unsupportedProtectRate,
    0,
    `unsupported PROTECT in: ${report.unsupportedProtectCases.join(", ")}\n${formatReport(report)}`,
  );
  assert.deepEqual(report.unsupportedProtectCases, []);
});

test("every rumour-bearing case stays at or below WATCH", () => {
  assert.equal(report.rumorToWatchRate, 1, formatReport(report));
});

test("no case authorises an aggressive fee outside PROTECT", () => {
  for (const result of report.results) {
    const flagCheck = result.checks.find((c) => c.name === "aggressiveFeeAuthorized");
    assert.ok(flagCheck?.passed, `${result.caseId}: ${JSON.stringify(flagCheck)}`);
  }
});

// ---------------------------------------------------------------------------
// Per-case results
// ---------------------------------------------------------------------------

test("every labelled case matches its gold label", () => {
  const failures = report.results.filter((r) => !r.passed);
  assert.deepEqual(
    failures.map((f) => f.caseId),
    [],
    formatReport(report),
  );
});

// One named test per case, so a regression names the case rather than a count.
for (const evalCase of evalSet.cases) {
  test(`case: ${evalCase.caseId} (${evalCase.dimension})`, () => {
    const result = runCase(evalCase);
    for (const c of result.checks) {
      assert.ok(
        c.passed,
        `${evalCase.caseId} / ${c.name}: expected ${JSON.stringify(c.expected)}, ` +
          `got ${JSON.stringify(c.actual)}\n` +
          `observed: ${JSON.stringify(result.observed, null, 2)}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Coverage of the set itself
// ---------------------------------------------------------------------------

test("the set covers every dimension it claims to, with no dimension left untested", () => {
  const declared = [
    "EXTRACTION",
    "CLUSTERING",
    "ENTITY_RESOLUTION",
    "INDEPENDENCE",
    "CONTRADICTION",
    "RUMOR_CONTAINMENT",
    "MATERIALITY",
  ];
  const covered = report.byDimension.map((d) => d.dimension);

  // CLUSTERING is deliberately absent from the case set: clustering is exercised directly in
  // `evidenceResolution.test.ts`, where hallucinated and overlapping proposals can be fed in.
  // The eval set runs one cluster per case, so it cannot test rejection paths. Recorded here
  // rather than left as an unexplained gap.
  const expectedGap = ["CLUSTERING"];
  const missing = declared.filter((d) => !covered.includes(d as never));
  assert.deepEqual(missing, expectedGap, "a dimension lost its coverage");

  for (const d of report.byDimension) {
    assert.ok(d.total > 0, `${d.dimension} has no cases`);
  }
});

test("the set contains at least one case per safety-critical outcome", () => {
  const states = evalSet.cases.map((c) => c.expected.state);
  // A set with no PROTECT case could pass the critical metric trivially, by never promoting
  // anything. A set with no NORMAL case would not test the materiality gate.
  assert.ok(states.includes("PROTECT"), "no PROTECT case — the metric would pass trivially");
  assert.ok(states.includes("WATCH"));
  assert.ok(states.includes("NORMAL"));
});

// ---------------------------------------------------------------------------
// The T2.3 -> T1.2 seam
// ---------------------------------------------------------------------------

test("promotion counts DERIVED origins, not the fixtures' hand labels", () => {
  // This is the point of T2.4. The four-outlet case has no `independenceGroup` on any claim,
  // so if promotion were reading hand labels it would see four empty-string groups collapse
  // to one by accident, or four distinct ones. Instead it must see the derived WSJ origin.
  const fourOutlets = evalSet.cases.find((c) => c.caseId === "single-origin-four-outlets")!;
  for (const claim of fourOutlets.claims) {
    assert.equal(claim.independenceGroup, undefined, "the case must carry no hand label");
  }

  const normalized = fourOutlets.claims.map(normalizeClaim);
  const nowSec = Math.floor(Date.parse(fourOutlets.now) / 1000);
  const graph = buildEvidenceGraph(normalized, nowSec, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const wired = wireGraphIntoPromotion(normalized, graph);

  // All four claims must carry the derived WSJ origin, not an empty hand label.
  assert.deepEqual(
    [...new Set(wired.map((w) => w.independenceGroup))],
    ["wsj"],
    "derived origins did not reach the promotion engine",
  );
});

test("a claim that disclaims independence is refused an origin, with the real reason recorded", () => {
  const relay = evalSet.cases.find((c) => c.caseId === "unnamed-relay-headline")!;
  const result = runCase(relay);

  // The DataCenterDynamics headline ends "- report". It must be disqualified, and the record
  // must say WHY — `selfRevised` is the lever the promotion engine offers, but the claim did
  // not revise anything, so the true reason is kept separately.
  assert.deepEqual(result.observed.disqualifications["dcd"], ["RELAYS_UNNAMED_REPORT"]);
  assert.equal(result.observed.usableOriginCount, 1);
  assert.equal(result.observed.state, "WATCH");
});

test("an incomplete-provenance claim cannot contribute an independent origin", () => {
  // The safety hole this closes: `promote()` has no `promotable` field, so without this
  // translation a two-origin set where one origin is unattributed would reach PROTECT on
  // evidence that failed its own provenance check.
  const missing = evalSet.cases.find((c) => c.caseId === "missing-provenance")!;
  const result = runCase(missing);

  assert.deepEqual(result.observed.disqualifications["anonymous"], ["PROVENANCE_INCOMPLETE"]);
  assert.equal(result.observed.allClaimsPromotable, false);
  assert.equal(result.observed.state, "WATCH");
});

test("the self-revised origin is derived from the text and reaches the promotion engine", () => {
  const revising = evalSet.cases.find((c) => c.caseId === "self-revising-source-line")!;
  const result = runCase(revising);

  // Two origins on their face; one disqualified because WSJ stated both $250bn and $120bn.
  assert.equal(result.observed.independentOriginCount, 2);
  assert.deepEqual(result.observed.revisedOriginKeys, ["wsj"]);
  assert.equal(result.observed.usableOriginCount, 1);
  assert.equal(result.observed.state, "WATCH");

  // Both WSJ claims must be disqualified, not just the one carrying the second figure —
  // a revision belongs to the source line, not to one article.
  assert.deepEqual(result.observed.disqualifications["wsj-old"], ["SELF_REVISED_ORIGIN"]);
  assert.deepEqual(result.observed.disqualifications["wsj-new"], ["SELF_REVISED_ORIGIN"]);
  assert.equal(result.observed.disqualifications["ti"], undefined);
});

test("the disqualification wiring is load-bearing, not decorative", () => {
  // A negative control. Two origins, one of which is a "- report" relay that disclaims being
  // an origin. With the wiring the set stays at WATCH; strip the disqualification, as a naive
  // translation would, and the same evidence reaches PROTECT.
  //
  // That counterfactual is the safety hole this seam closes: `promote()` cannot see the
  // graph's `relaysUnnamedReport` or `promotable` flags, so if the runner did not translate
  // them, evidence that disclaimed its own independence would authorise a fee change.
  const now = Math.floor(Date.parse("2026-08-15T19:38:26Z") / 1000);
  const claims = [
    normalizeClaim({
      claimId: "ti",
      sourceClass: "NEWS",
      dataMode: "REPLAY",
      sourceUrl: "https://example.com/ti",
      sourceId: "theinformation.com/x",
      publisherOrAuthor: "The Information",
      publishedAt: "2026-08-15T12:00:00Z",
      company: "NVIDIA CORPORATION",
      tokenSymbol: "wNVDAx",
      claimTextOrPointer: "Nvidia will take a stake in SB Energy.",
      materiality: "MATERIAL",
    }),
    normalizeClaim({
      claimId: "dcd",
      sourceClass: "NEWS",
      dataMode: "REPLAY",
      sourceUrl: "https://example.com/dcd",
      sourceId: "datacenterdynamics.com/x",
      publisherOrAuthor: "DataCenterDynamics",
      publishedAt: "2026-08-15T12:00:00Z",
      company: "NVIDIA CORPORATION",
      tokenSymbol: "wNVDAx",
      claimTextOrPointer: "Nvidia considers a backstop for the Ohio data center - report",
      materiality: "MATERIAL",
    }),
  ];

  const graph = buildEvidenceGraph(claims, now, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const wired = wireGraphIntoPromotion(claims, graph);
  const base = {
    marketConfirmation: { status: "CONFIRMED" as const, observedAt: now - 60 },
    now,
    currentState: "NORMAL" as const,
    resolutionOutcome: "RESOLVED" as const,
    officialEvidencePassed: false,
  };

  assert.equal(graph.usableOriginCount, 1, "the graph already knows the relay is not an origin");
  assert.equal(promote({ ...base, claims: wired }).state, "WATCH");

  // The counterfactual: strip BOTH disqualification levers and the same evidence promotes.
  const naive = wired.map((w) => ({ ...w, selfRevised: false, contributesIndependentOrigin: true }));
  assert.equal(
    promote({ ...base, claims: naive }).state,
    "PROTECT",
    "if this no longer promotes, the counterfactual has stopped demonstrating the hole",
  );
});

test("removing the self-revision would flip the same evidence to PROTECT", () => {
  // Proves the rule is load-bearing rather than incidental: the only difference between this
  // case and `two-independent-origins` is that one source line changed its own number.
  const twoOrigins = evalSet.cases.find((c) => c.caseId === "two-independent-origins")!;
  const result = runCase(twoOrigins);

  assert.equal(result.observed.usableOriginCount, 2);
  assert.equal(result.observed.state, "PROTECT");
  assert.deepEqual(result.observed.revisedOriginKeys, []);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test("the whole evaluation is reproducible", () => {
  // No model call, no clock read, no network. Running the set twice must give byte-identical
  // results, which is what lets the Evidence Graph be reproduced from fixtures (§0.9).
  const first = evaluate(evalSet);
  const second = evaluate(evalSet);
  assert.deepEqual(first, second);
});
