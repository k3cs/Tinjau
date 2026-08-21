/**
 * Freshness-aware OKX reference-price adapter (task T3.1).
 *
 * The existing index poller (`src/index-poller/`) writes append-only NDJSON day-files. It is
 * a good WRITER and this module is deliberately only a READER of what it wrote: tracker §0.21
 * says "reuse; add freshness-aware consumer, not silent mutation of historical rows". Nothing
 * here writes, edits, or backfills a sample.
 *
 * WHAT THIS MODULE WILL NOT DO, AND WHY IT MATTERS MOST:
 *
 * It cannot return `CONFIRMED`. A reference price is an input to market confirmation, not a
 * verdict about it — deciding that the market corroborates an event is T3.3's job, using this
 * price alongside pool telemetry. The only `ConfirmationStatus` values this module can produce
 * are the two that constrain a later decision (`UNAVAILABLE`, `STALE`) and `null`, meaning
 * "the data imposes no ceiling; the confirmation engine decides on the merits". A test proves
 * no input reaches `CONFIRMED`.
 *
 * THE TWO TIMESTAMPS. Every poller row carries two, and conflating them is the subtle way a
 * stale price gets treated as fresh:
 *
 *   - `raw.time`  — when OKX says the price was true. THIS is what freshness is measured from.
 *   - `t`         — when our poller wrote the row.
 *
 * Measured lag across the four committed samples is 8.6s–41.1s. If freshness were measured
 * from `t`, a poller re-reading a cached OKX response would look perfectly fresh while
 * quoting an arbitrarily old price. So `observedAt` is always the SOURCE time, and the
 * ingestion time is carried separately as provenance.
 */

import { readFileSync } from "node:fs";
import { INDEX_INSTRUMENTS, type IndexInstrument } from "../index-poller/config.js";
import type { ConfirmationStatus } from "../risk/types.js";

/**
 * The canonical committed sample file, relative to the repository root.
 *
 * Referenced rather than copied into this module's own fixtures directory: duplicating it
 * would create two sources of truth that can silently drift. The test pins its sha256, so a
 * change to the canonical file fails loudly instead.
 */
export const CANONICAL_SAMPLE_PATH =
  "docs/buildx-orion-2026/outputs/05-build/data/index/index-wNVDAx-2026-08-18.ndjson";

// ---------------------------------------------------------------------------
// Parsed rows
// ---------------------------------------------------------------------------

/** One poller row, with both timestamps and full provenance preserved. */
export interface IndexSample {
  instrument: string;
  chain: string;
  /** Token contract address the price is for, lowercased for comparison. */
  address: string;
  /**
   * Price as a decimal STRING at full precision. Never parsed to a JS number here — the
   * poller deliberately carries it as a string end-to-end, and `Number()` would silently
   * truncate the 30+ significant digits these samples carry.
   */
  price: string;
  /** Unit of `price`, stated rather than assumed. */
  priceUnit: "USD";
  /** Epoch seconds from OKX's own `raw.time`. Freshness is measured from this. */
  sourceTimeSec: number;
  /** Epoch seconds our poller wrote the row. Provenance only, never freshness. */
  ingestedAtSec: number;
  /** `ingestedAtSec - sourceTimeSec`. Exposed so pipeline lag is visible, not hidden. */
  ingestionLagSec: number;
  /** The raw row exactly as written, so a reader can re-derive everything themselves. */
  raw: unknown;
}

/** Why a row was discarded during parsing. Rows are never dropped silently. */
export type RowRejectReason =
  | "NOT_JSON"
  | "MISSING_FIELDS"
  | "UNPARSEABLE_INGEST_TIME"
  | "MISSING_SOURCE_TIME"
  | "UNPARSEABLE_SOURCE_TIME"
  | "EMPTY_PRICE";

export interface RowReject {
  lineNumber: number;
  reason: RowRejectReason;
  /** Truncated raw line, so a malformed row can be investigated without dumping the file. */
  excerpt: string;
}

