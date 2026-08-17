/**
 * End-to-end orchestration: poll → strip → 3x parse → diff → grade → (stub) post.
 *
 * This wires together P1.1-P1.5 into one callable pipeline per filing. It does NOT post
 * anywhere on-chain — that's a different executor's task (the EventState registry
 * contract, P1.6-P1.9). `postToRegistry()` below is a clearly-marked stub that logs what
 * WOULD be posted and returns immediately; wiring it to a real contract call is out of
 * scope here.
 *
 * Run standalone against one real filing: `tsx src/pipeline.ts <ticker> <accessionNumber>`
 * (requires GEMINI_API_KEY to actually run the LLM steps — see src/llm/provider.ts).
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

export interface PipelineResult {
  filing: FilingRecord;
  contentHash: string;
  strippedTextLength: number;
  agreement: AgreementReport;
  severityGrade: SeverityGradeResult;
}

/** Runs P1.2-P1.5 for one already-fetched filing record. */
export async function runPipelineForFiling(filing: FilingRecord): Promise<PipelineResult> {
  const rawHtml = await fetchFilingDocument(filing);
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
    agreement,
    severityGrade,
  };
}

/**
 * STUB — logs the record that would be posted on-chain and returns without doing
 * anything else. Wiring this to the real EventState registry contract is a different
 * executor's task (P1.6-P1.9). Deliberately does not import any chain/RPC client.
 */
export function postToRegistry(result: PipelineResult): { posted: false; reason: string } {
  console.log("[pipeline] STUB postToRegistry — NOT actually posting on-chain. Would post:");
  console.log(
    JSON.stringify(
      {
        token: result.filing.tokenSymbol,
        form: result.filing.form,
        accessionNumber: result.filing.accessionNumber,
        acceptanceDateTime: result.filing.acceptanceDateTime,
        sourceUrl: result.filing.documentUrl,
        contentHash: result.contentHash,
        readyToPost: result.agreement.readyToPost,
        flaggedForReview: result.agreement.flaggedForReview,
        severity: result.severityGrade.grade.severity,
        direction: result.severityGrade.grade.direction,
      },
      null,
      2,
    ),
  );
  return { posted: false, reason: "postToRegistry is a stub — real on-chain posting is a separate task (P1.6-P1.9)" };
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
      postToRegistry(result);
    })
    .catch((err) => {
      console.error("[pipeline] failed:", err);
      process.exit(1);
    });
}
