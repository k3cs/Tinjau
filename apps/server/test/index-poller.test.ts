/**
 * Tests for the P0.8 OKX index-price poller. Pure/fixture-driven — no real CLI spawns, no
 * network calls. Covers: the 4-way outcome classification against sample CLI outputs, the
 * NDJSON row writer (schema + px string-precision survival), and UTC day-file rollover.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyIndexResponse } from "../src/index-poller/okxIndexClient.js";
import { appendIndexRow, dayFilePath, utcDateFromIso, type IndexRow } from "../src/index-poller/ndjsonWriter.js";

// ---------------------------------------------------------------------------
// classifyIndexResponse — 4-way classification
// ---------------------------------------------------------------------------

test("classifyIndexResponse: real success JSON -> ok, with full-precision price string", () => {
  const stdout = JSON.stringify({
    ok: true,
    data: [
      {
        chainIndex: "196",
        price: "225.2747549225031666676926969749943",
        time: "1787017756000",
        tokenContractAddress: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
      },
    ],
  });
  const outcome = classifyIndexResponse({ stdout, stderr: "", timedOut: false });
  assert.equal(outcome.kind, "ok");
  if (outcome.kind === "ok") {
    assert.equal(outcome.price, "225.2747549225031666676926969749943");
    assert.equal(typeof outcome.price, "string");
    assert.equal(outcome.srcTimeMs, "1787017756000");
  }
});

test("classifyIndexResponse: 50114 auth error code -> auth", () => {
  const stdout = JSON.stringify({ ok: false, code: "50114", msg: "Invalid Authority" });
  const outcome = classifyIndexResponse({ stdout, stderr: "", timedOut: false });
  assert.equal(outcome.kind, "auth");
  if (outcome.kind === "auth") {
    assert.match(outcome.detail, /50114|Invalid Authority/);
  }
});

test("classifyIndexResponse: passphrase pre-flight error text -> auth", () => {
  const outcome = classifyIndexResponse({
    stdout: "",
    stderr: "Error: OKX_PASSPHRASE is required but not set",
    timedOut: false,
  });
  assert.equal(outcome.kind, "auth");
});

test("classifyIndexResponse: other known auth codes (50103/50111/50112/50113/50102) -> auth", () => {
  // The CLI's own error text formats the code as literal "code=NNNNN" (e.g. a Rust
  // error Display), not a JSON `"code"` key — matches the classification rule's regex.
  for (const code of ["50103", "50111", "50112", "50113", "50102"]) {
    const outcome = classifyIndexResponse({
      stdout: "",
      stderr: `Error: OKX API request failed, code=${code}`,
      timedOut: false,
    });
    assert.equal(outcome.kind, "auth", `code=${code} should classify as auth`);
  }
});

test("classifyIndexResponse: notifications OVER_QUOTA payload -> quota", () => {
  const stdout = JSON.stringify({
    ok: false,
    notifications: [{ code: "MARKET_API_OVER_QUOTA", message: "quota exceeded" }],
  });
  const outcome = classifyIndexResponse({ stdout, stderr: "", timedOut: false });
  assert.equal(outcome.kind, "quota");
});

test("classifyIndexResponse: confirming:true payload -> quota", () => {
  const stdout = JSON.stringify({ ok: false, confirming: true });
  const outcome = classifyIndexResponse({ stdout, stderr: "", timedOut: false });
  assert.equal(outcome.kind, "quota");
});

test("classifyIndexResponse: timeout -> transient", () => {
  const outcome = classifyIndexResponse({ stdout: "", stderr: "", timedOut: true });
  assert.equal(outcome.kind, "transient");
});

test("classifyIndexResponse: garbage/non-JSON stdout -> transient", () => {
  const outcome = classifyIndexResponse({
    stdout: "connect ETIMEDOUT 1.2.3.4:443",
    stderr: "",
    timedOut: false,
  });
  assert.equal(outcome.kind, "transient");
});

test("classifyIndexResponse: ok:true but empty data array -> transient (not a false success)", () => {
  const stdout = JSON.stringify({ ok: true, data: [] });
  const outcome = classifyIndexResponse({ stdout, stderr: "", timedOut: false });
  assert.equal(outcome.kind, "transient");
});

test("classifyIndexResponse: spawn error (ENOENT-style) -> transient", () => {
  const outcome = classifyIndexResponse({
    stdout: "",
    stderr: "",
    timedOut: false,
    spawnError: "spawn /opt/afterhours/bin/onchainos ENOENT",
  });
  assert.equal(outcome.kind, "transient");
});

// ---------------------------------------------------------------------------
// NDJSON row writer — schema, px precision, day-file path/rollover
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<IndexRow> = {}): IndexRow {
  return {
    t: "2026-08-18T09:15:00.000Z",
    instrument: "wNVDAx",
    chain: "xlayer",
    address: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
    px: "225.2747549225031666676926969749943",
    src: "okx-index",
    raw: { chainIndex: "196" },
    ...overrides,
  };
}

test("utcDateFromIso: extracts UTC calendar date", () => {
  assert.equal(utcDateFromIso("2026-08-18T09:15:00.000Z"), "2026-08-18");
  assert.equal(utcDateFromIso("2026-08-18T23:59:59.999Z"), "2026-08-18");
  assert.equal(utcDateFromIso("2026-08-19T00:00:00.000Z"), "2026-08-19");
});

test("dayFilePath: builds the expected path shape", () => {
  const path = dayFilePath("/opt/afterhours/data", "wNVDAx", "2026-08-18");
  assert.equal(path, "/opt/afterhours/data/index/index-wNVDAx-2026-08-18.ndjson");
});

test("appendIndexRow: writes a well-formed row with all 6 keys, px surviving as an exact string", () => {
  const dir = mkdtempSync(join(tmpdir(), "index-poller-test-"));
  try {
    const row = makeRow();
    const path = appendIndexRow(dir, row);
    assert.equal(path, join(dir, "index", "index-wNVDAx-2026-08-18.ndjson"));

    const contents = readFileSync(path, "utf8");
    const lines = contents.trim().split("\n");
    assert.equal(lines.length, 1);

    const parsed = JSON.parse(lines[0]);
    assert.deepEqual(Object.keys(parsed).sort(), ["address", "chain", "instrument", "px", "raw", "src", "t"].sort());
    assert.equal(typeof parsed.px, "string");
    assert.equal(parsed.px, "225.2747549225031666676926969749943"); // exact, no precision loss
    assert.equal(parsed.t, row.t);
    assert.equal(parsed.instrument, "wNVDAx");
    assert.equal(parsed.src, "okx-index");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendIndexRow: appends (does not truncate) across multiple calls, and always writes a row even if price unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "index-poller-test-"));
  try {
    const row = makeRow();
    appendIndexRow(dir, row);
    appendIndexRow(dir, { ...row, t: "2026-08-18T09:18:00.000Z" }); // same px, later tick

    const path = dayFilePath(dir, "wNVDAx", "2026-08-18");
    const lines = readFileSync(path, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).px, JSON.parse(lines[1]).px);
    assert.notEqual(JSON.parse(lines[0]).t, JSON.parse(lines[1]).t);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendIndexRow: UTC day rollover routes rows to distinct day-files", () => {
  const dir = mkdtempSync(join(tmpdir(), "index-poller-test-"));
  try {
    const rowDay1 = makeRow({ t: "2026-08-18T23:59:59.000Z" });
    const rowDay2 = makeRow({ t: "2026-08-19T00:00:01.000Z" });
    const path1 = appendIndexRow(dir, rowDay1);
    const path2 = appendIndexRow(dir, rowDay2);

    assert.notEqual(path1, path2);
    assert.match(path1, /index-wNVDAx-2026-08-18\.ndjson$/);
    assert.match(path2, /index-wNVDAx-2026-08-19\.ndjson$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendIndexRow: separate instruments never share a day-file", () => {
  const dir = mkdtempSync(join(tmpdir(), "index-poller-test-"));
  try {
    const pathA = appendIndexRow(dir, makeRow({ instrument: "wNVDAx" }));
    const pathB = appendIndexRow(dir, makeRow({ instrument: "wMSTRx" }));
    assert.notEqual(pathA, pathB);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
