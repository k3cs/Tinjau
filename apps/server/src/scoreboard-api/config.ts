/**
 * Env/config loading for the scoreboard API (task P5.1) — mirrors
 * `src/index-poller/config.ts`'s fail-fast-before-any-I/O style. This file holds only the
 * runtime config the HTTP layer needs; the reaction-window math and the ticker <->
 * instrument mapping live in `src/studies/scoreboardReaction.ts`, and the on-chain read
 * lives in `server.ts` itself (via `src/chain/client.ts`, `src/chain/registryAbi.ts` —
 * never `getWalletClient`/any poster or relayer key).
 */

import { existsSync } from "node:fs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[scoreboard-api] missing required env var: ${name} — refusing to start.`);
  }
  return v;
}

export const STATE_DIR = requireEnv("AFTERHOURS_STATE_DIR");

if (!existsSync(STATE_DIR)) {
  throw new Error(`[scoreboard-api] AFTERHOURS_STATE_DIR=${STATE_DIR} does not exist on disk — refusing to start.`);
}

function getPort(): number {
  const raw = process.env.SCOREBOARD_API_PORT;
  if (!raw) return 8787;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[scoreboard-api] SCOREBOARD_API_PORT must be a positive integer, got: "${raw}"`);
  }
  return parsed;
}

export const PORT = getPort();

/** "Recompute at most once per 30s" — approved P5.1 decision #4. */
export const CACHE_TTL_MS = 30_000;

/** 60 req/min per source IP, fixed-window — approved P5.1 decision #4. */
export const RATE_LIMIT_PER_MINUTE = 60;

/**
 * How often the background refresh loop attempts a recompute. Note: this process writes no
 * heartbeat file of its own — the deployed unit is read-only on `AFTERHOURS_STATE_DIR`
 * (`ReadOnlyPaths=/opt/afterhours/data`, no `ReadWritePaths=`), the first fully read-only
 * AFTERHOURS unit. See `main.ts`'s file header for how liveness is monitored instead.
 */
export const REFRESH_INTERVAL_MS = CACHE_TTL_MS;
