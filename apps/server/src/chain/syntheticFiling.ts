/**
 * Synthetic (fabricated, non-EDGAR) filing loader for task P4.4's end-to-end
 * synthetic-injection test.
 *
 * `runOnce.ts`'s `selectFiling()` (task P1.8) deliberately refuses to synthesize a
 * `FilingRecord` not backed by a real EDGAR poll response — reusing it here would force a
 * fake `sourceUrl` that claims to be a real EDGAR document whose bytes don't match, which
 * would be a genuinely fabricated bonded claim on-chain. This module is a separate,
 * self-identifying path instead:
 *
 *   - `sourceUrl` always starts with `synthetic://afterhours/P4.4/...` — never a real EDGAR
 *     URL, so nobody reading the registry could mistake this for a real filing.
 *   - `accessionNumber` starts with `SYNTHETIC-P4.4-...` — not EDGAR's real
 *     `NNNNNNNNNN-YY-NNNNNN` format, so it's unambiguously not a real accession number.
 *   - The raw HTML committed to `sourceContentHash` carries an in-document warning banner
 *     inside an HTML `<!-- -->` comment (see `apps/server/synthetic/README.md`) —
 *     `stripFilingHtml()` strips HTML comments before the model ever sees the text, so the
 *     banner never contaminates the parse, but it IS part of the exact bytes
 *     `sourceContentHash` commits to on-chain, so anyone who fetches and hashes the raw
 *     file sees the warning first.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FilingRecord } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNTHETIC_DIR = join(__dirname, "..", "..", "synthetic");

/** CIK for NVIDIA CORP, matches src/config/tickers.ts. */
const NVDA_CIK = "0001045810";

export interface SyntheticFilingDefinition {
  /** Stable short id used on the CLI (`--filing <id>`) and in output filenames. */
  id: string;
  /** Filename under apps/server/synthetic/, relative to this file's synthetic/ dir. */
  htmlFile: string;
  /** Human-readable one-line description, printed by runSynthetic.ts. */
  description: string;
  accessionNumber: string;
}

export const SYNTHETIC_FILINGS: Record<string, SyntheticFilingDefinition> = {
  "nvdax-grave-bankruptcy": {
    id: "nvdax-grave-bankruptcy",
    htmlFile: "nvdax-8k-grave-bankruptcy.html",
    description:
      "POSITIVE ARM: fabricated Item 1.03 bankruptcy 8-K, designed to drive a maximum-severity, high-agreement path through the pipeline.",
    accessionNumber: "SYNTHETIC-P4.4-0001",
  },
  "nvdax-nonmaterial-annual-meeting": {
    id: "nvdax-nonmaterial-annual-meeting",
    htmlFile: "nvdax-8k-nonmaterial-annual-meeting.html",
    description:
      "NEGATIVE CONTROL: fabricated Item 5.07 annual-meeting-results 8-K with no clean mapping in the 12-value EVENT_TYPES enum, designed to produce genuine 3-way eventType disagreement and readyToPost=false.",
    accessionNumber: "SYNTHETIC-P4.4-0002",
  },
};

export interface LoadedSyntheticFiling {
  filing: FilingRecord;
  rawHtml: string;
}

/**
 * Loads a synthetic filing definition by id, reading its HTML file from disk and building
 * the matching `FilingRecord`. `acceptanceDateTime` is stamped at load time (run time) —
 * there is no real EDGAR acceptance timestamp for a fabricated document.
 */
export function loadSyntheticFiling(id: string): LoadedSyntheticFiling {
  const def = SYNTHETIC_FILINGS[id];
  if (!def) {
    throw new Error(
      `Unknown synthetic filing id "${id}". Known ids: ${Object.keys(SYNTHETIC_FILINGS).join(", ")}`,
    );
  }

  const htmlPath = join(SYNTHETIC_DIR, def.htmlFile);
  const rawHtml = readFileSync(htmlPath, "utf8");

  const now = new Date().toISOString();

  const filing: FilingRecord = {
    ticker: "NVDA",
    tokenSymbol: "NVDAx",
    cik: NVDA_CIK,
    form: "8-K",
    accessionNumber: def.accessionNumber,
    filingDate: now.slice(0, 10),
    acceptanceDateTime: now,
    primaryDocument: def.htmlFile,
    primaryDocDescription: "SYNTHETIC — fabricated for AFTERHOURS task P4.4, not an SEC filing.",
    documentUrl: `synthetic://afterhours/P4.4/${def.htmlFile}`,
  };

  return { filing, rawHtml };
}
