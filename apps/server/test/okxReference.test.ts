/**
 * Freshness-aware OKX reference-price adapter (task T3.1).
 *
 * Acceptance criteria being proven:
 *   - the frozen asset produces deterministic timestamped samples;
 *   - stale or missing data is never treated as confirmation;
 *   - failures are observable rather than silent.
 *
 * The load-bearing test is `no input to this adapter can produce CONFIRMED`. A reference
 * price is an input to market confirmation, not a verdict about it, and an adapter that could
 * manufacture a `CONFIRMED` would let a data-availability fact masquerade as evidence that the
 * market corroborated an event.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_SAMPLE_PATH,
  confirmationCeiling,
  loadIndexSamples,
  parseIndexNdjson,
  parseIndexRow,
  resolveInstrumentByAddress,
  selectReferencePrice,
  type IndexSample,
  type ReferenceAvailability,
} from "../src/market/okxReference.js";
import type { ConfirmationStatus } from "../src/risk/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const fixturesDir = join(here, "..", "src", "market", "fixtures");

const canonicalPath = join(repoRoot, CANONICAL_SAMPLE_PATH);
const WNVDAX = "0xa8ddb5cd96b5222afe198316e9a57caa642850d5";
const WMSTRX = "0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab";

/** Source time of the last committed sample: 2026-08-18T02:01:30Z. */
const LAST_SAMPLE_SEC = 1_787_018_490;

// ---------------------------------------------------------------------------
// The canonical sample file
// ---------------------------------------------------------------------------

test("the canonical sample file is byte-pinned, so it cannot drift unnoticed", () => {
  const bytes = readFileSync(canonicalPath);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "ecf296d71e7803653a877e37306177c7f2aaca66b1be55f7b23ec72c5e486198",
  );
  assert.equal(bytes.byteLength, 1408);
});

test("the frozen asset parses into deterministic timestamped samples", () => {
  const first = loadIndexSamples(canonicalPath);
  const second = loadIndexSamples(canonicalPath);

  assert.equal(first.readError, null);
  assert.equal(first.rejects.length, 0);
  assert.equal(first.samples.length, 4);
  assert.deepEqual(first.samples, second.samples, "the same file must always parse the same way");

  for (const s of first.samples) {
    assert.equal(s.instrument, "wNVDAx");
    assert.equal(s.address, WNVDAX);
    assert.equal(s.priceUnit, "USD");
    assert.ok(Number.isInteger(s.sourceTimeSec) && s.sourceTimeSec > 0);
    assert.ok(Number.isInteger(s.ingestedAtSec) && s.ingestedAtSec > 0);
  }

  // Sorted by source time regardless of file order.
  const times = first.samples.map((s) => s.sourceTimeSec);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.equal(times[times.length - 1], LAST_SAMPLE_SEC);
});

test("price precision survives parsing, because a JS number would truncate it", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const price = samples[0].price;

  assert.equal(price, "224.9609885649185592025708209812978");
  assert.equal(typeof price, "string");
  // The reason the string is carried end-to-end: Number() loses 20+ significant digits.
  assert.notEqual(String(Number(price)), price);
});

// ---------------------------------------------------------------------------
// The two timestamps
// ---------------------------------------------------------------------------

test("source time and ingestion time are kept separate, with the real lag exposed", () => {
  const { samples } = loadIndexSamples(canonicalPath);

  // Measured lag across the committed samples is 8-42s. Conflating the two timestamps is how
  // a cached OKX response would look fresh while quoting an arbitrarily old price.
  const lags = samples.map((s) => s.ingestionLagSec);
  for (const lag of lags) {
    assert.ok(lag > 0, "every sample was ingested after its source time");
    assert.ok(lag < 120, `unexpected lag ${lag}s`);
  }
  assert.ok(Math.max(...lags) >= 40, "the committed data really does contain a 40s+ lag");
});

test("freshness is measured from the source time, never from ingestion time", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const last = samples[samples.length - 1];
  const lag = last.ingestionLagSec;
  assert.ok(lag > 0);

  // Query at a moment where the two timestamps fall on opposite sides of the bound. If
  // ingestion time were used, this would read as fresh; measured from source time it is stale.
  const maxAgeSec = 60;
  const now = last.sourceTimeSec + maxAgeSec + 1;
  assert.ok(now - last.ingestedAtSec <= maxAgeSec, "ingestion time would still look fresh here");

  const result = selectReferencePrice(samples, { now, maxAgeSec, tokenAddress: WNVDAX });
  assert.equal(result.availability, "STALE");
  assert.equal(result.observedAt, last.sourceTimeSec, "observedAt must be the SOURCE time");
});

// ---------------------------------------------------------------------------
// The central safety property
// ---------------------------------------------------------------------------

