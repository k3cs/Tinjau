/**
 * AFTERHOURS OKX index-price poller (task P0.8).
 *
 * Long-running supervised loop that polls the `onchainos` CLI's authenticated index-price
 * endpoint for wNVDAx and wMSTRx (see `config.ts`) and appends one NDJSON row per
 * instrument per tick to `${TINJAU_STATE_DIR}/index/index-<INSTRUMENT>-<YYYY-MM-DD>.ndjson`
 * (see `ndjsonWriter.ts`). Intended to run under systemd as
 * `afterhours-index-poller.service` — a process entirely separate from the EDGAR
 * agent (`agent.ts` / `afterhours-agent.service`); the two never share state or env files.
 *
 * Design properties this file is responsible for:
 *
 *  - FAIL-FAST PREFLIGHT. `ONCHAINOS_BIN`, `ONCHAINOS_HOME`, `TINJAU_STATE_DIR` are
 *    asserted present (and, where applicable, present on disk) before any polling starts.
 *  - SEQUENTIAL, NEVER PARALLEL. The two instruments are polled one after another with
 *    `for...of` + `await`, never `Promise.all` — mirrors the EDGAR agent's own
 *    Gemini-quota-driven sequential-processing rule, applied here to be gentle on OKX.
 *  - RETRY ONLY TRANSIENT. Each instrument gets up to 3 attempts on a 0s/2s/8s backoff,
 *    but only `transient` outcomes are retried — `auth`/`quota` return immediately so a
 *    broken credential never turns into a retry storm against OKX.
 *  - NEVER CRASHES. Every tick runs fully inside try/catch; `unhandledRejection` is logged,
 *    never fatal. The one thing that IS fatal is the startup preflight — an unusable
 *    environment should fail immediately and loudly (systemd's `Restart=always` + the
 *    healthcheck timer will surface a crash-loop), not silently poll into a black hole.
 *  - LOUD, DISTINCT AUTH/QUOTA ALERTING, NO PROCESS EXIT. On `auth` or `quota`, this
 *    process logs a single-line banner at `error` level (greppable via
 *    `journalctl -p err`), writes `${TINJAU_STATE_DIR}/health/index-poller-alert.json`,
 *    and — because a bad credential does not self-heal on a fast timer — backs the poll
 *    interval off to ~5 minutes for as long as the alert is active, so `Restart=always` at
 *    30s doesn't hammer OKX. The process is NOT exited: once the credential/quota issue is
 *    fixed, the very next tick succeeds and the alert file is deleted automatically.
 *  - HEARTBEAT AFTER EVERY TICK. Atomic write-to-temp-then-rename, matching `agent.ts`'s
 *    own pattern, so `afterhours-index-healthcheck.service` always reads a complete file.
 *  - GRACEFUL SIGTERM. Clears the scheduling timer, lets any in-flight tick finish, flushes
 *    the heartbeat one more time, exits 0 — this is what makes `systemctl restart` safe.
 *
 * Run standalone: `tsx src/index-poller/main.ts` (requires ONCHAINOS_BIN, ONCHAINOS_HOME,
 * TINJAU_STATE_DIR, OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE in the environment —
 * see `/opt/afterhours/env/{common,index-poller.secrets}.env` on the VPS, or a local
 * `.env` for dev).
 */

