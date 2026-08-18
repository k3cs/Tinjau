/**
 * Verifies task P4.4's synthetic (fabricated, non-EDGAR) filing loader and the
 * self-identifying properties its README documents:
 *   - both HTML files exist on disk and are byte-for-byte pinned by sha256
 *   - `sourceUrl`/`accessionNumber` are unambiguously non-EDGAR-shaped
 *   - the HTML-comment warning banner is present in the raw bytes but is stripped out
 *     before the model would ever see the text (this is what makes the banner invisible
 *     to the LLM parse while still being part of what `sourceContentHash` commits to)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSyntheticFiling, SYNTHETIC_FILINGS } from "../src/chain/syntheticFiling.js";
import { stripFilingHtml } from "../src/parsing/stripFilingHtml.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNTHETIC_DIR = join(__dirname, "..", "synthetic");

/** Pinned sha256 of the exact committed HTML bytes — see synthetic/README.md. Anyone
 * editing either file's bytes without updating both this pin and the README must fail
 * this test. */
const KNOWN_SHA256: Record<string, string> = {
  "nvdax-8k-grave-bankruptcy.html": "cec4a8eb4ac19d728c0cddccd5808a88f18081822c0ea37a3544f83f34e1a0c1",
  "nvdax-8k-nonmaterial-annual-meeting.html": "4899c46626c5fff7b0099b9e929cc2a9252ea3f4f1bf3f7a7b5aceccac20af80",
};

test("both synthetic HTML files exist on disk", () => {
  for (const def of Object.values(SYNTHETIC_FILINGS)) {
    const path = join(SYNTHETIC_DIR, def.htmlFile);
    assert.ok(existsSync(path), `expected ${path} to exist`);
  }
});

test("both synthetic HTML files match their pinned sha256", () => {
  for (const def of Object.values(SYNTHETIC_FILINGS)) {
    const path = join(SYNTHETIC_DIR, def.htmlFile);
    const bytes = readFileSync(path);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const known = KNOWN_SHA256[def.htmlFile];
    assert.ok(known, `no pinned sha256 for ${def.htmlFile} — add one to KNOWN_SHA256`);
    assert.equal(hash, known, `${def.htmlFile} bytes changed — recompute and update both this pin and synthetic/README.md`);
  }
});

for (const id of Object.keys(SYNTHETIC_FILINGS)) {
  test(`loadSyntheticFiling("${id}"): sourceUrl (documentUrl) starts with synthetic://`, () => {
    const { filing } = loadSyntheticFiling(id);
    assert.ok(
      filing.documentUrl.startsWith("synthetic://"),
      `expected documentUrl to start with "synthetic://", got "${filing.documentUrl}"`,
    );
  });

  test(`loadSyntheticFiling("${id}"): accessionNumber starts with SYNTHETIC-`, () => {
    const { filing } = loadSyntheticFiling(id);
    assert.ok(
      filing.accessionNumber.startsWith("SYNTHETIC-"),
      `expected accessionNumber to start with "SYNTHETIC-", got "${filing.accessionNumber}"`,
    );
  });

  test(`loadSyntheticFiling("${id}"): raw HTML contains the warning banner text`, () => {
    const { rawHtml } = loadSyntheticFiling(id);
    assert.match(rawHtml, /SYNTHETIC DOCUMENT/);
  });

  test(`loadSyntheticFiling("${id}"): stripFilingHtml() output does NOT contain "SYNTHETIC" (banner invisible to the model)`, () => {
    const { rawHtml } = loadSyntheticFiling(id);
    const { text } = stripFilingHtml(rawHtml);
    assert.ok(
      !text.includes("SYNTHETIC"),
      `stripFilingHtml() output leaked the word "SYNTHETIC" — the HTML-comment banner is contaminating the model-facing text`,
    );
  });

  test(`loadSyntheticFiling("${id}"): tokenSymbol/ticker/form resolve correctly`, () => {
    const { filing } = loadSyntheticFiling(id);
    assert.equal(filing.ticker, "NVDA");
    assert.equal(filing.tokenSymbol, "NVDAx");
    assert.equal(filing.form, "8-K");
  });
}

test("loadSyntheticFiling throws a clear error for an unknown id", () => {
  assert.throws(() => loadSyntheticFiling("not-a-real-id"), /Unknown synthetic filing id/);
});
