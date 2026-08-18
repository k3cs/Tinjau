/**
 * AFTERHOURS X (Twitter) bot process (task P5.3).
 *
 * Long-running, systemd-supervised process (`afterhours-xbot.service`) — structurally
 * decoupled from `agent.ts`/`afterhours-agent.service`: its own env files
 * (`common.env` + `xbot.secrets.env`, never `agent.secrets.env` or
 * `index-poller.secrets.env`), its own state directory (`${AFTERHOURS_STATE_DIR}/xbot/`),
 * its own credentials. Same discipline `src/index-poller/main.ts` already uses to stay
 * separate from `agent.ts`.
 *
 * POLLING MECHANISM: sequential ID scan via the registry's `nextEventId()` / `getEvent()`
 * view functions — NOT `eth_getLogs`. Every tick: read `nextEventId()`, then for each
 * unprocessed id in `[highestProcessedEventId+1, nextEventId()-1]`, call `getEvent(id)` and
 * hand it to `processEvent()`. Strictly sequential and strictly in order — the pointer is a
 * single ascending checkpoint, so a failure on one id blocks moving past it until the next
 * tick retries (see `tick()` below).
 *
 * COLD-START SEAL (mirrors `agent.ts`'s own cold-start-seal EXACTLY — this is the single
 * most important correctness property here, same as it is there). On first run — no
 * `${STATE_DIR}/xbot/state.json` yet — this process reads `nextEventId()` ONCE, seals
 * every event id that already exists (`1..nextEventId()-1`) as already-processed WITHOUT
 * composing or attempting a tweet for any of them, and persists that before anything else
 * happens. Only events first observed on a LATER tick are ever tweeted. Getting this wrong
 * means the very first run would tweet every event ever posted to the registry, including
 * ones from before this bot existed.
 *
 * DEFENSE-IN-DEPTH: before processing event id N, this checks
 * `${STATE_DIR}/xbot/posted/<N>.json` — if present (the process crashed between a
 * successful post and persisting the pointer in a PRIOR run), it just advances the pointer
 * without re-posting.
 *
 * MARK-PROCESSED-AFTER, NOT BEFORE. The pointer only advances once an event is FULLY
 * handled: posted (live), dry-run-logged, or permanently skipped by the mandatory
 * `sourceUrlGuard`. A transient `postToX` failure (auth/rate_limit/transient/bad_request)
 * never advances the pointer — the tick's id loop stops there and retries that same id on
 * the next tick.
 *
 * GRACEFUL SIGTERM. Matches `agent.ts`'s pattern: clear the interval timer immediately; if
 * a tick is mid-flight, wait for it to finish (state writes are atomic
 * write-to-temp-then-rename, so nothing is ever caught half-written) before flushing state
 * one more time and exiting 0. This is what makes `systemctl restart` safe.
 *
 * HEARTBEAT. Written after every tick, matching `src/index-poller/main.ts`'s own
 * heartbeat pattern, for a companion `afterhours-xbot-healthcheck` timer.
 *
 * Run standalone: `tsx src/xbot/main.ts` (requires AFTERHOURS_STATE_DIR in the
 * environment; requires X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_TOKEN_SECRET ONLY
 * when AFTERHOURS_XBOT_POST_MODE=live — the default, dry-run, needs none of them).
 */

import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { EVENT_STATE_REGISTRY_ABI } from "../chain/registryAbi.js";
import { getPublicClient, getRegistryAddress, withRpcRetry } from "../chain/client.js";
import { isRealSecFilingSourceUrl } from "./sourceUrlGuard.js";
import { composeTweetText, findArchivedSummary } from "./composeTweet.js";
import { postToX } from "./postToX.js";

// ---------------------------------------------------------------------------
// Config — fail fast on anything missing/invalid, before any I/O happens.
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[xbot] missing required env var: ${name} — refusing to start.`);
  }
  return v;
}

const STATE_DIR = requireEnv("AFTERHOURS_STATE_DIR");

const POST_MODE = (process.env.AFTERHOURS_XBOT_POST_MODE ?? "dry-run").trim();
if (POST_MODE !== "dry-run" && POST_MODE !== "live") {
  throw new Error(`[xbot] AFTERHOURS_XBOT_POST_MODE must be "dry-run" or "live", got: "${POST_MODE}"`);
}

const MIN_POLL_INTERVAL_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 60_000;

function getPollIntervalMs(): number {
  const raw = process.env.AFTERHOURS_XBOT_POLL_INTERVAL_MS;
  if (!raw) return DEFAULT_POLL_INTERVAL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[xbot] AFTERHOURS_XBOT_POLL_INTERVAL_MS must be a positive number, got: "${raw}"`);
  }
  if (parsed < MIN_POLL_INTERVAL_MS) {
    throw new Error(
      `[xbot] AFTERHOURS_XBOT_POLL_INTERVAL_MS=${parsed} is below the minimum of ${MIN_POLL_INTERVAL_MS}ms.`,
    );
  }
  return parsed;
}