test("no availability outcome can produce CONFIRMED", () => {
  const all: ReferenceAvailability[] = ["AVAILABLE", "STALE", "UNAVAILABLE"];
  for (const availability of all) {
    const ceiling: ConfirmationStatus | null = confirmationCeiling(availability);
    assert.notEqual(ceiling, "CONFIRMED", `${availability} must never yield CONFIRMED`);
  }

  // UNAVAILABLE ("could not look") and NOT_CONFIRMED ("looked, saw nothing") stay distinct:
  // this module can observe the first and has no standing to assert the second.
  assert.equal(confirmationCeiling("UNAVAILABLE"), "UNAVAILABLE");
  assert.equal(confirmationCeiling("STALE"), "STALE");
  assert.equal(confirmationCeiling("AVAILABLE"), null, "good data imposes no ceiling");

  const ceilings = all.map(confirmationCeiling);
  assert.equal(ceilings.includes("NOT_CONFIRMED"), false);
});

test("a fresh price imposes no ceiling but is still not evidence of anything", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const result = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC + 30,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  assert.equal(result.availability, "AVAILABLE");
  // `null` means the confirmation engine decides on the merits — not that it is confirmed.
  assert.equal(confirmationCeiling(result.availability), null);
});

// ---------------------------------------------------------------------------
// Staleness and unavailability
// ---------------------------------------------------------------------------

test("a sample beyond the freshness bound is STALE, not merely old data served anyway", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const result = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC + 901,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  assert.equal(result.availability, "STALE");
  assert.equal(result.reason, "SAMPLE_OLDER_THAN_BOUND");
  assert.equal(result.ageSec, 901);
  assert.equal(result.maxAgeSec, 900, "the bound is echoed so the decision is reproducible");
  // The sample is still returned — a reader may want to see what the stale price was.
  assert.ok(result.sample);
  assert.equal(confirmationCeiling(result.availability), "STALE");
});

test("the boundary is inclusive at the bound and exclusive one second past it", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const at = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC + 900,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });
  const past = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC + 901,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  assert.equal(at.availability, "AVAILABLE");
  assert.equal(past.availability, "STALE");
});

test("an unmapped asset is UNAVAILABLE and never falls back to another asset's price", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const result = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC,
    maxAgeSec: 900,
    tokenAddress: "0x" + "9".repeat(40),
  });

  assert.equal(result.availability, "UNAVAILABLE");
  assert.equal(result.reason, "NO_INSTRUMENT_FOR_ADDRESS");
  assert.equal(result.sample, null);
  assert.equal(result.observedAt, null);
});

test("samples for a different asset never satisfy a query for the frozen one", () => {
  // T0.2 §2.2: NVDAx and wNVDAx are different tokens. Serving one asset's price for another
  // is the exact failure that mapping defect would have caused.
  const { samples } = loadIndexSamples(join(fixturesDir, "wrong-asset.ndjson"));
  assert.equal(samples.length, 2, "the fixture does contain valid rows");

  const result = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  assert.equal(result.availability, "UNAVAILABLE");
  assert.equal(result.reason, "NO_SAMPLES_FOR_INSTRUMENT");
  assert.equal(result.sample, null);

  // The same rows do satisfy a query for the asset they actually describe.
  const forMstr = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC,
    maxAgeSec: 900,
    tokenAddress: WMSTRX,
  });
  assert.equal(forMstr.availability, "AVAILABLE");
});

