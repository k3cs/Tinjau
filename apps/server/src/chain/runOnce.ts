/**
 * P1.8 end-to-end entrypoint: poll EDGAR -> run the P1.2-P1.5 pipeline -> map to
 * `postEvent()` args -> (gate on readyToPost) -> mint/approve bond -> post -> read back and
 * verify -> print a copy-pasteable evidence block.
 *
 * Usage:
 *   tsx src/chain/runOnce.ts --ticker MSTR --accession 0001193125-26-341297 \
 *     [--bond 10] [--dry-run] [--fixture <path>] [--force]
 *
 * Exit code 1 on any read-back mismatch, or on any failure.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { getLiveTickers } from "../config/tickers.js";
import { fetchRecentFilings } from "../edgar/client.js";
import { runPipelineForFiling } from "../pipeline.js";
import { postPipelineResult } from "./postEvent.js";
import { readEventBack } from "./readBack.js";
import { getRegistryAddress, getRpcUrl } from "./client.js";
import type { FilingRecord } from "../types.js";

const EXPLORER_BASE = "https://www.okx.com/web3/explorer/xlayer-test";

/**
 * Known-good sha256 content hashes, keyed by accessionNumber, verified live against both
 * `data.sec.gov` and the committed test fixture on 2026-08-16/17 (see
 * test/fixtures/mstr-8k-2026-08-10.htm). If a fetched document's hash doesn't match here,
 * SEC served something other than what was verified during planning — abort rather than
 * silently posting against different content.
 */
const KNOWN_CONTENT_HASHES: Record<string, string> = {
  "0001193125-26-341297": "b8d705f296596d777bbd7ad2e76e2482808cbf7817febf066f8e2dc43a8e1b58",
};

interface CliArgs {
  ticker: string;
  accession?: string;
  bond: string;
  dryRun: boolean;
  fixture?: string;
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { ticker: "", bond: "10", dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--ticker":
        args.ticker = argv[++i];
        break;
      case "--accession":
        args.accession = argv[++i];
        break;
      case "--bond":
        args.bond = argv[++i];
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--fixture":
        args.fixture = argv[++i];
        break;
      case "--force":
        args.force = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!args.ticker) throw new Error("Usage: tsx src/chain/runOnce.ts --ticker <TICKER> [--accession <accessionNumber>] [--bond <human units>] [--dry-run] [--fixture <path>] [--force]");
  return args;
}

