/**
 * Credential-free RSS/Atom feed reader for the news-intake leg (task S5.2).
 *
 * ---------------------------------------------------------------------------------------
 * THIS MODULE CANNOT WRITE ANYTHING, ANYWHERE.
 *
 * Every request goes through `httpGetBytes`, and `httpGetBytes` hardcodes `method: "GET"`.
 * There is no parameter, flag, or branch in this file that produces a POST, PUT, PATCH or
 * DELETE, and it sends no cookie, no body and no credential of any kind. It is the same
 * containment shape `xbot/readFromX.ts` uses, for the same reason: a reader auditing "can the
 * intake leg emit anything?" should be able to answer it from one line.
 *
 * ---------------------------------------------------------------------------------------
 * NO CREDENTIAL, NO ACCOUNT, NO PAID TIER.
 *
 * S5.1 was blocked by `402 credits-depleted` on X's paid read tier. The lesson recorded there
 * is that an intake leg whose only source needs a purchase is not an intake leg. This module
 * therefore reads plain RSS/Atom over HTTPS. The only header it sends is `User-Agent`, which
 * SEC *requires* on every request from anyone (https://www.sec.gov/os/webmaster-faq#developers)
 * and which is not a secret, not an identity, and not tied to an account. It is read via
 * `edgar/client.ts::getEdgarUserAgent()` rather than reinvented, so this project has exactly
 * one place that decides what it tells SEC it is.
 *
 * ---------------------------------------------------------------------------------------
 * ZERO NPM DEPENDENCIES, INCLUDING NO XML PARSER.
 *
 * The extraction below is a deliberately small, deliberately dumb tag scanner over the feed
 * text. That is a real limitation and it is stated in the artifact rather than hidden: it does
 * not resolve namespaces, does not handle CDATA nesting, and does not validate the document.
 * It is enough because feed formats are shallow and because every value it pulls out is
 * published verbatim next to the item's own raw XML, so any extraction error is visible to a
 * reader rather than buried. Adding a parser dependency to read six leaf tags would be a
 * larger, less auditable change than this function.
 *
 * ---------------------------------------------------------------------------------------
 * BYTES, THEN TEXT — IN THAT ORDER.
 *
 * The content hash is taken over the EXACT bytes the server sent, before any decoding. Hashing
 * a decoded string would commit to this process's charset guess rather than to what the source
 * served, and a hash that depends on the reader is not a commitment to the source. SEC's Atom
 * feed declares `ISO-8859-1` in its XML prolog while sending no `charset` in `Content-Type`,
 * so the charset genuinely has to be sniffed — which is exactly why the hash must not depend
 * on the result.
 * ---------------------------------------------------------------------------------------
 */

import { createHash } from "node:crypto";

import { getEdgarUserAgent } from "../edgar/client.js";
import { isRealSecFilingSourceUrl } from "../xbot/sourceUrlGuard.js";

// ---------------------------------------------------------------------------
// Failure classification — pure, so it is testable without a network
// ---------------------------------------------------------------------------

export type FeedFailureKind =
  /** 404/410. The feed URL does not exist — this reader's bug, not the publisher's. */
  | "not_found"
  /** 401/403. The publisher refuses anonymous reads, or blocked this User-Agent. */
  | "forbidden"
  /** 429. */
  | "rate_limit"
  /** 400/422. A malformed request. */
  | "bad_request"
  /** 402. A paywall or metered tier. Kept separate: this is the S5.1 outcome by name. */
  | "payment_required"
  /** 5xx. */
  | "server_error"
  /** Network failure, or a body that is not a feed at all. */
  | "transient";

export interface FeedFetchOk {
  ok: true;
  url: string;
  httpStatus: number;
  contentType: string | null;
  /** Where the charset came from, so the decode is checkable rather than assumed. */
  charset: { value: string; source: "content-type-header" | "xml-declaration" | "default-utf-8" };
  byteLength: number;
  /** sha256 over the exact bytes received, before any decoding. */
  sha256: string;
  /** The decoded document. */
  text: string;
  retrievedAtUtc: string;
  lastModified: string | null;
}