import "dotenv/config";
import { existsSync, mkdirSync, renameSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { INDEX_INSTRUMENTS, type IndexInstrument } from "./config.js";
import { fetchIndexPrice, type IndexOutcome } from "./okxIndexClient.js";
import { appendIndexRow, utcDateFromIso, type IndexRow } from "./ndjsonWriter.js";

// ---------------------------------------------------------------------------
// Config — fail fast on anything missing/unusable, before any I/O happens.
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[index-poller] missing required env var: ${name} — refusing to start.`);
  }
  return v;
}

const ONCHAINOS_BIN = requireEnv("ONCHAINOS_BIN");
const ONCHAINOS_HOME = requireEnv("ONCHAINOS_HOME");
const STATE_DIR = requireEnv("TINJAU_STATE_DIR");

if (!existsSync(ONCHAINOS_BIN)) {
  throw new Error(`[index-poller] ONCHAINOS_BIN=${ONCHAINOS_BIN} does not exist on disk — refusing to start.`);
}
if (!existsSync(ONCHAINOS_HOME)) {
  throw new Error(`[index-poller] ONCHAINOS_HOME=${ONCHAINOS_HOME} does not exist on disk — refusing to start.`);
}
if (!existsSync(STATE_DIR)) {
  throw new Error(`[index-poller] TINJAU_STATE_DIR=${STATE_DIR} does not exist on disk — refusing to start.`);
}

const DEFAULT_POLL_INTERVAL_MS = 180_000; // 3 minutes
const MIN_POLL_INTERVAL_MS = 30_000; // floor guard, mirrors the EDGAR poller's own pattern
const ALERT_BACKOFF_MS = 300_000; // ~5 minutes, used while any instrument is in auth/quota alert

function getPollIntervalMs(): number {
  const raw = process.env.INDEX_POLL_INTERVAL_MS;
  if (!raw) return DEFAULT_POLL_INTERVAL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[index-poller] INDEX_POLL_INTERVAL_MS must be a positive number, got: "${raw}"`);
  }
  if (parsed < MIN_POLL_INTERVAL_MS) {
    throw new Error(
      `[index-poller] INDEX_POLL_INTERVAL_MS=${parsed} is below the minimum of ${MIN_POLL_INTERVAL_MS}ms.`,
    );
  }
  return parsed;
}

const POLL_INTERVAL_MS = getPollIntervalMs();
const RETRY_BACKOFFS_MS = [0, 2000, 8000];

// ---------------------------------------------------------------------------
// State paths
// ---------------------------------------------------------------------------

const HEARTBEAT_PATH = join(STATE_DIR, "health", "index-poller-heartbeat.json");
const ALERT_PATH = join(STATE_DIR, "health", "index-poller-alert.json");

// ---------------------------------------------------------------------------
// Atomic JSON write helper — write-to-temp-then-rename, matching agent.ts.
// ---------------------------------------------------------------------------

