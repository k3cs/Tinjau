/**
 * Thin wrapper around the `onchainos` CLI's `market index` subcommand (task P0.8).
 *
 * Spawns via `execFile` (never a shell) so there is no command-injection surface from the
 * instrument address/chain strings, and hardcodes the subcommand args so this module can
 * never construct an `onchainos payment ...` invocation — this poller reads prices only,
 * it must never be able to spend money. `assertNoPaymentSubcommand` below is a second,
 * belt-and-braces check against that same invariant in case the args are ever edited.
 *
 * `classifyIndexResponse` is exported separately (pure function, no process spawning) so
 * the test suite can exercise all 4 outcome kinds against fixture CLI output without any
 * real network/CLI calls.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { IndexInstrument } from "./config.js";

const execFileAsync = promisify(execFile);

export type IndexOutcome =
  | { kind: "ok"; price: string; srcTimeMs: string; raw: unknown }
  | { kind: "auth"; detail: string } // loud, distinct, never retried on a short timer
  | { kind: "quota"; detail: string } // loud, distinct
  | { kind: "transient"; detail: string }; // retry

export const TIMEOUT_MS = 20_000;

const AUTH_CODE_RE = /code=(50114|50103|50111|50112|50113|50102)/;
const AUTH_TEXT_RE = /Invalid Authority|not logged in|OK-ACCESS|Invalid Sign|passphrase/i;
const QUOTA_TEXT_RE = /OVER_QUOTA/;

function assertNoPaymentSubcommand(args: string[]): void {
  if (args.some((a) => a.toLowerCase() === "payment")) {
    throw new Error(
      `[index-poller] refusing to run onchainos with a "payment" subcommand — this poller ` +
        `must never be able to spend money. args=${JSON.stringify(args)}`,
    );
  }
}

/**
 * Classifies a completed (or failed) CLI invocation into exactly one of the 4 outcome
 * kinds. Pure — no I/O, no process access — so it's directly unit-testable against fixture
 * stdout/stderr strings.
 */
export function classifyIndexResponse(params: {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: string;
}): IndexOutcome {
  const { stdout, stderr, timedOut, spawnError } = params;

  if (timedOut) {
    return { kind: "transient", detail: `onchainos CLI timed out after ${TIMEOUT_MS}ms` };
  }
  if (spawnError) {
    return { kind: "transient", detail: `failed to spawn onchainos CLI: ${spawnError}` };
  }

  const combined = `${stdout}\n${stderr}`.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    parsed = undefined;
  }

  // Unambiguous success: ok:true with a non-empty data[0].price.
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (obj.ok === true) {
      const data = obj.data;
      const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
      const price = row?.price;
      const time = row?.time;
      if (typeof price === "string" && price.length > 0) {
        return {
          kind: "ok",
          price,
          srcTimeMs: typeof time === "string" ? time : String(time ?? ""),
          raw: row,
        };
      }
    }
  }

  // Quota signal: notifications[].code matches OVER_QUOTA, or confirming:true in the body,
  // or (as a fallback for non-JSON/partial output) the literal text anywhere in stdout/stderr.
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const notifications = obj.notifications;
    const notifQuota =
      Array.isArray(notifications) &&
      notifications.some(
        (n) => n && typeof n === "object" && typeof (n as Record<string, unknown>).code === "string" &&
          QUOTA_TEXT_RE.test((n as Record<string, unknown>).code as string),
      );
    if (notifQuota || obj.confirming === true) {
      return { kind: "quota", detail: combined.slice(0, 500) };
    }
  }
  if (QUOTA_TEXT_RE.test(combined)) {
    return { kind: "quota", detail: combined.slice(0, 500) };
  }

  // Auth signal: known OKX error codes, or known auth-related text (including the
  // "OKX_PASSPHRASE is required" pre-flight error class via the /passphrase/i match).
  if (AUTH_CODE_RE.test(combined) || AUTH_TEXT_RE.test(combined)) {
    return { kind: "auth", detail: combined.slice(0, 500) };
  }

  // Everything else: timeout (handled above), non-JSON stdout, empty data, network/DNS
  // error, unrecognized shape.
  return { kind: "transient", detail: combined.slice(0, 500) || "empty/non-JSON CLI output" };
}

/**
 * Runs `onchainos market index --address <addr> --chain <chain>` once and classifies the
 * result. Does not retry — retry-with-backoff is the caller's (main.ts's) job, since only
 * `transient` outcomes should ever be retried.
 */
export async function fetchIndexPrice(instrument: IndexInstrument, binPath: string): Promise<IndexOutcome> {
  const args = ["market", "index", "--address", instrument.address, "--chain", instrument.chain];
  assertNoPaymentSubcommand(args);

  try {
    const { stdout, stderr } = await execFileAsync(binPath, args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1_000_000,
    });
    return classifyIndexResponse({ stdout, stderr, timedOut: false });
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean; signal?: string };
    if (e.code === "ENOENT") {
      return { kind: "transient", detail: `onchainos binary not found at ${binPath}: ${e.message}` };
    }
    // execFile's own `timeout` option kills the child with SIGTERM on expiry.
    const timedOut = Boolean(e.killed) && e.signal === "SIGTERM";
    return classifyIndexResponse({
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message ?? "",
      timedOut,
    });
  }
}
