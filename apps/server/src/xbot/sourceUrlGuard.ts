/**
 * Mandatory sourceUrl guard for the X bot (task P5.3).
 *
 * Pure function, no I/O. MUST be the unconditional first statement in the per-event
 * handler in `main.ts` — an on-chain `EventState.sourceUrl` that is not a real SEC EDGAR
 * URL (e.g. the P4.4 synthetic-filing scheme `synthetic://afterhours/P4.4/...`, or any
 * lookalike/malicious string) must NEVER reach tweet composition or `postToX`, because a
 * tweet is a public, irreversible claim this project cannot retract the way it could a
 * flagged on-chain event.
 *
 * `URL` parsing (rather than a regex) is used for the hostname check specifically to
 * defeat the userinfo trick (`https://www.sec.gov@evil.com/...` — a naive
 * `startsWith`-only check would pass this, but `new URL(...).hostname` correctly resolves
 * it to `evil.com`).
 */

const REQUIRED_PREFIX = "https://www.sec.gov/";
const REQUIRED_HOSTNAME = "www.sec.gov";

export function isRealSecFilingSourceUrl(sourceUrl: string): boolean {
  if (typeof sourceUrl !== "string" || sourceUrl.length === 0) return false;
  if (!sourceUrl.startsWith(REQUIRED_PREFIX)) return false;
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return false;
  }
  // Intentionally case-sensitive / not normalized: `new URL()` already lowercases the
  // hostname per the URL spec, but the `startsWith(REQUIRED_PREFIX)` check above is
  // case-sensitive, so "https://WWW.SEC.GOV/..." fails at the prefix check before we
  // even get here. This is deliberate — real EDGAR URLs are always lowercase, and
  // silently accepting a differently-cased host would widen the guard beyond what has
  // ever actually been observed from EDGAR, for no benefit.
  return parsed.protocol === "https:" && parsed.hostname === REQUIRED_HOSTNAME;
}
