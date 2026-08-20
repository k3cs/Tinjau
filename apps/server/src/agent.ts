/**
 * AFTERHOURS autonomous agent process (task P0.11).
 *
 * Wires together the EDGAR poller (P1.1, `src/edgar/poller.ts`), the off-chain pipeline
 * (P1.2-P1.5, `src/pipeline.ts`), and the on-chain poster (P1.8, `src/chain/postEvent.ts`)
 * into one long-running supervised process. Intended to run under systemd as
 * `afterhours-agent.service` — see docs/buildx-orion-2026 P0.11 for the deployment plan.
 *
 * Safety properties this file is responsible for:
 *
 *  - COLD-START SEAL (the single most important correctness property here). On first
 *    run — no `${STATE_DIR}/edgar/seen-accessions.json` yet — this process polls EDGAR
 *    exactly once, marks EVERY filing currently returned as "seen" WITHOUT running any of
 *    them through the pipeline, and persists that before anything else happens. Only
 *    filings that first appear on a LATER poll are ever processed. Getting this wrong
 *    means the very first run would attempt the pipeline against the entire recent EDGAR
 *    history for the tracked tickers (~900-1200 filings) — thousands of wasted Gemini
 *    calls and (in `live` post mode) hundreds of garbage on-chain posts.
 *  - INDEPENDENT AGE CUTOFF. Even a filing not yet in the seen-set is skipped (and
 *    marked seen without processing) if its `acceptanceDateTime` is older than
 *    `TINJAU_MAX_FILING_AGE_MS` — a second, independent safety net in case the state
 *    file is ever lost or reset.
 *  - SEQUENTIAL PROCESSING ONLY. Filings are processed one at a time (`for...of` with
 *    `await`), never with `Promise.all` across filings — the Gemini quota is a hard
 *    20-requests/day cap and each filing costs 4 calls (3x independent parse + 1x
 *    severity grade — see `runPipelineForFiling` in `src/pipeline.ts`).
 *  - DAILY LLM CALL BUDGET GUARD. A persisted, UTC-date-stamped counter is checked
 *    before each filing is processed. On exhaustion the filing is appended to
 *    `${STATE_DIR}/edgar/deferred.json` (NOT marked seen) and logged at `error` level so
 *    it shows up in `journalctl -p err`; it will be retried once the daily budget resets.
 *  - MARK-SEEN-AFTER, NOT BEFORE. Unlike `poller.ts`'s `createPoller` (which marks
 *    filings seen before awaiting the caller's handler), this process only marks a
 *    filing seen once it has been fully processed without throwing — so a transient
 *    failure (network blip, LLM timeout, etc.) is retried on the next tick instead of
 *    being silently dropped forever.
 *  - POST-MODE GATE. `TINJAU_POST_MODE` is `dry-run` or `live`. In `dry-run` (what
 *    this deployment runs), the full pipeline (poll -> strip -> parse -> diff -> grade)
 *    executes normally but `postPipelineResult()` is never called — no testnet gas is
 *    spent and nothing is posted on-chain. Every result is still archived to
 *    `${STATE_DIR}/pipeline/<accessionNumber>.json` regardless of mode.
 *  - CRASH ISOLATION. The whole per-filing handler runs inside try/catch inside the
 *    tick loop — an uncaught rejection from one filing can never crash the process, and
 *    `main()` itself is wrapped so any startup/tick-scheduling failure exits cleanly with
 *    a logged error instead of an unhandled rejection.
 *  - GRACEFUL SIGTERM. On SIGTERM the interval timer is cleared immediately; if a tick
 *    is mid-flight, we wait for it to finish (state writes are synchronous
 *    write-to-temp-then-rename, so nothing can be caught half-written) before flushing
 *    state one more time and exiting 0. This is what makes `systemctl restart` safe.
 *
 * Run standalone: `tsx src/agent.ts` (requires EDGAR_USER_AGENT, GEMINI_API_KEY,
 * POSTER_PRIVATE_KEY, TINJAU_STATE_DIR in the environment — see
 * `/opt/afterhours/env/*.env` on the VPS, or a local `.env` for dev).
 */

import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pollOnce } from "./edgar/poller.js";
import { runPipelineForFiling, type PipelineResult } from "./pipeline.js";
import { postPipelineResult } from "./chain/postEvent.js";
import type { FilingRecord } from "./types.js";

