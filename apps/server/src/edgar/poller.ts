/**
 * EDGAR poller (task P1.1).
 *
 * Polls SEC EDGAR's submissions API for every ticker with `live: true` in
 * `src/config/tickers.ts`, filters to 8-K and Form 4, and reports newly-seen filings
 * (by accessionNumber) since the last poll.
 *
 * Two ways to use this module:
 *  1. Standalone process: `tsx src/edgar/poller.ts` — polls on an interval forever.
 *  2. Imported by a scheduler: `pollOnce()` does a single pass and returns new filings;
 *     `createPoller()` gives you a start/stop-able poller without owning the process.
 *
 * Poll interval defaults to 5 minutes (EDGAR_POLL_INTERVAL_MS env var to override) —
 * this is deliberately not a tight loop. SEC's own guidance is to avoid hammering the
 * endpoint faster than a human filer would (see docs/buildx-orion-2026/SERVICES.md SVC-001).
 */

import "dotenv/config";
import { getLiveTickers } from "../config/tickers.js";
import { fetchRecentFilings } from "./client.js";
import type { FilingRecord } from "../types.js";

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function getPollIntervalMs(): number {
  const raw = process.env.EDGAR_POLL_INTERVAL_MS;
  if (!raw) return DEFAULT_POLL_INTERVAL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`EDGAR_POLL_INTERVAL_MS must be a positive number, got: "${raw}"`);
  }
  // Guard rail: SEC asks for reasonable use. Refuse to tight-loop even if misconfigured.
  const MIN_INTERVAL_MS = 30_000;
  if (parsed < MIN_INTERVAL_MS) {
    throw new Error(
      `EDGAR_POLL_INTERVAL_MS=${parsed} is below the minimum of ${MIN_INTERVAL_MS}ms — ` +
        `SEC EDGAR should not be polled faster than every 30s, and every-few-minutes is the ` +
        `intended cadence for this poller.`,
    );
  }
  return parsed;
}

/**
 * Fetches recent tracked-form filings across all live tickers in a single pass.
 * Does not dedup against prior polls — that's `createPoller`'s job.
 */
export async function pollOnce(): Promise<FilingRecord[]> {
  const tickers = getLiveTickers();
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        return await fetchRecentFilings(ticker);
      } catch (err) {
        // One ticker's failure shouldn't take down the whole poll pass.
        console.error(`[edgar-poller] failed to fetch filings for ${ticker.ticker}:`, err);
        return [] as FilingRecord[];
      }
    }),
  );
  return results.flat();
}

export interface Poller {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * Creates a start/stop-able poller that dedups on accessionNumber and invokes
 * `onNewFilings` only with filings not seen in a previous pass. Does not run
 * automatically — call `.start()`. Intended for import by a future scheduler process.
 */
export function createPoller(
  onNewFilings: (filings: FilingRecord[]) => void | Promise<void>,
  intervalMs: number = getPollIntervalMs(),
): Poller {
  const seenAccessionNumbers = new Set<string>();
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function tick() {
    const filings = await pollOnce();
    const fresh = filings.filter((f) => !seenAccessionNumbers.has(f.accessionNumber));
    for (const f of filings) seenAccessionNumbers.add(f.accessionNumber);
    if (fresh.length > 0) {
      await onNewFilings(fresh);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      // Fire immediately, then on the interval — don't make the first caller wait a full cycle.
      void tick();
      timer = setInterval(() => void tick(), intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      running = false;
    },
    isRunning() {
      return running;
    },
  };
}

// Standalone entrypoint: `tsx src/edgar/poller.ts`
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  console.log(
    `[edgar-poller] starting — live tickers: ${getLiveTickers()
      .map((t) => t.ticker)
      .join(", ")}, interval: ${getPollIntervalMs()}ms`,
  );

  const poller = createPoller((filings) => {
    for (const f of filings) {
      console.log(
        `[edgar-poller] NEW ${f.ticker} ${f.form} accession=${f.accessionNumber} ` +
          `accepted=${f.acceptanceDateTime} doc=${f.documentUrl}`,
      );
    }
  });

  poller.start();

  process.on("SIGINT", () => {
    console.log("[edgar-poller] stopping");
    poller.stop();
    process.exit(0);
  });
}