const POLL_INTERVAL_MS = getPollIntervalMs();

// This bot only ever runs against testnet in this dispatch — never inferred, always an
// explicit config value threaded into composeTweetText().
const NETWORK: "testnet" | "mainnet" = "testnet";

// Only require the four X_* credentials when postMode is actually "live" — the service
// MUST start cleanly with zero X_* env vars set in dry-run mode (the only mode deployed by
// this dispatch: P0.1, creating the real X account, has not happened yet).
if (POST_MODE === "live") {
  requireEnv("X_API_KEY");
  requireEnv("X_API_SECRET");
  requireEnv("X_ACCESS_TOKEN");
  requireEnv("X_ACCESS_TOKEN_SECRET");
}

// ---------------------------------------------------------------------------
// State paths
// ---------------------------------------------------------------------------

const XBOT_DIR = join(STATE_DIR, "xbot");
const STATE_PATH = join(XBOT_DIR, "state.json");
const POSTED_DIR = join(XBOT_DIR, "posted");
const SKIPPED_DIR = join(XBOT_DIR, "skipped");
const HEARTBEAT_PATH = join(STATE_DIR, "health", "xbot-heartbeat.json");

function postedPath(id: bigint): string {
  return join(POSTED_DIR, `${id.toString()}.json`);
}

function skippedPath(id: bigint): string {
  return join(SKIPPED_DIR, `${id.toString()}.json`);
}

