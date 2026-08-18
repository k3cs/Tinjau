/**
 * Pure scoreboard-reaction computation (task P5.1). Zero chain calls, zero I/O side
 * effects beyond reading the index-poller's own NDJSON day-files.
 *
 * The method implemented here is pre-registered in
 * `docs/buildx-orion-2026/outputs/05-build/scoreboard-reaction-definition.md` — read that
 * doc before changing any constant below. The 0.50% threshold is an explicitly-disclosed
 * provisional value (an 8-sample bootstrap) with a predeclared revisit trigger at >=100
 * samples/token; it must never be silently re-tuned per event.
 *
 * Day-file naming/reading is reused directly from `../index-poller/ndjsonWriter.js`
 * (`dayFilePath`/`utcDateFromIso`) rather than reimplemented, so this module can never
 * drift from the poller's own on-disk convention.
 */

import { existsSync, readFileSync } from "node:fs";
import { dayFilePath, utcDateFromIso, type IndexRow } from "../index-poller/ndjsonWriter.js";

// ---------------------------------------------------------------------------
// Ticker -> instrument mapping (pre-registration doc §2) — only the 2 tickers P0.8 polls.
// ---------------------------------------------------------------------------

const TICKER_TO_INSTRUMENT: Record<string, string> = {
  NVDAx: "wNVDAx",
  MSTRx: "wMSTRx",
};

/** Returns the polled instrument name for a tracked ticker, or null if it's not one of the 2 P0.8 polls. */
export function instrumentForTicker(ticker: string): string | null {
  return TICKER_TO_INSTRUMENT[ticker] ?? null;
}

// ---------------------------------------------------------------------------
// Window/threshold constants (pre-registration doc §3-6).
// ---------------------------------------------------------------------------

export const PRE_WINDOW_SECONDS = 1800; // 30 min
export const POST_WINDOW_SECONDS = 3600; // 60 min
export const REACTION_THRESHOLD_PCT = 0.5; // 0.50% — provisional, see pre-registration doc §6
export const MIN_BASELINE_SAMPLES = 2;
export const EXPECTED_POLL_INTERVAL_SECONDS = 180; // matches INDEX_POLL_INTERVAL_MS default (3 min)
export const MIN_COVERAGE_FRACTION = 0.8; // "no_reaction_in_window" typical-case coverage bar

// ---------------------------------------------------------------------------
// loadIndexSeries — reads day-partitioned NDJSON files spanning [fromIso, toIso].
// ---------------------------------------------------------------------------

export interface IndexSample {
  tSec: number;
  price: number;
}

/**
 * Reads every NDJSON row for `instrument` whose timestamp falls in `[fromIso, toIso]`
 * (inclusive both ends), across however many UTC day-files that range spans. Missing
 * day-files are silently skipped (no data for that day, not an error) — the normal case
 * for a window that predates the poller starting, or a token the poller doesn't track.
 * Malformed lines are skipped rather than throwing, so one corrupt row never takes down
 * the whole read.
 */
export function loadIndexSeries(instrument: string, stateDir: string, fromIso: string, toIso: string): IndexSample[] {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) {
    throw new Error(`loadIndexSeries: invalid range fromIso=${fromIso} toIso=${toIso}`);
  }

  const dates: string[] = [];
  const firstDayMs = Date.parse(`${utcDateFromIso(fromIso)}T00:00:00.000Z`);
  for (let dayMs = firstDayMs; dayMs <= toMs; dayMs += 86_400_000) {
    dates.push(new Date(dayMs).toISOString().slice(0, 10));
  }

  const samples: IndexSample[] = [];
  for (const date of dates) {
    const path = dayFilePath(stateDir, instrument, date);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let row: IndexRow;
      try {
        row = JSON.parse(trimmed) as IndexRow;
      } catch {
        continue; // malformed line — skip rather than crash the whole read
      }
      const tMs = Date.parse(row.t);
      if (Number.isNaN(tMs) || tMs < fromMs || tMs > toMs) continue;
      const price = Number(row.px);
      if (!Number.isFinite(price)) continue;
      samples.push({ tSec: Math.floor(tMs / 1000), price });
    }
  }

  samples.sort((a, b) => a.tSec - b.tSec);
  return samples;
}

// ---------------------------------------------------------------------------
// computeBaseline — median of the pre-window (pre-registration doc §4).
// ---------------------------------------------------------------------------

export interface Baseline {
  median: number;
  sampleCount: number;
}

