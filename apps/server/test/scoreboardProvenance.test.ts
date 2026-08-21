/**
 * Guards the public scoreboard API's provenance labelling (task T0.5).
 *
 * The defect this closes: the live API returned event 2 as
 * "8-K — bankruptcy_or_restructuring" against NVDAx with no source field at all. That event
 * came from a document the team fabricated for task P4.4, so the payload read as though
 * NVIDIA had filed for bankruptcy. Tracker §0.17 item 13 lists it; T0.1 recorded it as
 * compatibility gap 13.
 *
 * The rule these tests defend is that classification is CLOSED: only a verified EDGAR URL
 * may be called OFFICIAL, and anything unrecognised is surfaced as unverified rather than
 * quietly passed through.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyEventProvenance } from "../src/scoreboard-api/provenance.js";

const HASH = "0xcec4a8eb4ac19d728c0cddccd5808a88f18081822c0ea37a3544f83f34e1a0c1";

test("a real EDGAR filing is the only thing classified OFFICIAL", () => {
  const p = classifyEventProvenance(
    "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm",
    HASH,
  );
  assert.equal(p.sourceClass, "OFFICIAL");
  assert.equal(p.dataMode, "OBSERVED");
  assert.equal(p.isSimulated, false);
  // The raw on-chain values must survive untouched so a reader can verify them.
  assert.match(p.sourceUrl, /^https:\/\/www\.sec\.gov\//);
  assert.equal(p.sourceContentHash, HASH);
});

test("the P4.4 synthetic scheme is reported as simulated, in plain language", () => {
  const p = classifyEventProvenance("synthetic://afterhours/P4.4/nvdax-8k-grave-bankruptcy.html", HASH);
  assert.equal(p.sourceClass, "SIMULATED");
  assert.equal(p.dataMode, "SIMULATED");
  assert.equal(p.isSimulated, true);
  assert.match(p.label, /SIMULATED/);
  assert.match(p.label, /fabricated/);
  // The scheme is a compatibility key committed on chain — it must not be rewritten.
  assert.equal(p.sourceUrl, "synthetic://afterhours/P4.4/nvdax-8k-grave-bankruptcy.html");
});

test("anything unrecognised fails closed rather than passing as official", () => {
  for (const url of [
    "",
    "http://www.sec.gov/Archives/edgar/data/1045810/x.htm", // not https
    "https://sec.gov/Archives/edgar/data/1045810/x.htm", // wrong host
    "https://www.sec.gov.evil.com/Archives/edgar/x.htm", // lookalike host
    "https://www.sec.gov@evil.com/Archives/edgar/x.htm", // userinfo trick
    "ftp://example.com/filing.htm",
    "some-unlabelled-string",
  ]) {
    const p = classifyEventProvenance(url, HASH);
    assert.equal(p.sourceClass, "UNKNOWN", `"${url}" must not be classified OFFICIAL`);
    assert.equal(p.isSimulated, true, `"${url}" must be flagged as not-to-be-trusted`);
    assert.match(p.label, /UNKNOWN PROVENANCE/);
  }
});

test("a missing source url never yields a confident classification", () => {
  const p = classifyEventProvenance(undefined as unknown as string, undefined as unknown as string);
  assert.equal(p.sourceClass, "UNKNOWN");
  assert.equal(p.isSimulated, true);
  assert.equal(p.sourceUrl, "");
  assert.equal(p.sourceContentHash, "");
});
