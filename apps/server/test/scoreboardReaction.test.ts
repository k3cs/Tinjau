/**
 * Tests for the P5.1 scoreboard-reaction computation. Fixture-driven, in-memory NDJSON
 * files written to a temp dir — no live VPS/RPC dependency. Covers all 5 states, including
 * a fixture reproducing the real "zero post-window coverage" case (the live MSTR event,
 * whose post-window entirely predates the poller starting) and a fixture with ~0.1%
 * consecutive-sample noise that must NOT falsely trigger `reacted`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadIndexSeries,
  computeBaseline,
  computeReaction,
  computeReactionForTicker,
  instrumentForTicker,
  type IndexSample,
} from "../src/studies/scoreboardReaction.js";
import { dayFilePath, utcDateFromIso } from "../src/index-poller/ndjsonWriter.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeStateDir(): string {
  return mkdtempSync(join(tmpdir(), "afterhours-scoreboard-test-"));
}

function writeRows(stateDir: string, instrument: string, rows: Array<{ tSec: number; px: string }>): void {
  const byDate = new Map<string, string[]>();
  for (const row of rows) {
    const iso = new Date(row.tSec * 1000).toISOString();
    const date = utcDateFromIso(iso);
    const line = JSON.stringify({
      t: iso,
      instrument,
      chain: "xlayer",
      address: "0xtest",
      px: row.px,
      src: "okx-index",
      raw: {},
    });
    const arr = byDate.get(date) ?? [];
    arr.push(line);
    byDate.set(date, arr);
  }
  for (const [date, lines] of byDate) {
    const path = dayFilePath(stateDir, instrument, date);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, lines.join("\n") + "\n");
  }
}

const BASE_T = 1_800_000_000; // fixed reference "now", arbitrary round-ish unix seconds

// ---------------------------------------------------------------------------
// instrumentForTicker
// ---------------------------------------------------------------------------

test("instrumentForTicker: resolves the 2 P0.8-polled tickers", () => {
  assert.equal(instrumentForTicker("NVDAx"), "wNVDAx");
  assert.equal(instrumentForTicker("MSTRx"), "wMSTRx");
});

test("instrumentForTicker: unknown ticker resolves to null", () => {
  assert.equal(instrumentForTicker("AAPL"), null);
  assert.equal(instrumentForTicker(""), null);
});

// ---------------------------------------------------------------------------
// loadIndexSeries — day-file reading, range filtering, multi-day spans
// ---------------------------------------------------------------------------

test("loadIndexSeries: reads rows within range, excludes rows outside it, sorted ascending", () => {
  const stateDir = makeStateDir();
  try {
    writeRows(stateDir, "wNVDAx", [
      { tSec: BASE_T - 5000, px: "100" }, // before range
      { tSec: BASE_T - 100, px: "101" },
      { tSec: BASE_T + 50, px: "103" },
      { tSec: BASE_T, px: "102" },
      { tSec: BASE_T + 9999, px: "999" }, // after range
    ]);
    const fromIso = new Date((BASE_T - 200) * 1000).toISOString();
    const toIso = new Date((BASE_T + 200) * 1000).toISOString();
    const series = loadIndexSeries("wNVDAx", stateDir, fromIso, toIso);
    assert.deepEqual(
      series.map((s) => s.tSec),
      [BASE_T - 100, BASE_T, BASE_T + 50],
    );
    assert.deepEqual(
      series.map((s) => s.price),
      [101, 102, 103],
    );
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadIndexSeries: spans multiple UTC day-files correctly", () => {
  const stateDir = makeStateDir();
  try {
    const day1Sec = Date.parse("2026-08-17T23:50:00.000Z") / 1000;
    const day2Sec = Date.parse("2026-08-18T00:10:00.000Z") / 1000;
    writeRows(stateDir, "wMSTRx", [
      { tSec: day1Sec, px: "50" },
      { tSec: day2Sec, px: "51" },
    ]);
    const fromIso = new Date((day1Sec - 3600) * 1000).toISOString();
    const toIso = new Date((day2Sec + 3600) * 1000).toISOString();
    const series = loadIndexSeries("wMSTRx", stateDir, fromIso, toIso);
    assert.equal(series.length, 2);
    assert.deepEqual(
      series.map((s) => s.tSec),
      [day1Sec, day2Sec],
    );
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadIndexSeries: missing day-file is silently skipped, not an error", () => {
  const stateDir = makeStateDir();
  try {
    const fromIso = new Date((BASE_T - 200) * 1000).toISOString();
    const toIso = new Date((BASE_T + 200) * 1000).toISOString();
    const series = loadIndexSeries("wNVDAx", stateDir, fromIso, toIso);
    assert.deepEqual(series, []);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadIndexSeries: malformed NDJSON line is skipped, not fatal", () => {
  const stateDir = makeStateDir();
  try {
    const path = dayFilePath(stateDir, "wNVDAx", utcDateFromIso(new Date(BASE_T * 1000).toISOString()));
    mkdirSync(join(path, ".."), { recursive: true });
    const goodLine = JSON.stringify({
      t: new Date(BASE_T * 1000).toISOString(),
      instrument: "wNVDAx",
      chain: "xlayer",
      address: "0xtest",
      px: "200",
      src: "okx-index",
      raw: {},
    });
    writeFileSync(path, "not json at all\n" + goodLine + "\n");
    const fromIso = new Date((BASE_T - 100) * 1000).toISOString();
    const toIso = new Date((BASE_T + 100) * 1000).toISOString();
    const series = loadIndexSeries("wNVDAx", stateDir, fromIso, toIso);
    assert.equal(series.length, 1);
    assert.equal(series[0].price, 200);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// computeBaseline
// ---------------------------------------------------------------------------

test("computeBaseline: median of an odd-length pre-window", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 1000, price: 100 },
    { tSec: BASE_T - 500, price: 300 },
    { tSec: BASE_T - 100, price: 200 },
  ];
  const baseline = computeBaseline(series, BASE_T);
  assert.equal(baseline?.median, 200);
  assert.equal(baseline?.sampleCount, 3);
});

test("computeBaseline: median of an even-length pre-window averages the middle two", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 1000, price: 100 },
    { tSec: BASE_T - 500, price: 200 },
  ];
  const baseline = computeBaseline(series, BASE_T);
  assert.equal(baseline?.median, 150);
});

test("computeBaseline: excludes samples at/after postTimeSec and before the 1800s pre-window", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 1801, price: 1 }, // just outside the pre-window
    { tSec: BASE_T - 1800, price: 100 }, // exactly at the boundary — included
    { tSec: BASE_T, price: 999 }, // at postTime — excluded (pre-window is strictly < postTime)
  ];
  const baseline = computeBaseline(series, BASE_T);
  assert.equal(baseline?.sampleCount, 1);
  assert.equal(baseline?.median, 100);
});

test("computeBaseline: empty pre-window returns null", () => {
  assert.equal(computeBaseline([], BASE_T), null);
});

// ---------------------------------------------------------------------------
// computeReaction — the 5 states
// ---------------------------------------------------------------------------

test("computeReaction: no_poller_coverage — zero post-window rows, window fully elapsed (real MSTR-event shape)", () => {
  // Reproduces the live MSTR event: postTime falls entirely before the poller's first
  // recorded row, so the post-window has zero rows even though "now" is well past it.
  const series: IndexSample[] = [
    { tSec: BASE_T + 10_000, price: 100 }, // some unrelated future data, outside this event's window
  ];
  const result = computeReaction(series, BASE_T, BASE_T + 100_000);
  assert.deepEqual(result, { state: "no_poller_coverage" });
});

test("computeReaction: pending — zero post-window rows so far, window still open", () => {
  const result = computeReaction([], BASE_T, BASE_T + 100); // nowSec well inside the 3600s window
  assert.deepEqual(result, { state: "pending" });
});

test("computeReaction: insufficient_baseline — post-window has data but pre-window has <2 samples", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 100, price: 100 }, // only 1 pre-window sample
    { tSec: BASE_T + 100, price: 100 },
  ];
  const result = computeReaction(series, BASE_T, BASE_T + 4000);
  assert.deepEqual(result, { state: "insufficient_baseline" });
});

test("computeReaction: reacted — threshold crossed, reports reaction time/price/baseline/pctMove", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 1000, price: 100 },
    { tSec: BASE_T - 500, price: 100 },
    { tSec: BASE_T + 60, price: 100.2 }, // +0.2%, below threshold
    { tSec: BASE_T + 120, price: 101 }, // +1.0%, crosses 0.50%
    { tSec: BASE_T + 180, price: 105 }, // later sample, should not be reported (first crossing wins)
  ];
  const result = computeReaction(series, BASE_T, BASE_T + 4000);
  assert.equal(result.state, "reacted");
  if (result.state === "reacted") {
    assert.equal(result.reactionTimeSec, BASE_T + 120);
    assert.equal(result.price, "101.0000");
    assert.equal(result.baseline, "100.0000");
    assert.ok(Math.abs(result.pctMove - 1.0) < 1e-9);
  }
});

test("computeReaction: reacted is reported immediately even while the post-window is still open", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 500, price: 100 },
    { tSec: BASE_T - 200, price: 100 },
    { tSec: BASE_T + 10, price: 102 }, // +2%, crosses threshold immediately
  ];
  const result = computeReaction(series, BASE_T, BASE_T + 20); // window still wide open
  assert.equal(result.state, "reacted");
});

test("computeReaction: no_reaction_in_window — good coverage, nothing crosses threshold, window elapsed", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 1000, price: 100 },
    { tSec: BASE_T - 500, price: 100 },
  ];
  // ~20 evenly spaced samples across the 3600s post-window, full coverage, tiny noise only.
  for (let i = 0; i < 20; i++) {
    series.push({ tSec: BASE_T + i * 180, price: 100 + (i % 2 === 0 ? 0.05 : -0.05) });
  }
  const result = computeReaction(series, BASE_T, BASE_T + 4000);
  assert.equal(result.state, "no_reaction_in_window");
  if (result.state === "no_reaction_in_window") {
    assert.ok(result.coverageFraction >= 0.8, `expected >=0.8 coverage, got ${result.coverageFraction}`);
  }
});

test("computeReaction: ~0.1% consecutive-sample noise must NOT falsely trigger reacted", () => {
  // Modeled on the real measured wNVDAx noise (mean ~0.086%, stdev ~0.036% per the
  // pre-registration doc) — a realistic noisy-but-flat series that must classify as
  // no_reaction_in_window, never reacted, since every single-sample move stays well under
  // the 0.50% threshold even though it accumulates a small drift over many samples.
  const series: IndexSample[] = [
    { tSec: BASE_T - 1000, price: 100 },
    { tSec: BASE_T - 500, price: 100 },
  ];
  let price = 100;
  const deltas = [0.097, -0.112, 0.100, -0.094, 0.104, 0.0003, -0.096, 0.09, -0.1, 0.095, -0.098, 0.101, -0.093, 0.099, -0.101, 0.096, -0.099, 0.098, -0.1, 0.097];
  for (let i = 0; i < deltas.length; i++) {
    price = price * (1 + deltas[i] / 100);
    series.push({ tSec: BASE_T + i * 180, price });
  }
  const result = computeReaction(series, BASE_T, BASE_T + 4000);
  assert.equal(result.state, "no_reaction_in_window", `noise series falsely triggered: ${JSON.stringify(result)}`);
});

test("computeReaction: low coverage (elapsed, some data, no crossing) still reports no_reaction_in_window with the real coverageFraction", () => {
  const series: IndexSample[] = [
    { tSec: BASE_T - 1000, price: 100 },
    { tSec: BASE_T - 500, price: 100 },
    { tSec: BASE_T + 100, price: 100.1 }, // only 1 post-window sample out of ~20 expected
  ];
  const result = computeReaction(series, BASE_T, BASE_T + 4000);
  assert.equal(result.state, "no_reaction_in_window");
  if (result.state === "no_reaction_in_window") {
    assert.ok(result.coverageFraction < 0.8, `expected low coverage, got ${result.coverageFraction}`);
  }
});

// ---------------------------------------------------------------------------
// computeReactionForTicker — ticker resolution + no_poller_coverage-by-construction
// ---------------------------------------------------------------------------

test("computeReactionForTicker: null ticker -> no_poller_coverage without touching disk", () => {
  const result = computeReactionForTicker(null, "/nonexistent/path/should/not/matter", BASE_T, BASE_T + 100_000);
  assert.deepEqual(result, { state: "no_poller_coverage" });
});

test("computeReactionForTicker: unmapped ticker -> no_poller_coverage without touching disk", () => {
  const result = computeReactionForTicker("AAPL", "/nonexistent/path/should/not/matter", BASE_T, BASE_T + 100_000);
  assert.deepEqual(result, { state: "no_poller_coverage" });
});

test("computeReactionForTicker: resolves NVDAx -> wNVDAx and reads real fixture data end to end", () => {
  const stateDir = makeStateDir();
  try {
    writeRows(stateDir, "wNVDAx", [
      { tSec: BASE_T - 1000, px: "100" },
      { tSec: BASE_T - 500, px: "100" },
      { tSec: BASE_T + 60, px: "101" }, // +1%, crosses threshold
    ]);
    const result = computeReactionForTicker("NVDAx", stateDir, BASE_T, BASE_T + 4000);
    assert.equal(result.state, "reacted");
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});
