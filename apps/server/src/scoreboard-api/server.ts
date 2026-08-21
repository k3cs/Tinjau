/**
 * Scoreboard API HTTP server (task P5.1) — plain `node:http`, no new npm dependency.
 * Two GET-only routes: `GET /health` (liveness) and `GET /scoreboard` (registry events
 * joined against index-reaction data). See `src/studies/scoreboardReaction.ts` for the
 * reaction computation and
 * `docs/buildx-orion-2026/outputs/05-build/scoreboard-reaction-definition.md` for the
 * pre-registered method.
 *
 * STRUCTURALLY READ-ONLY: this module — and everything it imports from `../chain/` — must
 * NEVER import `getWalletClient`/`getPosterAccount`/`getDemoRelayerAccount`/`getWalletClientFor`
 * or any other private-key path. It only ever calls `getPublicClient()` / `readContract()`.
 * This is a hard invariant, not a style preference: a bug in this file must never be able
 * to sign a transaction, because this is the one service on the VPS with no secrets env
 * file at all (see the deployed systemd unit — zero `EnvironmentFile=*.secrets.env` lines).
 *
 * NO CORS HEADERS: the only caller is a Vercel server-side Route Handler
 * (`apps/web/src/app/api/scoreboard/route.ts`), which fetches this service from Vercel's
 * own infrastructure — a server-to-server fetch, not a browser request. CORS exists to
 * police cross-origin *browser* requests, so it doesn't apply here. Adding
 * `Access-Control-Allow-Origin` would just be unused attack surface: a header nothing
 * legitimate reads, that only widens what a browser could do against this port if it were
 * ever reached directly.
 *
 * NO AUTH TOKEN: `/scoreboard` re-serves data that is already public by construction —
 * every registry event is a public on-chain read (anyone can call `getEvent()` directly
 * against the testnet RPC themselves) and every index price is a public OKX index read.
 * A bearer token here would protect nothing that isn't already open elsewhere. The real
 * protection this service needs is the narrow, structurally-read-only surface (above) plus
 * the rate limiter (below) — not a secret to issue, store, and rotate.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { getPublicClient, getRegistryAddress, withRpcRetry } from "../chain/client.js";
import { EVENT_STATE_REGISTRY_ABI } from "../chain/registryAbi.js";
import { computeReactionForTicker, type ReactionResult } from "../studies/scoreboardReaction.js";
import { classifyEventProvenance, type EventProvenance } from "./provenance.js";

// ---------------------------------------------------------------------------
// Token address -> tracked ticker (reverse of the mainnet/testnet tables in
// ../chain/tokenAddresses.ts). Mirrored from apps/web/src/lib/chain/tokenAddresses.ts's
// TRACKED_TOKENS, kept in sync manually — the same manual-sync pattern already used for
// this project's two registryAbi.ts copies (see that file's own header comment for why).
// Only the 2 tickers P0.8 actually polls need to resolve to anything; any other on-chain
// token address falls through to null, and computeReactionForTicker(null, ...) reports
// no_poller_coverage by construction.
// ---------------------------------------------------------------------------

const TESTNET_ADDRESS_TO_TICKER: Record<string, string> = {
  "0xf07a9d89848bc694c7154fda4cce707eb409f903": "NVDAx",
  "0xae2f842ef90c0d5213259ab82639d5bbf649b08e": "MSTRx",
};

function tickerForTestnetAddress(address: string): string | null {
  return TESTNET_ADDRESS_TO_TICKER[address.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Read-only registry read (structurally cannot sign — see file header).
// ---------------------------------------------------------------------------

interface RawRegistryEvent {
  id: bigint;
  token: string;
  eventTypeLabel: string;
  timestamp: bigint;
  sourceUrl: string;
  sourceContentHash: string;
}

async function fetchAllEventsReadOnly(): Promise<RawRegistryEvent[]> {
  const client = getPublicClient();
  const address = getRegistryAddress();
  const nextId = await withRpcRetry(() =>
    client.readContract({
      address,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "nextEventId",
    }),
  );

  const total = Number(nextId) - 1;
  if (total < 1) return [];

  const ids = Array.from({ length: total }, (_, i) => BigInt(total - i)); // newest first
  return Promise.all(
    ids.map(async (id) => {
      const event = await withRpcRetry(() =>
        client.readContract({
          address,
          abi: EVENT_STATE_REGISTRY_ABI,
          functionName: "getEvent",
          args: [id],
        }),
      );
      const ev = event as unknown as {
        token: string;
        eventTypeLabel: string;
        timestamp: bigint;
        sourceUrl: string;
        sourceContentHash: string;
      };
      return {
        id,
        token: ev.token,
        eventTypeLabel: ev.eventTypeLabel,
        timestamp: ev.timestamp,
        sourceUrl: ev.sourceUrl,
        sourceContentHash: ev.sourceContentHash,
      };
    }),
  );
}

export interface ScoreboardEntry {
  eventId: string;
  token: string;
  ticker: string | null;
  eventTypeLabel: string;
  postTimeSec: number;
  postTimeIso: string;
  reaction: ReactionResult;
  /**
   * Where this event's underlying document came from, derived from the `sourceUrl` and
   * `sourceContentHash` the registry already commits on chain (task T0.5).
   *
   * This field is additive — every pre-existing field above keeps its shape — but consumers
   * MUST render it. Without it, a fabricated test filing is indistinguishable from a real
   * SEC one, which is exactly the defect T0.1 found on the public API.
   */
  provenance: EventProvenance;
}

