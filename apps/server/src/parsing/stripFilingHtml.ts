/**
 * HTML/XBRL → clean-text stripper for filing documents (task P1.2).
 *
 * SEC 8-K/Form 4 documents are Inline XBRL: a normal-looking HTML document with large
 * amounts of embedded XBRL markup (<ix:...>, <xbrli:...> namespaced tags, hidden
 * `<div style="display:none">` XBRL fact blocks, etc). Real measured range: 40-220 KB
 * raw HTML reduces to roughly 2,500-3,700 tokens of actual prose after stripping
 * (docs/buildx-orion-2026/outputs/02-ideation/afterhours-spec.md §7).
 *
 * This is a regex-based tag stripper, not a full HTML parser (cheerio is not installed
 * in this environment — see report). This is a known-adequate first pass for this
 * document class: SEC filing HTML is well-formed enough that a careful strip-and-collapse
 * approach produces readable prose. A DOM-based parser would be more robust against
 * malformed markup but isn't required for this pass.
 */

/** Rough tokens-per-character ratio for English prose (~4 chars/token). Estimate only. */
const CHARS_PER_TOKEN_ESTIMATE = 4;

export interface StripResult {
  text: string;
  rawLength: number;
  strippedLength: number;
  /** Rough token estimate (chars / 4) — not a real tokenizer, just a sanity-check figure. */
  estimatedTokens: number;
}

export function stripFilingHtml(rawHtml: string): StripResult {
  let text = rawHtml;

  // 1. Drop <script> and <style> blocks entirely — content, not markup, but never prose.
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");

  // 2. Drop hidden XBRL fact blocks. Inline XBRL filings commonly carry a
  //    <div style="display:none">...</div> (or ix:hidden) section containing raw XBRL
  //    facts duplicated from the visible document — pure noise for an LLM prompt.
  text = text.replace(/<div[^>]*style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, " ");
  text = text.replace(/<ix:hidden[\s\S]*?<\/ix:hidden>/gi, " ");

  // 3. Drop XML/XBRL processing instructions and comments (e.g. the DFIN header comments).
  text = text.replace(/<\?xml[\s\S]*?\?>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  // 4. Insert paragraph/line breaks before stripping tags, so block-level elements don't
  //    fuse adjacent prose together into one run-on line.
  text = text.replace(/<\/(p|div|tr|table|br|li|h[1-6])\s*>/gi, "\n");
  text = text.replace(/<(br)\s*\/?>/gi, "\n");

  // 5. Strip every remaining tag (including namespaced XBRL tags like <ix:nonFraction>,
  //    <xbrli:...>) — this is the actual "regex tag stripper" step.
  text = text.replace(/<[^>]+>/g, " ");

  // 6. Decode the small set of HTML entities SEC filings actually use.
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&rdquo;": "”",
    "&ldquo;": "“",
  };
  text = text.replace(/&[a-zA-Z#0-9]+;/g, (m) => entities[m] ?? " ");

  // 7. Collapse whitespace: multiple spaces/tabs to one space, 3+ newlines to a paragraph
  //    break, trim each line.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.trim();

  const estimatedTokens = Math.round(text.length / CHARS_PER_TOKEN_ESTIMATE);

  return {
    text,
    rawLength: rawHtml.length,
    strippedLength: text.length,
    estimatedTokens,
  };
}
