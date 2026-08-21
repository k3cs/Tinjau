/**
 * Tests task P5.3's tweet composition (src/xbot/composeTweet.ts): archive enrichment
 * (present/absent), declared-amount consensus gating, long-summary truncation, both
 * network tags, and a worst-case-length guarantee (<=280 chars).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeTweetText, findArchivedSummary, type ComposeTweetEventInput } from "../src/xbot/composeTweet.js";
import { resolveTokenAddress } from "../src/chain/tokenAddresses.js";

const NVDAX_TESTNET = resolveTokenAddress("NVDAx", "testnet");
const REGISTRY_ADDRESS = "0x713f45f44e74616898FB366E11881196221933aA" as const;

function baseInput(overrides: Partial<ComposeTweetEventInput> = {}): ComposeTweetEventInput {
  return {
    eventId: 7n,
    eventTypeLabel: "8-K — earnings_announcement",
    token: NVDAX_TESTNET,
    declaredAmount: 80000n, // 0.08 scaled by 1_000_000
    currency: "USD",
    declaredAmountAgreement: 3,
    sourceContentHash: "0x" + "ab".repeat(32),
    registryAddress: REGISTRY_ADDRESS,
    network: "testnet",
    ...overrides,
  };
}

test("without archive enrichment: falls back to deterministic template, stays under 280 chars", () => {
  const text = composeTweetText(baseInput(), null);
  assert.ok(text.length <= 280);
  assert.match(text, /^\[Testnet\]/);
  // Public copy uses the current product name (T0.5). The historical AFTERHOURS name stays
  // in deployed contract names, systemd units and on-chain source schemes — never here.
  assert.match(text, /Event #7 recorded on Tinjau\./);
  assert.doesNotMatch(text, /AFTERHOURS/i);
});

test("with archive enrichment: includes the real summary text", () => {
  const text = composeTweetText(baseInput(), { summary: "NVIDIA reports record quarterly revenue.", accessionNumber: "0001193125-26-000001" });
  assert.match(text, /NVIDIA reports record quarterly revenue\./);
  assert.ok(text.length <= 280);
});

test("declaredAmountAgreement > 0: amount + currency are included", () => {
  const text = composeTweetText(baseInput({ declaredAmountAgreement: 2 }), null);
  assert.match(text, /Amount: 0\.08 USD/);
});

test("declaredAmountAgreement === 0: amount is never printed, even if declaredAmount is nonzero", () => {
  const text = composeTweetText(baseInput({ declaredAmountAgreement: 0, declaredAmount: 999999n }), null);
  assert.doesNotMatch(text, /Amount:/);
});

test("long summary is truncated with an ellipsis to keep the tweet under 280 chars", () => {
  const longSummary = "A".repeat(500);
  const text = composeTweetText(baseInput(), { summary: longSummary, accessionNumber: "acc-1" });
  assert.ok(text.length <= 280);
  assert.ok(text.includes("…"));
});

test("network tag: testnet", () => {
  const text = composeTweetText(baseInput({ network: "testnet" }), null);
  assert.match(text, /^\[Testnet\]/);
});

test("network tag: mainnet", () => {
  const mainnetToken = resolveTokenAddress("NVDAx", "mainnet");
  const text = composeTweetText(baseInput({ network: "mainnet", token: mainnetToken }), null);
  assert.match(text, /^\[Mainnet\]/);
});

test("worst-case-length scenario: huge eventTypeLabel + huge amount + huge summary still stays <= 280", () => {
  const text = composeTweetText(
    baseInput({
      eventTypeLabel: "8-K — " + "x".repeat(200),
      declaredAmount: 123456789012345678901234567890n,
      currency: "SUPERLONGCURRENCYCODE",
      declaredAmountAgreement: 3,
    }),
    { summary: "S".repeat(1000), accessionNumber: "acc-2" },
  );
  assert.ok(text.length <= 280, `length was ${text.length}`);
});

test("uses a tx explorer link when txHash is provided, registry address link otherwise", () => {
  const withTx = composeTweetText(baseInput({ txHash: "0xdeadbeef" }), null);
  assert.match(withTx, /\/tx\/0xdeadbeef/);

  const withoutTx = composeTweetText(baseInput(), null);
  assert.match(withoutTx, new RegExp(`/address/${REGISTRY_ADDRESS}`));
});

test("resolves a known token address to its symbol", () => {
  const text = composeTweetText(baseInput(), null);
  assert.match(text, /NVDAx/);
});

// --- findArchivedSummary (filesystem I/O, no network) ---

test("findArchivedSummary: returns null when the pipeline dir does not exist", () => {
  const dir = mkdtempSync(join(tmpdir(), "afterhours-xbot-test-"));
  try {
    assert.equal(findArchivedSummary("0x" + "11".repeat(32), dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findArchivedSummary: finds a match by contentHash and returns the first real summary", () => {
  const dir = mkdtempSync(join(tmpdir(), "afterhours-xbot-test-"));
  try {
    const pipelineDir = join(dir, "pipeline");
    mkdirSync(pipelineDir, { recursive: true });
    const contentHash = "ab".repeat(32);
    writeFileSync(
      join(pipelineDir, "0001193125-26-000001.json"),
      JSON.stringify({
        filing: { accessionNumber: "0001193125-26-000001" },
        contentHash,
        agreement: { summaries: ["First summary.", "Second summary.", "Third summary."] },
      }),
    );
    const match = findArchivedSummary(`0x${contentHash}`, dir);
    assert.deepEqual(match, { summary: "First summary.", accessionNumber: "0001193125-26-000001" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findArchivedSummary: no match, malformed file, or empty summaries all return null without throwing", () => {
  const dir = mkdtempSync(join(tmpdir(), "afterhours-xbot-test-"));
  try {
    const pipelineDir = join(dir, "pipeline");
    mkdirSync(pipelineDir, { recursive: true });
    writeFileSync(join(pipelineDir, "malformed.json"), "{ not valid json");
    writeFileSync(
      join(pipelineDir, "no-summaries.json"),
      JSON.stringify({ contentHash: "cd".repeat(32), agreement: { summaries: [] } }),
    );
    assert.doesNotThrow(() => findArchivedSummary("0x" + "ff".repeat(32), dir));
    assert.equal(findArchivedSummary("0x" + "ff".repeat(32), dir), null);
    assert.equal(findArchivedSummary("0x" + "cd".repeat(32), dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