export interface FeedFetchErr {
  ok: false;
  url: string;
  kind: FeedFailureKind;
  httpStatus: number;
  /** Truncated response text. Never a credential — this reader sends none. */
  detail: string;
  retrievedAtUtc: string;
}

export type FeedFetchResult = FeedFetchOk | FeedFetchErr;

/**
 * Maps a completed HTTP response onto exactly one failure kind.
 *
 * Pure — no fetch, no I/O — matching `readFromX.ts::classifyXReadFailure` and
 * `okxIndexClient.ts::classifyIndexResponse`. `402` keeps its own kind even though no
 * credential-free feed should ever return one: if a publisher starts metering a feed this
 * project treats as open, that must surface as "the source became paid", not as a generic
 * server error someone would try to retry through.
 */
export function classifyFeedFailure(
  url: string,
  status: number,
  bodyText: string,
  retrievedAtUtc: string,
): FeedFetchErr {
  const detail = bodyText.slice(0, 500);
  const base = { ok: false as const, url, httpStatus: status, detail, retrievedAtUtc };
  if (status === 402) return { ...base, kind: "payment_required" };
  if (status === 401 || status === 403) return { ...base, kind: "forbidden" };
  if (status === 404 || status === 410) return { ...base, kind: "not_found" };
  if (status === 429) return { ...base, kind: "rate_limit" };
  if (status === 400 || status === 422) return { ...base, kind: "bad_request" };
  if (status >= 500) return { ...base, kind: "server_error" };
  return { ...base, kind: "transient" };
}

// ---------------------------------------------------------------------------
// Bytes -> text
// ---------------------------------------------------------------------------

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Works out which charset the bytes are in, and says how it worked it out.
 *
 * Header first (it is the authority when present), then the XML prolog, then UTF-8. SEC's
 * `browse-edgar` Atom output sends `Content-Type: application/atom+xml` with no charset and a
 * prolog reading `<?xml version="1.0" encoding="ISO-8859-1" ?>`, so the prolog branch is a live
 * code path here, not a defensive one.
 */
export function detectCharset(
  contentType: string | null,
  bytes: Uint8Array,
): FeedFetchOk["charset"] {
  const fromHeader = contentType?.match(/charset\s*=\s*"?([\w-]+)"?/i)?.[1];
  if (fromHeader) return { value: fromHeader.toLowerCase(), source: "content-type-header" };

  // The prolog is ASCII in every encoding this could plausibly be, so reading the first bytes
  // as latin1 to find it is safe regardless of what the answer turns out to be.
  const prolog = Buffer.from(bytes.slice(0, 256)).toString("latin1");
  const fromXml = prolog.match(/<\?xml[^>]*encoding\s*=\s*["']([\w-]+)["']/i)?.[1];
  if (fromXml) return { value: fromXml.toLowerCase(), source: "xml-declaration" };

  return { value: "utf-8", source: "default-utf-8" };
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // An unsupported label is not a reason to fail the run, but it IS a reason not to pretend
    // we honoured it. UTF-8 is the fallback and the caller still publishes the declared label,
    // so a mismatch is visible in the artifact.
    return new TextDecoder("utf-8").decode(bytes);
  }
}

// ---------------------------------------------------------------------------
// The ONLY request primitive in this module
// ---------------------------------------------------------------------------

export interface RawGetResult {
  ok: boolean;
  httpStatus: number;
  bytes: Uint8Array;
  sha256: string;
  contentType: string | null;
  lastModified: string | null;
  retrievedAtUtc: string;
  /** Set only when the request never completed. */
  networkError: string | null;
}

/**
 * One `GET`. `method` is a constant, not a parameter — there is no call site, present or
 * future, that can turn this helper into a write by passing a different verb.
 */
export async function httpGetBytes(
  url: string,
  userAgent: string,
  accept: string,
): Promise<RawGetResult> {
  const retrievedAtUtc = new Date().toISOString();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": userAgent, Accept: accept },
      redirect: "follow",
    });
  } catch (err) {
    return {
      ok: false,
      httpStatus: 0,
      bytes: new Uint8Array(),
      sha256: sha256Hex(new Uint8Array()),
      contentType: null,
      lastModified: null,
      retrievedAtUtc,
      networkError: err instanceof Error ? err.message : String(err),
    };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    ok: response.ok,
    httpStatus: response.status,
    bytes,
    sha256: sha256Hex(bytes),
    contentType: response.headers.get("content-type"),
    lastModified: response.headers.get("last-modified"),
    retrievedAtUtc,
    networkError: null,
  };
}

