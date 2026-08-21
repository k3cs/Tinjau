/**
 * The two baseline policies, run over the four frozen scenarios (tasks T5.1 and T5.2).
 *
 * SCOPE, DELIBERATELY NARROW
 *
 * This module produces `STATIC` rows and `VOLATILITY_ONLY` rows. It does not produce a Tinjau
 * row, and it computes no comparison of any kind — not a difference, not a ranking, not a
 * "which won". T5.3 (the replay runner) and T5.4 (outcome calculation) own that, and they depend
 * on T4.5, which is not finished. Computing a comparison before the Tinjau path exists is exactly
 * the situation the pre-registration was written to prevent: with a result visible, every
 * remaining implementation choice acquires a direction.
 *
 * WHAT "IDENTICAL INPUTS" MEANS HERE
 *
 * Both policies are handed the same `ReplayInput` object, built once per scenario by
 * `loadReplayInput`. Each row carries that input's `fingerprint`, so identity is checkable from
 * the artifact rather than asserted in prose.
 *
 * GRID-SHAPED OUTPUT
 *
 * Rows are keyed by `(scenarioId, policyId, parameters)`, where `parameters` is a map.
 * `VOLATILITY_ONLY` emits three rows per scenario, one per `k ∈ {2,3,5}`; `STATIC` emits one with
 * an empty map. Amendment AMD-001 extends the same grid discipline to Tinjau's `minDrawdownBps`
 * at 150/200/300, so T5.3 can add `{ minDrawdownBps: 150 }` rows into this shape without a schema
 * change. AMD-001 exists because a single value was about to be published where a grid belonged;
 * a result shape that can only hold one value per policy would have made that mistake structural.
 *
 * DETERMINISM. Every function below is pure with respect to the fixtures on disk. No clock, no
 * network, no randomness — `runBaselines()` twice in one process, or in two processes, produces
 * byte-identical JSON.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPreRegistration } from "./envelope.js";
import { loadReplayInput, SCENARIO_IDS, type ReplayInput, type ScenarioId } from "./replayInput.js";
import { evaluateStatic, staticFeeSchedule, STATIC_METHOD_VERSION, STATIC_POLICY_ID } from "./staticPolicy.js";
import {
  evaluateKGrid,
  K_GRID,
  projectVolatilityOnlyInput,
  volatilityFeeSchedule,
  VOLATILITY_METHOD_VERSION,
  VOLATILITY_POLICY_ID,
} from "./volatilityPolicy.js";
import { scoreScenarioPolicy, type MaterialityLabel, type ScenarioPolicyRow } from "./score.js";
import {
  evaluateDrawdownGrid,
  MIN_DRAWDOWN_BPS_GRID,
  tinjauFeeSchedule,
  TINJAU_METHOD_VERSION,
  TINJAU_POLICY_ID,
} from "./tinjauPolicy.js";
import {
  buildComparisonCells,
  evaluateClaimGate,
  COMPARISON_SCHEMA_VERSION,
  type ClaimGate,
  type ComparisonCell,
} from "./compare.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(HERE, "..", "..", "scenarios");

export const BASELINE_ARTIFACT_SCHEMA_VERSION = "tinjau.benchmark-baselines/1.0.0";

const SCENARIO_FILES: Record<ScenarioId, string> = {
  "A-rumor-watch": "scenario-a-rumor-watch.json",
  "B-confirmed-protect": "scenario-b-confirmed-protect.json",
  "C-two-origins-hard-case": "scenario-c-two-origins-hard-case.json",
  "D-neutral-normal": "scenario-d-neutral-normal.json",
};

export interface BaselineArtifact {
  schemaVersion: typeof BASELINE_ARTIFACT_SCHEMA_VERSION;
  producedByTasks: string[];
  preRegistration: { schemaVersion: string; frozenAt: string; document: string };
  /** Stated in the artifact so a reader is not left to infer it from an absence. */
  scopeLimit: string;
  counterfactualLimitation: string;
  kGrid: number[];
  scenarios: Array<{
    scenarioId: ScenarioId;
    replayInputFingerprint: string;
    windowFromBlock: number;
    windowToBlock: number;
    swapCount: number;
    rpcRangeErrors: number;
    hasEconomicRow: boolean;
  }>;
  rows: ScenarioPolicyRow[];
}