async function selectFiling(ticker: string, accession: string | undefined): Promise<FilingRecord> {
  const trackedTicker = getLiveTickers().find((t) => t.ticker === ticker);
  if (!trackedTicker) {
    throw new Error(`"${ticker}" is not a live-tracked ticker (see src/config/tickers.ts).`);
  }

  console.log(`[runOnce] polling EDGAR for ${ticker} (CIK ${trackedTicker.cik})...`);
  const filings = await fetchRecentFilings(trackedTicker);
  console.log(`[runOnce] EDGAR returned ${filings.length} tracked-form filings for ${ticker}.`);

  let selected: FilingRecord | undefined;
  if (accession) {
    selected = filings.find((f) => f.accessionNumber === accession);
    if (!selected) {
      throw new Error(
        `No filing with accessionNumber "${accession}" found in ${ticker}'s recent filings ` +
          `(found: ${filings.map((f) => f.accessionNumber).join(", ") || "none"}). Refusing to synthesize a FilingRecord.`,
      );
    }
  } else {
    selected = filings.filter((f) => f.form === "8-K").sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1))[0];
    if (!selected) {
      throw new Error(`No 8-K filings found for ${ticker}.`);
    }
  }
  return selected;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bondAmountBaseUnits = BigInt(Math.round(Number(args.bond) * 1_000_000));

  const filing = await selectFiling(args.ticker, args.accession);
  console.log(`[runOnce] selected filing: ${filing.form} ${filing.accessionNumber} accepted=${filing.acceptanceDateTime}`);
  console.log(`[runOnce] documentUrl: ${filing.documentUrl}`);

  const rawHtml = args.fixture ? readFileSync(args.fixture, "utf8") : undefined;
  if (args.fixture) {
    console.log(`[runOnce] --fixture set — using local file instead of a live EDGAR document fetch: ${args.fixture}`);
  }

  console.log(`[runOnce] running pipeline (fetch -> sha256 -> strip -> 3x parse ∥ grade -> diff)...`);
  const result = await runPipelineForFiling(filing, { rawHtml });

  console.log(`[runOnce] contentHash: ${result.contentHash}`);
  const knownHash = KNOWN_CONTENT_HASHES[filing.accessionNumber];
  if (knownHash) {
    if (result.contentHash !== knownHash) {
      throw new Error(
        `contentHash mismatch for accession ${filing.accessionNumber}: fetched ${result.contentHash}, ` +
          `expected ${knownHash} (verified live during P1.8 planning). Aborting rather than posting ` +
          `against unexpected content — SEC may have re-served an amended/different document.`,
      );
    }
    console.log(`[runOnce] contentHash matches known-good value for this accession.`);
  } else {
    console.log(`[runOnce] no known-good contentHash on file for accession ${filing.accessionNumber} — skipping hash-pin check.`);
  }
  console.log(`[runOnce] readyToPost: ${result.agreement.readyToPost}, flagReasons: ${JSON.stringify(result.agreement.flagReasons)}`);
  console.log(`[runOnce] successfulParseCount: ${result.agreement.successfulParseCount}/${result.agreement.totalAttempts}`);
  console.log(`[runOnce] severityGrade: ${result.severityGrade.grade.severity} / ${result.severityGrade.grade.direction}`);

  const outcome = await postPipelineResult(result, {
    bondAmountBaseUnits,
    force: args.force,
    dryRun: args.dryRun,
    network: "testnet",
  });

  console.log(`\n[runOnce] mapped postEvent() args:`);
  console.log(JSON.stringify(outcome.args, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  if (outcome.dryRun) {
    console.log(`\n[runOnce] --dry-run set — stopping before any transaction.`);
    return;
  }

  console.log(`\n[runOnce] reading back and verifying...`);
  const readBack = await readEventBack(outcome.eventId, outcome.args);

  console.log(`\n[runOnce] read-back results:`);
  for (const c of readBack.checks) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.field}`);
    if (!c.pass) {
      console.log(`        expected: ${stringifyMaybeBigint(c.expected)}`);
      console.log(`        actual:   ${stringifyMaybeBigint(c.actual)}`);
    }
  }

  const registryAddress = getRegistryAddress();
  console.log(`\n=== EVIDENCE BLOCK (P1.8) ===`);
  console.log(`rpcUrl: ${getRpcUrl()}`);
  console.log(`registry: ${registryAddress}`);
  console.log(`eventId: ${outcome.eventId}`);
  console.log(`contentHash: 0x${result.contentHash}`);
  console.log(`postTxHash: ${outcome.postTxHash}`);
  console.log(`postTxExplorer: ${EXPLORER_BASE}/tx/${outcome.postTxHash}`);
  if (outcome.mintTxHash) {
    console.log(`mintTxHash: ${outcome.mintTxHash}`);
    console.log(`mintTxExplorer: ${EXPLORER_BASE}/tx/${outcome.mintTxHash}`);
  }
  if (outcome.approveTxHash) {
    console.log(`approveTxHash: ${outcome.approveTxHash}`);
    console.log(`approveTxExplorer: ${EXPLORER_BASE}/tx/${outcome.approveTxHash}`);
  }
  console.log(`gasUsed: ${outcome.gasUsed}`);
  console.log(`bondAmountBaseUnits: ${bondAmountBaseUnits}`);
  console.log(`readBack.allPass: ${readBack.allPass}`);
  console.log(`=== END EVIDENCE BLOCK ===\n`);

  if (!readBack.allPass) {
    console.error(`[runOnce] read-back verification FAILED — see above.`);
    process.exit(1);
  }
}

function stringifyMaybeBigint(v: unknown): string {
  return JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val));
}

main().catch((err) => {
  console.error("[runOnce] failed:", err);
  process.exit(1);
});