/** One read of one feed URL. Read-only. No retry — see the note on `fetchEdgarCompanyAtom`. */
export async function fetchFeed(url: string, userAgent: string): Promise<FeedFetchResult> {
  const raw = await httpGetBytes(url, userAgent, "application/atom+xml,application/rss+xml,application/xml,text/xml");

  if (raw.networkError !== null) {
    return {
      ok: false,
      url,
      kind: "transient",
      httpStatus: 0,
      detail: `network error calling ${url}: ${raw.networkError}`,
      retrievedAtUtc: raw.retrievedAtUtc,
    };
  }

  const charset = detectCharset(raw.contentType, raw.bytes);
  const text = decodeBytes(raw.bytes, charset.value);

  if (!raw.ok) return classifyFeedFailure(url, raw.httpStatus, text, raw.retrievedAtUtc);

  // A 200 carrying an HTML error page is a real, observed failure mode for feed endpoints, and
  // treating it as an empty feed would publish "nothing was happening" when the truth is "we
  // were served the wrong document".
  if (!/<(feed|rss|rdf:RDF)[\s>]/i.test(text)) {
    return {
      ok: false,
      url,
      kind: "transient",
      httpStatus: raw.httpStatus,
      detail:
        `HTTP ${raw.httpStatus} but the body is not an RSS or Atom document ` +
        `(no <feed>, <rss> or <rdf:RDF> root): ${text.slice(0, 300)}`,
      retrievedAtUtc: raw.retrievedAtUtc,
    };
  }

  return {
    ok: true,
    url,
    httpStatus: raw.httpStatus,
    contentType: raw.contentType,
    charset,
    byteLength: raw.bytes.byteLength,
    sha256: raw.sha256,
    text,
    retrievedAtUtc: raw.retrievedAtUtc,
    lastModified: raw.lastModified,
  };
}

// ---------------------------------------------------------------------------
// Extraction — hand-rolled, no dependency
// ---------------------------------------------------------------------------

/**
 * Decodes the five XML predefined entities plus numeric references.
 *
 * `&amp;` is decoded LAST and by a pass that cannot re-enter, because decoding it first turns
 * the legitimate literal `&amp;lt;` into `<`, which would silently rewrite a source's text.
 */
export function decodeXmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function stripCdata(value: string): string {
  const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : value;
}

/** Text of the first `<tag>…</tag>` in `xml`, entity-decoded and trimmed. Null when absent. */
export function firstTagText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return null;
  const value = decodeXmlEntities(stripCdata(match[1])).trim();
  return value.length > 0 ? value : null;
}

/** Value of `attr` on the first `<tag …>` in `xml`. Null when absent. */
export function firstTagAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*"([^"]*)"`, "i");
  const match = xml.match(re);
  return match ? decodeXmlEntities(match[1]).trim() || null : null;
}

/**
 * Every simple leaf element inside a block, as a flat name -> text map.
 *
 * "Simple" means an element whose content contains no further `<`. That restriction is what
 * makes a flat map honest: a nested element is not representable here, so it is left out
 * rather than flattened into something the document did not say. EDGAR's `<content>` block is
 * exactly this shape — `accession-number`, `filing-date`, `filing-type`, `filing-href`,
 * `items-desc`, `form-name` are all leaves.
 */
export function leafFields(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<([a-z][\w:.-]*)(?:\s[^>]*)?>([^<]*)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const name = match[1].toLowerCase();
    const value = decodeXmlEntities(match[2]).trim();
    // First occurrence wins: a repeated tag means the block is not the flat shape this helper
    // claims to handle, and overwriting would quietly publish the last one as if it were the
    // only one.
    if (value.length > 0 && !(name in out)) out[name] = value;
  }
  return out;
}