/**
 * Reads how the frozen scenario pre-registered this event, for after-the-fact labelling only.
 *
 * This never reaches the volatility policy. The policy runs first and returns a trigger decision;
 * only then does the scoring layer attach a false-positive label using this. That ordering is the
 * point — a label is a property of the result, not an input to the decision.
 *
 * A scenario earns a definite label only when its pre-registration is unconditional
 * (`mustHoldRegardlessOfMarketData`). Scenario B's expectation is conditional on market
 * confirmation and C's is explicitly undecided, so both stay `NOT_DETERMINABLE` rather than
 * receiving a label from a judgement the pre-registration does not supply.
 */
export function loadMaterialityLabel(scenarioId: ScenarioId): MaterialityLabel {
  const scenario = JSON.parse(
    readFileSync(join(SCENARIOS_DIR, SCENARIO_FILES[scenarioId]), "utf8"),
  ) as {
    preRegisteredExpectation: {
      state: string;
      mustHoldRegardlessOfMarketData?: boolean;
      aggressiveFeeAuthorized?: boolean;
    };
  };
  const expectation = scenario.preRegisteredExpectation;
  const unconditional = expectation.mustHoldRegardlessOfMarketData === true;

  if (unconditional && expectation.aggressiveFeeAuthorized === false) {
    return {
      aggressiveProtectionWarranted: false,
      reason:
        `The frozen scenario pre-registers state ${expectation.state} with ` +
        `aggressiveFeeAuthorized=false and mustHoldRegardlessOfMarketData=true, so no market ` +
        `behaviour in this window can make an aggressive fee the right response. A policy that ` +
        `raises the fee here is raising it on an event that did not warrant one.`,
    };
  }
  return {
    aggressiveProtectionWarranted: null,
    reason:
      `The frozen scenario pre-registers state ${expectation.state}, which is conditional or ` +
      `undecided. Labelling a trigger here as right or wrong would need a judgement the ` +
      `pre-registration deliberately withholds, so no label is asserted.`,
  };
}

/** Every baseline row for one scenario: one `STATIC`, three `VOLATILITY_ONLY` (one per `k`). */
export function runBaselinesForScenario(input: ReplayInput): ScenarioPolicyRow[] {
  const materiality = loadMaterialityLabel(input.scenarioId);
  const rows: ScenarioPolicyRow[] = [];

  const staticResult = evaluateStatic(input);
  rows.push(
    scoreScenarioPolicy(input, {
      policyId: STATIC_POLICY_ID,
      methodVersion: STATIC_METHOD_VERSION,
      parameters: {},
      status: "CONSTANT_BASE_FEE",
      statusReason: staticResult.statusReason,
      episodes: staticResult.episodes,
      feeAt: staticFeeSchedule(staticResult),
      materiality,
      notes: [
        "T0.4 §6.1: STATIC is the pool's actual live behaviour, so its replayed fee revenue " +
          "doubles as the reconciliation check on the replay itself.",
      ],
    }),
  );

  // The whole k grid, always. There is no code path that emits one k.
  const projected = projectVolatilityOnlyInput(input);
  for (const result of evaluateKGrid(projected, input.envelope)) {
    rows.push(
      scoreScenarioPolicy(input, {
        policyId: VOLATILITY_POLICY_ID,
        methodVersion: VOLATILITY_METHOD_VERSION,
        parameters: { k: result.k },
        status: result.status,
        statusReason: result.statusReason,
        episodes: result.episodes,
        feeAt: volatilityFeeSchedule(result, input.envelope),
        materiality,
        notes: [
          result.coverage.note,
          `Reference coverage: rv_short estimable at ${result.coverage.definedRvShortPoints} of ` +
            `${result.coverage.gridPoints} grid points; the trigger ratio was evaluable at ` +
            `${result.coverage.evaluableRatioPoints}.`,
          "This policy received price and time only. No filing, news, rumour, event type, " +
            "market-hours flag or decision anchor was reachable from its input type.",
        ],
      }),
    );
  }

  return rows;
}

/**
 * The Tinjau arm for one scenario: one row per `minDrawdownBps` in the AMD-001 grid.
 *
 * The decision comes from the real `decide()` engine via `tinjauPolicy.ts`. The same
 * `ReplayInput` — and therefore the same fingerprint — covers this arm as covers the baselines,
 * so the identity guarantee built for T5.1 extends to Tinjau without a second mechanism.
 */
