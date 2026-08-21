#!/usr/bin/env node
/**
 * T5.5 — build the Proof of Protection record.
 *
 * Zero dependencies. Reads only committed artifacts and DERIVES every counterfactual
 * figure from `three-policy-benchmark.json` rather than transcribing it, so the two
 * artifacts cannot drift. Every observed figure is DERIVED from
 * `t4-demo-manifest-xlayer-testnet.json`, which was written by the on-chain harness.
 *
 * No wall-clock time is read, so re-running produces a byte-identical file.
 *
 *   node docs/buildx-orion-2026/outputs/05-build/tools/build-proof-of-protection.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "..");
const REPO = join(BUILD, "..", "..", "..", "..");

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const manifest = read(join(BUILD, "t4-demo-manifest-xlayer-testnet.json"));
const benchmark = read(join(BUILD, "three-policy-benchmark.json"));
const scenarioB = read(join(REPO, "apps/server/scenarios/scenario-b-confirmed-protect.json"));

const SCENARIO_ID = "B-confirmed-protect";

// ---------------------------------------------------------------------------
// Observed side — the only PROTECT interval that has ever existed.
// ---------------------------------------------------------------------------

const sceneB = manifest.scenes.find((s) => s.scene === "B");
const sceneF = manifest.scenes.find((s) => s.scene === "F");
if (!sceneB) throw new Error("scene B missing from the demo manifest");
if (!sceneF) throw new Error("scene F missing from the demo manifest");

const step = (scene, name) => {
  const s = scene.steps.find((x) => x.step === name);
  if (!s) throw new Error(`step ${name} missing from scene ${scene.scene}`);
  return s;
};

const decide = step(sceneB, "decide");
const post = step(sceneB, "postAssessment");
const readback = step(sceneB, "readback");
const compare = step(sceneB, "compare:canonical-vs-constructed");
const standDown = step(sceneB, "postAssessment:stand-down");
const cooldown = step(sceneB, "postAssessment:blocked-by-cooldown");

const obs = (value, unit, note) =>
  note === undefined
    ? { value, unit, basis: "OBSERVED" }
    : { value, unit, basis: "OBSERVED", note };

const swapRow = (swap, label, note) => ({
  label,
  txHash: swap.txHash,
  blockNumber: swap.blockNumber,
  atUnixSeconds: swap.atUnixSeconds,
  appliedFeePips: obs(swap.appliedFee, "pips", note),
  previewedFeePips: obs(
    swap.previewedFee,
    "pips",
    swap.previewedFee === swap.appliedFee
      ? undefined
      : "A quoted fee is an upper bound during decay: the fee is continuous in time and seconds elapse between the quote and inclusion. Both values are recorded rather than reconciled away.",
  ),
  poolManagerSwapEvent: {
    amount0: obs(swap.amount0, "token0 base units"),
    amount1: obs(swap.amount1, "token1 base units"),
    tick: obs(swap.tick, "tick"),
  },
});

const [widened, midDecay, recovered, afterCooldown] = sceneB.swaps;

// ---------------------------------------------------------------------------
// Counterfactual side — lifted verbatim from the benchmark artifact.
// ---------------------------------------------------------------------------

const bRows = benchmark.rows.filter((r) => r.scenarioId === SCENARIO_ID);
if (bRows.length === 0) throw new Error(`no benchmark rows for ${SCENARIO_ID}`);

const pickRow = (policyId, params) =>
  bRows.find(
    (r) =>
      r.policyId === policyId &&
      Object.entries(params).every(([k, v]) => r.parameters[k] === v),
  );

const economicsOf = (row) => {
  if (!row) throw new Error("benchmark row not found");
  const e = row.economics;
  if (!e) throw new Error(`row ${row.policyId} has no economics`);
  return {
    policyId: row.policyId,
    parameters: row.parameters,
    methodVersion: row.methodVersion,
    replayInputFingerprint: row.replayInputFingerprint,
    status: row.policyBehaviour.status,
    swapCount: e.swapCount,
    totalNotionalUsd: e.totalNotionalUsd,
    feeRevenueGrossUsd: e.feeRevenueGrossUsd,
    feeRevenueToLpUsd: e.feeRevenueToLpUsd,
    markoutM0Usd: e.markoutM0Usd,
    markoutPrimaryUsd: e.markoutPrimaryUsd,
    markoutPrimaryPostHocAmd002Usd: {
      ...e.amd002ConsistentBasis.markoutPrimaryConsistentUsd,
      note:
        "AMD-002, POST-HOC. Never describe this as pre-registered. It flatters every fee-raising policy and is structurally excluded from the claim gate.",
    },
    adverseSelectionPrimaryUsd: e.adverseSelectionPrimaryUsd,
    maxFeeReachedPips: row.policyBehaviour.maxFeeReachedPips,
    actionLatencySec: row.policyBehaviour.actionLatencySec,
    protectionDurationSec: row.policyBehaviour.protectionDurationSec,
    timeToDecaySec: row.policyBehaviour.timeToDecaySec,
    triggerCount: row.policyBehaviour.triggerCount,
  };
};

const staticRow = economicsOf(pickRow("STATIC", {}));
const volRows = [2, 3, 5].map((k) => economicsOf(pickRow("VOLATILITY_ONLY", { k })));
const tinjauRows = [150, 200, 300].map((bps) =>
  economicsOf(pickRow("TINJAU", { minDrawdownBps: bps })),
);

// ---------------------------------------------------------------------------

const record = {
  $schema: "./proof-of-protection.schema.json",
  schemaVersion: "tinjau.proof-of-protection/1.0.0",
  producedByTask: "T5.5",
  recordId: "pop-B-confirmed-protect-xlayer-testnet-1952-demo-envelope",

  _READ_THIS_FIRST: [
    "THIS RECORD DEMONSTRATES ENFORCEMENT, NOT BENEFIT.",
    "No replayed scenario produced a PROTECT. The only observed PROTECT interval that exists anywhere in this project is the one below, and its MARKET LEG IS CONSTRUCTED on a BUILDER-CONTROLLED X Layer Testnet pool seeded with valueless mock tokens.",
    "The canonical replay of this same 8-K resolves to WATCH, because its market leg is NOT_CONFIRMED (T3.3, published). See `canonicalReplayOfThisEvent`.",
    "canClaimLossAvoided is FALSE. Nothing here may be presented as evidence that an intervention helped an LP, because no measured event warranted an intervention.",
    "`observedOnChainProtection` and `replayedCounterfactualBaselines` are different chains, different pools, and different epistemic status. They must never be combined into one figure or shown with one visual treatment.",
  ],

  derivedFrom: {
    onChainRun: {
      artifact: "t4-demo-manifest-xlayer-testnet.json",
      runAt: manifest.generatedAt,
      addressStatus: manifest.addressStatus,
    },
    benchmark: {
      artifact: "three-policy-benchmark.json",
      schemaVersion: benchmark.schemaVersion,
      producedByTasks: benchmark.producedByTasks,
    },
    frozenScenario: {
      artifact: "apps/server/scenarios/scenario-b-confirmed-protect.json",
      schemaVersion: scenarioB.schemaVersion,
      scenarioId: scenarioB.scenarioId,
      frozenAt: scenarioB.frozenAt,
      frozenByTask: scenarioB.frozenByTask,
    },
    _determinism:
      "Every field below is derived from those three artifacts. No wall-clock time is read, so re-running the generator produces a byte-identical file and an empty diff is meaningful evidence.",
  },

  // -------------------------------------------------------------------------
  // §0.13 requirement 1 — the triggering evidence.
  // -------------------------------------------------------------------------
  trigger: {
    inputIdentity: {
      scenarioId: scenarioB.scenarioId,
      title: scenarioB.title,
      decisionAnchor: scenarioB.decisionAnchor,
      evidenceWindow: scenarioB.evidenceWindow,
      canonicalAsset: scenarioB.asset,
      preRegisteredExpectation: scenarioB._pre_registration,
    },
    evidence: {
      dataMode: "REPLAY",
      claimCount: scenarioB.claims.length,
      claims: scenarioB.claims.map((c) => ({
        claimId: c.claimId,
        sourceClass: c.sourceClass,
        dataMode: c.dataMode,
        sourceUrl: c.sourceUrl,
        sourceId: c.sourceId,
        publisherOrAuthor: c.publisherOrAuthor,
        publishedAt: c.publishedAt,
        eventType: c.eventType,
        materiality: c.materiality,
        sourceContentSha256: c.sourceContentSha256,
      })),
      _note:
        "The evidence leg is real and source-linked: SEC 8-K accession 0001045810-26-000069, primary document byte-committed. No claim in this scenario is SIMULATED. That is scenario A's rumour fixture, not this one.",
    },
    marketObservations: {
      dataMode: "CONSTRUCTED",
      _WARNING:
        "CONSTRUCTED. This price path was authored for the builder-controlled testnet pool because the real one does not confirm. It is not a market observation and no market conclusion may be drawn from it.",
      whatWasConstructed:
        "The price path only. The path was scored by the real `confirmMarket` engine under its own frozen thresholds (rule tinjau.confirm/2.0.0), so the CONFIRMED verdict is the engine's, not a hand-set value.",
      measuredExtentOfConstruction: compare.decoded.reasonCodeDiff,
      _measuredExtentNote:
        "Reason-code diff against the canonical replay. All three differing codes are market-leg codes. Every evidence-leg conclusion is identical in both runs, asserted by test in the harness.",
      confirmation: decide.decoded.marketConfirmation,
      okxLeg: {
        status: "UNAVAILABLE",
        _note:
          "No committed OKX index data covers this anchor (T3.1). This is a single-leg X Layer pool confirmation. No artifact may describe it as dual OKX/X Layer confirmation.",
      },
    },
  },

  // -------------------------------------------------------------------------
  // §0.13 requirement 2 — selected state, reason, policy version.
  // -------------------------------------------------------------------------
  selection: {
    state: decide.decoded.state,
    reasonCodes: decide.decoded.reasonCodes,
    confidenceBand: decide.decoded.confidenceBand,
    policyVersion: readback.decoded.record.policyVersion,
    schemaVersion: "tinjau.risk/1.0.0",
    confirmationRuleVersion: "tinjau.confirm/2.0.0",
    evidenceCommitment: readback.decoded.record.evidenceCommitment,
    reasonBits: readback.decoded.record.reasonBits,
    dataModeOnChain: readback.decoded.record.dataMode,
    _dataModeCaveat:
      "The on-chain `dataMode` is derived from the EVIDENCE only, so it reads REPLAY and cannot express 'evidence replayed, market constructed'. That distinction lives in this record and in the demo manifest, not on chain.",
    humanExplanation: decide.decoded.humanExplanation,
    assetRemap: sceneB.assetRemap,
  },

  // -------------------------------------------------------------------------
  // §0.13 requirement 3 — bounded action requested vs actually applied.
  // -------------------------------------------------------------------------
  boundedAction: {
    envelope: {
      ...manifest.network.envelope,
      _envelopeCaveat:
        "DEMO ENVELOPE, compressed 60x from the production envelope (3600/18000/21600 s) so the recovery could be watched inside a demo. The invariants `cap == widen + decay` and `cooldown == widen` are preserved exactly. X Layer Testnet exposes no evm_increaseTime, so the production timings are proven by `forge test` (134/134) and by the local Anvil run, not on chain 1952.",
    },
    requestedFeePips: obs(
      Number(decide.decoded.requestedFee),
      "pips",
      "A proposal. The contract recomputes its own target and may lower or reject it; it can never raise it.",
    ),
    appliedFeePips: obs(
      widened.appliedFee,
      "pips",
      "Decoded from PoolManager's own Swap event — what the pool charged, not what a view function returned.",
    ),
    status: "APPLIED",
    postAssessmentTxHash: post.txHash,
    protectStartedAtUnixSeconds: readback.decoded.record.protectStartedAt,
    protectEndsAtUnixSeconds: readback.decoded.effectiveState.endsAt,
    recordExpiresAtUnixSeconds: readback.decoded.record.expiresAt,
  },

  // =========================================================================
  // OBSERVED — chain 1952, builder-controlled pool. Every leaf basis: OBSERVED.
  // Nothing economic lives here, because there is no economics to measure on a
  // pool this project created and seeded with valueless mock tokens.
  // =========================================================================
  observedOnChainProtection: {
    _basis: "OBSERVED",
    _scope:
      "What the pool actually charged, and what the contract actually refused. These are enforcement facts. They are NOT an LP outcome and carry no USD figure, because the tokens are freely-mintable mocks with no value and the liquidity is ours.",
    chainId: manifest.network.chainId,
    networkLabel: manifest.network.networkLabel,
    poolClass: "BUILDER_CONTROLLED",
    addresses: manifest.network.addresses,
    addressStatus: manifest.addressStatus,
    roleSeparation: {
      ...manifest.network.accounts,
      _note:
        "Testnet arrangement. The assessor key is derived from the poster key and holds 0 OKB by design; guardian and poster are the same wallet because pausing costs gas. Production requires an independently generated assessor key. No key material appears in this artifact.",
    },
    feePathActuallyCharged: [
      swapRow(widened, "protection applied", "Bounded action at the envelope ceiling."),
      swapRow(
        midDecay,
        "mid-decay",
        "Advanced 210 s (widen plus half the decay window). No transaction changed the record.",
      ),
      swapRow(
        recovered,
        "recovered to base",
        "Deterministic recovery: no LLM, no keeper, no transaction ended this. Only time passed.",
      ),
      swapRow(afterCooldown, "after stand-down", "Base fee, unchanged."),
    ],
    deterministicRecovery: {
      storedStateAtRecovery: obs(
        step(sceneB, "swap:recovered").decoded.storedState,
        "risk state",
        "The stored record still reads PROTECT. Expiry is applied at read time, not by erasing history — a consumer that reads storage without applying expiry will misread this.",
      ),
      effectiveStateAtRecovery: obs(
        step(sceneB, "swap:recovered").decoded.effectiveState.state,
        "risk state",
      ),
      effectiveFeeAtRecoveryPips: obs(
        step(sceneB, "swap:recovered").decoded.effectiveState.fee,
        "pips",
      ),
      endedByTransaction: obs(false, "boolean", "No keeper and no transaction ended protection."),
    },
    standDownAndCooldown: {
      standDownTxHash: standDown.txHash,
      standDownState: obs(standDown.decoded.assessmentPosted.state, "risk state"),
      protectionEndedAtUnixSeconds: obs(
        standDown.decoded.protectionEnded.endedAt,
        "unix seconds",
      ),
      immediateRearmRefused: obs(
        cooldown.decoded.failure.errorName,
        "contract error",
        "Refused on chain by the contract, not by the off-chain engine.",
      ),
      cooldownSeconds: obs(cooldown.decoded.failure.args[1], "seconds"),
    },
    failedActionRecordedWithoutBenefit: {
      _scope:
        "§0.11 requires an action failure to be recorded without claiming a protection benefit. Scene F induces one with a real guardian pause.",
      pauseTxHash: step(sceneF, "guardian:pause").txHash,
      refusalError: obs(
        step(sceneF, "postAssessment:failed").decoded.failure.errorName,
        "contract error",
      ),
      action: step(sceneF, "postAssessment:failed").decoded.action,
      feeChargedAfterFailurePips: obs(
        step(sceneF, "swap:after-failure").decoded.appliedFee,
        "pips",
        "Measured proof that the failed action produced no fee change. No protection benefit is claimed for this interval.",
      ),
      unpauseTxHash: step(sceneF, "guardian:unpause").txHash,
    },
    readConsistency: {
      ...manifest.readConsistency,
      _consumerWarning:
        "X Layer's public RPC is load-balanced and serves stale reads. A confirmed postAssessment whose own event decoded to PROTECT was immediately followed by currentRecord() returning the previous WATCH record. Measured convergence lag 2519-2746 ms per write. A naive consumer can read NORMAL while a PROTECT is live — for a risk registry that is the dangerous direction. Pin reads to a block or follow AssessmentPosted; do not poll currentRecord.",
    },
    allScenesPassed: manifest.allPassed,
  },

  // =========================================================================
  // COUNTERFACTUAL — chain 196 mainnet replay of the SAME 8-K, third-party pool.
  // Every leaf carries the benchmark's own basis marker, verbatim.
  // =========================================================================
  replayedCounterfactualBaselines: {
    _basis: "MIXED_PER_LEAF — every leaf carries its own `basis` marker, copied verbatim from three-policy-benchmark.json",
    _scope:
      "A different chain (196), a different pool (third-party wNVDAx/USDG), and a different question. These figures re-price the SAME observed swap sequence under different fee schedules. They are not outcomes of the protection above and must never be added to it.",
    chainId: scenarioB.asset.chainId,
    poolIdOrAddress: scenarioB.asset.poolIdOrAddress,
    poolClass: "THIRD_PARTY_MAINNET",
    replayWindow: scenarioB.marketReplayWindow,
    primaryHorizonSec: 3600,
    preRegistration: benchmark.preRegistration,
    counterfactualLimitation: benchmark.counterfactualLimitation,
    policies: {
      STATIC: staticRow,
      VOLATILITY_ONLY: volRows,
      TINJAU: tinjauRows,
    },
    _tinjauResult:
      "TINJAU's rows are identical to STATIC's in every column, at every threshold in the AMD-001 grid, because Tinjau never left the base fee on this window. That equality is the result, not a rounding artefact, and it is asserted by test in the benchmark suite.",
    _signIsUndetermined:
      "All 27 comparable cells flip from TINJAU_BEATS to TINJAU_LOSES between the pre-registered basis and AMD-002's post-hoc basis, on identical trades. Neither basis is clean. ON MARKOUT, THIS BENCHMARK CANNOT DETERMINE WHICH POLICY DID BETTER: it brackets the answer and the bracket spans the sign.",
  },

  // -------------------------------------------------------------------------
  // The canonical result for this same event, kept adjacent so the constructed
  // record can never be read on its own.
  // -------------------------------------------------------------------------
  canonicalReplayOfThisEvent: {
    _basis: "OBSERVED",
    state: compare.decoded.canonicalState,
    confirmationStatus: "NOT_CONFIRMED",
    why:
      "The 235 bps drawdown clears the confirmation floor but retains only 13% after five minutes (net change -45 bps): the pool dipped and bounced. Anti-wick is a necessary condition under rule tinjau.confirm/2.0.0, so the market leg does not confirm.",
    robustness:
      "The method was tested against the correction that would have favoured this scenario: measuring drawdown post-anchor only gives 101 bps, half the floor. Scenario B gets weaker, not stronger, so the verdict is robust to the method choice. Published as-is; the rules were not loosened to escape it.",
    consequence:
      "The demo's confirmed-protection scene cannot be a mainnet replay. It is re-scoped onto the builder-controlled testnet pool and labelled constructed, which is exactly what this record does.",
    source: "t3-3-confirmation-method.md; three-policy-benchmark.md §4.3",
  },

  // -------------------------------------------------------------------------
  // §0.24 — claim eligibility.
  // -------------------------------------------------------------------------
  claimGate: {
    canClaimLossAvoided: benchmark.claimGate.value,
    metricBasis: benchmark.claimGate.metricBasis,
    reason:
      "Tinjau never promoted to PROTECT on any of the four frozen scenarios, at any threshold in the AMD-001 grid. Its replayed economics are IDENTICAL to the do-nothing STATIC policy, not better. `Beats` means strictly greater and a tie is not a win, so condition 2 fails. Separately, the only observed PROTECT interval has a CONSTRUCTED market leg on a builder-controlled pool, so it could not support a loss-avoided claim even if the benchmark had produced one.",
    conditions: benchmark.claimGate.conditions,
    failedConditionIds: benchmark.claimGate.failedConditionIds,
    _sourceOfTruth:
      "Copied from three-policy-benchmark.json `claimGate`. This record does not compute its own gate and cannot open one the benchmark closed. AMD-002's post-hoc metric is structurally excluded from the gate.",
  },

  whatThisProves: [
    "ENFORCEMENT. A signed assessment reached a deployed registry, a v4 hook read it, and the pool actually charged 20000 pips — decoded from PoolManager's own Swap event, not from a view function.",
    "BOUNDEDNESS. The applied fee sat at the envelope ceiling the contract computes for itself. The assessor cannot express a higher one: `requestedFee` is signed and bound into the EIP-712 hash but is never written into RiskRecord, which has no fee field.",
    "DETERMINISTIC RECOVERY. The fee returned to 500 with only time passing — no LLM, no keeper, no transaction.",
    "COOLDOWN. Immediate re-arming was refused on chain by the contract.",
    "FAILURE VISIBILITY. A guardian pause refused an authorised action, the refusal is recorded, and the measured fee afterwards was unchanged at 500. No benefit is claimed for that interval.",
    "RESTRAINT, from the replay side: Tinjau declined to act on two large price moves because neither had a qualifying cause, and one of them a volatility-only policy would have traded on.",
  ],

  whatThisDoesNotProve: [
    "That the intervention helped. No measured event warranted one, so no benefit was measured. canClaimLossAvoided is false.",
    "That Tinjau reduces LP loss. It ties the do-nothing policy on every comparable cell of the pre-registered basis and loses on every cell of the post-hoc basis.",
    "That this event confirms in the real market. The canonical replay of the same 8-K resolves to WATCH.",
    "Anything about a market. The pool is builder-controlled, the tokens are freely-mintable mocks, and the liquidity is ours.",
    "Dual OKX/X Layer confirmation. The OKX leg is UNAVAILABLE for all four frozen scenarios.",
    "Live discovery, coverage, or latency. SVC-007/SVC-008 use immutable replay fixtures.",
    "Production readiness. These are T4.2 working addresses on a testnet, not final ones; T7.2 owns the authoritative list.",
  ],

  limitations: [
    "The market leg of the observed PROTECT is CONSTRUCTED. The evidence leg is real and source-linked; the price path is not.",
    "The observed run used the DEMO envelope (60/300/360 s), not the production envelope (3600/18000/21600 s), because X Layer Testnet exposes no evm_increaseTime.",
    "Executable exit depth is a LOWER BOUND on every result, and the mainnet pool is extraordinarily thin: only 0.53-2.29 wNVDAx (~$120-$517) is provably quotable within one tick range across the four windows. Exit-depth figures are not representative of a liquid market.",
    "The benchmark re-prices identical observed trades under different fee schedules. Fee revenue is overstated for any fee-raising policy and the adverse-selection benefit is understated; the two biases oppose each other and THE NET SIGN IS UNDETERMINED. These results may not be called conservative.",
    "Three economic scenarios, one asset, one pool, a market weeks old. No sentence built on these rows may imply a general result about tokenized equities.",
    "The assessment instant is the window end. If Tinjau ever did promote on one of these windows, protection would begin at the window end and almost no swaps would be re-priced, so the economic comparison for a PROMOTING Tinjau is not measurable on these windows.",
    "TVL_event is unavailable for this scenario, so every 'bps of TVL' figure is null rather than imputed.",
    "X Layer's public RPC serves stale reads (2519-2746 ms measured convergence lag). A naive consumer can read NORMAL while a PROTECT is live.",
  ],

  reproduction: {
    onChainRun: [
      "cd apps/server && npx tsx src/chain/tinjauDemoRun.ts --local   # boots its own Anvil, production envelope",
      "npx tsx src/chain/tinjauPreflight.ts                            # before touching a public chain",
      "# the chain-1952 demo-envelope run is documented in full in ../04-planning/t4-2-t4-5-harness-and-testnet-run.md §9",
    ],
    benchmark: [
      "cd apps/server && npx tsx src/benchmark/emit.ts   # rewrites three-policy-benchmark.json byte-identically",
      "npx tsx --test 'test/benchmark*.test.ts'",
    ],
    thisRecord: [
      "node docs/buildx-orion-2026/outputs/05-build/tools/build-proof-of-protection.mjs",
      "node docs/buildx-orion-2026/outputs/05-build/tools/verify-proof-of-protection.mjs",
    ],
  },

  companionDocument: "t5-5-proof-of-protection.md",
};

const outPath = join(BUILD, "proof-of-protection.json");
writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
process.stdout.write(`wrote ${outPath}\n`);
