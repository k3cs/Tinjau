/**
 * Independence, contradiction and recency derivation (task T2.3).
 *
 * Acceptance criteria being proven:
 *   - two copies of the same origin do not count as two sources;
 *   - contradiction is visible and caps promotion;
 *   - every confidence change carries a machine-readable explanation.
 *
 * The point of this suite is that the answers are DERIVED from the claim text rather than
 * read off a hand label. The frozen fixtures declare `independenceGroup` and `relation`; here
 * the same conclusions are reached from the words, and the two are cross-checked.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeClaim, type NormalizedClaim } from "../src/evidence/normalize.js";
import {
  buildEvidenceGraph,
  deriveIndependence,
  detectSelfRevision,
  extractMoneyAmounts,
  applyRecency,
  countDerivedIndependentOrigins,
} from "../src/evidence/graph.js";

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), "..", "scenarios");
const readScenario = (f: string) => JSON.parse(readFileSync(join(scenariosDir, f), "utf8"));

const NOW = Math.floor(Date.parse("2026-08-15T19:38:26Z") / 1000);
const WINDOW = 72 * 3600;

function claim(overrides: Partial<Parameters<typeof normalizeClaim>[0]> = {}): NormalizedClaim {
  return normalizeClaim({
    claimId: "c1",
    sourceClass: "NEWS",
    dataMode: "REPLAY",
    sourceUrl: "https://example.com/a",
    sourceId: "example.com/a",
    publisherOrAuthor: "Example Wire",
    publishedAt: "2026-08-15T12:00:00Z",
    company: "NVIDIA CORPORATION",
    tokenSymbol: "wNVDAx",
    eventType: "CONTINGENT_FINANCIAL_OBLIGATION",
    claimTextOrPointer: "Something happened.",
    ...overrides,
  });
}

function fromFixture(raw: any): NormalizedClaim {
  return normalizeClaim({
    claimId: raw.claimId,
    sourceClass: raw.sourceClass,
    dataMode: raw.dataMode,
    sourceUrl: raw.sourceUrl ?? null,
    sourceId: raw.sourceId,
    publisherOrAuthor: raw.publisherOrAuthor ?? null,
    publishedAt: raw.publishedAt,
    sourceContentSha256: raw.sourceContentSha256 ?? null,
    company: raw.company,
    tokenSymbol: raw.tokenSymbol,
    tokenAddress: raw.tokenAddress,
    eventType: raw.eventType,
    claimTextOrPointer: raw.claimTextOrPointer,
    independenceGroup: raw.independenceGroup,
    relation: raw.relation,
    officialConfirmation: raw.officialConfirmation,
    materiality: raw.materiality,
  });
}

// ---------------------------------------------------------------------------
// Syndication is derived from the words, not read off a label
// ---------------------------------------------------------------------------

test("an attribution phrase collapses a claim into the origin it names", () => {
  const reuters = claim({
    claimId: "reuters",
    publisherOrAuthor: "Reuters",
    claimTextOrPointer:
      "Nvidia is in talks to provide roughly $250 billion in financing guarantees for OpenAI, " +
      "the Wall Street Journal reported on Sunday, citing people familiar with the matter.",
  });

  const [finding] = deriveIndependence([reuters]);
  assert.equal(finding.isSyndication, true);
  assert.equal(finding.attributedTo, "wsj");
  assert.equal(finding.derivedOriginKey, "wsj", "Reuters is carrying WSJ's story, not its own");
  // The matched phrase is returned so the derivation is checkable rather than magic.
  assert.match(finding.evidence ?? "", /Wall Street Journal reported/);
});

test("four outlets carrying one story derive to one origin", () => {
  const claims = [
    claim({ claimId: "wsj", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "Nvidia will guarantee $250 billion." }),
    claim({ claimId: "reuters", publisherOrAuthor: "Reuters", claimTextOrPointer: "the Wall Street Journal reported on Sunday" }),
    claim({ claimId: "cnbc", publisherOrAuthor: "CNBC", claimTextOrPointer: "according to the Wall Street Journal, Nvidia is in talks." }),
    claim({ claimId: "tnw", publisherOrAuthor: "The Next Web", claimTextOrPointer: "the Wall Street Journal reported on Sunday, citing people familiar." }),
  ];

  const findings = deriveIndependence(claims);
  assert.equal(countDerivedIndependentOrigins(claims, findings), 1);
  assert.deepEqual(
    findings.filter((f) => f.isSyndication).map((f) => f.claimId).sort(),
    ["cnbc", "reuters", "tnw"],
  );
});

test("an outlet restating its own scoop is not treated as a syndication of itself", () => {
  const wsj = claim({
    claimId: "wsj",
    publisherOrAuthor: "The Wall Street Journal",
    claimTextOrPointer: "the Wall Street Journal reported on Sunday that Nvidia is in talks.",
  });
  const [finding] = deriveIndependence([wsj]);

  assert.equal(finding.isSyndication, false);
  assert.equal(finding.derivedOriginKey, "wsj");
});

test("two genuinely independent origins stay two", () => {
  const claims = [
    claim({ claimId: "wsj", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "Nvidia will guarantee less than $120 billion." }),
    claim({ claimId: "ti", publisherOrAuthor: "The Information", claimTextOrPointer: "Nvidia is in talks to invest $3 billion in SB Energy." }),
  ];
  assert.equal(countDerivedIndependentOrigins(claims, deriveIndependence(claims)), 2);
});

test("unrecognised publishers are never merged with each other", () => {
  // Two outlets nobody has catalogued must not collapse into one just because both are
  // unknown — that would under-count independence in the unsafe direction.
  const claims = [
    claim({ claimId: "a", publisherOrAuthor: "Obscure Daily", sourceId: "obscure.example/a" }),
    claim({ claimId: "b", publisherOrAuthor: "Another Outlet", sourceId: "another.example/b" }),
  ];
  assert.equal(countDerivedIndependentOrigins(claims, deriveIndependence(claims)), 2);
});

test("a headline that admits it is relaying a report cannot count as an origin", () => {
  // DataCenterDynamics ran "Nvidia considers $250bn backstop … - report". The trailing
  // "- report" says outright that it is not the origin, but never says whose story it is.
  // We cannot merge it into an origin, and we must not count it as one — independence is
  // exactly what it disclaimed.
  const claims = [
    claim({
      claimId: "dcd",
      publisherOrAuthor: "DataCenterDynamics",
      sourceId: "datacenterdynamics.com/x",
      claimTextOrPointer:
        'Headline (verbatim): "Nvidia considers $250bn backstop for OpenAI\'s planned 10GW Ohio data center - report"',
    }),
  ];

  const [finding] = deriveIndependence(claims);
  assert.equal(finding.relaysUnnamedReport, true);
  assert.equal(finding.attributedTo, null, "no origin is named, so none can be assigned");
  assert.equal(countDerivedIndependentOrigins(claims, [finding]), 0);
});

test("a byline naming another outlet is treated as attribution, not as identity", () => {
  // "CNBC, reporting a Wall Street Journal story" names two outlets. The publisher is CNBC;
  // WSJ is the attribution. Scanning the whole field for any known name would have resolved
  // CNBC's own identity to WSJ, which is right by accident and wrong in general.
  const cnbc = claim({
    claimId: "cnbc",
    publisherOrAuthor: "CNBC, reporting a Wall Street Journal story",
    claimTextOrPointer: 'Headline (verbatim): "Nvidia and OpenAI in talks for up to $250 billion backstop"',
  });

  const [finding] = deriveIndependence([cnbc]);
  assert.equal(finding.isSyndication, true);
  assert.equal(finding.attributedTo, "wsj");
  assert.equal(finding.derivedOriginKey, "wsj");
});

test("a rumour never counts toward independent origins", () => {
  const claims = [
    claim({ claimId: "r", sourceClass: "RUMOR", dataMode: "SIMULATED", sourceUrl: null, publisherOrAuthor: null, sourceId: "simulated://x" }),
    claim({ claimId: "n", publisherOrAuthor: "The Information" }),
  ];
  assert.equal(countDerivedIndependentOrigins(claims, deriveIndependence(claims)), 1);
});

// ---------------------------------------------------------------------------
// Self-revision, derived rather than hand-labelled
// ---------------------------------------------------------------------------

test("money amounts are extracted with their scale and their verbatim text", () => {
  const amounts = extractMoneyAmounts("capped at $105 billion, down from the $250 billion discussed");
  assert.deepEqual(amounts.map((a) => a.value), [105e9, 250e9]);
  assert.deepEqual(amounts.map((a) => a.text), ["$105 billion", "$250 billion"]);

  assert.deepEqual(extractMoneyAmounts("$1.5 billion").map((a) => a.value), [1.5e9]);
  assert.deepEqual(extractMoneyAmounts("no amounts here"), []);
});

test("one source line stating two figures is derived as a self-revision", () => {
  const claims = [
    claim({ claimId: "old", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "Nvidia in talks to guarantee $250 billion." }),
    claim({ claimId: "new", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "Nvidia now expected to guarantee less than $120 billion." }),
  ];

  const findings = detectSelfRevision(claims, deriveIndependence(claims));
  const wsj = findings.find((f) => f.originKey === "wsj");

  assert.ok(wsj);
  assert.equal(wsj.revised, true);
  assert.match(wsj.explanation, /cannot count toward independent corroboration/);
});

test("a source line stating one consistent figure is not a revision", () => {
  const claims = [
    claim({ claimId: "a", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "guarantee of $250 billion" }),
    claim({ claimId: "b", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "the $250 billion guarantee" }),
  ];
  const wsj = detectSelfRevision(claims, deriveIndependence(claims)).find((f) => f.originKey === "wsj");
  assert.equal(wsj?.revised, false);
});

test("different quantities from different outlets are NOT called a contradiction", () => {
  // "$250bn of guarantees" and "$3bn equity stake" are different quantities about one deal.
  // A detector that flagged these would manufacture contradictions out of normal reporting.
  const claims = [
    claim({ claimId: "wsj", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "guarantees of $250 billion" }),
    claim({ claimId: "ti", publisherOrAuthor: "The Information", claimTextOrPointer: "an investment of $3 billion" }),
  ];
  const findings = detectSelfRevision(claims, deriveIndependence(claims));
  assert.equal(findings.every((f) => !f.revised), true);
});

// ---------------------------------------------------------------------------
// Recency
// ---------------------------------------------------------------------------

test("recency marks evidence outside the window without deleting it", () => {
  const claims = [
    claim({ claimId: "fresh", publishedAt: "2026-08-15T12:00:00Z" }),
    claim({ claimId: "stale", publishedAt: "2026-07-26T00:00:00Z" }),
    claim({ claimId: "future", publishedAt: "2026-08-16T00:00:00Z" }),
  ];
  const findings = applyRecency(claims, NOW, WINDOW);

  assert.equal(findings.length, 3, "nothing may be dropped");
  assert.equal(findings.find((f) => f.claimId === "fresh")?.withinWindow, true);
  assert.equal(findings.find((f) => f.claimId === "stale")?.withinWindow, false);
  // A claim dated after the assessment instant is a data defect, flagged as such.
  assert.equal(findings.find((f) => f.claimId === "future")?.fromFuture, true);
  assert.equal(findings.find((f) => f.claimId === "future")?.withinWindow, false);
});

// ---------------------------------------------------------------------------
// Every confidence change is explained
// ---------------------------------------------------------------------------

test("each confidence factor carries a direction, an explanation and the claims behind it", () => {
  const claims = [
    claim({ claimId: "wsj", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "guarantee $250 billion, citing people familiar with the matter." }),
    claim({ claimId: "reuters", publisherOrAuthor: "Reuters", claimTextOrPointer: "the Wall Street Journal reported on Sunday that the figure is now $120 billion." }),
    claim({ claimId: "old", publishedAt: "2026-07-01T00:00:00Z", publisherOrAuthor: "CNBC" }),
  ];
  const graph = buildEvidenceGraph(claims, NOW, WINDOW);

  assert.ok(graph.confidenceFactors.length > 0);
  for (const factor of graph.confidenceFactors) {
    assert.ok(["RAISES", "LOWERS"].includes(factor.direction));
    assert.ok(factor.explanation.length > 0, `${factor.code} has no explanation`);
    assert.ok(Array.isArray(factor.claimIds));
  }

  const codes = graph.confidenceFactors.map((f) => f.code);
  assert.ok(codes.includes("SYNDICATION_DETECTED"));
  assert.ok(codes.includes("SELF_REVISED_SOURCE"));
  assert.ok(codes.includes("STALE_EVIDENCE_PRESENT"));
  assert.ok(codes.includes("UNVERIFIED_ATTRIBUTION"));
});

test("usableOriginCount excludes self-revised origins, which is what promotion counts", () => {
  const claims = [
    claim({ claimId: "wsj1", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "guarantee $250 billion" }),
    claim({ claimId: "wsj2", publisherOrAuthor: "The Wall Street Journal", claimTextOrPointer: "now less than $120 billion" }),
    claim({ claimId: "ti", publisherOrAuthor: "The Information", claimTextOrPointer: "in talks to invest $3 billion" }),
  ];
  const graph = buildEvidenceGraph(claims, NOW, WINDOW);

  assert.equal(graph.independentOriginCount, 2, "two distinct origins are present");
  assert.deepEqual(graph.revisedOriginKeys, ["wsj"]);
  assert.equal(graph.usableOriginCount, 1, "the revised line cannot corroborate");
});

// ---------------------------------------------------------------------------
// Cross-check against the frozen fixtures
// ---------------------------------------------------------------------------

test("scenario A's syndications are derived, matching what the fixture declared by hand", () => {
  const scenario = readScenario("scenario-a-rumor-watch.json");
  const claims = scenario.claims.map(fromFixture);
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);

  const graph = buildEvidenceGraph(claims, anchor, WINDOW);

  // The fixture hand-labelled one WSJ origin with three syndications. The derivation must
  // reach the same conclusion from the attribution text alone.
  assert.equal(graph.usableOriginCount, 1, "four outlets, one origin");

  const disagreements = graph.independence.filter((f) => f.disagreesWithDeclared);
  assert.deepEqual(
    disagreements.map((d) => d.claimId),
    [],
    "derivation and hand label disagree — one of them is wrong and a human must decide",
  );
});

test("scenario C's self-revision is derived from the text, not taken from the fixture", () => {
  const scenario = readScenario("scenario-c-two-origins-hard-case.json");
  const claims = scenario.claims.map(fromFixture);
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);

  const graph = buildEvidenceGraph(claims, anchor, WINDOW);

  // Two origins on their face, but the WSJ line stated both $120bn and $250bn, so only one
  // origin can corroborate. This is T1.2's rule receiving a DERIVED input for the first time.
  assert.equal(graph.independentOriginCount, 2);
  assert.ok(graph.revisedOriginKeys.includes("wsj"));
  assert.equal(graph.usableOriginCount, 1);

  const factor = graph.confidenceFactors.find((f) => f.code === "SELF_REVISED_SOURCE");
  assert.ok(factor, "the revision must be explained, not merely applied");
  assert.equal(factor.direction, "LOWERS");
});
