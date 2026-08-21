/**
 * The single shared replay input every benchmark policy is scored against (task T5.1).
 *
 * T0.4 §1 and tracker §0.13 require all three policies to receive identical trades, timestamps,
 * initial liquidity, costs and replay window. T5.1's acceptance criterion is exactly that
 * identity.
 *
 * THE DESIGN CHOICE THIS FILE MAKES
 *
 * Identity is made *structural* rather than procedural. There is one constructor,
 * `loadReplayInput`, and every policy takes a `ReplayInput` it cannot build for itself. A policy
 * therefore cannot quietly acquire a different trade list, a different starting fee, or a
 * different protocol-fee assumption — not because a reviewer remembered to check, but because
 * there is no second place for those values to come from.
 *
 * The `fingerprint` closes the remaining hole. It is a hash over the trades, window, anchor,
 * envelope, costs and initial state, and it is stamped on every result row. Two rows claiming to
 * be the same replay but carrying different fingerprints is a mechanical contradiction, so a
 * later refactor that silently re-slices the window fails the comparison rather than shifting it.
 *
 * DETERMINISM. Loading is pure with respect to its inputs: fixtures on disk, no clock, no
 * network, no randomness.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  blockToIso,
  blockToUnixSeconds,
  decodeFixtureSwaps,
  type PoolDescriptor,
  type RawSwap,
  type SwapWindowFixture,
} from "../market/poolTelemetry.js";
import { frozenEnvelope, type FeeEnvelope } from "./envelope.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(HERE, "..", "..", "scenarios");
const POOL_FIXTURES_DIR = join(HERE, "..", "market", "fixtures");
/** Produced by task P2.4, an independent earlier study. Used read-only, for `TVL_event`. */
const P2_4_MARKOUT_RAW = join(
  HERE, "..", "..", "..", "..",
  "docs", "buildx-orion-2026", "outputs", "05-build", "data", "p2_4_markout_raw.jsonl",
);

export const REPLAY_INPUT_SCHEMA_VERSION = "tinjau.benchmark-replay-input/1.0.0";

