/**
 * The frozen fee envelope and the widen-and-decay curve every fee-raising policy shares
 * (tasks T5.1 / T5.2).
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM THE POLICIES
 *
 * T0.4 §2 requires `VOLATILITY_ONLY` and `TINJAU` to use the *same* ceiling, widen duration and
 * decay curve, because "comparing a policy that may reach 2% against one capped lower would
 * measure the cap, not the signal". Two policies that each own a private copy of the curve can
 * drift apart silently, and the drift would be invisible in the result table — it would just
 * look like one policy protecting better. So the curve lives here once, is loaded from the
 * pre-registration JSON rather than retyped, and is imported by every policy that raises a fee.
 *
 * The curve itself is not reimplemented either: `timeDecayedFee` is the existing pure-TS mirror
 * of `AfterhoursFeePolicy.timeDecayedFee` (task P4.4), already pinned against the Solidity by
 * `test/expectedFee.test.ts` and against the live hook config on chain 1952. Writing a second
 * linear-decay function here would mean the benchmark measured a curve the product does not run.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { timeDecayedFee } from "../chain/expectedFee.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** `apps/server/scenarios/benchmark-preregistration.json` — the machine-readable T0.4 freeze. */
export const PREREGISTRATION_PATH = join(HERE, "..", "..", "scenarios", "benchmark-preregistration.json");

export interface PreRegistration {
  schemaVersion: string;
  frozenAt: string;
  venue: {
    chainId: number;
    pool: string;
    token0: string;
    token0Symbol: string;
    token0Decimals: number;
    token1: string;
    token1Symbol: string;
    token1Decimals: number;
    usdgIsToken0: boolean;
    poolFee: number;
    tickSpacing: number;
    feeProtocol: string;
    protocolShareOfPoolFee: number;
  };
  feeEnvelope: {
    baseFee: number;
    maxFee: number;
    widenDurationSec: number;
    decayDurationSec: number;
    appliesTo: string[];
  };
  policies: Array<Record<string, unknown>>;
  markout: {
    horizonsSec: number[];
    primaryHorizonSec: number;
  };
}

let cached: PreRegistration | null = null;

/**
 * Reads the frozen pre-registration.
 *
 * Deliberately read from disk rather than transcribed into TypeScript constants. A transcription
 * can be edited to match a result; a read cannot, because the JSON is the artifact T0.4 published
 * and `scenarioFixtures.test.ts` already guards the scenario files it sits beside.
 */
export function loadPreRegistration(): PreRegistration {
  if (cached === null) {
    cached = JSON.parse(readFileSync(PREREGISTRATION_PATH, "utf8")) as PreRegistration;
  }
  return cached;
}

export interface FeeEnvelope {
  /** Pips. 500 = 0.05%. */
  baseFeePips: number;
  /** Pips. 20000 = 2%. */
  maxFeePips: number;
  /** Seconds the fee stays at `maxFeePips` after a trigger. */
  widenDurationSec: number;
  /** Seconds over which the fee decays linearly back to `baseFeePips`. */
  decayDurationSec: number;
  /** Fraction of the pool fee taken by the protocol. 0.25 at this venue (`feeProtocol` 0x44). */
  protocolShareOfPoolFee: number;
  /** Provenance string so a result row can say where the envelope came from. */
  source: string;
}

export function frozenEnvelope(): FeeEnvelope {
  const pre = loadPreRegistration();
  return {
    baseFeePips: pre.feeEnvelope.baseFee,
    maxFeePips: pre.feeEnvelope.maxFee,
    widenDurationSec: pre.feeEnvelope.widenDurationSec,
    decayDurationSec: pre.feeEnvelope.decayDurationSec,
    protocolShareOfPoolFee: pre.venue.protocolShareOfPoolFee,
    source:
      `scenarios/benchmark-preregistration.json (${pre.schemaVersion}, frozen ${pre.frozenAt}); ` +
      `envelope inherited from the deployed AfterhoursFeeHook, not chosen for this benchmark`,
  };
}

/** One widen-and-decay episode: a trigger and the recovery that follows it. */
export interface FeeEpisode {
  /** Epoch seconds at which the fee stepped to `maxFeePips`. */
  triggerAtUnixSeconds: number;
  /** Epoch seconds at which the fee is back at `baseFeePips` (trigger + widen + decay). */
  recoveredAtUnixSeconds: number;
}

/**
 * The fee a policy charges at an instant, in pips.
 *
 * Before the first trigger the fee is `baseFeePips`. This wrapper is needed because
 * `timeDecayedFee` returns the *widened* fee for `now <= eventTimestamp` — correct for the hook,
 * whose event timestamp is by construction in the past, but wrong for a replay that also scores
 * the trades preceding the trigger.
 *
 * Episodes must be sorted and non-overlapping; `latestEpisodeAt` picks the governing one.
 */
export function feeAtInstantPips(
  unixSeconds: number,
  episodes: readonly FeeEpisode[],
  envelope: FeeEnvelope,
): number {
  const episode = latestEpisodeAt(unixSeconds, episodes);
  if (episode === null) return envelope.baseFeePips;
  return Number(
    timeDecayedFee(
      BigInt(envelope.maxFeePips),
      BigInt(envelope.baseFeePips),
      BigInt(Math.trunc(episode.triggerAtUnixSeconds)),
      BigInt(Math.trunc(unixSeconds)),
      BigInt(envelope.widenDurationSec),
      BigInt(envelope.decayDurationSec),
    ),
  );
}

function latestEpisodeAt(unixSeconds: number, episodes: readonly FeeEpisode[]): FeeEpisode | null {
  let found: FeeEpisode | null = null;
  for (const episode of episodes) {
    if (episode.triggerAtUnixSeconds <= unixSeconds) found = episode;
    else break;
  }
  return found;
}

/** Seconds from trigger to full recovery. Constant for a given envelope. */
export function recoverySeconds(envelope: FeeEnvelope): number {
  return envelope.widenDurationSec + envelope.decayDurationSec;
}