function writeJsonAtomic(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp-${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  renameSync(tmpPath, path);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Per-instrument tracking state
// ---------------------------------------------------------------------------

type AlertKind = "auth" | "quota" | "transient";

interface InstrumentState {
  lastSuccessTs: string | null;
  lastStatus: IndexOutcome["kind"] | "unknown";
  lastError: string | null;
  consecutiveFailures: number; // any non-ok outcome, reset on success
  consecutiveTransientFailures: number; // transient only, reset on success OR on auth/quota
  alertKind: AlertKind | null;
  alertSince: string | null;
  rowsWrittenToday: number;
  rowsWrittenTodayDate: string | null; // UTC YYYY-MM-DD this counter belongs to
}

function freshInstrumentState(): InstrumentState {
  return {
    lastSuccessTs: null,
    lastStatus: "unknown",
    lastError: null,
    consecutiveFailures: 0,
    consecutiveTransientFailures: 0,
    alertKind: null,
    alertSince: null,
    rowsWrittenToday: 0,
    rowsWrittenTodayDate: null,
  };
}

const instrumentStates: Record<string, InstrumentState> = {};
for (const instr of INDEX_INSTRUMENTS) {
  instrumentStates[instr.instrument] = freshInstrumentState();
}

function anyAlertActive(): boolean {
  return Object.values(instrumentStates).some((s) => s.alertKind !== null);
}

// ---------------------------------------------------------------------------
// Alert file — written on sustained auth/quota/transient failure, deleted on recovery.
// ---------------------------------------------------------------------------

function writeAlertFile(): void {
  const active = Object.entries(instrumentStates)
    .filter(([, s]) => s.alertKind !== null)
    .map(([instrument, s]) => ({
      instrument,
      kind: s.alertKind,
      since: s.alertSince,
      lastError: s.lastError,
      consecutiveFailures: s.alertKind === "transient" ? s.consecutiveTransientFailures : s.consecutiveFailures,
    }));
  if (active.length === 0) {
    clearAlertFile();
    return;
  }
  // Top-level fields summarize the worst active alert; `perInstrument` carries the detail.
  const worst = active[0];
  writeJsonAtomic(ALERT_PATH, {
    kind: worst.kind,
    since: worst.since,
    lastError: worst.lastError,
    consecutiveFailures: worst.consecutiveFailures,
    perInstrument: active,
  });
}

function clearAlertFile(): void {
  if (existsSync(ALERT_PATH)) {
    rmSync(ALERT_PATH, { force: true });
  }
}

// ---------------------------------------------------------------------------
// Heartbeat — written after every tick, whether or not it was clean.
// ---------------------------------------------------------------------------

function writeHeartbeat(): void {
  const states = Object.entries(instrumentStates);
  const nowIso = new Date().toISOString();
  const lastSuccessTs =
    states
      .map(([, s]) => s.lastSuccessTs)
      .filter((ts): ts is string => ts !== null)
      .sort()
      .at(-1) ?? null;
  const maxConsecutiveFailures = Math.max(0, ...states.map(([, s]) => s.consecutiveFailures));
  const rowsWrittenToday = states.reduce((sum, [, s]) => sum + s.rowsWrittenToday, 0);
  const overallStatus = anyAlertActive() ? "degraded" : "ok";

  writeJsonAtomic(HEARTBEAT_PATH, {
    ts: nowIso,
    lastSuccessTs,
    lastStatus: overallStatus,
    consecutiveFailures: maxConsecutiveFailures,
    rowsWrittenToday,
    perInstrument: Object.fromEntries(
      states.map(([instrument, s]) => [
        instrument,
        {
          lastSuccessTs: s.lastSuccessTs,
          lastStatus: s.lastStatus,
          consecutiveFailures: s.consecutiveFailures,
          rowsWrittenToday: s.rowsWrittenToday,
          alertKind: s.alertKind,
        },
      ]),
    ),
  });
}

// ---------------------------------------------------------------------------
// Per-instrument poll (with retry) + outcome handling
// ---------------------------------------------------------------------------

async function pollInstrumentWithRetry(instr: IndexInstrument): Promise<IndexOutcome> {
  let outcome: IndexOutcome = { kind: "transient", detail: "no attempt made" };
  for (let attempt = 0; attempt < RETRY_BACKOFFS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFFS_MS[attempt]);
    }
    outcome = await fetchIndexPrice(instr, ONCHAINOS_BIN);
    if (outcome.kind !== "transient") {
      // auth/quota return immediately — no retry-spam; ok obviously stops too.
      return outcome;
    }
  }
  return outcome; // exhausted retries, still transient
}

function rolloverRowCountIfNewDay(state: InstrumentState, utcDate: string): void {
  if (state.rowsWrittenTodayDate !== utcDate) {
    state.rowsWrittenTodayDate = utcDate;
    state.rowsWrittenToday = 0;
  }
}

function handleOutcome(instr: IndexInstrument, outcome: IndexOutcome): void {
  const state = instrumentStates[instr.instrument];
  const nowIso = new Date().toISOString();

  if (outcome.kind === "ok") {
    const row: IndexRow = {
      t: nowIso,
      instrument: instr.instrument,
      chain: instr.chain,
      address: instr.address,
      px: outcome.price,
      src: "okx-index",
      raw: outcome.raw,
    };
    const path = appendIndexRow(STATE_DIR, row);
    rolloverRowCountIfNewDay(state, utcDateFromIso(nowIso));
    state.rowsWrittenToday += 1;
    state.consecutiveFailures = 0;
    state.consecutiveTransientFailures = 0;
    state.lastSuccessTs = nowIso;
    state.lastStatus = "ok";
    state.lastError = null;

    if (state.alertKind) {
      console.log(
        `[index-poller] ${instr.instrument}: recovered from "${state.alertKind}" alert — clearing alert state.`,
      );
      state.alertKind = null;
      state.alertSince = null;
      writeAlertFile(); // re-derives from remaining active alerts, deletes file if none left
    }

    console.log(`[index-poller] ${instr.instrument}: ok px=${outcome.price} t=${nowIso} -> ${path}`);
    return;
  }

  state.consecutiveFailures += 1;
  state.lastStatus = outcome.kind;
  state.lastError = outcome.detail;

  if (outcome.kind === "auth" || outcome.kind === "quota") {
    state.consecutiveTransientFailures = 0;
    if (!state.alertKind) state.alertSince = nowIso;
    state.alertKind = outcome.kind;
    console.error(
      `[index-poller] ${outcome.kind.toUpperCase()} FAILURE — index prices are NOT being recorded for ` +
        `${instr.instrument}. detail=${outcome.detail}`,
    );
    writeAlertFile();
    return;
  }

  // transient, retries already exhausted by pollInstrumentWithRetry
  state.consecutiveTransientFailures += 1;
  console.error(
    `[index-poller] ${instr.instrument}: transient failure after retries — detail=${outcome.detail}`,
  );
  if (state.consecutiveTransientFailures >= 3) {
    if (!state.alertKind) state.alertSince = nowIso;
    state.alertKind = "transient";
    console.error(
      `[index-poller] SUSTAINED TRANSIENT FAILURE — ${instr.instrument} has failed ` +
        `${state.consecutiveTransientFailures} consecutive ticks. index prices are NOT being recorded.`,
    );
    writeAlertFile();
  }
}

