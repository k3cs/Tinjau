/**
 * End-to-end off-chain orchestration: poll → strip → 3x parse → diff → grade.
 *
 * This wires together P1.1-P1.5 into one callable pipeline per filing. Deliberately
 * chain-free — this module imports no chain/RPC client, so it stays unit-testable without
 * a private key or network access to X Layer. Actual on-chain posting (mapping this
 * result to `EventStateRegistry.postEvent()` args, bonding, sending the tx, reading the
 * result back) is task P1.8, implemented in `src/chain/postEvent.ts` and
 * `src/chain/mapEventToRegistry.ts` — see `src/chain/runOnce.ts` for the end-to-end
 * entrypoint that calls this pipeline and then posts.
 *
 * Run standalone against one real filing: `tsx src/pipeline.ts <ticker> <accessionNumber>`
 * (requires GEMINI_API_KEY to actually run the LLM steps — see src/llm/provider.ts). This
 * only runs P1.1-P1.5 and prints the result; it does not post on-chain.
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { TRACKED_TICKERS } from "./config/tickers.js";
import { fetchFilingDocument, documentUrl } from "./edgar/client.js";
import { stripFilingHtml } from "./parsing/stripFilingHtml.js";
import { parseFilingThreeWays } from "./llm/parseFiling.js";
import { gradeFilingSeverity, type SeverityGradeResult } from "./llm/gradeFiling.js";
import { buildAgreementReport, type AgreementReport } from "./diff/agreement.js";
import type { FilingRecord } from "./types.js";
import type { ParseAttemptResult } from "./llm/parseFiling.js";

export interface PipelineResult {
  filing: FilingRecord;
  contentHash: string;
  strippedTextLength: number;
  /** All 3 independent P1.3 parse attempts, successes and failures alike — exposed (not
   * just the agreement-diffed summary) so downstream consumers like P1.8's
   * `mapEventToRegistry.ts` can do their own modal-value selection / agreement counting
   * per field without re-casting through `unknown`. */
  attempts: ParseAttemptResult[];
  agreement: AgreementReport;
  severityGrade: SeverityGradeResult;
}

/**
 * Runs P1.2-P1.5 for one already-fetched filing record.
 * @param opts.rawHtml Skip `fetchFilingDocument` and use this HTML instead (P1.8's
 * `--fixture` fallback flag, for SEC rate-limit contingency during a live demo run).
 */
export async function runPipelineForFiling(filing: FilingRecord, opts: { rawHtml?: string } = {}): Promise<PipelineResult> {
  const rawHtml = opts.rawHtml ?? (await fetchFilingDocument(filing));
  const contentHash = createHash("sha256").update(rawHtml, "utf8").digest("hex");
  const { text } = stripFilingHtml(rawHtml);

  const ctx = {
    ticker: filing.ticker,
    form: filing.form,
    filingDate: filing.filingDate,
    accessionNumber: filing.accessionNumber,
  };

  const [attempts, severityGrade] = await Promise.all([
    parseFilingThreeWays(text, ctx),
    gradeFilingSeverity(text, ctx),
  ]);

  const agreement = buildAgreementReport(attempts);

  return {
    filing,
    contentHash,
    strippedTextLength: text.length,
    attempts,
    agreement,
    severityGrade,
  };
}

// Standalone entrypoint: `tsx src/pipeline.ts NVDA 0001193125-26-341297`
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [tickerArg, accessionArg] = process.argv.slice(2);
  if (!tickerArg || !accessionArg) {
    console.error("Usage: tsx src/pipeline.ts <TICKER> <accessionNumber> <primaryDocument> [filingDate] [acceptanceDateTime]");
    process.exit(1);
  }
  const primaryDocument = process.argv[4];
  const filingDate = process.argv[5] ?? new Date().toISOString().slice(0, 10);
  const acceptanceDateTime = process.argv[6] ?? new Date().toISOString();

  const ticker = TRACKED_TICKERS.find((t) => t.ticker === tickerArg);
  if (!ticker || !primaryDocument) {
    console.error(`Unknown ticker "${tickerArg}" or missing primaryDocument argument.`);
    process.exit(1);
  }

  const filing: FilingRecord = {
    ticker: ticker.ticker,
    tokenSymbol: ticker.tokenSymbol,
    cik: ticker.cik,
    form: "8-K",
    accessionNumber: accessionArg,
    filingDate,
    acceptanceDateTime,
    primaryDocument,
    primaryDocDescription: null,
    documentUrl: documentUrl(ticker.cik, accessionArg, primaryDocument),
  };

  runPipelineForFiling(filing)
    .then((result) => {
      // This standalone entrypoint only runs P1.1-P1.5 and prints the result — it does
      // NOT post on-chain. Use `tsx src/chain/runOnce.ts` (P1.8) to poll + pipeline + post.
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error("[pipeline] failed:", err);
      process.exit(1);
    });
}
