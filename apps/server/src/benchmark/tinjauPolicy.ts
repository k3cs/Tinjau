/**
 * The Tinjau arm of the benchmark (task T5.3).
 *
 * THIS DOES NOT REIMPLEMENT TINJAU
 *
 * The decision comes from `src/decision/decide()` — the real T4.1 orchestrator — fed by the real
 * upstream stages: `normalizeClaims` (T2.1), `buildEvidenceGraph` (T2.3), `resolveAsset` (T2.2),
 * `confirmMarket` (T3.3). A benchmark arm that reimplemented the policy would measure the
 * reimplementation, and any divergence would show up as a product result rather than as a bug.
 *
 * The wiring below is a copy of `decision/scenarioRunner.ts:runScenario` with exactly one change:
 * `confirmMarket` receives a `ConfirmationConfig` whose `minDrawdownBps` comes from the AMD-001
 * grid instead of always being the frozen 200. `runScenario` does not take a config, so it cannot
 * express the grid. To stop that copy drifting into a second implementation,
 * `test/benchmarkTinjau.test.ts` asserts that this module at `minDrawdownBps = 200` reproduces
 * `runScenario`'s `Decision` field for field. If the production runner changes, that test fails.
 *
 * THE FEE ENVELOPE IS THE PRODUCT'S OWN
 *
 * `decayedFee` from `decision/envelope.ts` is the mirror of `TinjauRiskPolicy.decayedFee` the
 * product actually runs. It is used here rather than the benchmark's `feeAtInstantPips`, and a
 * test proves the two curves are identical at the frozen envelope — so "same ceiling, same widen
 * and decay as the baselines" is a checked property, not a claim.
 *
 * WHAT TINJAU MAY PROPOSE. `targetFeeForConfidence` caps the proposal by confidence band
 * (LOW 7,000 / MEDIUM 13,500 / HIGH 20,000 pips). The *ceiling* is 20,000 for both fee-raising
 * policies, as T0.4 §2 requires; Tinjau may simply ask for less. That asymmetry is the product's
 * real behaviour and is not adjusted for the benchmark's convenience.
 *
 * DETERMINISM. Pure with respect to the fixtures on disk. The assessment instant is derived from
 * the replay window, never from a clock.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { normalizeClaims, type RawClaimInput } from "../evidence/normalize.js";
import { buildEvidenceGraph } from "../evidence/graph.js";
import { resolveAsset } from "../evidence/assets.js";
import { buildConfirmationInput, confirmMarket } from "../market/confirm.js";
import { FROZEN_CONFIRMATION_CONFIG } from "../market/confirmationConfig.js";
import { blockToUnixSeconds, type SwapWindowFixture } from "../market/poolTelemetry.js";
import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import { decide, decayedFee, FROZEN_ACTION_ENVELOPE, type Decision } from "../decision/index.js";
import type { FeeEpisode } from "./envelope.js";
import type { FeeRatePipsAt } from "./markout.js";
import { SCENARIO_IDS, type ReplayInput, type ScenarioId } from "./replayInput.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(HERE, "..", "..", "scenarios");
const POOL_FIXTURES_DIR = join(HERE, "..", "market", "fixtures");

export const TINJAU_POLICY_ID = "TINJAU" as const;
export const TINJAU_METHOD_VERSION = "tinjau.benchmark-tinjau/1.0.0";

/**
 * Amendment AMD-001's sensitivity grid for Tinjau's own `minDrawdownBps`.
 *
 * Same discipline as the volatility baseline's `k` grid and for the same reason: a single value
 * would leave a reviewer unable to tell whether the result depends on it. 200 is the frozen T3.3
 * value; 150 and 300 bracket it.
 */
export const MIN_DRAWDOWN_BPS_GRID = [150, 200, 300] as const;
export type MinDrawdownBps = (typeof MIN_DRAWDOWN_BPS_GRID)[number];

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

const PLACEHOLDER_REGISTRY = "0x00000000000000000000000000000000000000c1" as const;

interface ScenarioFile {
  scenarioId: string;
  asset: { company: string; tokenSymbol: string; tokenAddress: string; poolIdOrAddress: string };
  decisionAnchor: { at: string; usReferenceMarketOpen?: boolean };
  claims: RawClaimInput[];
}

export interface TinjauResult {
  policyId: typeof TINJAU_POLICY_ID;
  methodVersion: typeof TINJAU_METHOD_VERSION;
  minDrawdownBps: MinDrawdownBps;

  state: string;
  actionAuthorized: boolean;
  actionStatus: string;
  /** Pips Tinjau asked the contract for, or `null` when no protection was authorised. */
  requestedFeePips: number | null;
  /** The policy target for the record's confidence band; the request may never exceed it. */
  policyTargetFeePips: number;
  protectStartedAt: number | null;

  confirmationStatus: string;
  confidenceBand: string;
  reasonCodes: string[];
  humanExplanation: string;

  /** Epoch seconds the assessment was made at, and why that instant. */
  assessedAtUnixSeconds: number;
  assessmentInstantRule: string;

  /**
   * T0.4 §6.3 binding rule 3: the configuration version is recorded in every result row.
   * `minDrawdownBps` is carried alongside because the grid varies it away from the frozen value.
   */
  ruleVersions: Decision["ruleVersions"] & { minDrawdownBps: number };

  episodes: FeeEpisode[];
  statusReason: string;
}

/**
 * Runs the real pipeline for one scenario at one drawdown threshold.
 *
 * `now` defaults to the END of the replay window, matching `runScenario`'s documented default and
 * its reasoning: the promotion engine re-judges the market observation's age against `now` under a
 * 900 s freshness bound, so assessing at the anchor would throw the market leg out on timing
 * before its verdict was considered, and a refusal produced that way would say nothing about the
 * market. The window end makes the last observation 0 s old — the most favourable possible timing
 * for promotion. A refusal is therefore on the merits.
 */