// ---------------------------------------------------------------------------
// Tick — sequential across instruments, fully wrapped in try/catch.
// ---------------------------------------------------------------------------

let tickCount = 0;

async function tick(): Promise<void> {
  tickCount += 1;
  console.log(`[index-poller] tick #${tickCount} starting at ${new Date().toISOString()}`);

  for (const instr of INDEX_INSTRUMENTS) {
    try {
      const outcome = await pollInstrumentWithRetry(instr);
      handleOutcome(instr, outcome);
    } catch (err) {
      // Defense-in-depth: fetchIndexPrice/handleOutcome should never throw, but a bug
      // there must never take down the whole poller.
      console.error(`[index-poller] unexpected error polling ${instr.instrument}:`, err);
    }
  }

  writeHeartbeat();
  console.log(`[index-poller] tick #${tickCount} complete.`);
}

process.on("unhandledRejection", (reason) => {
  console.error(`[index-poller] unhandledRejection (ignored, process continues):`, reason);
});

// ---------------------------------------------------------------------------
// Scheduling loop — a self-rescheduling timeout (not a static setInterval) so the
// interval can widen to ALERT_BACKOFF_MS while any instrument is in an auth/quota/
// sustained-transient alert state, and narrow back once recovered.
// ---------------------------------------------------------------------------

let timer: NodeJS.Timeout | null = null;
let shuttingDown = false;
let tickInProgress = false;

function nextIntervalMs(): number {
  return anyAlertActive() ? ALERT_BACKOFF_MS : POLL_INTERVAL_MS;
}

function scheduleNext(): void {
  if (shuttingDown) return;
  const delay = nextIntervalMs();
  timer = setTimeout(() => void runTick(), delay);
}

async function runTick(): Promise<void> {
  tickInProgress = true;
  try {
    await tick();
  } finally {
    tickInProgress = false;
    if (shuttingDown) {
      finalizeShutdown();
    } else {
      scheduleNext();
    }
  }
}

function finalizeShutdown(): void {
  writeHeartbeat();
  console.log(`[index-poller] graceful shutdown complete — heartbeat flushed, exiting.`);
  process.exit(0);
}

function requestShutdown(signal: string): void {
  console.log(
    `[index-poller] ${signal} received — stopping${tickInProgress ? " (waiting for in-flight tick to finish)" : ""}.`,
  );
  shuttingDown = true;
  if (timer) clearTimeout(timer);
  if (!tickInProgress) {
    finalizeShutdown();
  }
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

// ---------------------------------------------------------------------------
// Entrypoint — fire once immediately, then on the interval.
// ---------------------------------------------------------------------------

console.log(
  `[index-poller] starting — instruments: ${INDEX_INSTRUMENTS.map((i) => i.instrument).join(", ")}, ` +
    `pollIntervalMs=${POLL_INTERVAL_MS}, stateDir=${STATE_DIR}, onchainosBin=${ONCHAINOS_BIN}`,
);

void runTick();
