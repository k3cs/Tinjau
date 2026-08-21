/**
 * Deterministic tweet-text composition for the X bot (task P5.3).
 *
 * `composeTweetText()` is a pure function — deterministic, no LLM call, no network call —
 * given an already-resolved event + (optional) archived-summary match. `findArchivedSummary`
 * is separate on purpose: it does read-only local filesystem I/O (scanning
 * `${STATE_DIR}/pipeline/*.json`), which is not a "network/LLM call" but is still I/O, so it
 * is kept out of the pure composition function and wrapped so it can never throw or block
 * posting — a missing/empty/corrupt archive just means no enrichment, never an error.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveSymbolForAddress } from "../chain/tokenAddresses.js";
import { DECLARED_AMOUNT_SCALE } from "../chain/mapEventToRegistry.js";

/**
 * Canonical X Layer Testnet explorer base URL. `apps/web/src/lib/chain/chain.ts` already
 * defines this exact constant (verified 2026-08-17: the old `www.okx.com/web3/explorer/
 * xlayer-test` path used elsewhere in `apps/server/src/chain/{runOnce,swapOnce,
 * runSynthetic}.ts` 301-redirects to this one) — apps/server has no workspace import into
 * apps/web, so it's redefined here rather than duplicated as a THIRD differently-spelled
 * source of truth. Do not add a fourth.
 */
export const XLAYER_TESTNET_EXPLORER = "https://web3.okx.com/explorer/x-layer-testnet";

export function explorerTxUrl(hash: string): string {
  return `${XLAYER_TESTNET_EXPLORER}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${XLAYER_TESTNET_EXPLORER}/address/${address}`;
}

const MAX_TWEET_LENGTH = 280;

export interface ComposeTweetEventInput {
  eventId: bigint;
  eventTypeLabel: string;
  /** The on-chain `token` address this event concerns. */
  token: `0x${string}`;
  /** `facts.declaredAmount` — fixed-point base units, scaled by DECLARED_AMOUNT_SCALE. */
  declaredAmount: bigint;
  /** `facts.currency`. */
  currency: string;
  /** `agreement.declaredAmountAgreement` — only print the amount when this is > 0. */
  declaredAmountAgreement: number;
  /** `sourceContentHash`, `0x`-prefixed bytes32 hex — used to look up an archived summary. */
  sourceContentHash: string;
  /**
   * Best-effort tx hash for this specific event (e.g. from a narrowly-scoped, indexed-topic
   * log lookup performed by the caller — never inside this pure function). Falls back to a
   * registry-address explorer link when unavailable.
   */
  txHash?: string;
  /** Registry contract address, used for the explorer link fallback when `txHash` is absent. */
  registryAddress: `0x${string}`;
  network: "testnet" | "mainnet";
}

export interface ArchivedSummaryMatch {
  summary: string;
  accessionNumber: string;
}

/**
 * Read-only best-effort scan of `${stateDir}/pipeline/*.json` (the shape `agent.ts`'s
 * `archivePipelineResult()` writes — see `AgreementReport.summaries` in
 * `src/diff/agreement.ts`) for an entry whose `contentHash` matches this event's
 * `sourceContentHash`. Returns the first of that entry's (up to 3) real parsed summaries,
 * or `null` if no match / the archive is missing / anything is unreadable or malformed —
 * never throws.
 */
export function findArchivedSummary(sourceContentHash: string, stateDir: string): ArchivedSummaryMatch | null {
  try {
    const pipelineDir = join(stateDir, "pipeline");
    if (!existsSync(pipelineDir)) return null;

    const target = sourceContentHash.toLowerCase().replace(/^0x/, "");
    const files = readdirSync(pipelineDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const raw = readFileSync(join(pipelineDir, file), "utf8");
        const parsed = JSON.parse(raw) as {
          contentHash?: string;
          agreement?: { summaries?: string[] };
          filing?: { accessionNumber?: string };
        };
        const contentHash = parsed.contentHash?.toLowerCase().replace(/^0x/, "");
        if (!contentHash || contentHash !== target) continue;

        const summaries = parsed.agreement?.summaries ?? [];
        const summary = summaries.find((s) => typeof s === "string" && s.trim().length > 0);
        if (!summary) return null;

        return {
          summary: summary.trim(),
          accessionNumber: parsed.filing?.accessionNumber ?? file.replace(/\.json$/, ""),
        };
      } catch {
        // One unreadable/malformed archive entry must never abort the scan or block posting.
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Formats a fixed-point declaredAmount base-unit bigint back to a human decimal string,
 * trimming trailing zeros (e.g. 80000n / 1_000_000 -> "0.08", 5_000_000n -> "5"). */
function formatDeclaredAmount(baseUnits: bigint, scale: number = DECLARED_AMOUNT_SCALE): string {
  const negative = baseUnits < 0n;
  const abs = negative ? -baseUnits : baseUnits;
  const whole = abs / BigInt(scale);
  const frac = abs % BigInt(scale);
  const scaleDigits = String(scale).length - 1;
  let fracStr = frac.toString().padStart(scaleDigits, "0").replace(/0+$/, "");
  const out = fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
  return negative ? `-${out}` : out;
}

function truncateToFit(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= 1) return text.slice(0, maxLen);
  return `${text.slice(0, maxLen - 1)}…`;
}

/**
 * Pure, deterministic tweet-text builder. No LLM call, no network call. `archived` is the
 * (possibly null) result of a prior `findArchivedSummary()` call — passed in rather than
 * looked up here so this function stays testable without any filesystem fixture.
 */
export function composeTweetText(input: ComposeTweetEventInput, archived: ArchivedSummaryMatch | null): string {
  const networkTag = input.network === "testnet" ? "[Testnet]" : "[Mainnet]";
  const symbol = resolveSymbolForAddress(input.token, input.network) ?? input.token;

  const parts: string[] = [`${networkTag} ${input.eventTypeLabel} — ${symbol}`];

  if (input.declaredAmountAgreement > 0) {
    const amount = formatDeclaredAmount(input.declaredAmount);
    const currency = input.currency.trim();
    parts.push(currency.length > 0 ? `Amount: ${amount} ${currency}` : `Amount: ${amount}`);
  }

  const link = input.txHash ? explorerTxUrl(input.txHash) : explorerAddressUrl(input.registryAddress);

  // Reserve space for the fixed parts + link before deciding how much of the summary fits.
  const fixedWithoutSummary = [...parts, link].join(" | ");
  const budgetForSummary = MAX_TWEET_LENGTH - fixedWithoutSummary.length - 3; // " | " separator

  let summaryText: string | null = null;
  if (archived && budgetForSummary > 10) {
    summaryText = truncateToFit(archived.summary, budgetForSummary);
  } else if (!archived) {
    // Deterministic fallback template — never blocks on a missing/empty archive.
    // Public-facing product name (T0.5). The historical AFTERHOURS name stays in deployed
    // contract names, systemd units and on-chain source schemes, but never in new copy a
    // reader sees.
    const fallback = `Event #${input.eventId} recorded on Tinjau.`;
    if (budgetForSummary > 10) summaryText = truncateToFit(fallback, budgetForSummary);
  }

  const finalParts = summaryText ? [...parts, summaryText, link] : [...parts, link];
  const text = finalParts.join(" | ");
  return truncateToFit(text, MAX_TWEET_LENGTH);
}