// ---------------------------------------------------------------------------
// Config — fail fast on anything missing, before any I/O happens.
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[agent] missing required env var: ${name} — refusing to start.`);
  }
  return v;
}

// Fail-fast assertions. Order matters only in that all four must be checked before any
// network/file I/O below.
requireEnv("EDGAR_USER_AGENT");
requireEnv("GEMINI_API_KEY");
requireEnv("POSTER_PRIVATE_KEY");
const STATE_DIR = requireEnv("TINJAU_STATE_DIR");

const POLL_INTERVAL_MS = Number(process.env.EDGAR_POLL_INTERVAL_MS ?? 300_000);
const POST_MODE = (process.env.TINJAU_POST_MODE ?? "dry-run").trim();
const DAILY_LLM_CALL_BUDGET = Number(process.env.TINJAU_DAILY_LLM_CALL_BUDGET ?? 12);
const MAX_FILING_AGE_MS = Number(process.env.TINJAU_MAX_FILING_AGE_MS ?? 86_400_000);
const BOND_AMOUNT_USDT0 = Number(process.env.BOND_AMOUNT_USDT0 ?? 10);

if (POST_MODE !== "dry-run" && POST_MODE !== "live") {
  throw new Error(`[agent] TINJAU_POST_MODE must be "dry-run" or "live", got: "${POST_MODE}"`);
}
if (!Number.isFinite(POLL_INTERVAL_MS) || POLL_INTERVAL_MS <= 0) {
  throw new Error(`[agent] EDGAR_POLL_INTERVAL_MS must be a positive number, got: "${process.env.EDGAR_POLL_INTERVAL_MS}"`);
}
if (!Number.isFinite(DAILY_LLM_CALL_BUDGET) || DAILY_LLM_CALL_BUDGET < 0) {
  throw new Error(`[agent] TINJAU_DAILY_LLM_CALL_BUDGET must be a non-negative number, got: "${process.env.TINJAU_DAILY_LLM_CALL_BUDGET}"`);
}
if (!Number.isFinite(MAX_FILING_AGE_MS) || MAX_FILING_AGE_MS <= 0) {
  throw new Error(`[agent] TINJAU_MAX_FILING_AGE_MS must be a positive number, got: "${process.env.TINJAU_MAX_FILING_AGE_MS}"`);
}

/** 3x independent parse + 1x severity grade, run per filing by `runPipelineForFiling`. */
const LLM_CALLS_PER_FILING = 4;

// ---------------------------------------------------------------------------
// State paths (all under TINJAU_STATE_DIR, pre-created by the deploy script)
// ---------------------------------------------------------------------------

const SEEN_PATH = join(STATE_DIR, "edgar", "seen-accessions.json");
const DEFERRED_PATH = join(STATE_DIR, "edgar", "deferred.json");
const BUDGET_PATH = join(STATE_DIR, "edgar", "llm-budget.json");
const PIPELINE_DIR = join(STATE_DIR, "pipeline");
const HEARTBEAT_PATH = join(STATE_DIR, "health", "agent-heartbeat.json");

// ---------------------------------------------------------------------------
// Atomic JSON read/write helpers — write-to-temp-then-rename so a crash mid-write
// never leaves a corrupt/partial state file on disk.
// ---------------------------------------------------------------------------

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (err) {
    console.error(`[agent] failed to parse ${path}, using fallback:`, err);
    return fallback;
  }
}

function writeJsonAtomic(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp-${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  renameSync(tmpPath, path);
}

// ---------------------------------------------------------------------------
// Seen-set state
// ---------------------------------------------------------------------------

interface SeenState {
  accessionNumbers: string[];
  /** ISO timestamp of the cold-start seal, if one has happened. Logging/debugging only. */
  sealedAt?: string;
}

const stateFileExistedAtStart = existsSync(SEEN_PATH);
let seenState: SeenState = { accessionNumbers: [] };
let seenSet = new Set<string>();

function loadSeenState(): void {
  seenState = readJson<SeenState>(SEEN_PATH, { accessionNumbers: [] });
  seenSet = new Set(seenState.accessionNumbers);
}

function persistSeenState(): void {
  seenState = { ...seenState, accessionNumbers: Array.from(seenSet) };
  writeJsonAtomic(SEEN_PATH, seenState);
}

// ---------------------------------------------------------------------------
// Daily LLM call budget — persisted with a UTC date stamp so it resets daily.
// ---------------------------------------------------------------------------

interface BudgetState {
  utcDate: string; // YYYY-MM-DD, UTC
  callsUsed: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

let budgetState: BudgetState = { utcDate: todayUtc(), callsUsed: 0 };

function loadBudgetState(): void {
  budgetState = readJson<BudgetState>(BUDGET_PATH, { utcDate: todayUtc(), callsUsed: 0 });
  rolloverBudgetIfNewDay();
}

function rolloverBudgetIfNewDay(): void {
  const today = todayUtc();
  if (budgetState.utcDate !== today) {
    budgetState = { utcDate: today, callsUsed: 0 };
  }
}

function persistBudgetState(): void {
  writeJsonAtomic(BUDGET_PATH, budgetState);
}

function budgetRemaining(): number {
  rolloverBudgetIfNewDay();
  return DAILY_LLM_CALL_BUDGET - budgetState.callsUsed;
}

function consumeBudget(n: number): void {
  rolloverBudgetIfNewDay();
  budgetState.callsUsed += n;
  persistBudgetState();
}

// ---------------------------------------------------------------------------
// Deferred filings (budget-exhausted for the day, NOT marked seen — retried later)
// ---------------------------------------------------------------------------

interface DeferredEntry {
  accessionNumber: string;
  ticker: string;
  deferredAt: string;
}

function appendDeferred(entry: DeferredEntry): void {
  const existing = readJson<DeferredEntry[]>(DEFERRED_PATH, []);
  existing.push(entry);
  writeJsonAtomic(DEFERRED_PATH, existing);
}

// ---------------------------------------------------------------------------
// Heartbeat — overwritten after every completed poll tick, whether or not new
// filings were found. `afterhours-healthcheck.service` reads this file's `ts`.
// ---------------------------------------------------------------------------

let tickCount = 0;
let lastFilingSeen: string | null = null;

function writeHeartbeat(): void {
  writeJsonAtomic(HEARTBEAT_PATH, {
    ts: new Date().toISOString(),
    tickCount,
    lastFilingSeen,
  });
}

// ---------------------------------------------------------------------------
// Pipeline result archive — written regardless of post mode. This is both the
// evidence trail and a defense against ever re-spending a Gemini call on a filing
// that was already fully processed (see the existsSync check in the tick loop below).
// ---------------------------------------------------------------------------

function pipelineArchivePath(accessionNumber: string): string {
  return join(PIPELINE_DIR, `${accessionNumber}.json`);
}

function archivePipelineResult(filing: FilingRecord, result: PipelineResult, postedInfo: unknown): void {
  writeJsonAtomic(pipelineArchivePath(filing.accessionNumber), {
    filing,
    contentHash: result.contentHash,
    strippedTextLength: result.strippedTextLength,
    agreement: result.agreement,
    severityGrade: result.severityGrade,
    postMode: POST_MODE,
    posted: postedInfo,
    archivedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Per-filing processing
// ---------------------------------------------------------------------------

async function processFiling(filing: FilingRecord): Promise<void> {
  console.log(
    `[agent] processing ${filing.ticker} ${filing.form} accession=${filing.accessionNumber} ` +
      `accepted=${filing.acceptanceDateTime}`,
  );

  const result = await runPipelineForFiling(filing);

  console.log(
    `[agent] ${filing.accessionNumber}: readyToPost=${result.agreement.readyToPost} ` +
      `flagReasons=${JSON.stringify(result.agreement.flagReasons)} ` +
      `successfulParses=${result.agreement.successfulParseCount}/${result.agreement.totalAttempts} ` +
      `severity=${result.severityGrade.grade.severity}/${result.severityGrade.grade.direction}`,
  );

  let postedInfo: unknown = { attempted: false, reason: `postMode=${POST_MODE}` };

  if (POST_MODE === "live") {
    const bondAmountBaseUnits = BigInt(Math.round(BOND_AMOUNT_USDT0 * 1_000_000));
    const outcome = await postPipelineResult(result, {
      bondAmountBaseUnits,
      dryRun: false,
      network: "testnet",
    });
    postedInfo = outcome;
    console.log(
      `[agent] ${filing.accessionNumber}: posted on-chain — ` +
        `${JSON.stringify(outcome, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}`,
    );
  } else {
    console.log(
      `[agent] ${filing.accessionNumber}: dry-run mode — NOT calling postPipelineResult(). ` +
        `Would have posted with readyToPost=${result.agreement.readyToPost}, force=false.`,
    );
  }

  archivePipelineResult(filing, result, postedInfo);
}

// ---------------------------------------------------------------------------
// Cold-start seal
// ---------------------------------------------------------------------------

async function coldStartSeal(): Promise<void> {
  console.log(
    `[agent] cold start: no existing state file at ${SEEN_PATH} — polling EDGAR once to seal ` +
      `the current universe WITHOUT processing any of it.`,
  );
  const filings = await pollOnce();
  for (const f of filings) seenSet.add(f.accessionNumber);
  const sealedAt = new Date().toISOString();
  seenState = { accessionNumbers: Array.from(seenSet), sealedAt };
  persistSeenState();
  console.log(
    `[agent] cold start: sealed ${filings.length} historical filings; only filings first ` +
      `observed after ${sealedAt} will be processed.`,
  );
  tickCount += 1;
  writeHeartbeat();
}

// ---------------------------------------------------------------------------
// Main tick — sequential processing only, never Promise.all across filings.
// ---------------------------------------------------------------------------

let shutdownRequested = false;
let tickInProgress = false;

async function tick(): Promise<void> {
  tickInProgress = true;
  try {
    tickCount += 1;
    console.log(`[agent] tick #${tickCount} starting at ${new Date().toISOString()}`);

    let filings: FilingRecord[];
    try {
      filings = await pollOnce();
    } catch (err) {
      console.error(`[agent] pollOnce() failed, skipping this tick:`, err);
      writeHeartbeat();
      return;
    }

    console.log(`[agent] pollOnce() returned ${filings.length} tracked-form filings.`);

    const now = Date.now();

    for (const filing of filings) {
      if (shutdownRequested) {
        console.log(`[agent] shutdown requested mid-tick — stopping before further filings.`);
        break;
      }
      if (seenSet.has(filing.accessionNumber)) continue;

      // Defense-in-depth: if this accession was already fully processed and archived in
      // a previous run (e.g. the process was killed after archiving but before
      // persisting the seen-set), don't re-spend a Gemini call on it — just seal it now.
      if (existsSync(pipelineArchivePath(filing.accessionNumber))) {
        console.log(
          `[agent] ${filing.accessionNumber} already has an archived pipeline result — ` +
            `marking seen without reprocessing.`,
        );
        seenSet.add(filing.accessionNumber);
        persistSeenState();
        continue;
      }

      // Independent age cutoff — second safety net even if the seen-set state is fresh
      // or was lost entirely.
      const acceptedMs = Date.parse(filing.acceptanceDateTime);
      if (Number.isFinite(acceptedMs) && now - acceptedMs > MAX_FILING_AGE_MS) {
        console.log(
          `[agent] skipping ${filing.accessionNumber} (${filing.ticker}) — acceptanceDateTime ` +
            `${filing.acceptanceDateTime} exceeds TINJAU_MAX_FILING_AGE_MS=${MAX_FILING_AGE_MS}ms`,
        );
        seenSet.add(filing.accessionNumber);
        persistSeenState();
        continue;
      }

      if (budgetRemaining() < LLM_CALLS_PER_FILING) {
        console.error(
          `[agent] daily LLM call budget exhausted (used ${budgetState.callsUsed}/` +
            `${DAILY_LLM_CALL_BUDGET} today, UTC) — deferring ${filing.accessionNumber} ` +
            `(${filing.ticker}) instead of processing. Will retry once the budget resets.`,
        );
        appendDeferred({
          accessionNumber: filing.accessionNumber,
          ticker: filing.ticker,
          deferredAt: new Date().toISOString(),
        });
        continue; // NOT marked seen — retried on a future tick
      }

      try {
        await processFiling(filing);
        consumeBudget(LLM_CALLS_PER_FILING);
        seenSet.add(filing.accessionNumber);
        persistSeenState();
        lastFilingSeen = filing.accessionNumber;
      } catch (err) {
        // Never let one filing's failure crash the process, and never mark it seen on
        // failure — it is retried on the next tick instead of being silently dropped.
        console.error(
          `[agent] failed to process ${filing.accessionNumber} (${filing.ticker}), will retry ` +
            `next tick:`,
          err,
        );
      }
    }

    writeHeartbeat();
    console.log(`[agent] tick #${tickCount} complete.`);
  } finally {
    tickInProgress = false;
    if (shutdownRequested) {
      finalizeShutdown();
    }
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let intervalTimer: NodeJS.Timeout | null = null;

function finalizeShutdown(): void {
  persistSeenState();
  persistBudgetState();
  console.log(`[agent] graceful shutdown complete — state flushed, exiting.`);
  process.exit(0);
}

function requestShutdown(signal: string): void {
  console.log(`[agent] ${signal} received — stopping poller${tickInProgress ? " (waiting for in-flight tick to finish)" : ""}.`);
  shutdownRequested = true;
  if (intervalTimer) clearInterval(intervalTimer);
  if (!tickInProgress) {
    finalizeShutdown();
  }
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    `[agent] starting — pollIntervalMs=${POLL_INTERVAL_MS} postMode=${POST_MODE} ` +
      `dailyLlmCallBudget=${DAILY_LLM_CALL_BUDGET} maxFilingAgeMs=${MAX_FILING_AGE_MS} ` +
      `stateDir=${STATE_DIR}`,
  );

  loadSeenState();
  loadBudgetState();

  if (!stateFileExistedAtStart) {
    await coldStartSeal();
  } else {
    console.log(
      `[agent] existing state file found — loaded ${seenSet.size} previously-seen accession ` +
        `numbers (sealedAt=${seenState.sealedAt ?? "unknown"}). Skipping cold-start seal.`,
    );
    await tick();
  }

  intervalTimer = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error(`[agent] fatal error during startup:`, err);
  process.exit(1);
});