/**
 * Converts a feed timestamp to a strict `…Z` ISO-8601 instant, or null.
 *
 * `evidence/normalize.ts::isIsoTimestamp` accepts only the `Z` form, and feeds emit neither:
 * Atom uses an offset (`2026-08-17T08:41:33-04:00`) and RSS uses RFC 822
 * (`Fri, 21 Aug 2026 17:39:01 +0000`). This converts the instant without changing it, and the
 * caller publishes the raw string alongside so the conversion is checkable. Null when the
 * value does not parse — a timestamp that cannot be read is recorded as unavailable, never
 * replaced with the fetch time.
 */
export function toStrictIsoUtc(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const ms = Date.parse(raw.trim());
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export interface FeedItem {
  /** Position in the feed as served, so "the newest item" is checkable. */
  index: number;
  kind: "atom-entry" | "rss-item";
  /** The item's XML, verbatim, exactly as it appeared in the decoded document. */
  raw: string;
  /** sha256 over the UTF-8 bytes of `raw`. Commits to this item within the feed. */
  rawSha256: string;
  title: string | null;
  /** Atom: the `alternate` link's href. RSS: the `<link>` text. */
  link: string | null;
  /** Atom `<id>`, RSS `<guid>`. The publisher's own stable identifier. */
  id: string | null;
  /** The publication timestamp exactly as the feed wrote it. */
  publishedRaw: string | null;
  /** `publishedRaw` as a strict `…Z` instant, or null when it did not parse. */
  publishedIso: string | null;
  /** Which element `publishedRaw` came from. */
  publishedFrom: "updated" | "published" | "pubDate" | "dc:date" | null;
  summary: string | null;
  /** Atom `<category term="…">`. */
  categoryTerm: string | null;
  /** Every simple leaf element in the item, including any nested `<content>` leaves. */
  fields: Record<string, string>;
}

/** Splits a feed into its items, handling Atom `<entry>` and RSS `<item>` alike. */
export function parseFeedItems(xml: string): FeedItem[] {
  const atom = [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)];
  const blocks: { kind: FeedItem["kind"]; raw: string }[] =
    atom.length > 0
      ? atom.map((m) => ({ kind: "atom-entry" as const, raw: m[0] }))
      : [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => ({
          kind: "rss-item" as const,
          raw: m[0],
        }));

  return blocks.map(({ kind, raw }, index) => {
    const published: [FeedItem["publishedFrom"], string | null][] = [
      ["updated", firstTagText(raw, "updated")],
      ["published", firstTagText(raw, "published")],
      ["pubDate", firstTagText(raw, "pubDate")],
      ["dc:date", firstTagText(raw, "dc:date")],
    ];
    const chosen = published.find(([, value]) => value !== null);

    const link =
      kind === "atom-entry"
        ? firstTagAttr(raw, "link", "href") ?? firstTagText(raw, "link")
        : firstTagText(raw, "link") ?? firstTagAttr(raw, "link", "href");

    return {
      index,
      kind,
      raw,
      rawSha256: sha256Hex(Buffer.from(raw, "utf8")),
      title: firstTagText(raw, "title"),
      link,
      id: firstTagText(raw, "id") ?? firstTagText(raw, "guid"),
      publishedRaw: chosen?.[1] ?? null,
      publishedIso: toStrictIsoUtc(chosen?.[1] ?? null),
      publishedFrom: chosen?.[0] ?? null,
      summary: firstTagText(raw, "summary") ?? firstTagText(raw, "description"),
      categoryTerm: firstTagAttr(raw, "category", "term"),
      fields: leafFields(raw),
    };
  });
}

/** The part of a feed before its first item — where channel-level metadata lives. */
export function feedHeader(xml: string): string {
  const firstItem = xml.search(/<(entry|item)(?:\s|>)/i);
  return firstItem < 0 ? xml : xml.slice(0, firstItem);
}

// ---------------------------------------------------------------------------
// SEC EDGAR: the one feed this project reads today
// ---------------------------------------------------------------------------

export const EDGAR_BROWSE_ENDPOINT = "https://www.sec.gov/cgi-bin/browse-edgar";