/** Reads every posted registry event and joins each against its index-reaction result. */
export async function buildScoreboard(
  stateDir: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<ScoreboardEntry[]> {
  const events = await fetchAllEventsReadOnly();
  return events.map((ev) => {
    const ticker = tickerForTestnetAddress(ev.token);
    const postTimeSec = Number(ev.timestamp);
    const reaction = computeReactionForTicker(ticker, stateDir, postTimeSec, nowSec);
    return {
      eventId: ev.id.toString(),
      token: ev.token,
      ticker,
      eventTypeLabel: ev.eventTypeLabel,
      postTimeSec,
      postTimeIso: new Date(postTimeSec * 1000).toISOString(),
      reaction,
      provenance: classifyEventProvenance(ev.sourceUrl, ev.sourceContentHash),
    };
  });
}

// ---------------------------------------------------------------------------
// In-process cache — recompute at most once per `ttlMs`, serve the cached response
// otherwise. Concurrent callers during a recompute share the same in-flight promise
// rather than triggering N parallel chain reads.
// ---------------------------------------------------------------------------

export interface ScoreboardCache {
  get(): Promise<ScoreboardEntry[]>;
}

export function createScoreboardCache(
  compute: () => Promise<ScoreboardEntry[]>,
  ttlMs: number,
  now: () => number = Date.now,
): ScoreboardCache {
  let cached: { at: number; data: ScoreboardEntry[] } | null = null;
  let inFlight: Promise<ScoreboardEntry[]> | null = null;

  return {
    async get() {
      const nowMs = now();
      if (cached && nowMs - cached.at < ttlMs) return cached.data;
      if (inFlight) return inFlight;
      inFlight = compute()
        .then((data) => {
          cached = { at: now(), data };
          return data;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}

// ---------------------------------------------------------------------------
// Fixed-window rate limiter — 60 req/min per source IP (approved P5.1 decision #4).
// ---------------------------------------------------------------------------

export class FixedWindowRateLimiter {
  private readonly limitPerMinute: number;
  private readonly now: () => number;
  private readonly windows = new Map<string, { windowStartMs: number; count: number }>();

  constructor(limitPerMinute: number, now: () => number = Date.now) {
    this.limitPerMinute = limitPerMinute;
    this.now = now;
  }

  /** Returns null if the request is allowed, or the number of whole seconds until the window resets if blocked. */
  check(key: string): number | null {
    const nowMs = this.now();
    const windowMs = 60_000;
    const entry = this.windows.get(key);
    if (!entry || nowMs - entry.windowStartMs >= windowMs) {
      this.windows.set(key, { windowStartMs: nowMs, count: 1 });
      return null;
    }
    entry.count += 1;
    if (entry.count > this.limitPerMinute) {
      const retryAfterMs = windowMs - (nowMs - entry.windowStartMs);
      return Math.max(1, Math.ceil(retryAfterMs / 1000));
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTTP layer — createServer(opts) takes an injectable `getScoreboardData` so the
// route/rate-limit/cache logic is testable without a live RPC connection.
// ---------------------------------------------------------------------------

export interface CreateServerOptions {
  getScoreboardData: () => Promise<ScoreboardEntry[]>;
  cacheTtlMs: number;
  rateLimitPerMinute: number;
  now?: () => number;
}

function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders?: Record<string, string>): void {
  res.writeHead(status, { "Content-Type": "application/json", ...extraHeaders });
  res.end(JSON.stringify(body));
}

export function createServer(opts: CreateServerOptions): Server {
  const now = opts.now ?? Date.now;
  const cache = createScoreboardCache(opts.getScoreboardData, opts.cacheTtlMs, now);
  const limiter = new FixedWindowRateLimiter(opts.rateLimitPerMinute, now);

  return createHttpServer((req, res) => {
    void handleRequest(req, res, cache, limiter);
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  cache: ScoreboardCache,
  limiter: FixedWindowRateLimiter,
): Promise<void> {
  const path = (req.url ?? "/").split("?")[0];

  if (path === "/health") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "method not allowed" }, { Allow: "GET" });
      return;
    }
    sendJson(res, 200, { status: "ok", ts: new Date().toISOString() });
    return;
  }

  if (path === "/scoreboard") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "method not allowed" }, { Allow: "GET" });
      return;
    }
    const retryAfterSec = limiter.check(clientIp(req));
    if (retryAfterSec !== null) {
      sendJson(res, 429, { error: "rate limit exceeded", retryAfterSeconds: retryAfterSec }, { "Retry-After": String(retryAfterSec) });
      return;
    }
    try {
      const data = await cache.get();
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 503, { error: "scoreboard temporarily unavailable", detail: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  sendJson(res, 404, { error: "not found" });
}
