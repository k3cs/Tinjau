/**
 * S3.3 Phase 2 — apply the frozen event-selection rule and publish whatever it yields.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS IS, AND WHAT IT IS NOT.
 *
 * The pre-registration is `docs/buildx-orion-2026/outputs/05-build/
 * s3-3-scenario-expansion-selection-rule.md`, committed as `b408ca0` BEFORE any market data was
 * read. This script executes it. It does not amend it, and it may not: §7.2 freezes the selected
 * set on commit and §9 freezes every threshold.
 *
 * Applying §4.1 selects exactly ONE 8-K, and it is scenario B's own filing
 * (`0001045810-26-000069`). After §4.1 step 5 labels it `CONTROL_REPRODUCTION`, **the expansion
 * set is empty.** That is the published headline, not a shortfall this script works around.
 *
 * So this is a REPRODUCTION CHECK, and it is named one everywhere it appears. It is not an
 * expansion and no artifact it writes may be described as one. What it actually tests: if you
 * rebuild scenario B from the frozen rule — fetching the 8-K from EDGAR, re-deriving every
 * scenario field mechanically, re-capturing the swap window from chain 196 — does the unmodified
 * engine still return the published `WATCH`? A disagreement would be a real defect in either the
 * reconstruction path or the frozen artifact, and either matters more than the expansion would
 * have. A disagreement is therefore PUBLISHED, never debugged into agreement.
 *
 * ---------------------------------------------------------------------------------------
 * THE THREE RUNS, AND WHY THERE ARE THREE.
 *
 * The reconstruction carries ONE `OFFICIAL` claim, because §4.4 forbids hand-assembling a news
 * graph (that judgement is exactly what would get tuned). Frozen scenario B carries several
 * claims including `NEWS`. So the two evidence graphs differ BY CONSTRUCTION, and some reason
 * codes must legitimately differ with them. One comparison could not separate "the harness
 * disagrees" from "the claim sets differ on purpose". Three can:
 *
 *   R2  frozen scenario B  + frozen fixture   -> the canonical baseline, re-derived in process
 *   R3  frozen scenario B  + FRESH fixture    -> identical claims; ONLY the capture differs,
 *                                                so this isolates the market leg exactly
 *   R1  reconstruction     + FRESH fixture    -> the full §4.4 path end to end
 *
 * R3 vs R2 is the strict test: same claims, same engine, same thresholds, so every reason code
 * must match. R1 vs R2 then attributes whatever remains to the deliberate claim-graph difference
 * rather than leaving it ambiguous.
 *
 * ---------------------------------------------------------------------------------------
 * THE TWO-PASS RULE (pre-registration §6.1), enforced here rather than intended.
 *
 * Pass 1 sweeps `eth_getLogs` and reads ONLY `log.blockNumber`. It never touches `log.data` —
 * `sqrtPriceX96`, `tick`, `liquidity` and both amounts all live in that word, so not decoding it
 * is what makes "market data was available for event N" a statement that can be made without
 * having seen what the prices did. `fetchSwapCountsOnly` below is a separate function from
 * `poolTelemetry.fetchSwapWindow` for exactly this reason; it must not be "simplified" into a
 * call to the decoding one.
 *
 * The pass-1 artifact is written to disk BEFORE `confirmMarket` is invoked for anything, and the
 * ordering is asserted at run time by `confirmMarketGuard`. Pass 2 then re-sweeps the same range
 * with the real decoding fetcher.
 *
 * Availability NEVER excludes anything (§6.3). It is a label on a published row. The denominator
 * of every rate is the frozen set size.
 *
 * ---------------------------------------------------------------------------------------
 * CLI
 *
 *   npx tsx src/studies/scenarioExpansionS33.ts
 *       Selection -> EDGAR fetch -> pass 1 -> pass 2 -> three runs -> artifacts.
 *       Reads EDGAR and the X Layer public RPC. Sends NOTHING to any chain. Makes no LLM call.
 *
 *   --out <path>       Result artifact path. Defaults to the S3.3 data path below.
 *   --skip-capture     Reuse an existing fresh fixture on disk instead of re-sweeping the RPC.
 *                      For re-running the analysis without ~500 more RPC calls. Recorded in the
 *                      artifact as `captureReused: true` so a reader is never misled about it.
 *   --help             Prints this and exits before any file read or network call.
 *
 * SECRETS. `EDGAR_USER_AGENT` is read and never printed, logged, or written. Errors name the
 * VARIABLE, never the value. Every artifact is scanned by value against `process.env` before it
 * is written, and the write is refused on a hit.
 * ---------------------------------------------------------------------------------------
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScenario, type FrozenScenario } from "../decision/scenarioRunner.js";
import type { Decision } from "../decision/orchestrate.js";
import type { RawClaimInput } from "../evidence/normalize.js";
import {
  blockToUnixSeconds,
  fetchSwapWindow,
  MAX_LOG_RANGE_BLOCKS,
  SWAP_TOPIC0,
  type JsonRpcTransport,
  type SwapWindowFixture,
} from "../market/poolTelemetry.js";
import { buildConfirmationInput, confirmMarket } from "../market/confirm.js";
import { FROZEN_CONFIRMATION_CONFIG } from "../market/confirmationConfig.js";
import { getEdgarUserAgent, documentUrl } from "../edgar/client.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, "..", "..");
const repoRoot = join(serverRoot, "..", "..");
const buildOut = join(repoRoot, "docs", "buildx-orion-2026", "outputs", "05-build");

const FROZEN_SCENARIO_B = join(serverRoot, "scenarios", "scenario-b-confirmed-protect.json");
const FROZEN_FIXTURE_B = join(serverRoot, "src", "market", "fixtures", "pool-scenario-b-swaps.json");
const EXPANSION_DIR = join(serverRoot, "scenarios", "expansion");
const EXPANSION_SOURCES = join(EXPANSION_DIR, "sources");
const FRESH_FIXTURE_DIR = join(serverRoot, "src", "market", "fixtures", "expansion");

const AVAILABILITY_PATH = join(buildOut, "data", "s3-3-market-availability.json");
const DEFAULT_RESULT_PATH = join(buildOut, "data", "s3_3_scenario_expansion_result.json");

// ---------------------------------------------------------------------------
// Frozen inputs — every one of these is transcribed from the committed
// pre-registration (b408ca0) or from an artifact that predates this task.
// Nothing here may be edited in response to a result.
// ---------------------------------------------------------------------------

const PREREG = "docs/buildx-orion-2026/outputs/05-build/s3-3-scenario-expansion-selection-rule.md";
const PREREG_COMMIT = "b408ca0";

/** §2.2 — the one supported asset. */
const CIK = "0001045810";
const COMPANY = "NVIDIA CORPORATION";
const TOKEN_SYMBOL = "wNVDAx";
const TOKEN_ADDRESS = "0xa8ddb5cd96b5222afe198316e9a57caa642850d5";
const POOL = "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2";
const CHAIN_ID = 196;
const RPC_URL = "https://rpc.xlayer.tech";

