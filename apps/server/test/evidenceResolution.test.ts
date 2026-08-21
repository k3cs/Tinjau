/**
 * Entity/token resolution and claim clustering (task T2.2).
 *
 * Acceptance criteria being proven:
 *   - both frozen scenarios resolve to the intended asset and pool;
 *   - unsupported or ambiguous mappings stop short of authorising an action.
 *
 * This suite also closes the mapping defect recorded in T0.2 §2.2, and keeps it closed: the
 * NVDAx/wNVDAx confusion is asserted explicitly so it cannot quietly return.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveAsset,
  assetByAddress,
  isSupportedAddress,
  SUPPORTED_ASSETS,
} from "../src/evidence/assets.js";
import {
  buildClusters,
  proposeClustersDeterministically,
  type ClusterProposal,
} from "../src/evidence/cluster.js";
import { normalizeClaim, type NormalizedClaim } from "../src/evidence/normalize.js";

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), "..", "scenarios");
const readScenario = (f: string) => JSON.parse(readFileSync(join(scenariosDir, f), "utf8"));

const WNVDAX = "0xa8ddb5cd96b5222afe198316e9a57caa642850d5";
const NVDAX = "0xc845b2894dbddd03858fd2d643b4ef725fe0849d";
const POOL = "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2";

function claim(overrides: Partial<NormalizedClaim> = {}): NormalizedClaim {
  return normalizeClaim({
    claimId: "c1",
    sourceClass: "NEWS",
    dataMode: "REPLAY",
    sourceUrl: "https://example.com/a",
    sourceId: "example.com/a",
    publisherOrAuthor: "Example",
    publishedAt: "2026-08-15T19:38:26Z",
    company: "NVIDIA CORPORATION",
    tokenSymbol: "wNVDAx",
    tokenAddress: WNVDAX,
    eventType: "CONTINGENT_FINANCIAL_OBLIGATION",
    claimTextOrPointer: "Something happened.",
    ...(overrides as object),
  });
}

// ---------------------------------------------------------------------------
// The T0.2 §2.2 mapping defect, closed and kept closed
// ---------------------------------------------------------------------------

test("wNVDAx and NVDAx are recognised as two different tokens", () => {
  const wrapped = assetByAddress(WNVDAX);
  const unwrapped = assetByAddress(NVDAX);

  assert.ok(wrapped && unwrapped);
  assert.notEqual(wrapped.tokenAddress, unwrapped.tokenAddress);
  assert.equal(wrapped.tokenSymbol, "wNVDAx");
  assert.equal(unwrapped.tokenSymbol, "NVDAx");

  // Only one of them has an observable market, and only that one may be acted on.
  assert.equal(wrapped.poolAddress, POOL);
  assert.equal(unwrapped.poolAddress, null);
  assert.equal(isSupportedAddress(WNVDAX), true);
  assert.equal(isSupportedAddress(NVDAX), false);
});

test("the unsupported sibling resolves to a refusal that names the supported one", () => {
  const r = resolveAsset("NVIDIA CORPORATION", "NVDAx");

  assert.equal(r.outcome, "UNSUPPORTED_ASSET");
  assert.equal(r.mayAuthorizeAction, false);
  assert.equal(r.asset, null);
  // A near miss must be explained, not merely refused, or the operator has to guess.
  assert.match(r.explanation, /no verified pool/);
  assert.match(r.explanation, /wNVDAx/);
});

test("the unsupported sibling is listed rather than omitted, so it cannot be silently missed", () => {
  // Omitting NVDAx would make a claim about it resolve to UNKNOWN_COMPANY, which reads like
  // a coverage gap rather than what it is: a known token that must not be acted on.
  const listed = SUPPORTED_ASSETS.find((a) => a.tokenSymbol === "NVDAx");
  assert.ok(listed, "NVDAx must stay registered as an explicit non-supported asset");
  assert.equal(listed.supported, false);
  assert.match(listed.supportNote, /T0\.2 §2\.2/);
});

test("an address hint beats a symbol hint, because an address is unambiguous", () => {
  // Symbol says the unsupported one, address says the supported one. The address wins.
  const r = resolveAsset("NVIDIA CORPORATION", "NVDAx", WNVDAX);
  assert.equal(r.outcome, "RESOLVED");
  assert.equal(r.asset?.tokenSymbol, "wNVDAx");
  assert.equal(r.mayAuthorizeAction, true);
});

// ---------------------------------------------------------------------------
// Resolution refuses rather than guesses
// ---------------------------------------------------------------------------

test("an unknown company or unregistered symbol never authorises an action", () => {
  const unknownCompany = resolveAsset("ACME CORP");
  assert.equal(unknownCompany.outcome, "UNKNOWN_COMPANY");
  assert.equal(unknownCompany.mayAuthorizeAction, false);

  // An unrecognised symbol must not fall back to "any token for this company".
  const badSymbol = resolveAsset("NVIDIA CORPORATION", "NVDAxx");
  assert.equal(badSymbol.outcome, "UNKNOWN_COMPANY");
  assert.equal(badSymbol.mayAuthorizeAction, false);
  assert.match(badSymbol.explanation, /not registered/);

  const badAddress = resolveAsset("NVIDIA CORPORATION", null, "0x" + "9".repeat(40));
  assert.equal(badAddress.mayAuthorizeAction, false);
});

test("company name matching tolerates punctuation and case but not identity", () => {
  assert.equal(resolveAsset("nvidia corporation", "wNVDAx").outcome, "RESOLVED");
  assert.equal(resolveAsset("  NVIDIA  CORPORATION  ", "wNVDAx").outcome, "RESOLVED");
  assert.equal(resolveAsset("NVIDIA CORP", "wNVDAx").outcome, "UNKNOWN_COMPANY");
});

test("mayAuthorizeAction is true for exactly one outcome", () => {
  const outcomes = [
    resolveAsset("NVIDIA CORPORATION", "wNVDAx"),
    resolveAsset("NVIDIA CORPORATION", "NVDAx"),
    resolveAsset("ACME CORP"),
    resolveAsset("NVIDIA CORPORATION", "NVDAxx"),
  ];
  for (const r of outcomes) {
    assert.equal(r.mayAuthorizeAction, r.outcome === "RESOLVED");
  }
});

// ---------------------------------------------------------------------------
// Clustering: a model proposes, the rules validate
// ---------------------------------------------------------------------------

test("a valid proposal produces a cluster resolved to the supported pool", () => {
  const claims = [claim({ claimId: "a" }), claim({ claimId: "b" })];
  const proposals: ClusterProposal[] = [
    { eventKey: "sb-energy-deal", claimIds: ["a", "b"], label: "SB Energy financing" },
  ];

  const result = buildClusters(claims, proposals);
  assert.equal(result.clusters.length, 1);
  assert.equal(result.clusters[0].claims.length, 2);
  assert.equal(result.clusters[0].resolution.asset?.poolAddress, POOL);
  assert.equal(result.clusters[0].mayAuthorizeAction, true);
  assert.deepEqual(result.rejections, []);
});

test("a proposal naming a claim that does not exist is rejected, not repaired", () => {
  const claims = [claim({ claimId: "a" })];
  const result = buildClusters(claims, [
    { eventKey: "e", claimIds: ["a", "ghost"], label: "hallucinated" },
  ]);

  assert.equal(result.clusters.length, 0);
  assert.equal(result.rejections[0].reason, "UNKNOWN_CLAIM_ID");
  // The real claim is not lost — it surfaces as unclustered.
  assert.deepEqual(result.unclustered.map((c) => c.claimId), ["a"]);
});

test("one claim cannot belong to two clusters, so independence cannot be inflated", () => {
  const claims = [claim({ claimId: "a" }), claim({ claimId: "b" })];
  const result = buildClusters(claims, [
    { eventKey: "e1", claimIds: ["a", "b"], label: "first" },
    { eventKey: "e2", claimIds: ["b"], label: "double-counting b" },
  ]);

  assert.equal(result.clusters.length, 1);
  assert.equal(result.rejections[0].reason, "DUPLICATE_CLAIM_ASSIGNMENT");
});

test("a cluster spanning two companies is rejected, because it cannot resolve to one pool", () => {
  const claims = [claim({ claimId: "a" }), claim({ claimId: "b", company: "ACME CORP" })];
  const result = buildClusters(claims, [
    { eventKey: "e", claimIds: ["a", "b"], label: "two companies" },
  ]);

  assert.equal(result.clusters.length, 0);
  assert.equal(result.rejections[0].reason, "SPANS_MULTIPLE_COMPANIES");
});

test("empty and duplicate-key proposals are rejected", () => {
  const claims = [claim({ claimId: "a" })];
  const result = buildClusters(claims, [
    { eventKey: "e", claimIds: [], label: "empty" },
    { eventKey: "k", claimIds: ["a"], label: "first" },
    { eventKey: "k", claimIds: ["a"], label: "same key again" },
  ]);

  assert.deepEqual(
    result.rejections.map((r) => r.reason).sort(),
    ["DUPLICATE_EVENT_KEY", "EMPTY_CLUSTER"],
  );
  assert.equal(result.clusters.length, 1);
});

test("a cluster on an unsupported token is built but cannot authorise an action", () => {
  const claims = [claim({ claimId: "a", tokenSymbol: "NVDAx", tokenAddress: NVDAX })];
  const result = buildClusters(claims, [{ eventKey: "e", claimIds: ["a"], label: "unwrapped" }]);

  // The cluster exists — losing it would hide that a claim about this token was seen.
  assert.equal(result.clusters.length, 1);
  assert.equal(result.clusters[0].mayAuthorizeAction, false);
  assert.equal(result.clusters[0].resolution.outcome, "UNSUPPORTED_ASSET");
});

test("the deterministic fallback splits rather than merges when it is unsure", () => {
  const claims = [
    claim({ claimId: "a", eventType: "CONTINGENT_FINANCIAL_OBLIGATION" }),
    claim({ claimId: "b", eventType: "STRATEGIC_PARTNERSHIP_OR_INVESTMENT" }),
  ];
  const proposals = proposeClustersDeterministically(claims);

  // Two event types, two clusters. Splitting under-counts corroboration, which can only hold
  // a state lower — the safe direction for a fallback that does not understand language.
  assert.equal(proposals.length, 2);
  const result = buildClusters(claims, proposals);
  assert.equal(result.clusters.length, 2);
  assert.equal(result.unclustered.length, 0);
});

// ---------------------------------------------------------------------------
// The frozen scenarios resolve as intended
// ---------------------------------------------------------------------------

test("every frozen scenario resolves to wNVDAx in the verified pool", () => {
  for (const file of [
    "scenario-a-rumor-watch.json",
    "scenario-b-confirmed-protect.json",
    "scenario-c-two-origins-hard-case.json",
    "scenario-d-neutral-normal.json",
  ]) {
    const scenario = readScenario(file);
    const r = resolveAsset(
      scenario.claims[0].company,
      scenario.claims[0].tokenSymbol,
      scenario.claims[0].tokenAddress,
    );

    assert.equal(r.outcome, "RESOLVED", `${file} failed to resolve`);
    assert.equal(r.asset?.tokenAddress, scenario.asset.tokenAddress);
    assert.equal(r.asset?.poolAddress, scenario.asset.poolIdOrAddress);
    assert.equal(r.mayAuthorizeAction, true);
  }
});

test("scenario B's claims cluster into one event on the supported pool", () => {
  const scenario = readScenario("scenario-b-confirmed-protect.json");
  const claims = scenario.claims.map((raw: any) =>
    normalizeClaim({
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
    }),
  );

  // The frozen scenario is one event described by six claims across three source classes.
  const result = buildClusters(claims, [
    {
      eventKey: "nvda-sbenergy-ports-pike-2026-08",
      claimIds: claims.map((c: NormalizedClaim) => c.claimId),
      label: "NVIDIA / SB Energy PORTS-Pike financing",
    },
  ]);

  assert.equal(result.clusters.length, 1);
  assert.equal(result.unclustered.length, 0);
  assert.deepEqual(result.rejections, []);
  assert.equal(result.clusters[0].resolution.asset?.poolAddress, POOL);
  assert.equal(result.clusters[0].mayAuthorizeAction, true);
});