/** Median price of samples with `t in [postTimeSec - 1800, postTimeSec)`. Null if the pre-window is empty. */
export function computeBaseline(series: IndexSample[], postTimeSec: number): Baseline | null {
  const preWindow = series.filter((s) => s.tSec >= postTimeSec - PRE_WINDOW_SECONDS && s.tSec < postTimeSec);
  if (preWindow.length === 0) return null;
  const sorted = [...preWindow].sort((a, b) => a.price - b.price);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid].price : (sorted[mid - 1].price + sorted[mid].price) / 2;
  return { median, sampleCount: preWindow.length };
}

// ---------------------------------------------------------------------------
// computeReaction — the 5-state tagged union (pre-registration doc §8).
// ---------------------------------------------------------------------------

export type ReactionResult =
  | { state: "no_poller_coverage" }
  | { state: "insufficient_baseline" }
  | { state: "pending" }
  | { state: "no_reaction_in_window"; coverageFraction: number }
  | { state: "reacted"; reactionTimeSec: number; price: string; baseline: string; pctMove: number };

function fmt(n: number): string {
  return n.toFixed(4);
}

/**
 * `series` should cover (at least) `[postTimeSec - 1800, postTimeSec + 3600]` — callers
 * typically get it from `loadIndexSeries(instrument, stateDir, fromIso, toIso)` with that
 * exact range. Extra rows outside the range are harmless (filtered internally).
 *
 * `nowSec` defaults to the real current time; tests pass an explicit value so the
 * pending/elapsed branches are deterministic.
 */
export function computeReaction(
  series: IndexSample[],
  postTimeSec: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): ReactionResult {
  const postWindowEnd = postTimeSec + POST_WINDOW_SECONDS;
  const postWindow = series
    .filter((s) => s.tSec >= postTimeSec && s.tSec <= postWindowEnd)
    .sort((a, b) => a.tSec - b.tSec);

  if (postWindow.length === 0) {
    // Zero rows so far. If the window is still open, we genuinely don't know yet whether
    // this token has poller coverage at all — report "pending", not "no coverage". Only
    // once the window has fully elapsed with zero rows do we call it "no coverage" (this is
    // also what a genuinely-unmapped/unpolled ticker looks like forever, by construction).
    if (nowSec < postWindowEnd) return { state: "pending" };
    return { state: "no_poller_coverage" };
  }

  const baseline = computeBaseline(series, postTimeSec);
  if (!baseline || baseline.sampleCount < MIN_BASELINE_SAMPLES) {
    return { state: "insufficient_baseline" };
  }

  for (const sample of postWindow) {
    const pctMove = ((sample.price - baseline.median) / baseline.median) * 100;
    if (Math.abs(pctMove) >= REACTION_THRESHOLD_PCT) {
      // A real crossing already happened — report it immediately, even if the post-window
      // technically hasn't closed yet. It doesn't become less true by waiting.
      return {
        state: "reacted",
        reactionTimeSec: sample.tSec,
        price: fmt(sample.price),
        baseline: fmt(baseline.median),
        pctMove,
      };
    }
  }

  if (nowSec < postWindowEnd) {
    return { state: "pending" };
  }

  const expectedSamples = Math.max(1, Math.floor(POST_WINDOW_SECONDS / EXPECTED_POLL_INTERVAL_SECONDS));
  const coverageFraction = Math.min(1, postWindow.length / expectedSamples);
  // Below the ~80% typical-case coverage bar this is still "no_reaction_in_window" — the
  // pre-registered 5 states don't define a 6th bucket for "elapsed, some data, low
  // coverage, no crossing" — but the real coverageFraction is always carried in the result
  // so a sparse, low-confidence reading is never presented as equally strong as a
  // well-covered one. See the pre-registration doc's "Implementation note".
  return { state: "no_reaction_in_window", coverageFraction };
}

// ---------------------------------------------------------------------------
// computeReactionForTicker — convenience wrapper joining ticker -> instrument -> series.
// ---------------------------------------------------------------------------

/**
 * Resolves `ticker` to a polled instrument, loads its series for the exact window
 * `computeReaction` needs, and computes the result. Returns `no_poller_coverage`
 * immediately (no file I/O) when `ticker` is null or isn't one of the 2 polled tickers —
 * "by construction", per the pre-registration doc.
 */
export function computeReactionForTicker(
  ticker: string | null,
  stateDir: string,
  postTimeSec: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): ReactionResult {
  if (ticker === null) return { state: "no_poller_coverage" };
  const instrument = instrumentForTicker(ticker);
  if (instrument === null) return { state: "no_poller_coverage" };

  const fromIso = new Date((postTimeSec - PRE_WINDOW_SECONDS) * 1000).toISOString();
  const toIso = new Date((postTimeSec + POST_WINDOW_SECONDS) * 1000).toISOString();
  const series = loadIndexSeries(instrument, stateDir, fromIso, toIso);
  return computeReaction(series, postTimeSec, nowSec);
}
