/**
 * AFTERHOURS tracked underlyings (task P1.1).
 *
 * Two names are polled live today: NVDA and MSTR. The other 9 tokenised-equity
 * underlyings are configuration-only rows for this pass — they exist so the poller's
 * `getLiveTickers()` output and the full roster are both derivable from one file, but
 * `live: false` entries are never fetched by the poller.
 *
 * CIKs below were resolved and cross-checked live against SEC's
 * `https://www.sec.gov/files/company_tickers.json` on 2026-08-17 (NVDA/MSTR CIKs match
 * the values given in the task brief exactly, which cross-validates the lookup for the
 * other 9). See docs/buildx-orion-2026/outputs/02-ideation/afterhours-spec.md §7 for the
 * full 11-name list (SPYx is explicitly excluded from AFTERHOURS's tracked set).
 */

export interface TrackedTicker {
  /** Stock ticker as filed with the SEC (not the on-chain "...x" wrapped-token symbol). */
  ticker: string;
  /** On-chain tokenised-equity symbol this filing's events apply to. */
  tokenSymbol: string;
  /** SEC CIK, 10 digits, zero-padded — required format for the submissions API URL. */
  cik: string;
  /** Company name as registered with the SEC (informational only). */
  companyName: string;
  /** Whether P1.1's poller actively fetches this ticker's filings right now. */
  live: boolean;
}

export const TRACKED_TICKERS: TrackedTicker[] = [
  {
    ticker: "NVDA",
    tokenSymbol: "NVDAx",
    cik: "0001045810",
    companyName: "NVIDIA CORP",
    live: true,
  },
  {
    ticker: "MSTR",
    tokenSymbol: "MSTRx",
    cik: "0001050446",
    companyName: "Strategy Inc",
    live: true,
  },
  // --- Configuration-only rows below (P1.1 scope: do not poll yet) ---
  {
    ticker: "AAPL",
    tokenSymbol: "AAPLx",
    cik: "0000320193",
    companyName: "Apple Inc.",
    live: false,
  },
  {
    ticker: "GOOGL",
    tokenSymbol: "GOOGLx",
    cik: "0001652044",
    companyName: "Alphabet Inc.",
    live: false,
  },
  {
    ticker: "TSLA",
    tokenSymbol: "TSLAx",
    cik: "0001318605",
    companyName: "Tesla, Inc.",
    live: false,
  },
  {
    ticker: "META",
    tokenSymbol: "METAx",
    cik: "0001326801",
    companyName: "Meta Platforms, Inc.",
    live: false,
  },
  {
    ticker: "SNDK",
    tokenSymbol: "SNDKx",
    cik: "0002023554",
    companyName: "Sandisk Corp",
    live: false,
  },
  {
    ticker: "CRCL",
    tokenSymbol: "CRCLx",
    cik: "0001876042",
    companyName: "Circle Internet Group, Inc.",
    live: false,
  },
  {
    ticker: "COIN",
    tokenSymbol: "COINx",
    cik: "0001679788",
    companyName: "Coinbase Global, Inc.",
    live: false,
  },
  {
    ticker: "AMZN",
    tokenSymbol: "AMZNx",
    cik: "0001018724",
    companyName: "AMAZON COM INC",
    live: false,
  },
  // SPYx is explicitly excluded from AFTERHOURS's tracked set — not a config row, not a TODO.
];

/** Form types P1.1 filters `filings.recent` on. */
export const TRACKED_FORM_TYPES = ["8-K", "4"] as const;
export type TrackedFormType = (typeof TRACKED_FORM_TYPES)[number];

export function getLiveTickers(): TrackedTicker[] {
  return TRACKED_TICKERS.filter((t) => t.live);
}

export function getTickerByCik(cik: string): TrackedTicker | undefined {
  return TRACKED_TICKERS.find((t) => t.cik === cik);
}
