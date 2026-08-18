/**
 * NDJSON day-file writer for the OKX index-price poller (task P0.8).
 *
 * One append-only file per instrument per UTC calendar day:
 * `<stateDir>/index/index-<INSTRUMENT>-<YYYY-MM-DD>.ndjson`. The day is derived from the
 * row's own `t` field (UTC), not wall-clock at write time, so a late-running tick just
 * after midnight UTC still lands in the correct day's file.
 *
 * `px` is carried as a string end-to-end (from the CLI's own JSON string through this
 * writer) — never wrapped in `Number()`, which would silently lose decimal precision.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export interface IndexRow {
  t: string; // ISO-8601 Z
  instrument: string;
  chain: string;
  address: string;
  px: string; // full decimal precision, string — never Number()
  src: "okx-index";
  raw: unknown;
}

/** Extracts the UTC calendar date (YYYY-MM-DD) from an ISO-8601 Z timestamp. */
export function utcDateFromIso(isoTimestamp: string): string {
  const date = isoTimestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`utcDateFromIso: not a valid ISO-8601 date prefix: "${isoTimestamp}"`);
  }
  return date;
}

/** Path of the day-file a given instrument/UTC-date pair belongs to. */
export function dayFilePath(stateDir: string, instrument: string, utcDate: string): string {
  return join(stateDir, "index", `index-${instrument}-${utcDate}.ndjson`);
}

/**
 * Appends one row to its UTC day-file, creating the directory (and file, implicitly via
 * append) if needed. Returns the path written to, for logging.
 */
export function appendIndexRow(stateDir: string, row: IndexRow): string {
  const utcDate = utcDateFromIso(row.t);
  const path = dayFilePath(stateDir, row.instrument, utcDate);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(row) + "\n");
  return path;
}
