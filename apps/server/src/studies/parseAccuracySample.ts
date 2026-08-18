/**
 * P2.1 — Parse-accuracy sample study.
 *
 * Full method pre-registered in
 * docs/buildx-orion-2026/outputs/05-build/parse-accuracy-study.md — read that file
 * before changing anything here. Summary: pull a deterministic, systematic 30-filing
 * sample out of the ~171-filing 8-K universe (10 tracked tickers, trailing year), run
 * `parseFilingThreeWays()` against each, and score the three independent parses against
 * four pre-registered accuracy tiers (A: deterministic EDGAR checks, B: item-code weak
 * label, C: n=8 manual spot-check, D: inter-model agreement rate).
 *
 * This module is deliberately chain-free and does NOT call `runPipelineForFiling()` —
 * it composes `fetchFilingDocument → stripFilingHtml → parseFilingThreeWays →
 * buildAgreementReport` directly, skipping P1.5's severity grade (no ground truth for
 * severity by construction; running it would just burn 30 extra Gemini calls).
 *
 * Two independent concerns live in this file, and it's important not to conflate them:
 *
 *  1. `buildUniverse()` / `selectSample()` — the sample-selection ALGORITHM, exactly as
 *     pre-registered in parse-accuracy-study.md §2.1. Calling these against live EDGAR
 *     data on a day other than when the sample was frozen can legitimately produce a
 *     DIFFERENT 30-filing selection than the frozen one, because the universe is
 *     ever-growing (new 8-Ks get filed every day). This is expected, not a bug — see
 *     the "Universe verification" section of the study doc for a concrete instance of
 *     this happening one day after the sample was frozen. These two functions exist so
 *     that drift can be detected (`--verify-sample`), not so the actual batch runs
 *     re-derive their filing list from them.
 *
 *  2. `loadFrozenSample()` / `runFiling()` / `processSample()` — the ACTUAL operational
 *     path. Batch runs always read the frozen, already-selected 30 rows out of
 *     `docs/buildx-orion-2026/outputs/05-build/data/p2_1_sample.json` (which was written
 *     once, by hand, transcribing the pre-registered §2.2 table, then enriched with
 *     `primaryDocument`/`acceptanceDateTime` looked up live against EDGAR on the day the
 *     sample was frozen). This is what stays stable across every future resumed run.
 *
 * CLI usage:
 *   tsx src/studies/parseAccuracySample.ts --start 0 --stop 6
 *     Runs the frozen sample's rows [0, 6) sequentially against the real Gemini API
 *     (requires GEMINI_API_KEY). Appends one JSONL row per filing to
 *     data/p2_1_parse_accuracy_raw.jsonl immediately after each filing completes, so a
 *     killed/interrupted run can be resumed with a later --start.
 *   tsx src/studies/parseAccuracySample.ts --verify-sample
 *     Diagnostic-only mode: rebuilds the universe and sample from live EDGAR data RIGHT
 *     NOW and compares it against the pre-registered counts/SHA-256. Makes EDGAR HTTP
 *     calls only — no Gemini calls, no quota cost, safe to run any time. Does not touch
 *     the frozen sample file or process any filing.
 *
 * Env var `P2_1_FILING_DELAY_MS` (default 20000ms) sets the sleep between filings.
 * Filings are always processed strictly sequentially (never in parallel) — this is a
 * deliberate quota-conservation choice, not a performance oversight.
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LanguageModel } from "ai";

import { TRACKED_TICKERS } from "../config/tickers.js";
import { getEdgarUserAgent, fetchFilingDocument, documentUrl } from "../edgar/client.js";
import { stripFilingHtml } from "../parsing/stripFilingHtml.js";
import {
  parseFilingThreeWays,
  withRetry,
  type FilingParseContext,
  type GenerateObjectFn,
  type ParseAttemptResult,
  type RetryOptions,
} from "../llm/parseFiling.js";
import { buildAgreementReport, type AgreementReport } from "../diff/agreement.js";
import type { FilingRecord } from "../types.js";
import { getGeminiModelId } from "../llm/provider.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/server/src/studies -> repo root is 4 levels up.
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const OUTPUTS_DIR = path.join(REPO_ROOT, "docs/buildx-orion-2026/outputs/05-build");
const DATA_DIR = path.join(OUTPUTS_DIR, "data");
export const SAMPLE_PATH = path.join(DATA_DIR, "p2_1_sample.json");
export const RAW_JSONL_PATH = path.join(DATA_DIR, "p2_1_parse_accuracy_raw.jsonl");

// ---------------------------------------------------------------------------
// Pre-registered constants (parse-accuracy-study.md §2.1)
// ---------------------------------------------------------------------------

export const WINDOW_START = "2025-08-17";
export const WINDOW_END = "2026-08-17";

export const EXPECTED_UNIVERSE_COUNT = 171;
export const EXPECTED_PER_TICKER: Record<string, number> = {
  MSTR: 72,
  GOOGL: 18,
  AMZN: 14,
  META: 11,
  NVDA: 11,
  COIN: 10,
  TSLA: 10,
  CRCL: 9,
  AAPL: 8,
  SNDK: 8,
};
export const EXPECTED_SAMPLE_SHA256 = "e228ab2c9f05974d519e8d479ab211434983600a623b047bcc47693cead04ae2";

const MSTR_K = 15;
const NON_MSTR_ALLOCATION: Record<string, number> = {
  GOOGL: 2,
  AMZN: 2,
  META: 2,
  NVDA: 2,
  COIN: 2,
  TSLA: 2,
  CRCL: 1,
  AAPL: 1,
  SNDK: 1,
};

// ---------------------------------------------------------------------------
// 1. Universe / sample-selection algorithm (diagnostic use — see file header)
// ---------------------------------------------------------------------------

/** One 8-K row out of a ticker's `filings.recent`, filtered to the study window. */
export interface UniverseFiling {
  ticker: string;
  cik: string;
  tokenSymbol: string;
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  items: string;
  primaryDocument: string;
  acceptanceDateTime: string;
}