test("a query before any sample exists is UNAVAILABLE, never clairvoyant", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const earliest = samples[0].sourceTimeSec;

  const result = selectReferencePrice(samples, {
    now: earliest - 1,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  // Replaying a historical moment must not see prices from that moment's future, or a
  // backtest quietly becomes clairvoyant.
  assert.equal(result.availability, "UNAVAILABLE");
  assert.equal(result.reason, "NO_SAMPLE_AT_OR_BEFORE_QUERY_TIME");
  assert.equal(result.sample, null);
});

test("selection takes the most recent sample at or before the query time", () => {
  const { samples } = loadIndexSamples(canonicalPath);

  // Query between the second and third samples: must pick the second, not the newest.
  const secondTime = samples[1].sourceTimeSec;
  const result = selectReferencePrice(samples, {
    now: secondTime + 10,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  assert.equal(result.observedAt, secondTime);
  assert.equal(result.sample?.price, samples[1].price);
});

// ---------------------------------------------------------------------------
// Failures stay observable
// ---------------------------------------------------------------------------

test("each malformed row is rejected with a named reason and a line number", () => {
  const { samples, rejects } = loadIndexSamples(join(fixturesDir, "degraded-rows.ndjson"));

  assert.equal(samples.length, 1, "only the one well-formed row survives");
  assert.equal(rejects.length, 6);

  assert.deepEqual(
    rejects.map((r) => r.reason),
    [
      "NOT_JSON",
      "MISSING_FIELDS",
      "MISSING_SOURCE_TIME",
      "UNPARSEABLE_SOURCE_TIME",
      "EMPTY_PRICE",
      "UNPARSEABLE_INGEST_TIME",
    ],
  );

  for (const reject of rejects) {
    assert.ok(reject.lineNumber > 0, "a rejected row must be locatable in the file");
    assert.ok(reject.excerpt.length > 0, "a rejected row must be inspectable");
  }
});

test("rejects are carried into the result, so degraded input is never silently clean", () => {
  const { samples, rejects } = loadIndexSamples(join(fixturesDir, "degraded-rows.ndjson"));
  const result = selectReferencePrice(
    samples,
    { now: LAST_SAMPLE_SEC, maxAgeSec: 900, tokenAddress: WNVDAX },
    rejects,
  );

  assert.equal(result.rejects.length, 6);
});

test("a missing source timestamp is fatal to a row rather than papered over", () => {
  // Falling back to the ingestion time would invent a freshness the data cannot support.
  const line = JSON.stringify({
    t: "2026-08-18T01:56:00.000Z",
    instrument: "wNVDAx",
    chain: "xlayer",
    address: WNVDAX,
    px: "224.5",
    src: "okx-index",
    raw: { chainIndex: "196", price: "224.5" },
  });
  const result = parseIndexRow(line, 1);
  assert.ok("reason" in result);
  assert.equal(result.reason, "MISSING_SOURCE_TIME");
});

test("an unreadable file reports a read error rather than looking like an empty day", () => {
  const result = loadIndexSamples(join(fixturesDir, "does-not-exist.ndjson"), { retries: 2 });

  assert.ok(result.readError, "an I/O failure must be distinguishable from no data");
  assert.match(result.readError, /ENOENT|no such file/i);
  assert.deepEqual(result.samples, []);

  // And it degrades to UNAVAILABLE — never to a price.
  const selected = selectReferencePrice(result.samples, {
    now: LAST_SAMPLE_SEC,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });
  assert.equal(selected.availability, "UNAVAILABLE");
  assert.equal(confirmationCeiling(selected.availability), "UNAVAILABLE");
});

test("blank lines are skipped without being counted as rejects", () => {
  const { samples, rejects } = parseIndexNdjson("\n\n  \n");
  assert.deepEqual(samples, []);
  assert.deepEqual(rejects, []);
});

// ---------------------------------------------------------------------------
// Asset mapping
// ---------------------------------------------------------------------------

test("instrument resolution is exact-address only, with no symbol fallback", () => {
  assert.equal(resolveInstrumentByAddress(WNVDAX)?.instrument, "wNVDAx");
  assert.equal(resolveInstrumentByAddress(WNVDAX.toUpperCase())?.instrument, "wNVDAx");
  assert.equal(resolveInstrumentByAddress(WMSTRX)?.instrument, "wMSTRx");

  // The unwrapped NVDAx sibling from T0.2 §2.2 has no index instrument and must not resolve.
  assert.equal(resolveInstrumentByAddress("0xc845b2894dbddd03858fd2d643b4ef725fe0849d"), undefined);
  assert.equal(resolveInstrumentByAddress(""), undefined);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test("selection is pure: same samples and options always give the same result", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const options = { now: LAST_SAMPLE_SEC + 100, maxAgeSec: 900, tokenAddress: WNVDAX };

  assert.deepEqual(
    selectReferencePrice(samples, options),
    selectReferencePrice(samples, options),
  );
});

test("every result carries provenance a reader can re-derive the verdict from", () => {
  const { samples } = loadIndexSamples(canonicalPath);
  const result = selectReferencePrice(samples, {
    now: LAST_SAMPLE_SEC + 100,
    maxAgeSec: 900,
    tokenAddress: WNVDAX,
  });

  assert.ok(result.explanation.length > 0);
  assert.ok(result.reason.length > 0, "a machine-readable reason, not just prose");
  assert.equal(result.observedAt, LAST_SAMPLE_SEC);
  assert.equal(result.ageSec, 100);
  assert.equal(result.maxAgeSec, 900);
  assert.ok(result.sample?.raw, "the raw row is carried so nothing has to be taken on trust");
  assert.equal(result.sample?.priceUnit, "USD", "units are stated, not assumed");
});

// ---------------------------------------------------------------------------
// The coverage limitation, asserted rather than merely documented
// ---------------------------------------------------------------------------

test("no committed index data covers any frozen scenario anchor", () => {
  // SVC-003: index history is not available retroactively. The only committed samples are
  // from 2026-08-18, and every frozen anchor predates them — so the OKX leg of market
  // confirmation is UNAVAILABLE for all four scenarios. Asserted here so the limitation
  // cannot be quietly forgotten, and so it fails loudly if data is ever backfilled.
  const { samples } = loadIndexSamples(canonicalPath);
  const anchors: [string, number][] = [
    ["A", Math.floor(Date.parse("2026-07-27T20:33:00Z") / 1000)],
    ["D", Math.floor(Date.parse("2026-08-12T21:13:10Z") / 1000)],
    ["C", Math.floor(Date.parse("2026-08-15T19:38:26Z") / 1000)],
    ["B", Math.floor(Date.parse("2026-08-17T12:41:33Z") / 1000)],
  ];

  for (const [name, now] of anchors) {
    const result = selectReferencePrice(samples, { now, maxAgeSec: 900, tokenAddress: WNVDAX });
    assert.equal(
      result.availability,
      "UNAVAILABLE",
      `scenario ${name} unexpectedly has index coverage`,
    );
    assert.equal(result.reason, "NO_SAMPLE_AT_OR_BEFORE_QUERY_TIME");
    assert.equal(confirmationCeiling(result.availability), "UNAVAILABLE");
  }
});
