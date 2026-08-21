/**
 * Claim normalisation and provenance validation (task T2.1).
 *
 * Acceptance criteria being proven:
 *   - speculation is not rewritten as fact;
 *   - missing provenance produces an invalid or non-promotable claim;
 *   - official ingestion preserves the existing hash/URL requirements.
 *
 * The frozen T0.2 fixtures are used as the realistic inputs, so this suite also checks that
 * the evidence the demo actually runs on survives normalisation intact.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeClaim,
  normalizeClaims,
  partitionByPromotability,
  type RawClaimInput,
} from "../src/evidence/normalize.js";
import { analyseSpeculation, CONSERVATIVE_DIRECTION } from "../src/evidence/speculation.js";

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), "..", "scenarios");
const readScenario = (f: string) => JSON.parse(readFileSync(join(scenariosDir, f), "utf8"));

function base(overrides: Partial<RawClaimInput> = {}): RawClaimInput {
  return {
    claimId: "c1",
    sourceClass: "NEWS",
    dataMode: "REPLAY",
    sourceUrl: "https://example.com/story",
    sourceId: "example.com/2026-08-15/story",
    publisherOrAuthor: "Example Wire",
    publishedAt: "2026-08-15T19:38:26Z",
    publishedAtPrecision: "SECOND",
    company: "NVIDIA CORPORATION",
    tokenSymbol: "wNVDAx",
    eventType: "CONTINGENT_FINANCIAL_OBLIGATION",
    claimTextOrPointer: "NVIDIA completed the acquisition on Monday.",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Speculation is not rewritten as fact
// ---------------------------------------------------------------------------

test("a claim about talks is never recorded as a completed event", () => {
  const c = normalizeClaim(
    base({
      claimTextOrPointer:
        "Nvidia is in talks to provide roughly $250 billion in financing guarantees for OpenAI, " +
        "the Wall Street Journal reported on Sunday, citing people familiar with the matter.",
    }),
  );

  assert.equal(c.assertionLevel, "REPORTED_UNVERIFIED");
  assert.equal(c.describesCompletedEvent, false);
  assert.ok(c.speculationMarkers.includes("in talks"));
  assert.ok(c.speculationMarkers.includes("people familiar"));

  // The text itself is preserved byte-for-byte. Normalisation labels, it never edits.
  assert.match(c.claimTextOrPointer, /^Nvidia is in talks to provide roughly \$250 billion/);
});

test("a publisher disclaiming verification is recorded as such", () => {
  const c = normalizeClaim(
    base({
      claimTextOrPointer:
        "Reuters could not immediately verify the report. Nvidia and SB Energy did not respond " +
        "to requests for comment.",
    }),
  );

  assert.equal(c.assertionLevel, "REPORTED_UNVERIFIED");
  assert.equal(c.publisherDisclaimedVerification, true);
  assert.equal(c.describesCompletedEvent, false);
});

test("hedged language wins over a caller's structural hint", () => {
  // The caller believes this is an assertion. The text says otherwise, and the text wins —
  // otherwise an upstream component could assert away the hedging.
  const c = normalizeClaim(
    base({ claimTextOrPointer: "The company may complete the merger.", assertionHint: "ASSERTED" }),
  );
  assert.equal(c.assertionLevel, "SPECULATIVE");
  assert.equal(c.describesCompletedEvent, false);
});

test("a plainly stated event is allowed to be a completed event", () => {
  const c = normalizeClaim(base());
  assert.equal(c.assertionLevel, "ASSERTED");
  assert.equal(c.describesCompletedEvent, true);
  assert.deepEqual(c.speculationMarkers, []);
});

test("detection only ever weakens a claim, which is what makes the heuristic safe", () => {
  assert.match(CONSERVATIVE_DIRECTION, /never strengthen/);

  // Whatever hint is supplied, a hedged text can only come out at or below SPECULATIVE.
  for (const hint of ["ASSERTED", "SPECULATIVE", "REPORTED_UNVERIFIED"] as const) {
    const level = analyseSpeculation("the board is considering a sale", hint).level;
    assert.notEqual(level, "ASSERTED");
  }
});

test("a hedged claim later confirmed by a filing keeps both facts separate", () => {
  // This is the normal shape of breaking financial news, and scenario B is exactly it: the
  // report hedged, the filing later confirmed. `officialConfirmation` describes what the
  // graph learned afterwards; `describesCompletedEvent` describes what THIS source asserted.
  // Conflating them would either reject legitimate evidence or launder a hedge into a fact.
  const c = normalizeClaim(
    base({ claimTextOrPointer: "Nvidia is in talks to invest $3 billion.", officialConfirmation: true }),
  );

  assert.equal(c.describesCompletedEvent, false, "the source still only reported talks");
  assert.equal(c.officialConfirmation, true, "and a filing still confirmed it later");
  assert.deepEqual(c.provenanceViolations, [], "neither fact is a provenance defect");
});

test("describesCompletedEvent is derived, so a caller cannot assert a hedge into a fact", () => {
  const c = normalizeClaim({
    ...base({ claimTextOrPointer: "Nvidia is in talks to invest $3 billion." }),
    ...({ describesCompletedEvent: true, assertionLevel: "ASSERTED" } as unknown as RawClaimInput),
  });
  assert.equal(c.describesCompletedEvent, false);
  assert.equal(c.assertionLevel, "SPECULATIVE");
});

// ---------------------------------------------------------------------------
// Missing provenance produces a non-promotable claim
// ---------------------------------------------------------------------------

test("each missing provenance field produces a named violation and blocks promotion", () => {
  const cases: [Partial<RawClaimInput>, string][] = [
    [{ sourceId: "" }, "MISSING_SOURCE_ID"],
    [{ publishedAt: "" }, "MISSING_PUBLISHED_AT"],
    [{ publishedAt: "last Tuesday" }, "INVALID_PUBLISHED_AT"],
    [{ claimTextOrPointer: "" }, "MISSING_CLAIM_TEXT"],
    [{ company: "" }, "MISSING_COMPANY"],
    [{ tokenSymbol: "" }, "MISSING_TOKEN_SYMBOL"],
    [{ sourceUrl: null }, "MISSING_URL_FOR_NON_SIMULATED"],
    [{ publisherOrAuthor: null }, "MISSING_PUBLISHER_FOR_NON_SIMULATED"],
  ];

  for (const [override, expected] of cases) {
    const c = normalizeClaim(base(override));
    assert.ok(c.provenanceViolations.includes(expected as never), `expected ${expected}`);
    assert.equal(c.promotable, false, `${expected} must block promotion`);
  }
});

test("an incomplete claim is kept and marked, never silently discarded", () => {
  const claims = normalizeClaims([base(), base({ claimId: "c2", sourceId: "" })]);
  const { promotable, nonPromotable } = partitionByPromotability(claims);

  assert.equal(claims.length, 2, "nothing may be dropped on the floor");
  assert.equal(promotable.length, 1);
  assert.equal(nonPromotable.length, 1);
  // The rejected claim is still readable — that record is what makes a WATCH explainable.
  assert.equal(nonPromotable[0].claimId, "c2");
});

test("promotability is derived, so no caller can assert its own claim is usable", () => {
  const c = normalizeClaim({
    ...base({ sourceId: "" }),
    // Deliberately try to smuggle these in; they are not part of RawClaimInput.
    ...({ promotable: true, provenanceViolations: [] } as unknown as RawClaimInput),
  });
  assert.equal(c.promotable, false);
  assert.ok(c.provenanceViolations.length > 0);
});

// ---------------------------------------------------------------------------
// Simulated claims
// ---------------------------------------------------------------------------

test("a simulated claim is valid without a URL, but never with a resolvable one", () => {
  const honest = normalizeClaim(
    base({
      sourceClass: "RUMOR",
      dataMode: "SIMULATED",
      sourceUrl: null,
      sourceId: "simulated://tinjau/T0.2/social/x",
      publisherOrAuthor: null,
      claimTextOrPointer: "hearing NVDA is on the hook for a quarter trillion.",
    }),
  );
  assert.equal(honest.promotable, true, "a labelled fixture is not a provenance defect");
  assert.deepEqual(honest.provenanceViolations, []);

  // The dangerous shape: fabricated content wearing a checkable-looking address.
  const disguised = normalizeClaim(
    base({
      sourceClass: "RUMOR",
      dataMode: "SIMULATED",
      sourceUrl: "https://x.com/someone/status/123",
      sourceId: "simulated://tinjau/T0.2/social/x",
    }),
  );
  assert.ok(disguised.provenanceViolations.includes("RESOLVABLE_URL_ON_SIMULATED_CLAIM"));
  assert.equal(disguised.promotable, false);
});

// ---------------------------------------------------------------------------
// Official ingestion keeps the existing bonded requirements
// ---------------------------------------------------------------------------

test("official claims still require a content hash and a real EDGAR URL", () => {
  const noHash = normalizeClaim(
    base({
      sourceClass: "OFFICIAL",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1045810/x.htm",
      sourceContentSha256: null,
    }),
  );
  assert.ok(noHash.provenanceViolations.includes("OFFICIAL_WITHOUT_CONTENT_HASH"));
  assert.equal(noHash.promotable, false);

  // A lookalike host must not pass as official — the same guard the X bot already applies.
  const lookalike = normalizeClaim(
    base({
      sourceClass: "OFFICIAL",
      sourceUrl: "https://www.sec.gov.evil.com/Archives/edgar/x.htm",
      sourceContentSha256: "a".repeat(64),
    }),
  );
  assert.ok(lookalike.provenanceViolations.includes("OFFICIAL_WITHOUT_RESOLVABLE_URL"));

  const good = normalizeClaim(
    base({
      sourceClass: "OFFICIAL",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm",
      sourceContentSha256: "1c480e3320f3171e6ac1979a50eecb123d4150637c7b769444d16faf97928133",
      claimTextOrPointer: "NVIDIA entered into multiple residual value guaranties with SB Energy.",
    }),
  );
  assert.deepEqual(good.provenanceViolations, []);
  assert.equal(good.promotable, true);
});

// ---------------------------------------------------------------------------
// The frozen evidence survives normalisation
// ---------------------------------------------------------------------------

test("every claim in every frozen scenario normalises without a provenance violation", () => {
  const files = [
    "scenario-a-rumor-watch.json",
    "scenario-b-confirmed-protect.json",
    "scenario-c-two-origins-hard-case.json",
    "scenario-d-neutral-normal.json",
  ];

  for (const file of files) {
    const scenario = readScenario(file);
    for (const raw of scenario.claims) {
      const c = normalizeClaim({
        claimId: raw.claimId,
        sourceClass: raw.sourceClass,
        dataMode: raw.dataMode,
        sourceUrl: raw.sourceUrl ?? null,
        sourceId: raw.sourceId,
        publisherOrAuthor: raw.publisherOrAuthor ?? null,
        publishedAt: raw.publishedAt,
        publishedAtPrecision: raw.publishedAtPrecision,
        sourceContentSha256: raw.sourceContentSha256 ?? null,
        company: raw.company,
        tokenSymbol: raw.tokenSymbol,
        tokenAddress: raw.tokenAddress,
        eventType: raw.eventType,
        claimTextOrPointer: raw.claimTextOrPointer,
        independenceGroup: raw.independenceGroup,
        relation: raw.relation,
        officialConfirmation: raw.officialConfirmation,
        expiresAt: raw.expiresAt,
        materiality: raw.materiality,
      });

      // Two WSJ originals are paywalled and were never retrieved, so they legitimately
      // carry no URL. The fixture records that as `retrievedFromOrigin: false`, and the
      // normaliser is expected to flag them — which is the honest outcome, not a bug.
      if (raw.sourceUrl === null && raw.dataMode !== "SIMULATED") {
        assert.ok(
          c.provenanceViolations.includes("MISSING_URL_FOR_NON_SIMULATED"),
          `${raw.claimId} has no URL and must be flagged`,
        );
        assert.equal(c.promotable, false, `${raw.claimId} must not be promotable without a URL`);
        continue;
      }

      assert.deepEqual(
        c.provenanceViolations,
        [],
        `${file} / ${raw.claimId} failed provenance: ${c.provenanceViolations.join(", ")}`,
      );
    }
  }
});

test("the frozen news claims are correctly recognised as unverified reporting", () => {
  const c = readScenario("scenario-c-two-origins-hard-case.json");
  const reuters = c.claims.find((x: any) => x.claimId === "claim-c-002");

  const normalized = normalizeClaim({
    claimId: reuters.claimId,
    sourceClass: reuters.sourceClass,
    dataMode: reuters.dataMode,
    sourceUrl: reuters.sourceUrl,
    sourceId: reuters.sourceId,
    publisherOrAuthor: reuters.publisherOrAuthor,
    publishedAt: reuters.publishedAt,
    company: reuters.company,
    tokenSymbol: reuters.tokenSymbol,
    claimTextOrPointer: reuters.claimTextOrPointer,
  });

  // "citing people familiar with the matter" is in the verbatim attribution span.
  assert.equal(normalized.assertionLevel, "REPORTED_UNVERIFIED");
  assert.equal(normalized.describesCompletedEvent, false);
});
