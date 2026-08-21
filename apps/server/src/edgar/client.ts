/**
 * Low-level SEC EDGAR HTTP client (task P1.1).
 *
 * Two endpoints:
 *  - `https://data.sec.gov/submissions/CIK{10-digit}.json` — per-company filing index.
 *  - `https://www.sec.gov/Archives/edgar/data/{cik-no-leading-zeros}/{accession-no-dashes}/{primaryDocument}`
 *    — the actual filing document.
 *
 * SEC requires a descriptive `User-Agent` header identifying the requester on every
 * request (https://www.sec.gov/os/webmaster-faq#developers). This is NOT optional —
 * generic/fake User-Agents get blocked. The value is read from the
 * `EDGAR_USER_AGENT` env var so no fake contact ends up hardcoded in source.
 */

import { TrackedFormType, TrackedTicker, TRACKED_FORM_TYPES } from "../config/tickers.js";
import type { FilingRecord } from "../types.js";

const SUBMISSIONS_BASE = "https://data.sec.gov/submissions";
const ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

export function getEdgarUserAgent(): string {
  const ua = process.env.EDGAR_USER_AGENT;
  if (!ua || ua.trim().length === 0) {
    throw new Error(
      "EDGAR_USER_AGENT not set — SEC requires a descriptive User-Agent header on every " +
        "request (e.g. \"Tinjau research@example.com\"). Set EDGAR_USER_AGENT in your " +
        "environment before polling EDGAR. See docs/buildx-orion-2026/SERVICES.md SVC-001.",
    );
  }
  return ua;
}

/** Shape of the fields inside `filings.recent` we actually use, straight off the wire. */
interface RawFilingsRecent {
  accessionNumber: string[];
  filingDate: string[];
  acceptanceDateTime: string[];
  form: string[];
  primaryDocument: string[];
  primaryDocDescription: (string | null)[];
}

interface RawSubmissionsResponse {
  cik: string;
  name: string;
  filings: {
    recent: RawFilingsRecent;
    // `files` (older filings, paginated separately) intentionally not modeled —
    // out of scope for P1.1, which only needs the current window.
  };
}

/** Builds the submissions API URL for a 10-digit zero-padded CIK. */
export function submissionsUrl(cikPadded: string): string {
  return `${SUBMISSIONS_BASE}/CIK${cikPadded}.json`;
}

/** Builds the Archives document URL. CIK and accession number both drop their zero-padding/dashes. */
export function documentUrl(cikPadded: string, accessionNumber: string, primaryDocument: string): string {
  const cikNoLeadingZeros = String(Number(cikPadded));
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `${ARCHIVES_BASE}/${cikNoLeadingZeros}/${accessionNoDashes}/${primaryDocument}`;
}

/**
 * Fetches and filters one company's recent filings down to tracked form types.
 * Throws on non-2xx responses or malformed JSON — callers decide retry/backoff policy.
 */
export async function fetchRecentFilings(
  ticker: TrackedTicker,
  formTypes: readonly TrackedFormType[] = TRACKED_FORM_TYPES,
): Promise<FilingRecord[]> {
  const userAgent = getEdgarUserAgent();
  const url = submissionsUrl(ticker.cik);

  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `EDGAR submissions fetch failed for ${ticker.ticker} (CIK ${ticker.cik}): ` +
        `HTTP ${res.status} ${res.statusText} — ${url}`,
    );
  }

  const data = (await res.json()) as RawSubmissionsResponse;
  const recent = data.filings?.recent;
  if (!recent || !Array.isArray(recent.form)) {
    throw new Error(
      `EDGAR submissions response for ${ticker.ticker} (CIK ${ticker.cik}) is missing ` +
        `filings.recent — unexpected response shape.`,
    );
  }

  const wanted = new Set<string>(formTypes);
  const out: FilingRecord[] = [];

  for (let i = 0; i < recent.form.length; i++) {
    const form = recent.form[i];
    if (!wanted.has(form)) continue;

    const accessionNumber = recent.accessionNumber[i];
    const primaryDocument = recent.primaryDocument[i];

    out.push({
      ticker: ticker.ticker,
      tokenSymbol: ticker.tokenSymbol,
      cik: ticker.cik,
      form: form as TrackedFormType,
      accessionNumber,
      filingDate: recent.filingDate[i],
      // Preserved exactly as returned by EDGAR — do not reformat (see FilingRecord doc).
      acceptanceDateTime: recent.acceptanceDateTime[i],
      primaryDocument,
      primaryDocDescription: recent.primaryDocDescription?.[i] ?? null,
      documentUrl: documentUrl(ticker.cik, accessionNumber, primaryDocument),
    });
  }

  return out;
}

/** Fetches the raw filing document (HTML) for a given FilingRecord. Returns the raw text as-is. */
export async function fetchFilingDocument(filing: FilingRecord): Promise<string> {
  const userAgent = getEdgarUserAgent();
  const res = await fetch(filing.documentUrl, {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(
      `EDGAR document fetch failed for ${filing.ticker} ${filing.accessionNumber}: ` +
        `HTTP ${res.status} ${res.statusText} — ${filing.documentUrl}`,
    );
  }

  return await res.text();
}