export function runTinjauForScenario(input: ReplayInput): ScenarioPolicyRow[] {
  const materiality = loadMaterialityLabel(input.scenarioId);
  return evaluateDrawdownGrid(input.scenarioId).map((result) =>
    scoreScenarioPolicy(input, {
      policyId: TINJAU_POLICY_ID,
      methodVersion: TINJAU_METHOD_VERSION,
      parameters: { minDrawdownBps: result.minDrawdownBps },
      status: result.state,
      statusReason: result.statusReason,
      episodes: result.episodes,
      feeAt: tinjauFeeSchedule(result, input),
      materiality,
      notes: [
        `Decision produced by the real src/decision/decide() engine, not a benchmark ` +
          `reimplementation. Rule versions: ${JSON.stringify(result.ruleVersions)}.`,
        result.assessmentInstantRule,
        `Confirmation ${result.confirmationStatus}; confidence ${result.confidenceBand}; ` +
          `reasons ${result.reasonCodes.join(", ")}.`,
      ],
    }),
  );
}

/** The complete T5.1 + T5.2 artifact. Deterministic and JSON-serialisable. */
export function runBaselines(): BaselineArtifact {
  const pre = loadPreRegistration();
  const inputs = SCENARIO_IDS.map(loadReplayInput);

  return {
    schemaVersion: BASELINE_ARTIFACT_SCHEMA_VERSION,
    producedByTasks: ["T5.1", "T5.2"],
    preRegistration: {
      schemaVersion: pre.schemaVersion,
      frozenAt: pre.frozenAt,
      document: "docs/buildx-orion-2026/outputs/04-planning/t0-4-benchmark-preregistration.md",
    },
    scopeLimit:
      "Baseline rows only. No Tinjau row and no cross-policy comparison appears in this " +
      "artifact: T5.3 and T5.4 own those and depend on T4.5, which is not complete. Any " +
      "comparison drawn from these rows is drawn by the reader, not asserted here.",
    counterfactualLimitation:
      "T0.4 §5: all rows re-price the SAME observed swap sequence under different fee schedules, " +
      "which embeds the false assumption that a higher fee would not have deterred any trade. " +
      "Fee revenue is therefore overstated for any fee-raising policy and the adverse-selection " +
      "benefit is understated. The two biases oppose each other and the NET SIGN IS UNDETERMINED " +
      "— these results may not be described as conservative.",
    kGrid: [...K_GRID],
    scenarios: inputs.map((input) => ({
      scenarioId: input.scenarioId,
      replayInputFingerprint: input.fingerprint,
      windowFromBlock: input.window.fromBlock,
      windowToBlock: input.window.toBlock,
      swapCount: input.swapCount,
      rpcRangeErrors: input.rpcRangeErrors,
      hasEconomicRow: input.swapCount > 0,
    })),
    rows: inputs.flatMap(runBaselinesForScenario),
  };
}

export const BENCHMARK_ARTIFACT_SCHEMA_VERSION = "tinjau.three-policy-benchmark/1.0.0";

export interface BenchmarkArtifact extends Omit<BaselineArtifact, "schemaVersion" | "producedByTasks" | "scopeLimit"> {
  schemaVersion: typeof BENCHMARK_ARTIFACT_SCHEMA_VERSION;
  producedByTasks: string[];
  comparisonSchemaVersion: typeof COMPARISON_SCHEMA_VERSION;
  minDrawdownBpsGrid: number[];
  amendments: Array<{ id: string; summary: string; direction: string; claimGateEffect: string }>;
  headlineFindings: string[];
  cells: ComparisonCell[];
  claimGate: ClaimGate;
}

/**
 * The complete three-policy artifact: `STATIC`, `VOLATILITY_ONLY` at every `k`, `TINJAU` at every
 * `minDrawdownBps`, plus every comparison cell and the claim gate.
 *
 * Deterministic and JSON-serialisable. `emit.ts` writes it to disk.
 */