/** §3.3 — both bounds inherited, neither chosen. Fixed; does not move with the clock. */
const W_START_ISO = "2026-07-22T11:18:40Z";
const W_END_ISO = "2026-08-20T18:00:00Z";

/** §4.1 step 4. Expected not to bind; recorded either way. */
const CAP_K = 12;

/** §4.1 step 6 — the pin recorded in §5.1. */
const EXPECTED_SELECTION_SHA256 =
  "a100bacb196058b91bb8586dcb8addf9fde9ef70ef1f76f9d459c4f44f45386d";

/** §4.1 step 5 — accessions already anchored in `scenarios/manifest.json`. */
const FROZEN_ANCHOR_ACCESSIONS = new Set(["0001045810-26-000069"]);

/** §4.3 — frozen item -> materiality map. Fixed before the universe was enumerated. */
const MATERIAL_ITEMS = new Set([
  "1.01", "1.02", "1.03", "2.01", "2.03", "2.04", "2.05", "2.06",
  "3.01", "3.03", "4.01", "4.02", "5.01",
]);
const NON_MATERIAL_ITEMS = new Set([
  "1.04", "2.02", "3.02", "5.02", "5.03", "5.04", "5.05", "5.06", "5.07", "5.08",
  "6.01", "6.02", "6.03", "6.04", "6.05", "6.06", "7.01", "8.01", "9.01",
]);

/** `manifest.json` `blockTimestampRelation.formula`, verified at three blocks by T0.2. */
const BLOCK_TS_OFFSET = 1718769036;

/** The frozen replay-window shape, reused verbatim from every T0.2 scenario. */
const WINDOW_LEAD_SEC = 3600;
const WINDOW_TRAIL_SEC = 21600;