// ---------------------------------------------------------------------------
// Atomic JSON read/write helpers — write-to-temp-then-rename, matching agent.ts exactly.
// ---------------------------------------------------------------------------

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (err) {
    console.error(`[xbot] failed to parse ${path}, using fallback:`, err);
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
// Pointer state — highestProcessedEventId stored as a STRING (bigint-safe).
// ---------------------------------------------------------------------------

interface XbotState {
  highestProcessedEventId: string;
  sealedAt: string;
}

const stateFileExistedAtStart = existsSync(STATE_PATH);
let pointer = 0n; // highestProcessedEventId
let sealedAt = "";

function loadState(): void {
  const state = readJson<XbotState | null>(STATE_PATH, null);
  if (state) {
    pointer = BigInt(state.highestProcessedEventId);
    sealedAt = state.sealedAt;
  }
}

function persistState(): void {
  writeJsonAtomic(STATE_PATH, {
    highestProcessedEventId: pointer.toString(),
    sealedAt,
  } satisfies XbotState);
}

// ---------------------------------------------------------------------------
// Heartbeat — matches src/index-poller/main.ts's own pattern.
// ---------------------------------------------------------------------------

let tickCount = 0;
let lastEventProcessed: string | null = null;

function writeHeartbeat(): void {
  writeJsonAtomic(HEARTBEAT_PATH, {
    ts: new Date().toISOString(),
    tickCount,
    highestProcessedEventId: pointer.toString(),
    lastEventProcessed,
    postMode: POST_MODE,
  });
}

// ---------------------------------------------------------------------------
// Chain reads
// ---------------------------------------------------------------------------

const publicClient = getPublicClient();
const registryAddress = getRegistryAddress();

async function readNextEventId(): Promise<bigint> {
  return withRpcRetry(() =>
    publicClient.readContract({
      address: registryAddress,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "nextEventId",
    }),
  );
}

async function readEvent(id: bigint) {
  return withRpcRetry(() =>
    publicClient.readContract({
      address: registryAddress,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "getEvent",
      args: [id],
    }),
  );
}

// ---------------------------------------------------------------------------
// Per-event handler
// ---------------------------------------------------------------------------

/** Thrown to signal a transient postToX outcome — the id loop in tick() catches this and
 * stops (does NOT advance the pointer, does NOT continue to later ids this tick). */
class TransientPostFailure extends Error {}

async function processEvent(id: bigint): Promise<void> {
  // Defense-in-depth: crash between a successful post and pointer-persist in a prior run.
  if (existsSync(postedPath(id))) {
    console.log(`[xbot] id=${id}: already has a posted/ marker from a prior run — advancing pointer without reposting.`);
    return;
  }

  const event = await readEvent(id);

  // MANDATORY GUARD — unconditional first statement applied to the fetched event, before
  // any tweet composition or posting logic whatsoever.
  if (!isRealSecFilingSourceUrl(event.sourceUrl)) {
    console.error(
      `[xbot] id=${id}: REJECTED by sourceUrlGuard — sourceUrl="${event.sourceUrl}" is not a real SEC EDGAR ` +
        `URL. This event will NEVER be tweeted. Skipping permanently.`,
    );
    writeJsonAtomic(skippedPath(id), {
      id: id.toString(),
      reason: "sourceUrlGuard_rejected",
      sourceUrl: event.sourceUrl,
      skippedAt: new Date().toISOString(),
    });
    return;
  }

  const archived = findArchivedSummary(event.sourceContentHash, STATE_DIR);
  const text = composeTweetText(
    {
      eventId: id,
      eventTypeLabel: event.eventTypeLabel,
      token: event.token,
      declaredAmount: event.facts.declaredAmount,
      currency: event.facts.currency,
      declaredAmountAgreement: event.agreement.declaredAmountAgreement,
      sourceContentHash: event.sourceContentHash,
      registryAddress,
      network: NETWORK,
    },
    archived,
  );

  const result = await postToX(text, { postMode: POST_MODE as "dry-run" | "live" });

  if (!result.posted) {
    console.error(`[xbot] id=${id}: postToX failed — kind=${result.kind} detail=${result.detail}. Will retry next tick.`);
    throw new TransientPostFailure(`postToX failed for id=${id}: ${result.kind}`);
  }

  if (result.dryRun) {
    console.log(`[xbot] id=${id}: DRY-RUN — would have posted: ${result.wouldPostText}`);
  } else {
    console.log(`[xbot] id=${id}: posted live — tweet id=${result.id}`);
  }

  writeJsonAtomic(postedPath(id), {
    id: id.toString(),
    dryRun: result.dryRun,
    tweetId: result.dryRun ? null : result.id,
    text,
    postedAt: new Date().toISOString(),
  });
  lastEventProcessed = id.toString();
}

// ---------------------------------------------------------------------------
// Cold-start seal
// ---------------------------------------------------------------------------

async function coldStartSeal(): Promise<void> {
  console.log(`[xbot] cold start: no existing state file at ${STATE_PATH} — sealing the current event universe.`);
  const nextId = await readNextEventId();
  pointer = nextId > 0n ? nextId - 1n : 0n;
  sealedAt = new Date().toISOString();
  persistState();
  console.log(
    `[xbot] cold start: sealed ${pointer} pre-existing events (ids 1..${pointer}) — only events first ` +
      `observed after this seal will be tweeted.`,
  );
  tickCount += 1;
  writeHeartbeat();
}

// ---------------------------------------------------------------------------
// Main tick — strictly sequential, in ascending id order.
// ---------------------------------------------------------------------------

let shutdownRequested = false;
let tickInProgress = false;

async function tick(): Promise<void> {
  tickInProgress = true;
  try {
    tickCount += 1;
    console.log(`[xbot] tick #${tickCount} starting at ${new Date().toISOString()} — pointer=${pointer}`);

    let nextId: bigint;
    try {
      nextId = await readNextEventId();
    } catch (err) {
      console.error(`[xbot] nextEventId() failed, skipping this tick:`, err);
      writeHeartbeat();
      return;
    }

    for (let id = pointer + 1n; id < nextId; id++) {
      if (shutdownRequested) {
        console.log(`[xbot] shutdown requested mid-tick — stopping before id=${id}.`);
        break;
      }
      try {
        await processEvent(id);
        pointer = id;
        persistState();
      } catch (err) {
        // Never let one event's failure crash the process. A TransientPostFailure (or any
        // other unexpected error) means the pointer must NOT advance past this id — stop
        // the loop for this tick entirely so ids are never processed out of order.
        console.error(`[xbot] id=${id}: failed, pointer stays at ${pointer}, will retry next tick:`, err);
        break;
      }
    }

    writeHeartbeat();
    console.log(`[xbot] tick #${tickCount} complete — pointer=${pointer}`);
  } finally {
    tickInProgress = false;
    if (shutdownRequested) {
      finalizeShutdown();
    }
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown — matches agent.ts's pattern exactly.
// ---------------------------------------------------------------------------

let intervalTimer: NodeJS.Timeout | null = null;

function finalizeShutdown(): void {
  persistState();
  writeHeartbeat();
  console.log(`[xbot] graceful shutdown complete — state flushed, exiting.`);
  process.exit(0);
}

function requestShutdown(signal: string): void {
  console.log(`[xbot] ${signal} received — stopping${tickInProgress ? " (waiting for in-flight tick to finish)" : ""}.`);
  shutdownRequested = true;
  if (intervalTimer) clearInterval(intervalTimer);
  if (!tickInProgress) {
    finalizeShutdown();
  }
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error(`[xbot] unhandledRejection (ignored, process continues):`, reason);
});

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    `[xbot] starting — pollIntervalMs=${POLL_INTERVAL_MS} postMode=${POST_MODE} network=${NETWORK} ` +
      `stateDir=${STATE_DIR} registryAddress=${registryAddress}`,
  );

  loadState();

  if (!stateFileExistedAtStart) {
    await coldStartSeal();
  } else {
    console.log(
      `[xbot] existing state file found — highestProcessedEventId=${pointer} (sealedAt=${sealedAt || "unknown"}). ` +
        `Skipping cold-start seal.`,
    );
    await tick();
  }

  intervalTimer = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error(`[xbot] fatal error during startup:`, err);
  process.exit(1);
});
