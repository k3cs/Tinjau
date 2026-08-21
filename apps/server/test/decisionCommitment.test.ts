/**
 * The evidence commitment (task T4.1).
 *
 * What these tests are for: §0.12 requires the on-chain record to carry an evidence commitment
 * a third party can check. A commitment nobody can recompute is decoration, so the preimage is
 * documented byte-exactly in `commitment.ts` and pinned here against a hand-written expectation
 * — one built by concatenating strings in this file, not by calling the implementation.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { keccak256, toBytes } from "viem";
import {
  EVIDENCE_COMMITMENT_VERSION,
  EvidenceCommitmentError,
  evidenceCommitment,
  evidenceCommitmentPreimage,
} from "../src/decision/commitment.js";
import type { EvidenceClaimView } from "../src/decision/viewModel.js";

const US = "\u001f";
const LF = "\n";

const ASSET = "0xA8DDB5CD96B5222AFE198316E9A57CAA642850D5";
const POOL = "0x2A2B11730C2B6D99A58034A869DD810D7300A7B2";

function claim(over: Partial<EvidenceClaimView> = {}): EvidenceClaimView {
  return {
    claimId: "claim-1",
    sourceClass: "NEWS",
    dataMode: "REPLAY",
    sourceUrl: "https://example.com/a",
    sourceId: "example.com/a",
    publisherOrAuthor: "Example",
    publishedAt: "2026-08-17T12:00:00Z",
    company: "NVIDIA CORPORATION",
    tokenSymbol: "wNVDAx",
    tokenAddress: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
    eventType: "CONTINGENT_FINANCIAL_OBLIGATION",
    claimTextOrPointer: "pointer#claimText",
    independenceGroup: "news:example",
    relation: "ORIGIN",
    officialConfirmation: false,
    expiresAt: "2026-08-18T12:00:00Z",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// The preimage is exactly what the doc says it is
// ---------------------------------------------------------------------------

test("the preimage matches the documented layout, byte for byte", () => {
  // Hand-built here from the field list in `commitment.ts`, deliberately NOT by calling any
  // helper from the implementation. If the two ever disagree, the published definition is what
  // a third party would follow, so this is the side that must win.
  const c = claim();
  const expected =
    [EVIDENCE_COMMITMENT_VERSION, ASSET.toLowerCase(), POOL.toLowerCase(), "1"].join(LF) +
    LF +
    [
      "claim-1",
      "NEWS",
      "REPLAY",
      "https://example.com/a",
      "example.com/a",
      "Example",
      "2026-08-17T12:00:00Z",
      "NVIDIA CORPORATION",
      "wNVDAx",
      "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
      "CONTINGENT_FINANCIAL_OBLIGATION",
      "pointer#claimText",
      "news:example",
      "ORIGIN",
      "false",
      "2026-08-18T12:00:00Z",
    ].join(US) +
    LF;

  assert.equal(evidenceCommitmentPreimage(ASSET, POOL, [c]), expected);
  assert.equal(evidenceCommitment(ASSET, POOL, [c]), keccak256(toBytes(expected)));
});

test("null fields encode as the empty string, booleans as lowercase words", () => {
  const preimage = evidenceCommitmentPreimage(ASSET, POOL, [
    claim({ sourceUrl: null, publisherOrAuthor: null, expiresAt: null, officialConfirmation: true }),
  ]);
  const fields = preimage.split(LF)[4].split(US);

  assert.equal(fields[3], "", "sourceUrl null -> empty string");
  assert.equal(fields[5], "", "publisherOrAuthor null -> empty string");
  assert.equal(fields[14], "true");
  assert.equal(fields[15], "", "expiresAt null -> empty string");
  assert.equal(fields.length, 16, "sixteen fields, exactly §0.24's EvidenceClaimView");
});

test("addresses are lowercased in the header and in each record", () => {
  const preimage = evidenceCommitmentPreimage(ASSET, POOL, [
    claim({ tokenAddress: "0xA8DDB5CD96B5222AFE198316E9A57CAA642850D5" }),
  ]);
  assert.ok(!/[A-F]/.test(preimage.split(LF)[1]), "asset header line is lowercased");
  assert.ok(!/[A-F]/.test(preimage.split(LF)[2]), "pool header line is lowercased");
  assert.ok(preimage.includes("0xa8ddb5cd96b5222afe198316e9a57caa642850d5"));
});

// ---------------------------------------------------------------------------
// Order independence and injectivity — the two properties a commitment must have
// ---------------------------------------------------------------------------

test("claim order in the input does not change the commitment", () => {
  // The set is what is committed, not the order it arrived in. Two components assembling the
  // same evidence in different orders must produce the same commitment or the field is useless
  // for comparison.
  const a = claim({ claimId: "claim-a-001" });
  const b = claim({ claimId: "claim-a-002" });
  const c = claim({ claimId: "claim-a-010" });

  assert.equal(
    evidenceCommitment(ASSET, POOL, [a, b, c]),
    evidenceCommitment(ASSET, POOL, [c, a, b]),
  );
});

test("sorting is by UTF-8 bytes of claimId, not by locale collation", () => {
  // `"a".localeCompare("B")` is negative under many locales and positive by byte order. A
  // commitment whose ordering depended on the runtime's locale would not be reproducible.
  const upper = claim({ claimId: "B-claim" });
  const lower = claim({ claimId: "a-claim" });
  const preimage = evidenceCommitmentPreimage(ASSET, POOL, [lower, upper]);
  const ids = preimage
    .split(LF)
    .slice(4, 6)
    .map((line) => line.split(US)[0]);

  assert.deepEqual(ids, ["B-claim", "a-claim"], "0x42 sorts before 0x61");
});

test("a separator byte inside a field is refused, not escaped", () => {
  // Without this the encoding is not injective: {"a\\x1fb", "c"} and {"a", "b\\x1fc"} would
  // produce the same bytes, and two different evidence sets could share one commitment.
  assert.throws(
    () => evidenceCommitmentPreimage(ASSET, POOL, [claim({ company: `NVIDIA${US}CORP` })]),
    EvidenceCommitmentError,
  );
  assert.throws(
    () => evidenceCommitmentPreimage(ASSET, POOL, [claim({ claimTextOrPointer: `line1${LF}line2` })]),
    EvidenceCommitmentError,
  );
});

test("a duplicated claimId is refused", () => {
  assert.throws(
    () => evidenceCommitmentPreimage(ASSET, POOL, [claim(), claim()]),
    EvidenceCommitmentError,
  );
});

test("changing any single committed field changes the commitment", () => {
  const base = evidenceCommitment(ASSET, POOL, [claim()]);
  const mutations: Partial<EvidenceClaimView>[] = [
    { claimId: "claim-2" },
    { sourceClass: "RUMOR" },
    { dataMode: "SIMULATED" },
    { sourceUrl: "https://example.com/b" },
    { sourceId: "example.com/b" },
    { publisherOrAuthor: "Other" },
    { publishedAt: "2026-08-17T12:00:01Z" },
    { company: "OTHER CORP" },
    { tokenSymbol: "NVDAx" },
    { tokenAddress: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d" },
    { eventType: "OTHER" },
    { claimTextOrPointer: "pointer#other" },
    { independenceGroup: "news:other" },
    { relation: "DUPLICATE" },
    { officialConfirmation: true },
    { expiresAt: "2026-08-19T12:00:00Z" },
  ];

  assert.equal(mutations.length, 16, "every committed field is covered");
  for (const mutation of mutations) {
    assert.notEqual(
      evidenceCommitment(ASSET, POOL, [claim(mutation)]),
      base,
      `mutating ${Object.keys(mutation)[0]} left the commitment unchanged`,
    );
  }
});

test("the asset and pool are committed too, so one evidence set cannot be reused for another pool", () => {
  const c = claim();
  assert.notEqual(
    evidenceCommitment(ASSET, POOL, [c]),
    evidenceCommitment("0xc845b2894dbddd03858fd2d643b4ef725fe0849d", POOL, [c]),
  );
  assert.notEqual(
    evidenceCommitment(ASSET, POOL, [c]),
    evidenceCommitment(ASSET, "0x0000000000000000000000000000000000000001", [c]),
  );
});

test("an empty evidence set still produces a non-zero commitment", () => {
  // The registry reverts with `ZeroEvidenceCommitment()` on bytes32(0), so an empty set must
  // hash to something rather than to nothing.
  const empty = evidenceCommitment(ASSET, POOL, []);
  assert.match(empty, /^0x[0-9a-f]{64}$/);
  assert.notEqual(empty, `0x${"0".repeat(64)}`);
  assert.equal(
    evidenceCommitmentPreimage(ASSET, POOL, []),
    [EVIDENCE_COMMITMENT_VERSION, ASSET.toLowerCase(), POOL.toLowerCase(), "0"].join(LF) + LF,
  );
});
