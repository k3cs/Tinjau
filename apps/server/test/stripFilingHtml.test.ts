/**
 * Tests P1.2's stripper against a real filing fetched live from EDGAR on 2026-08-17:
 * MSTR 8-K, accession 0001193125-26-341297, accepted 2026-08-10T12:00:15Z
 * (https://www.sec.gov/Archives/edgar/data/1050446/000119312526341297/mstr-20260810.htm).
 * Fixture saved at test/fixtures/mstr-8k-2026-08-10.htm — no network access needed to run
 * this test.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { stripFilingHtml } from "../src/parsing/stripFilingHtml.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, "fixtures", "mstr-8k-2026-08-10.htm");

test("strips a real MSTR 8-K down to a fraction of its raw size", () => {
  const rawHtml = readFileSync(FIXTURE_PATH, "utf8");
  const result = stripFilingHtml(rawHtml);

  assert.equal(result.rawLength, rawHtml.length);
  assert.ok(result.rawLength > 150_000, `expected a ~200KB fixture, got ${result.rawLength} bytes`);

  // Real measured range per spec §7: 2,500-3,700 tokens after stripping. Give some slack
  // either side since this is an estimate (chars/4), not a real tokenizer.
  assert.ok(
    result.estimatedTokens > 800 && result.estimatedTokens < 8000,
    `estimated tokens (${result.estimatedTokens}) outside the sanity range`,
  );

  // Dramatically smaller than the raw HTML.
  assert.ok(
    result.strippedLength < result.rawLength * 0.3,
    `stripped output (${result.strippedLength}) should be well under 30% of raw (${result.rawLength})`,
  );
});

test("stripped output contains no HTML/XBRL tags", () => {
  const rawHtml = readFileSync(FIXTURE_PATH, "utf8");
  const { text } = stripFilingHtml(rawHtml);

  assert.ok(!/<[a-zA-Z!?/][^>]*>/.test(text), "stripped text should contain no remaining tags");
  assert.ok(!text.includes("xbrli:"), "stripped text should contain no XBRL namespace prefixes");
  assert.ok(!text.includes("<?xml"), "stripped text should contain no XML declaration");
});

test("stripped output reads like prose, not markup soup", () => {
  const rawHtml = readFileSync(FIXTURE_PATH, "utf8");
  const { text } = stripFilingHtml(rawHtml);

  // A real 8-K cover page names the company and references the Securities Exchange Act.
  assert.ok(/Strategy|MicroStrategy/i.test(text), "expected the filer's name to survive stripping");
  assert.ok(/Securities Exchange Act/i.test(text), "expected boilerplate legal text to survive stripping");
});

test("handles empty and whitespace-only input without throwing", () => {
  assert.doesNotThrow(() => stripFilingHtml(""));
  assert.doesNotThrow(() => stripFilingHtml("   \n\n  "));
  const result = stripFilingHtml("<html><body></body></html>");
  assert.equal(result.text, "");
});