export function evaluateTinjau(
  scenarioId: ScenarioId,
  minDrawdownBps: MinDrawdownBps,
): TinjauResult {
  const scenario = JSON.parse(
    readFileSync(join(SCENARIOS_DIR, SCENARIO_FILES[scenarioId]), "utf8"),
  ) as ScenarioFile;
  const swapWindow = JSON.parse(
    readFileSync(join(POOL_FIXTURES_DIR, POOL_FIXTURE_FILES[scenarioId]), "utf8"),
  ) as SwapWindowFixture;

  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const windowEnd = blockToUnixSeconds(swapWindow.toBlock);
  const now = windowEnd;

  const claims = normalizeClaims(scenario.claims);
  const graph = buildEvidenceGraph(claims, now, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const resolution = resolveAsset(
    scenario.asset.company,
    scenario.asset.tokenSymbol,
    scenario.asset.tokenAddress,
  );

  const confirmationInput = buildConfirmationInput(swapWindow, {
    anchorUnixSeconds: anchor,
    nowUnixSeconds: windowEnd,
    okx: null,
    usReferenceMarketOpen: scenario.decisionAnchor.usReferenceMarketOpen ?? false,
  });
  // The ONE deviation from `runScenario`: the drawdown floor comes from the AMD-001 grid.
  const confirmation = confirmMarket(confirmationInput, {
    ...FROZEN_CONFIRMATION_CONFIG,
    minDrawdownBps,
  });

  const decision = decide({
    eventKey: `tinjau.scenario/${scenario.scenarioId}`,
    now,
    claims,
    graph,
    resolution,
    confirmation,
    confirmationInput,
    officialEvidencePassed: true,
    chainId: 196,
    registryAddress: PLACEHOLDER_REGISTRY,
    requestedFeeProposal: null,
  });

  return toResult(decision, minDrawdownBps, now);
}

/** Converts a `Decision` into a benchmark result row. Exported so the parity test can reuse it. */
export function toResult(
  decision: Decision,
  minDrawdownBps: MinDrawdownBps,
  assessedAtUnixSeconds: number,
): TinjauResult {
  const action = decision.record.action;
  const protecting =
    decision.record.state === "PROTECT" && action.authorized && decision.protectStartedAt !== null;

  const requestedFeePips = action.requestedFee === null ? null : Number(action.requestedFee);

  const episodes: FeeEpisode[] =
    protecting && requestedFeePips !== null
      ? [
          {
            triggerAtUnixSeconds: decision.protectStartedAt as number,
            recoveredAtUnixSeconds:
              (decision.protectStartedAt as number) + FROZEN_ACTION_ENVELOPE.maxProtectDurationSec,
          },
        ]
      : [];

  return {
    policyId: TINJAU_POLICY_ID,
    methodVersion: TINJAU_METHOD_VERSION,
    minDrawdownBps,
    state: decision.record.state,
    actionAuthorized: action.authorized,
    actionStatus: action.status,
    requestedFeePips,
    policyTargetFeePips: decision.policyTargetFee,
    protectStartedAt: decision.protectStartedAt,
    confirmationStatus: decision.effectiveConfirmation,
    confidenceBand: decision.record.confidenceBand,
    reasonCodes: [...decision.record.reasonCodes],
    humanExplanation: decision.record.humanExplanation,
    assessedAtUnixSeconds,
    assessmentInstantRule:
      "End of the replay window, matching decision/scenarioRunner.ts. The promotion engine " +
      "re-judges the market observation's age against `now` under a 900s freshness bound, so " +
      "assessing at the anchor would discard the market leg on timing before its verdict was " +
      "considered. The window end makes the last observation 0s old, which is the most " +
      "favourable timing promotion can get, so a refusal is on the merits.",
    ruleVersions: { ...decision.ruleVersions, minDrawdownBps },
    episodes,
    statusReason: protecting
      ? `PROTECT authorised at ${requestedFeePips} pips (policy target ${decision.policyTargetFee}), ` +
        `protection starting ${decision.protectStartedAt}.`
      : `State ${decision.record.state}, action not authorised, so the fee stays at the base fee ` +
        `for the whole window. Reasons: ${decision.record.reasonCodes.join(", ")}.`,
  };
}

/** The whole AMD-001 grid for one scenario. The only public evaluation entry point. */
export function evaluateDrawdownGrid(scenarioId: ScenarioId): TinjauResult[] {
  return MIN_DRAWDOWN_BPS_GRID.map((bps) => evaluateTinjau(scenarioId, bps));
}

export function evaluateAllScenarios(): Record<ScenarioId, TinjauResult[]> {
  const out = {} as Record<ScenarioId, TinjauResult[]>;
  for (const id of SCENARIO_IDS) out[id] = evaluateDrawdownGrid(id);
  return out;
}

/**
 * The fee schedule this decision implies.
 *
 * Uses the product's own `decayedFee`, so the benchmark cannot show a curve the contract would not
 * produce. Before protection starts, and whenever no protection was authorised, the fee is the
 * base fee.
 */
export function tinjauFeeSchedule(result: TinjauResult, input: ReplayInput): FeeRatePipsAt {
  const start = result.protectStartedAt;
  const target = result.requestedFeePips;
  if (start === null || target === null || !result.actionAuthorized) {
    return () => input.envelope.baseFeePips;
  }
  return (unixSeconds: number) => {
    if (unixSeconds < start) return input.envelope.baseFeePips;
    return decayedFee(target, unixSeconds - start, FROZEN_ACTION_ENVELOPE);
  };
}