/** The four frozen T0.2 scenarios, in their frozen order. No scenario may be added or dropped. */
export const SCENARIO_IDS = [
  "A-rumor-watch",
  "B-confirmed-protect",
  "C-two-origins-hard-case",
  "D-neutral-normal",
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

const SCENARIO_FILES: Record<ScenarioId, string> = {
  "A-rumor-watch": "scenario-a-rumor-watch.json",
  "B-confirmed-protect": "scenario-b-confirmed-protect.json",
  "C-two-origins-hard-case": "scenario-c-two-origins-hard-case.json",
  "D-neutral-normal": "scenario-d-neutral-normal.json",
};

const POOL_FIXTURE_FILES: Record<ScenarioId, string> = {
  "A-rumor-watch": "pool-scenario-a-swaps.json",
  "B-confirmed-protect": "pool-scenario-b-swaps.json",
  "C-two-origins-hard-case": "pool-scenario-c-swaps.json",
  "D-neutral-normal": "pool-scenario-d-swaps.json",
};

/**
 * Pool state the replay starts from, identical for every policy.
 *
 * Not a placeholder: "same initial state" is half of T5.1's acceptance criterion, and a policy
 * that began mid-protection would inherit a fee advantage no trigger earned.
 */
export interface ReplayInitialState {
  feePips: number;
  protectionActive: false;
  note: string;
}

/** Cost parameters, identical for every policy. */
export interface ReplayCosts {
  /** Fraction of the pool fee routed to the protocol rather than to LPs. */
  protocolShareOfPoolFee: number;
  /** How that fraction was established. */
  source: string;
}

export interface ReplayWindow {
  fromBlock: number;
  toBlock: number;
  fromUnixSeconds: number;
  toUnixSeconds: number;
  fromIso: string;
  toIso: string;
  rule: string;
}

export interface ReplayAnchor {
  /** The event instant the window is built around. Evidence-derived — see `volatilityPolicy.ts`. */
  unixSeconds: number;
  blockNumber: number;
  iso: string;
}

export interface ReplayTvl {
  /** Pool TVL in USD at the anchor block, or `null` when it could not be established. */
  valueUsd: number | null;
  source: string;
}

export interface ReplayInput {
  readonly schemaVersion: typeof REPLAY_INPUT_SCHEMA_VERSION;
  readonly scenarioId: ScenarioId;
  readonly pool: PoolDescriptor;
  readonly window: ReplayWindow;
  readonly anchor: ReplayAnchor;
  /** Every swap in the window, sorted by (blockNumber, logIndex). The identical trade list. */
  readonly swaps: readonly RawSwap[];
  readonly swapCount: number;
  /** Non-zero means the captured window has holes and `swapCount` is a lower bound. */
  readonly rpcRangeErrors: number;
  readonly initialState: ReplayInitialState;
  readonly costs: ReplayCosts;
  readonly envelope: FeeEnvelope;
  readonly tvlEvent: ReplayTvl;
  /** sha256 over everything above that a policy could differ on. Stamped on every result row. */
  readonly fingerprint: string;
}

interface ScenarioFile {
  scenarioId: string;
  decisionAnchor: { at: string; blockNumber: string };
  marketReplayWindow: {
    from: string;
    to: string;
    fromBlock: string;
    toBlock: string;
    rule: string;
  };
}

/**
 * Builds the shared replay input for one frozen scenario.
 *
 * Cross-checks the scenario's declared window against the captured pool fixture and throws on a
 * mismatch. A silently mismatched window is the exact defect that would make "identical inputs"
 * false while every row still claimed it was true.
 */
export function loadReplayInput(scenarioId: ScenarioId): ReplayInput {
  const scenario = JSON.parse(
    readFileSync(join(SCENARIOS_DIR, SCENARIO_FILES[scenarioId]), "utf8"),
  ) as ScenarioFile;
  const fixture = JSON.parse(
    readFileSync(join(POOL_FIXTURES_DIR, POOL_FIXTURE_FILES[scenarioId]), "utf8"),
  ) as SwapWindowFixture;

  const declaredFrom = Number(scenario.marketReplayWindow.fromBlock);
  const declaredTo = Number(scenario.marketReplayWindow.toBlock);
  if (fixture.fromBlock !== declaredFrom || fixture.toBlock !== declaredTo) {
    throw new Error(
      `Replay window mismatch for ${scenarioId}: the frozen scenario declares blocks ` +
        `${declaredFrom}-${declaredTo} but the captured pool fixture covers ` +
        `${fixture.fromBlock}-${fixture.toBlock}. The benchmark cannot proceed on a window ` +
        `that is not the frozen one.`,
    );
  }
  const swaps = decodeFixtureSwaps(fixture);
  if (swaps.length !== fixture.swapCount) {
    throw new Error(
      `Swap count mismatch for ${scenarioId}: fixture declares ${fixture.swapCount}, decoded ` +
        `${swaps.length}.`,
    );
  }

  const envelope = frozenEnvelope();
  const anchorBlock = Number(scenario.decisionAnchor.blockNumber);

  const pool: PoolDescriptor = {
    chainId: fixture.chainId,
    pool: fixture.pool,
    token0: fixture.token0,
    token0Symbol: fixture.token0Symbol,
    token0Decimals: fixture.token0Decimals,
    token1: fixture.token1,
    token1Symbol: fixture.token1Symbol,
    token1Decimals: fixture.token1Decimals,
    feePips: fixture.feePips,
    tickSpacing: fixture.tickSpacing,
    liquiditySource: fixture.liquiditySource,
    quoteIsToken0: fixture.quoteIsToken0,
  };

  const input: Omit<ReplayInput, "fingerprint"> = {
    schemaVersion: REPLAY_INPUT_SCHEMA_VERSION,
    scenarioId,
    pool,
    window: {
      fromBlock: fixture.fromBlock,
      toBlock: fixture.toBlock,
      fromUnixSeconds: blockToUnixSeconds(fixture.fromBlock),
      toUnixSeconds: blockToUnixSeconds(fixture.toBlock),
      fromIso: fixture.fromIso,
      toIso: fixture.toIso,
      rule: scenario.marketReplayWindow.rule,
    },
    anchor: {
      unixSeconds: blockToUnixSeconds(anchorBlock),
      blockNumber: anchorBlock,
      iso: blockToIso(anchorBlock),
    },
    swaps,
    swapCount: swaps.length,
    rpcRangeErrors: fixture.rpcRangeErrors,
    initialState: {
      feePips: envelope.baseFeePips,
      protectionActive: false,
      note:
        "Every policy starts at the frozen base fee with no protection running, so no policy " +
        "inherits a fee level that no trigger in this window earned.",
    },
    costs: {
      protocolShareOfPoolFee: envelope.protocolShareOfPoolFee,
      source: envelope.source,
    },
    envelope,
    tvlEvent: loadTvlEvent(anchorBlock),
  };

  return { ...input, fingerprint: fingerprintOf(input) };
}

export function loadAllReplayInputs(): ReplayInput[] {
  return SCENARIO_IDS.map(loadReplayInput);
}

/**
 * `TVL_event` per T0.4 §7: the pool's token balances at the anchor block, priced at the pool's
 * own `slot0` at that block.
 *
 * It cannot be derived from swap logs — balances need `balanceOf` at an archive block, and this
 * module makes no network calls. One value is recoverable without one: scenario D's anchor block
 * is the same block P2.4 already measured for the same pool, so that study's recorded
 * `tvl_event_usd` is reused rather than re-fetched or guessed. The other three scenarios report
 * `null` with the reason, because an imputed denominator would silently change every
 * "bps of TVL" figure derived from it.
 */
function loadTvlEvent(anchorBlock: number): ReplayTvl {
  if (!existsSync(P2_4_MARKOUT_RAW)) {
    return {
      valueUsd: null,
      source:
        "TVL_event requires balanceOf at an archive block; no network call is made here and no " +
        "recorded measurement was found for this block.",
    };
  }
  for (const line of readFileSync(P2_4_MARKOUT_RAW, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    const row = JSON.parse(line) as { event_block?: number; tvl_event_usd?: number; pool?: string };
    if (row.event_block === anchorBlock && typeof row.tvl_event_usd === "number") {
      return {
        valueUsd: row.tvl_event_usd,
        source:
          `p2_4_markout_raw.jsonl, event_block ${anchorBlock}, pool ${row.pool} — measured by ` +
          `task P2.4 via archive eth_call (balanceOf at the block, priced at that block's slot0).`,
      };
    }
  }
  return {
    valueUsd: null,
    source:
      `TVL_event requires balanceOf at archive block ${anchorBlock}. This module makes no network ` +
      `calls and no earlier study recorded that block, so the denominator is unavailable rather ` +
      `than imputed. Any "bps of TVL" figure for this scenario is therefore null, not zero.`,
  };
}

/**
 * sha256 over the parts of the replay a policy could differ on.
 *
 * Swaps are hashed in their compact captured form so the hash tracks the data, not the shape of
 * the decoded object.
 */
function fingerprintOf(input: Omit<ReplayInput, "fingerprint">): string {
  const canonical = JSON.stringify({
    schemaVersion: input.schemaVersion,
    scenarioId: input.scenarioId,
    pool: input.pool,
    window: input.window,
    anchor: input.anchor,
    swaps: input.swaps.map((s) => [
      s.blockNumber,
      s.logIndex,
      s.amount0,
      s.amount1,
      s.sqrtPriceX96,
      s.liquidity,
      s.tick,
    ]),
    rpcRangeErrors: input.rpcRangeErrors,
    initialState: { feePips: input.initialState.feePips, protectionActive: input.initialState.protectionActive },
    costs: { protocolShareOfPoolFee: input.costs.protocolShareOfPoolFee },
    envelope: {
      baseFeePips: input.envelope.baseFeePips,
      maxFeePips: input.envelope.maxFeePips,
      widenDurationSec: input.envelope.widenDurationSec,
      decayDurationSec: input.envelope.decayDurationSec,
      protocolShareOfPoolFee: input.envelope.protocolShareOfPoolFee,
    },
    tvlEventUsd: input.tvlEvent.valueUsd,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
