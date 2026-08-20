/**
 * AFTERHOURS scoreboard API entrypoint (task P5.1).
 *
 * Serves `GET /health` and `GET /scoreboard` on plain `node:http` — see `server.ts` for the
 * route logic, cache, and rate limiter, and `src/studies/scoreboardReaction.ts` for the
 * reaction computation. Intended to run under systemd as
 * `afterhours-scoreboard-api.service` — the first fully secret-free AFTERHOURS unit (this
 * process never loads a `*.secrets.env` file, matching its structurally-read-only design;
 * see `server.ts`'s file-header comment).
 *
 * Design properties this file is responsible for (mirrors `src/index-poller/main.ts` where
 * applicable — one deliberate divergence noted below):
 *
 *  - FAIL-FAST PREFLIGHT. `config.ts` asserts `TINJAU_STATE_DIR` present and present on
 *    disk before anything else runs.
 *  - ONE SHARED CACHE. A single `ScoreboardCache` instance is used both by the HTTP
 *    `/scoreboard` route and by a background refresh loop — so "recompute at most once per
 *    30s" holds true regardless of how many things ask for the data at once, and the
 *    background loop keeps the cache warm so real requests rarely wait on a live RPC round
 *    trip.
 *  - NEVER CRASHES. Every background refresh tick runs inside try/catch; a failed chain
 *    read is logged, never fatal — the previous cached response (if any) keeps being
 *    served, and `/health` stays 200 (liveness of the HTTP process, not of the last chain
 *    read — `/scoreboard` itself reports 503 if nothing has ever succeeded).
 *  - NO HEARTBEAT FILE WRITTEN BY THIS PROCESS — deliberate divergence from
 *    `index-poller/main.ts`'s pattern. The deployed unit sets `ReadOnlyPaths=/opt/afterhours/data`
 *    with no `ReadWritePaths=` line at all (this is the first fully read-only AFTERHOURS
 *    unit), so this process cannot write anywhere under `TINJAU_STATE_DIR` even for a
 *    heartbeat. Liveness/freshness monitoring instead happens the other direction: the
 *    paired `afterhours-scoreboard-healthcheck.service` (unsandboxed, like the other two
 *    healthcheck scripts) polls this process's own `GET /health` over HTTP and writes ITS
 *    OWN heartbeat file — see that service for details. Every refresh attempt is still
 *    logged to stdout (captured by journald via `SyslogIdentifier=afterhours-scoreboard-api`),
 *    so `journalctl -u afterhours-scoreboard-api` remains a complete history even without a
 *    heartbeat file.
 *  - GRACEFUL SIGTERM. Stops the refresh timer, closes the HTTP server, exits 0.
 *
 * Run standalone: `tsx src/scoreboard-api/main.ts` (requires `TINJAU_STATE_DIR`;
 * optionally `SCOREBOARD_API_PORT`, `XLAYER_TESTNET_RPC_URL`, `EVENT_STATE_REGISTRY_ADDRESS`
 * — see `../chain/client.ts`).
 */

import "dotenv/config";
import { CACHE_TTL_MS, PORT, RATE_LIMIT_PER_MINUTE, REFRESH_INTERVAL_MS, STATE_DIR } from "./config.js";
import { buildScoreboard, createScoreboardCache, createServer, type ScoreboardEntry } from "./server.js";

// ---------------------------------------------------------------------------
// Shared cache — one instance, used by both the HTTP route and the refresh loop below.
// ---------------------------------------------------------------------------

const cache = createScoreboardCache(() => buildScoreboard(STATE_DIR), CACHE_TTL_MS);

let refreshCount = 0;

async function refreshTick(): Promise<void> {
  refreshCount += 1;
  try {
    const data: ScoreboardEntry[] = await cache.get();
    console.log(`[scoreboard-api] refresh #${refreshCount}: ok, ${data.length} event(s)`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[scoreboard-api] refresh #${refreshCount}: failed — ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// HTTP server — wraps the same shared cache (double-memoized, effectively free: the outer
// cache's "compute" call is just `cache.get()` against the already-warm inner cache).
// ---------------------------------------------------------------------------

const server = createServer({
  getScoreboardData: () => cache.get(),
  cacheTtlMs: CACHE_TTL_MS,
  rateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
});

// ---------------------------------------------------------------------------
// Background refresh loop — self-rescheduling timeout, mirrors index-poller/main.ts's
// scheduling shape (though not its heartbeat-writing — see file header).
// ---------------------------------------------------------------------------

let refreshTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;

function scheduleNextRefresh(): void {
  if (shuttingDown) return;
  refreshTimer = setTimeout(() => void runRefresh(), REFRESH_INTERVAL_MS);
}

async function runRefresh(): Promise<void> {
  try {
    await refreshTick();
  } finally {
    if (!shuttingDown) scheduleNextRefresh();
  }
}

process.on("unhandledRejection", (reason) => {
  console.error(`[scoreboard-api] unhandledRejection (ignored, process continues):`, reason);
});

function requestShutdown(signal: string): void {
  console.log(`[scoreboard-api] ${signal} received — shutting down.`);
  shuttingDown = true;
  if (refreshTimer) clearTimeout(refreshTimer);
  server.close(() => {
    console.log(`[scoreboard-api] graceful shutdown complete.`);
    process.exit(0);
  });
  // Safety net: if close() hangs (e.g. a slow in-flight request), force-exit shortly after.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

console.log(`[scoreboard-api] starting — port=${PORT}, stateDir=${STATE_DIR}, cacheTtlMs=${CACHE_TTL_MS}, rateLimitPerMinute=${RATE_LIMIT_PER_MINUTE}`);

server.listen(PORT, () => {
  console.log(`[scoreboard-api] listening on :${PORT}`);
});

void runRefresh();