export function runBenchmark(): BenchmarkArtifact {
  const pre = loadPreRegistration();
  const inputs = SCENARIO_IDS.map(loadReplayInput);
  const rows = inputs.flatMap((input) => [
    ...runBaselinesForScenario(input),
    ...runTinjauForScenario(input),
  ]);
  const cells = buildComparisonCells(rows);

  return {
    schemaVersion: BENCHMARK_ARTIFACT_SCHEMA_VERSION,
    producedByTasks: ["T5.1", "T5.2", "T5.3", "T5.4"],
    comparisonSchemaVersion: COMPARISON_SCHEMA_VERSION,
    preRegistration: {
      schemaVersion: pre.schemaVersion,
      frozenAt: pre.frozenAt,
      document: "docs/buildx-orion-2026/outputs/04-planning/t0-4-benchmark-preregistration.md",
    },
    counterfactualLimitation:
      "T0.4 §5: every row re-prices the SAME observed swap sequence under different fee " +
      "schedules, which embeds the false assumption that a higher fee would not have deterred " +
      "any trade. Fee revenue is overstated for any fee-raising policy and the adverse-selection " +
      "benefit is understated. The two biases oppose each other and the NET SIGN IS UNDETERMINED " +
      "— these results may not be described as conservative.",
    kGrid: [...K_GRID],
    minDrawdownBpsGrid: [...MIN_DRAWDOWN_BPS_GRID],
    amendments: [
      {
        id: "AMD-001",
        summary:
          "Tinjau's own minDrawdownBps is reported across 150/200/300 rather than at 200 alone, " +
          "inheriting the volatility baseline's k-grid discipline.",
        direction:
          "Disclosure only. A sensitivity grid cannot make a result look better than a single " +
          "chosen value; it can only expose fragility a single value would have hidden.",
        claimGateEffect:
          "Tightens it. Tinjau must beat both baselines at every k AND every drawdown threshold.",
      },
      {
        id: "AMD-002",
        summary:
          "POST-HOC. Adds M_h_LP_consistent alongside the frozen M_h_LP, applying one fee basis " +
          "to both the credit and debit sides. The frozen metric debits a counterfactual protocol " +
          "cut of a fee it never credits the LP with earning.",
        direction:
          "STATED BEFORE ITS VALUES: it flatters every fee-raising policy, Tinjau included. It " +
          "does not remove T0.4 §5's bias, it relocates it — the frozen metric mechanically " +
          "penalises fee-raising, this one mechanically rewards it, and the truth is bracketed " +
          "between them.",
        claimGateEffect:
          "None, by construction. canClaimLossAvoided reads the pre-registered metric alone and " +
          "therefore stays false. A metric derived after seeing results cannot authorise a claim.",
      },
    ],
    headlineFindings: [
      "TINJAU does not promote to PROTECT on any of the four frozen scenarios, at any drawdown " +
        "threshold in the AMD-001 grid. Its fee stays at the base fee throughout every window, so " +
        "its economics are identical to STATIC rather than better than it.",
      "VOLATILITY_ONLY fires on the neutral control (scenario D, a routine Form 4 pre-registered " +
        "NORMAL) at every k in the grid. That is a false positive at 2, 3 and 5.",
      "canClaimLossAvoided is FALSE. Tinjau ties STATIC rather than beating it, and 'beats' means " +
        "strictly greater.",
      "Under AMD-002's post-hoc consistent basis, VOLATILITY_ONLY beats TINJAU on every economic " +
        "scenario, because it collects a counterfactual 2% fee on flow that is assumed not to " +
        "have been deterred. Published in full, per T0.4 §8.5.",
      "M_0 is not 'structurally >= 0' as T0.4 §4 states: false for 216 of 4,777 swaps, all of " +
        "them larger than the median trade.",
    ],
    scenarios: inputs.map((input) => ({
      scenarioId: input.scenarioId,
      replayInputFingerprint: input.fingerprint,
      windowFromBlock: input.window.fromBlock,
      windowToBlock: input.window.toBlock,
      swapCount: input.swapCount,
      rpcRangeErrors: input.rpcRangeErrors,
      hasEconomicRow: input.swapCount > 0,
    })),
    rows,
    cells,
    claimGate: evaluateClaimGate(cells),
  };
}

export * from "./compare.js";
export * from "./envelope.js";
export * from "./markout.js";
export * from "./tinjauPolicy.js";
export * from "./replayInput.js";
export * from "./score.js";
export * from "./staticPolicy.js";
export * from "./volatilityPolicy.js";