export interface ParseResult {
  samples: IndexSample[];
  rejects: RowReject[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Parses one NDJSON line.
 *
 * Returns a reject rather than throwing: one corrupt line in a day-file must not make the
 * whole file unreadable, but it must also not vanish. Both halves are returned by
 * `parseIndexNdjson`.
 */
export function parseIndexRow(line: string, lineNumber: number): IndexSample | RowReject {
  const excerpt = line.slice(0, 120);

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { lineNumber, reason: "NOT_JSON", excerpt };
  }

  const row = asRecord(parsed);
  if (
    !row ||
    typeof row.instrument !== "string" ||
    typeof row.chain !== "string" ||
    typeof row.address !== "string" ||
    typeof row.px !== "string" ||
    typeof row.t !== "string"
  ) {
    return { lineNumber, reason: "MISSING_FIELDS", excerpt };
  }

  if (row.px.trim().length === 0) {
    return { lineNumber, reason: "EMPTY_PRICE", excerpt };
  }

  const ingestedMs = Date.parse(row.t);
  if (!Number.isFinite(ingestedMs)) {
    return { lineNumber, reason: "UNPARSEABLE_INGEST_TIME", excerpt };
  }

  // The source timestamp is the one freshness depends on, so its absence is fatal to the row
  // rather than something to paper over with the ingestion time.
  const raw = asRecord(row.raw);
  const rawTime = raw?.time;
  if (rawTime === undefined || rawTime === null || rawTime === "") {
    return { lineNumber, reason: "MISSING_SOURCE_TIME", excerpt };
  }
  const sourceMs = Number(rawTime);
  if (!Number.isFinite(sourceMs) || sourceMs <= 0) {
    return { lineNumber, reason: "UNPARSEABLE_SOURCE_TIME", excerpt };
  }

  const sourceTimeSec = Math.floor(sourceMs / 1000);
  const ingestedAtSec = Math.floor(ingestedMs / 1000);

  return {
    instrument: row.instrument,
    chain: row.chain,
    address: row.address.toLowerCase(),
    price: row.px,
    priceUnit: "USD",
    sourceTimeSec,
    ingestedAtSec,
    ingestionLagSec: ingestedAtSec - sourceTimeSec,
    raw: row.raw,
  };
}

function isReject(value: IndexSample | RowReject): value is RowReject {
  return "reason" in value;
}

/** Parses a whole NDJSON document, keeping malformed rows visible as rejects. */
export function parseIndexNdjson(contents: string): ParseResult {
  const samples: IndexSample[] = [];
  const rejects: RowReject[] = [];

  contents.split("\n").forEach((line, i) => {
    if (line.trim().length === 0) return;
    const result = parseIndexRow(line, i + 1);
    if (isReject(result)) rejects.push(result);
    else samples.push(result);
  });

  // Sorted by source time so callers never depend on file ordering. Append-only files are
  // usually in order, but "usually" is not a property worth relying on.
  samples.sort((a, b) => a.sourceTimeSec - b.sourceTimeSec);
  return { samples, rejects };
}

// ---------------------------------------------------------------------------
// Asset mapping
// ---------------------------------------------------------------------------

/**
 * Maps a token address to the poller instrument that samples it.
 *
 * Exact address match only. There is deliberately no symbol-based fallback: T0.2 §2.2 found
 * that `NVDAx` and `wNVDAx` are two different tokens on X Layer, and a symbol lookup is
 * exactly how a price for the wrong one would be served with full confidence.
 */
export function resolveInstrumentByAddress(address: string): IndexInstrument | undefined {
  const want = address.trim().toLowerCase();
  return INDEX_INSTRUMENTS.find((i) => i.address.toLowerCase() === want);
}

// ---------------------------------------------------------------------------
// Selection and availability
// ---------------------------------------------------------------------------

export type ReferenceAvailability =
  /** A sample exists, is for the right asset, and is within the freshness bound. */
  | "AVAILABLE"
  /** A sample exists but is older than the bound. We looked and the answer is out of date. */
  | "STALE"
  /** We could not look: no instrument, no samples, or nothing at or before the query time. */
  | "UNAVAILABLE";

export type ReferenceReason =
  | "FRESH_SAMPLE"
  | "SAMPLE_OLDER_THAN_BOUND"
  | "NO_INSTRUMENT_FOR_ADDRESS"
  | "NO_SAMPLES_FOR_INSTRUMENT"
  | "NO_SAMPLE_AT_OR_BEFORE_QUERY_TIME"
  | "MALFORMED_ROWS_ONLY";

export interface ReferencePriceResult {
  availability: ReferenceAvailability;
  reason: ReferenceReason;
  /** Human-readable, for the risk record's explanation. Never used in any decision. */
  explanation: string;
  /** The selected sample, or null when none could be selected. */
  sample: IndexSample | null;
  /**
   * Epoch seconds the price was true, per OKX. This is what a downstream consumer must pass
   * as `observedAt` — it is the SOURCE time, not our ingestion time.
   */
  observedAt: number | null;
  /** Age of the selected sample at the query time, in seconds. */
  ageSec: number | null;
  /** The bound the age was judged against, echoed so the decision is reproducible. */
  maxAgeSec: number;
  /** Rows that could not be parsed, carried through so failures stay observable. */
  rejects: RowReject[];
}

export interface SelectOptions {
  /** Epoch seconds. Passed in, never read from a clock, so results are reproducible. */
  now: number;
  /** Maximum age a sample may have and still be `AVAILABLE`. */
  maxAgeSec: number;
  /** The asset the caller wants a price for. */
  tokenAddress: string;
}

/**
 * Selects the most recent sample at or before `now` and judges its freshness.
 *
 * Pure: same samples plus same options always give the same result.
 *
 * Two rules worth stating because they are easy to get backwards:
 *
 *   1. Samples dated AFTER `now` are ignored, not used. Replaying a historical moment must
 *      not be able to see prices from that moment's future, or a backtest quietly becomes
 *      clairvoyant.
 *   2. Freshness is judged here from the raw source timestamp. Nothing in the row is trusted
 *      to declare itself fresh, and this module's own verdict is re-derived downstream by
 *      `promote.ts` from `observedAt`. Two independent checks, on purpose.
 */
export function selectReferencePrice(
  samples: readonly IndexSample[],
  options: SelectOptions,
  rejects: readonly RowReject[] = [],
): ReferencePriceResult {
  const { now, maxAgeSec, tokenAddress } = options;
  const base = { maxAgeSec, rejects: [...rejects] };

  const instrument = resolveInstrumentByAddress(tokenAddress);
  if (!instrument) {
    return {
      ...base,
      availability: "UNAVAILABLE",
      reason: "NO_INSTRUMENT_FOR_ADDRESS",
      explanation:
        `No OKX index instrument is configured for ${tokenAddress}. A reference price cannot ` +
        `be obtained for an asset the poller does not sample.`,
      sample: null,
      observedAt: null,
      ageSec: null,
    };
  }

  const forAsset = samples.filter((s) => s.address === instrument.address.toLowerCase());
  if (forAsset.length === 0) {
    return {
      ...base,
      availability: "UNAVAILABLE",
      reason: rejects.length > 0 ? "MALFORMED_ROWS_ONLY" : "NO_SAMPLES_FOR_INSTRUMENT",
      explanation:
        rejects.length > 0
          ? `Every row for ${instrument.instrument} failed to parse (${rejects.length} rejected).`
          : `No index samples are available for ${instrument.instrument}.`,
      sample: null,
      observedAt: null,
      ageSec: null,
    };
  }

  // Rule 1: never look into the query time's future.
  const atOrBefore = forAsset.filter((s) => s.sourceTimeSec <= now);
  if (atOrBefore.length === 0) {
    return {
      ...base,
      availability: "UNAVAILABLE",
      reason: "NO_SAMPLE_AT_OR_BEFORE_QUERY_TIME",
      explanation:
        `The earliest index sample for ${instrument.instrument} is dated after the query time, ` +
        `so no price was observable at that moment.`,
      sample: null,
      observedAt: null,
      ageSec: null,
    };
  }

  const sample = atOrBefore[atOrBefore.length - 1];
  const ageSec = now - sample.sourceTimeSec;

  if (ageSec > maxAgeSec) {
    return {
      ...base,
      availability: "STALE",
      reason: "SAMPLE_OLDER_THAN_BOUND",
      explanation:
        `The most recent index price for ${instrument.instrument} is ${ageSec}s old, beyond the ` +
        `${maxAgeSec}s freshness bound. A price that old describes a different market.`,
      sample,
      observedAt: sample.sourceTimeSec,
      ageSec,
    };
  }

  return {
    ...base,
    availability: "AVAILABLE",
    reason: "FRESH_SAMPLE",
    explanation:
      `Index price ${sample.price} ${sample.priceUnit} for ${instrument.instrument}, ${ageSec}s ` +
      `old at the query time (bound ${maxAgeSec}s).`,
    sample,
    observedAt: sample.sourceTimeSec,
    ageSec,
  };
}

/**
 * The ceiling this data imposes on any later confirmation verdict.
 *
 * `null` means "no ceiling — the confirmation engine decides on the merits". A non-null value
 * is a forced outcome the engine may not exceed.
 *
 * This is the only bridge from this module into the `ConfirmationStatus` vocabulary, and it
 * is deliberately incapable of returning `CONFIRMED`: an available price is a fact about data,
 * not evidence that the market corroborated anything.
 *
 * `UNAVAILABLE` and `NOT_CONFIRMED` stay distinct throughout. This function never returns
 * `NOT_CONFIRMED` at all — "we looked at the market and it did not corroborate" is a judgment
 * only T3.3 can make, whereas "we could not obtain a price" is all this module can observe.
 */
export function confirmationCeiling(availability: ReferenceAvailability): ConfirmationStatus | null {
  switch (availability) {
    case "UNAVAILABLE":
      return "UNAVAILABLE";
    case "STALE":
      return "STALE";
    case "AVAILABLE":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Loading (the only I/O in this module)
// ---------------------------------------------------------------------------

export interface LoadOptions {
  /** Attempts before giving up. A transient read failure should not look like missing data. */
  retries?: number;
}

export interface LoadResult extends ParseResult {
  /** Null when the file could not be read after all attempts. */
  path: string;
  /** Read failures, so a permissions or I/O problem is never mistaken for an empty file. */
  readError: string | null;
}

/**
 * Reads and parses an NDJSON day-file.
 *
 * Retries a failing read, because a transient I/O error and a genuinely absent file are very
 * different findings and only the second should read as "no data". When every attempt fails,
 * `readError` is populated and `samples` is empty — which `selectReferencePrice` then reports
 * as `UNAVAILABLE`, never as a price.
 */
export function loadIndexSamples(path: string, options: LoadOptions = {}): LoadResult {
  const retries = options.retries ?? 3;
  let lastError = "";

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const contents = readFileSync(path, "utf8");
      return { path, readError: null, ...parseIndexNdjson(contents) };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { path, readError: lastError, samples: [], rejects: [] };
}