export interface EdgarCompanyFeedOptions {
  /** 10-digit zero-padded CIK, taken from the supported-asset registry. Never hand-typed. */
  cikPadded: string;
  /** SEC form type to filter on, e.g. `8-K`. Null asks for every form. */
  formType: string | null;
  /** How many of the most recent filings to ask for. This is a sample, not a sweep. */
  count: number;
}

/**
 * The company-filings Atom feed URL.
 *
 * `owner=include` matches what `edgar/client.ts` already does elsewhere in this project, so
 * both readers see the same filing universe. Built with `URLSearchParams` so a CIK or form
 * type containing a delimiter cannot smuggle another parameter into the query.
 */
export function edgarCompanyAtomUrl(options: EdgarCompanyFeedOptions): string {
  const params = new URLSearchParams({
    action: "getcompany",
    CIK: options.cikPadded,
    dateb: "",
    owner: "include",
    count: String(options.count),
    output: "atom",
  });
  if (options.formType !== null && options.formType.trim().length > 0) {
    params.set("type", options.formType.trim());
  }
  return `${EDGAR_BROWSE_ENDPOINT}?${params.toString()}`;
}

/**
 * One read of one company's EDGAR Atom feed. No retry, on purpose.
 *
 * SEC asks for reasonable use and has been known to block abusive User-Agents. A reader that
 * answers a rate limit by hammering the endpoint turns a reportable access problem into a ban
 * for the whole project. One attempt; whatever it returns is the run's result.
 */
export async function fetchEdgarCompanyAtom(
  options: EdgarCompanyFeedOptions,
  userAgent: string = getEdgarUserAgent(),
): Promise<FeedFetchResult> {
  return fetchFeed(edgarCompanyAtomUrl(options), userAgent);
}

/**
 * Fetches one document from `www.sec.gov` and hashes the exact bytes served.
 *
 * REFUSES ANY OTHER HOST. The URL is checked with the project's existing
 * `isRealSecFilingSourceUrl` guard before the request is made, so a malformed or lookalike
 * `filing-href` in a feed can never cause this process to fetch an attacker's document and
 * then publish its hash as the content commitment of an SEC filing. The guard is imported
 * rather than re-derived: there is one definition of "a real EDGAR URL" in this repo.
 */
export async function fetchSecDocument(
  url: string,
  userAgent: string = getEdgarUserAgent(),
): Promise<
  | { ok: true; url: string; httpStatus: number; byteLength: number; sha256: string; contentType: string | null; retrievedAtUtc: string }
  | { ok: false; url: string; kind: FeedFailureKind | "refused_not_sec_url"; httpStatus: number; detail: string; retrievedAtUtc: string }
> {
  if (!isRealSecFilingSourceUrl(url)) {
    return {
      ok: false,
      url,
      kind: "refused_not_sec_url",
      httpStatus: 0,
      detail:
        `Refused to fetch "${url}": it is not an https://www.sec.gov/ URL. The document hash is ` +
        `recorded as unavailable rather than taken from an unverified host.`,
      retrievedAtUtc: new Date().toISOString(),
    };
  }

  const raw = await httpGetBytes(url, userAgent, "text/html,application/xhtml+xml,application/xml");
  if (raw.networkError !== null) {
    return {
      ok: false,
      url,
      kind: "transient",
      httpStatus: 0,
      detail: `network error calling ${url}: ${raw.networkError}`,
      retrievedAtUtc: raw.retrievedAtUtc,
    };
  }
  if (!raw.ok) {
    const text = decodeBytes(raw.bytes, detectCharset(raw.contentType, raw.bytes).value);
    const classified = classifyFeedFailure(url, raw.httpStatus, text, raw.retrievedAtUtc);
    return { ok: false, url, kind: classified.kind, httpStatus: raw.httpStatus, detail: classified.detail, retrievedAtUtc: raw.retrievedAtUtc };
  }

  return {
    ok: true,
    url,
    httpStatus: raw.httpStatus,
    byteLength: raw.bytes.byteLength,
    sha256: raw.sha256,
    contentType: raw.contentType,
    retrievedAtUtc: raw.retrievedAtUtc,
  };
}
