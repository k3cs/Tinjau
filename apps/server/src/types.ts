/** Shared types used across the EDGAR poller, stripper, and LLM parsing stages. */

import type { TrackedFormType } from "./config/tickers.js";

/**
 * One filing entry as surfaced by the poller (P1.1), after filtering
 * `filings.recent` down to tracked form types for a tracked, live ticker.
 */
export interface FilingRecord {
  ticker: string;
  tokenSymbol: string;
  cik: string;
  form: TrackedFormType;
  accessionNumber: string;
  filingDate: string;
  /**
   * Second-precision acceptance timestamp straight from EDGAR, e.g.
   * "2026-08-10T12:00:15.000Z". Preserved exactly, unmodified — this timestamp is the
   * basis for the downstream on-chain reaction-latency study (spec §4.8b), so it must
   * never be reformatted, rounded, or re-derived from filingDate.
   */
  acceptanceDateTime: string;
  primaryDocument: string;
  primaryDocDescription: string | null;
  /** Fully-qualified URL to fetch the primary document from EDGAR's Archives host. */
  documentUrl: string;
}