/** Shape of the `filings.recent` fields this study needs that `src/edgar/client.ts` doesn't carry. */
interface StudySubmissionsRecent {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  form: string[];
  items: string[];
  primaryDocument: string[];
}

interface StudySubmissionsResponse {
  cik: string;
  filings: { recent: StudySubmissionsRecent };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches and filters one ticker's 8-K filings within the pre-registered study window.
 * Does its own submissions fetch (rather than reusing `fetchRecentFilings()` from
 * `src/edgar/client.ts`) because it needs `reportDate` and `items`, which that shared
 * client's `FilingRecord` shape doesn't carry.
 */
async function fetchTickerUniverse(ticker: (typeof TRACKED_TICKERS)[number]): Promise<UniverseFiling[]> {
  const userAgent = getEdgarUserAgent();
  const url = `https://data.sec.gov/submissions/CIK${ticker.cik}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`[p2_1] submissions fetch failed for ${ticker.ticker}: HTTP ${res.status} ${res.statusText} — ${url}`);
  }
  const data = (await res.json()) as StudySubmissionsResponse;
  const recent = data.filings?.recent;
  if (!recent || !Array.isArray(recent.form)) {
    throw new Error(`[p2_1] submissions response for ${ticker.ticker} is missing filings.recent`);
  }

  const out: UniverseFiling[] = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== "8-K") continue;
    const filingDate = recent.filingDate[i];
    if (filingDate < WINDOW_START || filingDate > WINDOW_END) continue;
    out.push({
      ticker: ticker.ticker,
      cik: ticker.cik,
      tokenSymbol: ticker.tokenSymbol,
      accessionNumber: recent.accessionNumber[i],
      filingDate,
      reportDate: recent.reportDate[i],
      items: recent.items[i],
      primaryDocument: recent.primaryDocument[i],
      acceptanceDateTime: recent.acceptanceDateTime[i],
    });
  }
  return out;
}

/**
 * Builds the full study-window 8-K universe across all 10 tracked tickers (live and
 * config-only alike — this study is not limited to P1.1's `live: true` subset). Fetches
 * sequentially with a short politeness delay between tickers, matching the pattern used
 * by the P2.2 reaction-latency study.
 */
export async function buildUniverse(): Promise<UniverseFiling[]> {
  const out: UniverseFiling[] = [];
  for (const ticker of TRACKED_TICKERS) {
    const rows = await fetchTickerUniverse(ticker);
    out.push(...rows);
    await sleep(150);
  }
  return out;
}

function sortByFilingDateThenAccession<T extends { filingDate: string; accessionNumber: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    a.filingDate === b.filingDate ? a.accessionNumber.localeCompare(b.accessionNumber) : a.filingDate.localeCompare(b.filingDate),
  );
}

function systematicIndices(n: number, k: number): number[] {
  const idxs: number[] = [];
  for (let i = 0; i < k; i++) idxs.push(Math.floor((i * n) / k));
  return idxs;
}

/**
 * Deterministic systematic-sampling selection per parse-accuracy-study.md §2.1 steps
 * 3-7. No RNG, no seed — same universe in, same 30 rows out, always.
 */
export function selectSample(universe: UniverseFiling[]): UniverseFiling[] {
  const byTicker = new Map<string, UniverseFiling[]>();
  for (const row of universe) {
    const list = byTicker.get(row.ticker) ?? [];
    list.push(row);
    byTicker.set(row.ticker, list);
  }
  for (const [ticker, rows] of byTicker) byTicker.set(ticker, sortByFilingDateThenAccession(rows));

  const picked: UniverseFiling[] = [];

  const mstrRows = byTicker.get("MSTR") ?? [];
  for (const idx of systematicIndices(mstrRows.length, MSTR_K)) picked.push(mstrRows[idx]);

  for (const [ticker, k] of Object.entries(NON_MSTR_ALLOCATION)) {
    const rows = byTicker.get(ticker) ?? [];
    for (const idx of systematicIndices(rows.length, k)) picked.push(rows[idx]);
  }

  return sortByFilingDateThenAccession(picked);
}

/** SHA-256 of the sample's accession numbers, joined by `|`, in sort order. */
export function computeSampleSha256(sample: UniverseFiling[]): string {
  const joined = sample.map((s) => s.accessionNumber).join("|");
  return createHash("sha256").update(joined, "utf8").digest("hex");
}

export interface GuardRailReport {
  actualCount: number;
  expectedCount: number;
  countMatches: boolean;
  actualPerTicker: Record<string, number>;
  expectedPerTicker: Record<string, number>;
  perTickerMatches: boolean;
  mismatches: string[];
}

/** Non-throwing comparison of a live-built universe against the pre-registered counts. */
export function checkUniverseGuardRail(universe: UniverseFiling[]): GuardRailReport {
  const actualPerTicker: Record<string, number> = {};
  for (const f of universe) actualPerTicker[f.ticker] = (actualPerTicker[f.ticker] ?? 0) + 1;

  const mismatches: string[] = [];
  for (const ticker of Object.keys(EXPECTED_PER_TICKER)) {
    const expected = EXPECTED_PER_TICKER[ticker];
    const actual = actualPerTicker[ticker] ?? 0;
    if (expected !== actual) {
      mismatches.push(`${ticker}: expected ${expected}, actual ${actual} (diff ${actual - expected > 0 ? "+" : ""}${actual - expected})`);
    }
  }

  return {
    actualCount: universe.length,
    expectedCount: EXPECTED_UNIVERSE_COUNT,
    countMatches: universe.length === EXPECTED_UNIVERSE_COUNT,
    actualPerTicker,
    expectedPerTicker: EXPECTED_PER_TICKER,
    perTickerMatches: mismatches.length === 0,
    mismatches,
  };
}

export interface SampleIntegrityReport {
  actualSha256: string;
  expectedSha256: string;
  matches: boolean;
  actualAccessions: string[];
}

/** Non-throwing comparison of a live-selected sample's SHA-256 against the pre-registered value. */
export function checkSampleIntegrity(sample: UniverseFiling[]): SampleIntegrityReport {
  return {
    actualSha256: computeSampleSha256(sample),
    expectedSha256: EXPECTED_SAMPLE_SHA256,
    matches: computeSampleSha256(sample) === EXPECTED_SAMPLE_SHA256,
    actualAccessions: sample.map((s) => s.accessionNumber),
  };
}

// ---------------------------------------------------------------------------
// 2. Frozen sample (operational path — see file header)
// ---------------------------------------------------------------------------

export interface FrozenSampleRow {
  index: number;
  ticker: string;
  filingDate: string;
  accessionNumber: string;
  reportDate: string;
  items: string;
  cik: string;
  tokenSymbol: string;
  primaryDocument: string;
  acceptanceDateTime: string;
}

interface FrozenSampleFile {
  _meta: Record<string, string>;
  rows: FrozenSampleRow[];
}

/** Loads the frozen 30-row sample from `data/p2_1_sample.json`. This is the operational source of truth for `processSample()`. */
export function loadFrozenSample(samplePath: string = SAMPLE_PATH): FrozenSampleRow[] {
  const raw = readFileSync(samplePath, "utf8");
  const parsed = JSON.parse(raw) as FrozenSampleFile;
  if (!Array.isArray(parsed.rows) || parsed.rows.length !== 30) {
    throw new Error(`[p2_1] frozen sample at ${samplePath} does not have exactly 30 rows (got ${parsed.rows?.length})`);
  }
  return parsed.rows;
}

// ---------------------------------------------------------------------------
// 3. Ground-truth checks (Tier A — parse-accuracy-study.md §2.3)
// ---------------------------------------------------------------------------

export interface AttemptGroundTruth {
  attempt: number;
  /** A1: parsed affectedToken equals the filer's ticker's tokenSymbol. null if this attempt failed. */
  a1AffectedTokenCorrect: boolean | null;
  /** A2: parsed effectiveDates array contains EDGAR's reportDate. null if this attempt failed. */
  a2EffectiveDatesContainsReportDate: boolean | null;
}

export interface GroundTruthResult {
  perAttempt: AttemptGroundTruth[];
}

/**
 * Tier A deterministic checks — pure function of the sample row's EDGAR-sourced ground
 * truth (`tokenSymbol`, `reportDate`) and the three parse attempts. No LLM call, fully
 * unit-testable with a mocked `attempts` array.
 */
export function groundTruthChecks(row: FrozenSampleRow, attempts: ParseAttemptResult[]): GroundTruthResult {
  const perAttempt: AttemptGroundTruth[] = attempts.map((a) => {
    if (a.status !== "ok") {
      return { attempt: a.attempt, a1AffectedTokenCorrect: null, a2EffectiveDatesContainsReportDate: null };
    }
    return {
      attempt: a.attempt,
      a1AffectedTokenCorrect: a.data.affectedToken === row.tokenSymbol,
      a2EffectiveDatesContainsReportDate: a.data.effectiveDates.includes(row.reportDate),
    };
  });
  return { perAttempt };
}

// ---------------------------------------------------------------------------
// 4. runFiling — one filing, one pass (fetch -> strip -> 3x parse -> diff -> ground truth)
// ---------------------------------------------------------------------------

export interface RunFilingResult {
  documentFetchStatus: "ok" | "document_fetch_failed";
  documentFetchError?: string;
  strippedTextLength?: number;
  attempts?: ParseAttemptResult[];
  agreement?: AgreementReport;
  groundTruth?: GroundTruthResult;
}

export interface RunFilingOpts {
  retryOptions: RetryOptions;
  /** Injectable for testing — see test/parseAccuracySample.test.ts. Never set in real batch runs. */
  generateFn?: GenerateObjectFn;
  model?: LanguageModel;
  /** Injectable for testing — bypasses the real EDGAR document fetch. */
  fetchDocumentFn?: (filing: FilingRecord) => Promise<string>;
}

/**
 * Runs ONE full pass over one filing: fetch document (3 attempts w/ backoff, per
 * parse-accuracy-study.md §2.5) -> strip HTML -> three independent LLM parses ->
 * agreement report -> Tier A ground-truth checks. Never throws for document-fetch or
 * parse failures — those are captured in the returned result's status fields, per the
 * pre-registered failure-handling rules. Deliberately does NOT call
 * `runPipelineForFiling()` (that also runs P1.5's severity grade, out of scope here).
 */
export async function runFiling(row: FrozenSampleRow, opts: RunFilingOpts): Promise<RunFilingResult> {
  const filing: FilingRecord = {
    ticker: row.ticker,
    tokenSymbol: row.tokenSymbol,
    cik: row.cik,
    form: "8-K",
    accessionNumber: row.accessionNumber,
    filingDate: row.filingDate,
    acceptanceDateTime: row.acceptanceDateTime,
    primaryDocument: row.primaryDocument,
    primaryDocDescription: null,
    documentUrl: documentUrl(row.cik, row.accessionNumber, row.primaryDocument),
  };

  const fetchDocumentFn = opts.fetchDocumentFn ?? fetchFilingDocument;

  let rawHtml: string;
  try {
    rawHtml = await withRetry(() => fetchDocumentFn(filing), { retries: 2, delayMs: 2000 });
  } catch (err) {
    return {
      documentFetchStatus: "document_fetch_failed",
      documentFetchError: err instanceof Error ? err.message : String(err),
    };
  }

  const stripped = stripFilingHtml(rawHtml);
  const ctx: FilingParseContext = {
    ticker: row.ticker,
    form: "8-K",
    filingDate: row.filingDate,
    accessionNumber: row.accessionNumber,
  };

  const attempts = await parseFilingThreeWays(stripped.text, ctx, {
    retryOptions: opts.retryOptions,
    generateFn: opts.generateFn,
    model: opts.model,
  });
  const agreement = buildAgreementReport(attempts);
  const groundTruth = groundTruthChecks(row, attempts);

  return {
    documentFetchStatus: "ok",
    strippedTextLength: stripped.strippedLength,
    attempts,
    agreement,
    groundTruth,
  };
}

// ---------------------------------------------------------------------------
// 5. processSample — pass 1 + gap-fill orchestration + JSONL append (§2.5)
// ---------------------------------------------------------------------------

export interface RawFilingOutcome {
  index: number;
  ticker: string;
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  items: string;
  pass1: RunFilingResult;
  /** 0-2 entries. Each is a fresh, self-contained pass — never merged with pass1 or with each other. */
  gapFillPasses: RunFilingResult[];
  /** The last pass run for this filing (pass1 if no gap-fill was needed). */
  finalResult: RunFilingResult;
  /** Which Gemini model actually produced this row (`getGeminiModelId()` at call time) —
   * recorded per-row, not assumed constant, because this session's daily free-tier quota
   * forced switching models mid-collection. A row's accuracy score is only comparable to
   * another row scored against the same model; never silently treat this field as constant
   * across the sample. */
  geminiModel: string;
}

const PASS1_RETRY_OPTIONS: RetryOptions = { retries: 4, delayMs: 5000 };
const GAP_FILL_RETRY_OPTIONS: RetryOptions = { retries: 6, delayMs: 15000 };
const MAX_GAP_FILL_PASSES = 2;

function needsGapFill(result: RunFilingResult): boolean {
  return result.documentFetchStatus === "ok" && (result.agreement?.successfulParseCount ?? 0) < 3;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function appendJsonlRow(outcome: RawFilingOutcome): void {
  ensureDataDir();
  appendFileSync(RAW_JSONL_PATH, JSON.stringify(outcome) + "\n", "utf8");
}

export interface ProcessSampleOpts {
  start: number;
  stop: number;
  delayMs: number;
  runFilingOverride?: (row: FrozenSampleRow, opts: RunFilingOpts) => Promise<RunFilingResult>;
  /** Suppresses the JSONL append — used by tests. Real runs always append. */
  skipAppend?: boolean;
}

/**
 * Processes frozen-sample rows in [start, stop), strictly sequentially, with pass-1 +
 * up-to-2-gap-fill-pass handling per §2.5. Appends one JSONL row per filing immediately
 * after it completes, so an interrupted run can resume with a later `--start`.
 */
export async function processSample(rows: FrozenSampleRow[], opts: ProcessSampleOpts): Promise<RawFilingOutcome[]> {
  const runFn = opts.runFilingOverride ?? runFiling;
  const slice = rows.filter((r) => r.index >= opts.start && r.index < opts.stop);
  const outcomes: RawFilingOutcome[] = [];

  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    console.log(`[p2_1] [${row.index}] ${row.ticker} ${row.accessionNumber} — pass 1...`);
    let result = await runFn(row, { retryOptions: PASS1_RETRY_OPTIONS });
    const pass1 = result;
    const gapFillPasses: RunFilingResult[] = [];

    while (needsGapFill(result) && gapFillPasses.length < MAX_GAP_FILL_PASSES) {
      console.log(
        `[p2_1] [${row.index}] successfulParseCount=${result.agreement?.successfulParseCount} < 3 — gap-fill pass ${gapFillPasses.length + 1}...`,
      );
      result = await runFn(row, { retryOptions: GAP_FILL_RETRY_OPTIONS });
      gapFillPasses.push(result);
    }

    const outcome: RawFilingOutcome = {
      index: row.index,
      ticker: row.ticker,
      accessionNumber: row.accessionNumber,
      filingDate: row.filingDate,
      reportDate: row.reportDate,
      items: row.items,
      pass1,
      gapFillPasses,
      finalResult: result,
      geminiModel: getGeminiModelId(),
    };
    outcomes.push(outcome);
    if (!opts.skipAppend) appendJsonlRow(outcome);

    console.log(
      `[p2_1] [${row.index}] done. documentFetchStatus=${result.documentFetchStatus} successfulParseCount=${
        result.agreement?.successfulParseCount ?? "n/a"
      } gapFillPasses=${gapFillPasses.length}`,
    );

    if (i < slice.length - 1) await sleep(opts.delayMs);
  }

  return outcomes;
}

// ---------------------------------------------------------------------------
// 6. CLI entrypoint
// ---------------------------------------------------------------------------

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function getFilingDelayMs(): number {
  const raw = process.env.P2_1_FILING_DELAY_MS;
  if (!raw) return 20000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`P2_1_FILING_DELAY_MS must be a non-negative number, got: "${raw}"`);
  }
  return parsed;
}

async function verifySampleAgainstLiveEdgar(): Promise<void> {
  console.log(`[p2_1] --verify-sample: rebuilding universe from live EDGAR (window ${WINDOW_START}..${WINDOW_END})...`);
  console.log("[p2_1] this makes EDGAR HTTP calls only — no Gemini calls, no quota cost.");
  const universe = await buildUniverse();
  const guardRail = checkUniverseGuardRail(universe);
  console.log("\n=== Universe guard rail ===");
  console.log(JSON.stringify(guardRail, null, 2));

  const sample = selectSample(universe);
  const integrity = checkSampleIntegrity(sample);
  console.log("\n=== Sample integrity (live selectSample() vs pre-registered SHA-256) ===");
  console.log(JSON.stringify(integrity, null, 2));

  if (!guardRail.countMatches || !guardRail.perTickerMatches) {
    console.warn(
      "\n[p2_1] WARNING: live universe does not match the pre-registered guard rail. " +
        "This is expected if the universe has grown since the sample was frozen (see " +
        "parse-accuracy-study.md 'Universe verification'). The frozen sample file " +
        `(${SAMPLE_PATH}) is unaffected by this — it is NOT regenerated by this command.`,
    );
  }
  if (!integrity.matches) {
    console.warn(
      "\n[p2_1] WARNING: live selectSample() SHA-256 does not match the pre-registered value. " +
        "The frozen sample file is unaffected by this check — batch runs read from it, not " +
        "from a fresh selectSample() call.",
    );
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);

  if (args.includes("--verify-sample")) {
    verifySampleAgainstLiveEdgar().catch((err) => {
      console.error("[p2_1] --verify-sample failed:", err);
      process.exit(1);
    });
  } else {
    const start = Number(getArgValue(args, "--start") ?? "0");
    const stop = Number(getArgValue(args, "--stop") ?? "30");
    if (!Number.isInteger(start) || !Number.isInteger(stop) || start < 0 || stop < start) {
      console.error(`Usage: tsx src/studies/parseAccuracySample.ts --start <n> --stop <m>  (0 <= start <= stop <= 30)`);
      process.exit(1);
    }

    const frozen = loadFrozenSample();
    const delayMs = getFilingDelayMs();
    console.log(`[p2_1] processing frozen sample rows [${start}, ${stop}) — inter-filing delay ${delayMs}ms`);

    processSample(frozen, { start, stop, delayMs })
      .then((outcomes) => {
        console.log(`\n[p2_1] batch [${start}:${stop}) done. ${outcomes.length} filing(s) processed and appended to ${RAW_JSONL_PATH}.`);
      })
      .catch((err) => {
        console.error("[p2_1] batch failed:", err);
        process.exit(1);
      });
  }
}