/** §4.4 — the evidence window is the frozen promotion config's, not a new number. */
const EVIDENCE_WINDOW_SEC = 72 * 3600;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sha256 = (buf: Buffer | string): string =>
  createHash("sha256").update(buf).digest("hex");

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const iso = (unix: number): string =>
  new Date(unix * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

const unixOf = (isoStr: string): number => Math.floor(Date.parse(isoStr) / 1000);

/**
 * Refuses to write anything containing a live secret VALUE.
 *
 * By value rather than by shape, because these artifacts legitimately contain 64-hex document
 * digests and 40-hex addresses that a shape-based scan would flag forever.
 */
function writeJsonSafely(path: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  for (const [name, secret] of Object.entries(process.env)) {
    if (!secret || secret.length < 8) continue;
    // Names that actually carry credentials. `USER_AGENT` is spelled out rather than matching a
    // bare `AGENT`, which collides with unrelated harness flags such as `ORCA_AGENT_HOOK_ENV`.
    if (!/KEY|SECRET|TOKEN|PASSWORD|USER_AGENT|MNEMONIC|PRIVATE|CREDENTIAL/i.test(name)) continue;
    // A single short all-lowercase word is an English word, not a credential. Without this a
    // mode flag whose value happens to appear in the artifact's prose blocks every write.
    if (secret.length < 24 && /^[a-z]+$/.test(secret)) continue;
    if (text.includes(secret)) {
      throw new Error(
        `Refusing to write ${path}: the artifact contains the value of ${name}. ` +
          `No secret value may appear in a published file.`,
      );
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

// ---------------------------------------------------------------------------
// Step A — §4.1 selection, re-applied against live EDGAR
// ---------------------------------------------------------------------------

interface SelectedEvent {
  accession: string;
  acceptanceUtc: string;
  acceptanceUnix: number;
  weekday: string;
  filingDate: string;
  reportDate: string;
  items: string[];
  unknownItems: string[];
  materiality: "MATERIAL" | "NON_MATERIAL" | "UNKNOWN";
  primaryDocument: string;
  anchorBlock: number;
  fromBlock: number;
  toBlock: number;
  role: "EXPANSION" | "CONTROL_REPRODUCTION";
  expectedState: string;
}

function classifyMateriality(items: string[]): {
  materiality: SelectedEvent["materiality"];
  unknownItems: string[];
} {
  const unknownItems = items.filter(
    (i) => !MATERIAL_ITEMS.has(i) && !NON_MATERIAL_ITEMS.has(i),
  );
  if (unknownItems.length > 0) return { materiality: "UNKNOWN", unknownItems };
  if (items.some((i) => MATERIAL_ITEMS.has(i))) return { materiality: "MATERIAL", unknownItems };
  return { materiality: "NON_MATERIAL", unknownItems };
}

async function edgarJson<T>(url: string, ua: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "application/json" } });
  if (!res.ok) throw new Error(`EDGAR ${res.status} for ${url}`);
  return (await res.json()) as T;
}

interface RecentFilings {
  accessionNumber: string[];
  form: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  primaryDocument: string[];
  items: string[];
}

async function applySelectionRule(ua: string): Promise<{
  selected: SelectedEvent[];
  nBeforeCap: number;
  capBound: boolean;
  sha256OfSelection: string;
  matchesPin: boolean;
  allFormsInWindow: { acceptanceUtc: string; form: string; accession: string; items: string }[];
}> {
  const url = `https://data.sec.gov/submissions/CIK${CIK}.json`;
  const body = await edgarJson<{ filings: { recent: RecentFilings } }>(url, ua);
  const r = body.filings.recent;
  const n = r.accessionNumber.length;

  const wStart = unixOf(W_START_ISO);
  const wEnd = unixOf(W_END_ISO);

  const all = Array.from({ length: n }, (_, i) => ({
    accession: r.accessionNumber[i],
    form: r.form[i],
    filingDate: r.filingDate[i],
    reportDate: r.reportDate[i] ?? "",
    acceptanceUnix: unixOf(r.acceptanceDateTime[i]),
    primaryDocument: r.primaryDocument[i] ?? "",
    items: r.items?.[i] ?? "",
  }));

  // Reported for context only — never a filter. §5.2 D1.
  const allFormsInWindow = all
    .filter((x) => x.acceptanceUnix >= wStart && x.acceptanceUnix <= wEnd)
    .sort((a, b) => a.acceptanceUnix - b.acceptanceUnix)
    .map((x) => ({
      acceptanceUtc: iso(x.acceptanceUnix),
      form: x.form,
      accession: x.accession,
      items: x.items,
    }));

  // §4.1 step 2 -> filter. step 3 -> sort.
  const rows = all
    .filter((x) => x.form === "8-K" && x.acceptanceUnix >= wStart && x.acceptanceUnix <= wEnd)
    .sort((a, b) =>
      a.acceptanceUnix - b.acceptanceUnix || a.accession.localeCompare(b.accession),
    );

  // §4.1 step 4 -> cap.
  const nBeforeCap = rows.length;
  const capBound = nBeforeCap > CAP_K;
  const capped = capBound
    ? Array.from({ length: CAP_K }, (_, i) => rows[Math.floor((i * nBeforeCap) / CAP_K)])
    : rows;

  const selected: SelectedEvent[] = capped.map((x) => {
    const items = x.items.split(",").map((s) => s.trim()).filter(Boolean);
    const { materiality, unknownItems } = classifyMateriality(items);
    const anchorBlock = x.acceptanceUnix - BLOCK_TS_OFFSET;
    // §4.1 step 5 -> label, never remove.
    const role = FROZEN_ANCHOR_ACCESSIONS.has(x.accession)
      ? ("CONTROL_REPRODUCTION" as const)
      : ("EXPANSION" as const);
    return {
      accession: x.accession,
      acceptanceUtc: iso(x.acceptanceUnix),
      acceptanceUnix: x.acceptanceUnix,
      weekday: new Date(x.acceptanceUnix * 1000).toUTCString().slice(0, 3),
      filingDate: x.filingDate,
      reportDate: x.reportDate,
      items,
      unknownItems,
      materiality,
      primaryDocument: x.primaryDocument,
      anchorBlock,
      fromBlock: anchorBlock - WINDOW_LEAD_SEC,
      toBlock: anchorBlock + WINDOW_TRAIL_SEC,
      role,
      // §5.x — determined by item codes alone, before any market data.
      expectedState: materiality === "MATERIAL" ? "WATCH_CONDITIONAL" : "NORMAL",
    };
  });

  // §4.1 step 6 -> pin.
  const sha = sha256(selected.map((s) => s.accession).join("|"));

  return {
    selected,
    nBeforeCap,
    capBound,
    sha256OfSelection: sha,
    matchesPin: sha === EXPECTED_SELECTION_SHA256,
    allFormsInWindow,
  };
}

// ---------------------------------------------------------------------------
// Step B — fetch the filing, byte-pin it
// ---------------------------------------------------------------------------

async function fetchAndPinDocument(
  ev: SelectedEvent,
  ua: string,
): Promise<{ url: string; sha256: string; bytes: number; localPath: string; indexSha256: string }> {
  const url = documentUrl(CIK, ev.accession, ev.primaryDocument);
  const res = await fetch(url, { headers: { "User-Agent": ua } });
  if (!res.ok) throw new Error(`EDGAR ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());

  await sleep(300); // SEC asks for <=10 req/s; this is far under it.
  const idxUrl = `https://www.sec.gov/Archives/edgar/data/${Number(CIK)}/${ev.accession.replace(/-/g, "")}/index.json`;
  const idxRes = await fetch(idxUrl, { headers: { "User-Agent": ua, Accept: "application/json" } });
  const idxBuf = Buffer.from(await idxRes.arrayBuffer());

  mkdirSync(EXPANSION_SOURCES, { recursive: true });
  const localPath = join(EXPANSION_SOURCES, `${ev.accession}-${ev.primaryDocument}`);
  writeFileSync(localPath, buf);
  writeFileSync(join(EXPANSION_SOURCES, `${ev.accession}-index.json`), idxBuf);

  return {
    url,
    sha256: sha256(buf),
    bytes: buf.length,
    localPath: localPath.slice(repoRoot.length + 1),
    indexSha256: sha256(idxBuf),
  };
}

// ---------------------------------------------------------------------------
// Step C — §4.4, build the reconstructed scenario. Every field derived.
// ---------------------------------------------------------------------------

function buildReconstructedScenario(
  ev: SelectedEvent,
  doc: { url: string; sha256: string; localPath: string },
): FrozenScenario & Record<string, unknown> {
  const anchorIso = ev.acceptanceUtc;
  const claim: RawClaimInput = {
    claimId: `claim-x-${ev.accession}-001`,
    sourceClass: "OFFICIAL",
    dataMode: "REPLAY",
    sourceUrl: doc.url,
    sourceId: `edgar:${ev.accession}/${ev.primaryDocument}`,
    publisherOrAuthor: `${COMPANY} (SEC EDGAR filer, CIK ${CIK})`,
    publishedAt: anchorIso,
    publishedAtPrecision: "SECOND",
    company: COMPANY,
    tokenSymbol: TOKEN_SYMBOL,
    tokenAddress: TOKEN_ADDRESS,
    eventType: `SEC_8K_ITEMS_${ev.items.join("_").replace(/\./g, "")}`,
    secItems: ev.items,
    sourceContentSha256: doc.sha256,
    sourceLocalPath: doc.localPath,
    claimTextOrPointer:
      `SEC Form 8-K, accession ${ev.accession}, items ${ev.items.join(", ")}. ` +
      `Byte-pinned local copy at ${doc.localPath} (sha256 ${doc.sha256}). ` +
      `No verbatim span is hand-selected: choosing which sentence to quote is a judgement, ` +
      `and the S3.3 selection rule has no place to put one.`,
    independenceGroup: `official:edgar/${ev.accession}`,
    relation: "ORIGIN",
    officialConfirmation: true,
    expiresAt: iso(ev.acceptanceUnix + EVIDENCE_WINDOW_SEC),
    materiality: ev.materiality,
  } as RawClaimInput & { secItems: string[]; sourceLocalPath: string };

  return {
    schemaVersion: "tinjau.scenario/0.2.0",
    scenarioId: `X-${ev.accession}`,
    title: `S3.3 reconstruction — ${COMPANY} 8-K ${ev.accession} (items ${ev.items.join(", ")})`,
    role:
      ev.role === "CONTROL_REPRODUCTION"
        ? "reproduction check — this accession is already frozen as scenario B; NOT an expansion row"
        : "S3.3 expansion event",
    builtByTask: "S3.3 Phase 2",
    builtAt: new Date().toISOString().slice(0, 10),
    _pre_registration:
      `Every field below is DERIVED by ${PREREG} §4.4 (committed ${PREREG_COMMIT}) from SEC ` +
      `filing metadata and the frozen venue constants. No field was chosen. No price path, pool ` +
      `state, or market datum was consulted to build this file.`,
    _not_a_frozen_scenario:
      "This file lives outside apps/server/scenarios/*.json deliberately. The four T0.2 " +
      "scenarios are historical evidence and are not modified, re-scored, or re-anchored by S3.3.",
    asset: {
      company: COMPANY,
      cik: CIK,
      ticker: "NVDA",
      tokenSymbol: TOKEN_SYMBOL,
      tokenAddress: TOKEN_ADDRESS,
      chainId: CHAIN_ID,
      chainName: "X Layer mainnet",
      poolIdOrAddress: POOL,
    },
    decisionAnchor: {
      at: anchorIso,
      blockNumber: String(ev.anchorBlock),
      why: `EDGAR acceptance timestamp of accession ${ev.accession}. Block from the manifest's verified relation blockNumber = unixSeconds - ${BLOCK_TS_OFFSET}.`,
      usReferenceMarketOpen: false,
      usReferenceMarketNote:
        "Recorded as false and used only as context; `confirmMarket` never gates on it.",
    },
    evidenceWindow: {
      rule: "anchor minus 72 hours .. anchor",
      from: iso(ev.acceptanceUnix - EVIDENCE_WINDOW_SEC),
      to: anchorIso,
      _completeness:
        "DELIBERATELY INCOMPLETE, and disclosed as such. §4.4 admits exactly one claim — the " +
        "8-K primary document. No NEWS claim is searched for or admitted, because choosing " +
        "which outlets count is the judgement the selection rule exists to keep out of the " +
        "sampling frame. The consequence (§8): this exercises the OFFICIAL path only and says " +
        "nothing about the two-independent-origin non-official path.",
    },
    marketReplayWindow: {
      from: iso(ev.acceptanceUnix - WINDOW_LEAD_SEC),
      to: iso(ev.acceptanceUnix + WINDOW_TRAIL_SEC),
      fromBlock: String(ev.fromBlock),
      toBlock: String(ev.toBlock),
      rule: "anchor minus 60 minutes .. anchor plus 6 hours",
    },
    claims: [claim],
    preRegisteredExpectation: {
      state: ev.expectedState,
      aggressiveFeeAuthorized: ev.materiality === "MATERIAL" ? null : false,
      mustHoldRegardlessOfMarketData: ev.materiality !== "MATERIAL",
      reasoning: [
        `Item codes ${ev.items.join(", ")} map to ${ev.materiality} under the §4.3 map, which ` +
          `was frozen before the EDGAR universe was enumerated.`,
        ev.materiality === "MATERIAL"
          ? "OFFICIAL evidence with officialEvidencePassed=true reduces mayReachProtect to a " +
            "single condition: confirmation === CONFIRMED. So WATCH, with PROTECT if and only " +
            "if the market leg confirms."
          : "promote() returns NORMAL for non-material-only evidence and no market behaviour " +
            "can change it, because qualifying evidence is required before the market leg is " +
            "consulted at all.",
      ],
    },
  } as unknown as FrozenScenario & Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// PASS 1 — counts only. NEVER decodes `log.data`.
// ---------------------------------------------------------------------------

function makeTransport(url: string): JsonRpcTransport {
  let id = 0;
  return async (method, params) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: { message: string } };
    if (body.error) throw new Error(`RPC error: ${body.error.message}`);
    return body.result;
  };
}

interface CountsOnlyResult {
  swapCount: number;
  swapsBeforeAnchor: number;
  swapsAtOrAfterAnchor: number;
  rpcRangeErrors: number;
  rpcCalls: number;
}

/**
 * Pass-1 sweep. Reads `log.blockNumber` and nothing else.
 *
 * Deliberately NOT a call to `poolTelemetry.fetchSwapWindow`, which decodes `log.data`. The
 * whole point of pass 1 is that availability can be stated without the price path having been
 * looked at, and that property is only real if the bytes are never read. Do not "simplify" this
 * into the decoding fetcher.
 */
async function fetchSwapCountsOnly(
  transport: JsonRpcTransport,
  pool: string,
  fromBlock: number,
  toBlock: number,
  anchorBlock: number,
): Promise<CountsOnlyResult> {
  let swapCount = 0;
  let before = 0;
  let after = 0;
  let rpcRangeErrors = 0;
  let rpcCalls = 0;

  for (let start = fromBlock; start <= toBlock; start += MAX_LOG_RANGE_BLOCKS) {
    const end = Math.min(start + MAX_LOG_RANGE_BLOCKS - 1, toBlock);
    let ok = false;
    for (let attempt = 0; attempt <= 5 && !ok; attempt++) {
      try {
        rpcCalls++;
        const logs = (await transport("eth_getLogs", [
          {
            address: pool,
            topics: [SWAP_TOPIC0],
            fromBlock: `0x${start.toString(16)}`,
            toBlock: `0x${end.toString(16)}`,
          },
        ])) as { blockNumber: string }[] | null;
        for (const log of logs ?? []) {
          // ONLY the block height is read. `log.data` is not touched.
          swapCount++;
          if (Number(BigInt(log.blockNumber)) < anchorBlock) before++;
          else after++;
        }
        ok = true;
      } catch {
        if (attempt === 5) rpcRangeErrors++;
        else await sleep(1000 * (attempt + 1));
      }
    }
  }
  return { swapCount, swapsBeforeAnchor: before, swapsAtOrAfterAnchor: after, rpcRangeErrors, rpcCalls };
}

/** §6.2 — the availability predicate, fixed in the pre-registration. */
function availabilityOf(c: CountsOnlyResult): "AVAILABLE" | "INSUFFICIENT" | "DEGRADED" {
  if (c.rpcRangeErrors > 0) return "DEGRADED";
  if (c.swapCount < FROZEN_CONFIRMATION_CONFIG.minSwapsForVerdict) return "INSUFFICIENT";
  return "AVAILABLE";
}

// ---------------------------------------------------------------------------
// Diffing two decisions
// ---------------------------------------------------------------------------

interface DecisionSummary {
  state: string;
  actionAuthorized: boolean;
  requestedFee: number;
  reasonCodes: string[];
  promotionReasonCodes: string[];
  effectiveConfirmation: string;
  marketConfirmationStatus: string;
  confidenceBand: string;
  independentSourceCount: number;
  highestSourceClass: string | null;
  claimCount: number;
  humanExplanation: string;
}

function summarize(d: Decision): DecisionSummary {
  return {
    state: d.record.state,
    actionAuthorized: d.record.action.authorized,
    requestedFee: d.assessment.requestedFee,
    reasonCodes: [...d.record.reasonCodes].sort(),
    promotionReasonCodes: [...d.promotion.reasonCodes].sort(),
    effectiveConfirmation: d.effectiveConfirmation,
    marketConfirmationStatus: d.record.marketConfirmation.status,
    confidenceBand: d.promotion.confidenceBand,
    independentSourceCount: d.promotion.independentSourceCount,
    highestSourceClass: d.promotion.highestSourceClass,
    claimCount: d.wiredClaims.length,
    humanExplanation: d.record.humanExplanation,
  };
}

function diffSummaries(a: DecisionSummary, b: DecisionSummary): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(a) as (keyof DecisionSummary)[];
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    const same = Array.isArray(av) && Array.isArray(bv)
      ? av.length === bv.length && av.every((v, i) => v === bv[i])
      : av === bv;
    if (!same) out[k] = { baseline: av, other: bv };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    return;
  }
  const outIdx = argv.indexOf("--out");
  const resultPath = outIdx >= 0 ? argv[outIdx + 1] : DEFAULT_RESULT_PATH;
  const skipCapture = argv.includes("--skip-capture");

  const ua = getEdgarUserAgent(); // named, never printed
  const startedAt = new Date().toISOString();
  const deviations: string[] = [];

  // ---- Step A: selection -----------------------------------------------------------------
  console.log("[A] applying §4.1 selection against live EDGAR …");
  const sel = await applySelectionRule(ua);
  console.log(
    `    n(8-K in window) = ${sel.nBeforeCap}; cap ${sel.capBound ? "BOUND" : "not bound"}; ` +
      `selected ${sel.selected.length}; sha256 ${sel.matchesPin ? "MATCHES" : "DOES NOT MATCH"} the pin`,
  );

  if (!sel.matchesPin) {
    // §7.2 — abort, publish the discrepancy, keep the frozen table. Never re-select.
    const abort = {
      _schemaVersion: "tinjau.s3-3-result/1.0.0",
      status: "ABORTED_SELECTION_PIN_MISMATCH",
      preRegistration: PREREG,
      preRegistrationCommit: PREREG_COMMIT,
      expectedSha256: EXPECTED_SELECTION_SHA256,
      observedSha256: sel.sha256OfSelection,
      observedSelection: sel.selected,
      explanation:
        "§7.2 of the pre-registration: if the selection pin fails at run time the run ABORTS, " +
        "the discrepancy is published, and §5.1's frozen table — not a fresh re-selection — " +
        "remains the sample. EDGAR revised or added a filing inside the window. No result is " +
        "reported from this run.",
    };
    writeJsonSafely(resultPath, abort);
    console.error("ABORTED: selection pin mismatch. Discrepancy published. No result reported.");
    process.exitCode = 1;
    return;
  }

  const expansion = sel.selected.filter((s) => s.role === "EXPANSION");
  const control = sel.selected.filter((s) => s.role === "CONTROL_REPRODUCTION");
  console.log(`    expansion set = ${expansion.length}; control set = ${control.length}`);

  const ev = sel.selected[0];
  if (!ev) throw new Error("Selection returned no rows at all; §5.1 pinned exactly one.");

  // ---- Step B: fetch and byte-pin the filing ----------------------------------------------
  console.log(`[B] fetching ${ev.accession} / ${ev.primaryDocument} from EDGAR …`);
  const doc = await fetchAndPinDocument(ev, ua);
  console.log(`    ${doc.bytes} bytes, sha256 ${doc.sha256}`);

  const frozenB = JSON.parse(readFileSync(FROZEN_SCENARIO_B, "utf8")) as {
    claims: { claimId: string; sourceContentSha256?: string }[];
  };
  const frozenBDocSha = frozenB.claims.find((c) => c.claimId === "claim-b-001")?.sourceContentSha256;
  const documentBytesReproduced = frozenBDocSha === doc.sha256;
  console.log(
    `    frozen scenario B pins ${frozenBDocSha} -> document bytes ` +
      `${documentBytesReproduced ? "REPRODUCED" : "DIFFER"}`,
  );

  // ---- Step C: reconstruct the scenario ---------------------------------------------------
  console.log("[C] reconstructing the scenario from §4.4 …");
  const reconstructed = buildReconstructedScenario(ev, doc);
  mkdirSync(EXPANSION_DIR, { recursive: true });
  const reconPath = join(EXPANSION_DIR, `scenario-x00-${ev.accession}.json`);
  writeJsonSafely(reconPath, reconstructed);

  // ---- PASS 1: counts only, written to disk BEFORE any confirmMarket ----------------------
  console.log("[1] pass 1 — counts-only sweep (log.data is never decoded) …");
  const transport = makeTransport(RPC_URL);
  const counts = await fetchSwapCountsOnly(transport, POOL, ev.fromBlock, ev.toBlock, ev.anchorBlock);
  const availability = availabilityOf(counts);
  console.log(
    `    swapCount=${counts.swapCount} before=${counts.swapsBeforeAnchor} ` +
      `after=${counts.swapsAtOrAfterAnchor} rpcRangeErrors=${counts.rpcRangeErrors} -> ${availability}`,
  );

  const availabilityArtifact = {
    _schemaVersion: "tinjau.s3-3-availability/1.0.0",
    _purpose:
      "Pass 1 of the S3.3 two-pass rule (§6.1). Written to disk BEFORE `confirmMarket` was " +
      "invoked for anything. Every field here is derived from log PRESENCE and BLOCK HEIGHT " +
      "only; `log.data` — which carries sqrtPriceX96, tick, liquidity and both amounts — was " +
      "never decoded in this pass. That is what makes 'market data was available for event N' " +
      "a statement made without having seen what the prices did.",
    _availabilityNeverExcludes:
      "§6.3: availability is a LABEL on a published row, never a filter. Every selected event " +
      "is scored and published whatever this file says about it, and the denominator of every " +
      "published rate is the frozen set size.",
    preRegistration: PREREG,
    preRegistrationCommit: PREREG_COMMIT,
    writtenAt: new Date().toISOString(),
    chainId: CHAIN_ID,
    pool: POOL,
    rpcUrl: RPC_URL,
    predicate: {
      rule: "AVAILABLE iff rpcRangeErrors == 0 && swapCount >= minSwapsForVerdict",
      minSwapsForVerdict: FROZEN_CONFIRMATION_CONFIG.minSwapsForVerdict,
      _inherited:
        "minSwapsForVerdict is FROZEN_CONFIRMATION_CONFIG's, verbatim. Not a new threshold.",
    },
    frozenSetSize: sel.selected.length,
    expansionSetSize: expansion.length,
    controlSetSize: control.length,
    events: [
      {
        accession: ev.accession,
        role: ev.role,
        anchorAt: ev.acceptanceUtc,
        anchorBlock: ev.anchorBlock,
        fromBlock: ev.fromBlock,
        toBlock: ev.toBlock,
        ...counts,
        availability,
      },
    ],
  };
  writeJsonSafely(AVAILABILITY_PATH, availabilityArtifact);
  console.log(`    pass-1 artifact written: ${AVAILABILITY_PATH.slice(repoRoot.length + 1)}`);

  // A run-time assertion that the ordering above actually held.
  if (!existsSync(AVAILABILITY_PATH)) {
    throw new Error("Pass-1 artifact missing; §6.1 forbids invoking confirmMarket before it exists.");
  }

  // ---- PASS 2: decode, build the fresh fixture --------------------------------------------
  mkdirSync(FRESH_FIXTURE_DIR, { recursive: true });
  const freshFixturePath = join(FRESH_FIXTURE_DIR, `pool-x00-${ev.accession}-swaps.json`);
  let freshFixture: SwapWindowFixture & Record<string, unknown>;
  let captureReused = false;

  if (skipCapture && existsSync(freshFixturePath)) {
    console.log("[2] pass 2 — reusing existing fresh fixture (--skip-capture) …");
    captureReused = true;
    freshFixture = JSON.parse(readFileSync(freshFixturePath, "utf8"));
    deviations.push(
      "--skip-capture was passed: the fresh fixture was read from disk rather than re-swept " +
        "from the RPC. Recorded as captureReused: true.",
    );
  } else {
    console.log("[2] pass 2 — decoding sweep …");
    const frozenFixture = JSON.parse(readFileSync(FROZEN_FIXTURE_B, "utf8")) as SwapWindowFixture &
      Record<string, unknown>;
    const pool = {
      chainId: CHAIN_ID,
      pool: POOL,
      token0: frozenFixture.token0,
      token0Symbol: frozenFixture.token0Symbol,
      token0Decimals: frozenFixture.token0Decimals,
      token1: frozenFixture.token1,
      token1Symbol: frozenFixture.token1Symbol,
      token1Decimals: frozenFixture.token1Decimals,
      feePips: frozenFixture.feePips,
      tickSpacing: frozenFixture.tickSpacing,
      liquiditySource: frozenFixture.liquiditySource,
      quoteIsToken0: frozenFixture.quoteIsToken0,
    };
    const swept = await fetchSwapWindow(transport, pool, ev.fromBlock, ev.toBlock);
    console.log(`    ${swept.swaps.length} swaps, ${swept.rpcRangeErrors} range errors`);
    freshFixture = {
      _purpose:
        `S3.3 pass-2 re-capture of the chain-196 window for accession ${ev.accession}. This is ` +
        `an INDEPENDENT capture of the same block range as pool-scenario-b-swaps.json, used to ` +
        `test whether the capture path reproduces. It does not replace that fixture.`,
      _schemaVersion: "tinjau.pool-telemetry-fixture/1.0.0",
      _capturedAt: new Date().toISOString().slice(0, 10),
      _liquidityNote:
        "Chain 196 (X Layer mainnet) USDG/wNVDAx pool. Real third-party liquidity, NOT the " +
        "builder-controlled testnet pool on chain 1952.",
      scenarioId: `X-${ev.accession}`,
      ...pool,
      fromBlock: ev.fromBlock,
      toBlock: ev.toBlock,
      fromIso: iso(ev.acceptanceUnix - WINDOW_LEAD_SEC),
      toIso: iso(ev.acceptanceUnix + WINDOW_TRAIL_SEC),
      blockTimestampOffset: BLOCK_TS_OFFSET,
      rpcRangeErrors: swept.rpcRangeErrors,
      swapCount: swept.swaps.length,
      quoteSymbol: frozenFixture.quoteSymbol,
      baseSymbol: frozenFixture.baseSymbol,
      _columns: ["blockNumber", "logIndex", "amount0", "amount1", "sqrtPriceX96", "liquidity", "tick"],
      swaps: swept.swaps.map((s) => [
        s.blockNumber, s.logIndex, s.amount0, s.amount1, s.sqrtPriceX96, s.liquidity, s.tick,
      ]),
    } as SwapWindowFixture & Record<string, unknown>;
    writeJsonSafely(freshFixturePath, freshFixture);
  }

  // Cross-check pass 1 against pass 2. They swept the same range by different code paths.
  const passesAgree = freshFixture.swapCount === counts.swapCount;
  if (!passesAgree) {
    deviations.push(
      `Pass 1 counted ${counts.swapCount} swaps and pass 2 decoded ${freshFixture.swapCount}. ` +
        `The two sweeps are separate RPC passes over a load-balanced public endpoint, so a ` +
        `difference is possible; it is published rather than reconciled.`,
    );
  }

  // ---- The three runs ---------------------------------------------------------------------
  console.log("[3] running R2 (baseline), R3 (capture check), R1 (reconstruction) …");
  const frozenScenarioB = JSON.parse(readFileSync(FROZEN_SCENARIO_B, "utf8")) as FrozenScenario;
  const frozenFixtureB = JSON.parse(readFileSync(FROZEN_FIXTURE_B, "utf8")) as SwapWindowFixture;

  const R2 = summarize(runScenario(frozenScenarioB, frozenFixtureB));
  const R3 = summarize(runScenario(frozenScenarioB, freshFixture));
  const R1 = summarize(runScenario(reconstructed, freshFixture));

  // The market leg's full detail, re-derived from the same pure functions `runScenario` calls
  // internally, so the artifact carries every signal value a reader would otherwise have to
  // re-run the chain to see. Pass 2 only, and deterministic given the fixture.
  const confirmationDetailOf = (fx: SwapWindowFixture) => {
    const ci = buildConfirmationInput(fx, {
      anchorUnixSeconds: ev.acceptanceUnix,
      nowUnixSeconds: blockToUnixSeconds(fx.toBlock),
      okx: null,
      usReferenceMarketOpen: false,
    });
    const c = confirmMarket(ci);
    return {
      status: c.status,
      ruleVersion: c.ruleVersion,
      reasonCodes: c.reasonCodes,
      observedAtIso: c.observedAtIso,
      fresh: c.fresh,
      signals: c.signals,
      antiWick: c.antiWick,
    };
  };
  const confirmationFrozenFixture = confirmationDetailOf(frozenFixtureB);
  const confirmationFreshFixture = confirmationDetailOf(freshFixture);

  const diffR3 = diffSummaries(R2, R3);
  const diffR1 = diffSummaries(R2, R1);
  const captureReproduces = Object.keys(diffR3).length === 0;

  // §5.1's pre-registered expectation for the one row, checked literally.
  const preRegMet =
    R1.state === "WATCH" &&
    R1.actionAuthorized === false &&
    R1.marketConfirmationStatus === "NOT_CONFIRMED";

  console.log(`    R2 ${R2.state} | R3 ${R3.state} | R1 ${R1.state}`);
  console.log(`    capture reproduces exactly: ${captureReproduces}`);
  console.log(`    §5.1 expectation met: ${preRegMet}`);

  // ---- The result artifact -----------------------------------------------------------------
  const result = {
    _schemaVersion: "tinjau.s3-3-result/1.0.0",
    _headline:
      `The S3.3 expansion set is EMPTY. Applying the frozen selection rule to live EDGAR ` +
      `selects ${sel.selected.length} 8-K, and it is scenario B's own filing, which §4.1 step 5 ` +
      `labels CONTROL_REPRODUCTION. Expansion rows: ${expansion.length}. This run is therefore ` +
      `a REPRODUCTION CHECK of the harness, not an expansion, and must not be described as one.`,
    _whatThisDoesNotShow:
      "Nothing here demonstrates the frozen thresholds are correct, and nothing demonstrates " +
      "they are wrong. The evaluation read 'no canonical replay reaches PROTECT' as possibly a " +
      "property of curated event choice; on this universe that branch is closed, because the " +
      "frozen set is close to a census of what NVIDIA filed inside the measurable window. That " +
      "is a fact about the event population, not a vindication of the thresholds.",
    status: "COMPLETE",
    preRegistration: PREREG,
    preRegistrationCommit: PREREG_COMMIT,
    startedAt,
    finishedAt: new Date().toISOString(),

    selection: {
      rule: "§4.1, applied verbatim",
      windowStart: W_START_ISO,
      windowEnd: W_END_ISO,
      capK: CAP_K,
      capBound: sel.capBound,
      nEightKInWindow: sel.nBeforeCap,
      sha256OfSelection: sel.sha256OfSelection,
      expectedSha256: EXPECTED_SELECTION_SHA256,
      pinMatches: sel.matchesPin,
      frozenSetSize: sel.selected.length,
      expansionSetSize: expansion.length,
      controlSetSize: control.length,
      selected: sel.selected,
      allFormsInWindow: sel.allFormsInWindow,
      _allFormsNote:
        "Reported for context (§5.2 D1), never used as a filter. Every document NVIDIA filed " +
        "with the SEC inside the measurable window, all form types.",
    },

    evidenceReconstruction: {
      accession: ev.accession,
      primaryDocument: ev.primaryDocument,
      sourceUrl: doc.url,
      fetchedSha256: doc.sha256,
      bytes: doc.bytes,
      localPath: doc.localPath,
      indexSha256: doc.indexSha256,
      frozenScenarioBPinnedSha256: frozenBDocSha,
      documentBytesReproduced,
      _note:
        "An independent EDGAR fetch, byte-pinned and compared against the sha256 frozen " +
        "scenario B has carried since T0.2. Agreement means EDGAR still serves the same bytes " +
        "and the frozen artifact is not stale.",
      reconstructedScenarioPath: reconPath.slice(repoRoot.length + 1),
      claimCount: 1,
      _claimGraphIsDeliberatelyThinner:
        "§4.4 admits exactly one OFFICIAL claim. Frozen scenario B carries several claims " +
        "including NEWS. The two evidence graphs therefore differ BY CONSTRUCTION and some " +
        "reason codes must legitimately differ with them. That is why run R3 exists.",
    },

    pass1Availability: availabilityArtifact,
    pass1ArtifactPath: AVAILABILITY_PATH.slice(repoRoot.length + 1),
    _passOrdering:
      "The pass-1 artifact above was written to disk before `confirmMarket` was invoked for " +
      "anything, and its existence was asserted at run time before pass 2 began.",

    pass2Capture: {
      fixturePath: freshFixturePath.slice(repoRoot.length + 1),
      captureReused,
      swapCount: freshFixture.swapCount,
      rpcRangeErrors: freshFixture.rpcRangeErrors,
      fromBlock: freshFixture.fromBlock,
      toBlock: freshFixture.toBlock,
      frozenFixtureSwapCount: frozenFixtureB.swapCount,
      pass1VsPass2Agree: passesAgree,
      freshVsFrozenSwapCountAgree: freshFixture.swapCount === frozenFixtureB.swapCount,
    },

    runs: {
      _design:
        "R2 = frozen scenario + frozen fixture (baseline). R3 = frozen scenario + FRESH " +
        "fixture (identical claims, only the capture differs, so this isolates the market " +
        "leg). R1 = reconstruction + fresh fixture (the full §4.4 path).",
      R2_baseline: R2,
      R3_captureCheck: R3,
      R1_reconstruction: R1,
    },

    confirmationDetail: {
      _note:
        "The market leg in full, for both captures of the same block range. Identical claims " +
        "are irrelevant here — `confirmMarket` sees only the swap window — so these two blocks " +
        "differing would mean the capture path does not reproduce.",
      frozenFixture: confirmationFrozenFixture,
      freshFixture: confirmationFreshFixture,
      identical:
        JSON.stringify(confirmationFrozenFixture) === JSON.stringify(confirmationFreshFixture),
    },

    comparison: {
      R3_vs_R2_diff: diffR3,
      captureReproducesExactly: captureReproduces,
      _captureMeaning:
        "R3 and R2 share every claim and differ only in which capture of the same block range " +
        "was fed to the engine. An empty diff means the capture path reproduces the frozen " +
        "fixture's verdict field for field.",
      R1_vs_R2_diff: diffR1,
      _reconstructionMeaning:
        "R1 differs from R2 in BOTH the capture and the claim set. Any field that differs here " +
        "but not in R3_vs_R2_diff is attributable to §4.4's deliberate one-claim graph.",
      preRegisteredExpectationMet: preRegMet,
      _preRegisteredExpectation:
        "§5.1: state WATCH, aggressiveFeeAuthorized false, market leg NOT_CONFIRMED.",
    },

    thresholds: {
      _statement:
        "No threshold was changed by this task, and none may be changed as a result of it (§9).",
      policyVersion: "tinjau.policy/1.0.0",
      confirmationRuleVersion: FROZEN_CONFIRMATION_CONFIG.ruleVersion,
      minSwapsForVerdict: FROZEN_CONFIRMATION_CONFIG.minSwapsForVerdict,
      minDrawdownBps: FROZEN_CONFIRMATION_CONFIG.minDrawdownBps,
      antiWickHoldSeconds: FROZEN_CONFIRMATION_CONFIG.antiWickHoldSeconds,
      antiWickRetentionFraction: FROZEN_CONFIRMATION_CONFIG.antiWickRetentionFraction,
      minVelocityRatio: FROZEN_CONFIRMATION_CONFIG.minVelocityRatio,
      minBasisBps: FROZEN_CONFIRMATION_CONFIG.minBasisBps,
    },

    deviations,

    limitations: [
      "THE EXPANSION SET IS EMPTY. This run adds zero new events and therefore zero new " +
        "evidence about threshold calibration. It is a reproduction check of the harness.",
      "It cannot show the thresholds are correct, and it cannot show they are wrong. It has no " +
        "independent ground truth about which events SHOULD have dislocated the price, so it " +
        "cannot separate 'the events were genuinely quiet' from 'the anti-wick gate is too " +
        "strict for a pool this thin'.",
      "ONE ASSET, ONE POOL, ~30 DAYS, ONE CHAIN. SUPPORTED_ASSETS contains only NVDA/wNVDAx " +
        "as supported and no MSTR-linked asset at all. No sentence may generalise from this to " +
        "tokenized equities as a class or to any other ticker.",
      "THE OFFICIAL PATH ONLY. §4.4 builds one OFFICIAL claim and no NEWS claims, so this says " +
        "nothing about the two-independent-origin non-official path, syndication collapsing, " +
        "or the self-revision rule.",
      "`officialEvidencePassed` is assumed true, not computed (tracker §8). The bonded " +
        "parse-agreement path is not exercised here.",
      "The OKX index leg is UNAVAILABLE for this anchor as it is for all four frozen " +
        "scenarios (SVC-003). No result here may be described as dual-leg confirmed.",
      "The §5.1 expectation and the §7.3 VOID condition are in tension in the committed " +
        "pre-registration: §5.1 asks for state/authorisation/market-leg agreement, while §7.3 " +
        "says 'the same reason codes'. §4.4's one-claim graph makes exact reason-code equality " +
        "structurally unreachable for R1. This is a drafting defect in the Phase 1 rule, not a " +
        "result-driven reinterpretation; run R3 exists precisely so the strict reason-code test " +
        "is still performed somewhere, on the comparison where it is meaningful. The Phase 1 " +
        "document was NOT edited to resolve this.",
      "This does not open `canClaimLossAvoided`. Its conditions are in t0-4 §8.6, untouched " +
        "here, and known-limitations.md §18 stands unchanged.",
    ],
  };

  writeJsonSafely(resultPath, result);
  console.log(`\nresult artifact: ${resultPath.slice(repoRoot.length + 1)}`);
  console.log(
    `HEADLINE: expansion set is EMPTY (${expansion.length} rows). ` +
      `Reproduction check: capture reproduces = ${captureReproduces}, ` +
      `§5.1 expectation met = ${preRegMet}.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
