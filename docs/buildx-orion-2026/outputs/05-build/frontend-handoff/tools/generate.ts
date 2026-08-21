/**
 * Regenerates the deterministic JSON artifacts in `frontend-handoff/`.
 *
 * Run from `apps/server` (that is where the dependencies live):
 *
 *   cd apps/server
 *   npx tsx ../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/generate.ts
 *
 * It makes NO network call and reads NO clock. Every timestamp comes from a frozen fixture or
 * from a recorded on-chain run, so re-running it must produce byte-identical files. `validate.mjs`
 * re-checks the output against the published schemas.
 *
 * This file lives outside `apps/server/tsconfig.json`'s `include`, so it is executed by tsx and
 * is deliberately not part of `pnpm typecheck`. It is a build tool, not shipped code.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeClaims } from "../../../../../../apps/server/src/evidence/normalize.js";
import { buildEvidenceGraph } from "../../../../../../apps/server/src/evidence/graph.js";
import { resolveAsset } from "../../../../../../apps/server/src/evidence/assets.js";
import {
  confirmMarket,
  buildConfirmationInput,
} from "../../../../../../apps/server/src/market/confirm.js";
import { FROZEN_PROMOTION_CONFIG } from "../../../../../../apps/server/src/risk/promotionConfig.js";
import { decide } from "../../../../../../apps/server/src/decision/orchestrate.js";
import { runScenario } from "../../../../../../apps/server/src/decision/scenarioRunner.js";
import {
  buildConstructedProtectWindow,
  timeShiftScenario,
} from "../../../../../../apps/server/src/chain/tinjauScenes.js";

const here = dirname(fileURLToPath(import.meta.url));
const handoffDir = join(here, "..");
const buildDir = join(handoffDir, "..");
const serverDir = join(here, "..", "..", "..", "..", "..", "..", "apps", "server");

const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"));
const scenarioFile = (f: string) => readJson(join(serverDir, "scenarios", f));
const swapFixture = (id: string) =>
  readJson(join(serverDir, "src", "market", "fixtures", `pool-scenario-${id}-swaps.json`));

/** Stable-key JSON so a re-run cannot reorder keys and produce a spurious diff. */
function write(name: string, value: unknown): void {
  writeFileSync(join(handoffDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  console.log(`wrote ${name}`);
}

// ---------------------------------------------------------------------------
// Evidence-graph view (evidence-graph.schema.json)
// ---------------------------------------------------------------------------

function evidenceGraphView(args: {
  eventKey: string;
  label: string;
  claims: readonly any[];
  graph: any;
  resolution: any;
  assessedAtIso: string;
}) {
  return {
    schemaVersion: "tinjau.evidence-graph/1.0.0",
    eventKey: args.eventKey,
    label: args.label,
    assessedAt: args.assessedAtIso,
    evidenceWindowSeconds: FROZEN_PROMOTION_CONFIG.evidenceWindowSec,
    resolution: {
      outcome: args.resolution.outcome,
      asset: args.resolution.asset,
      candidates: args.resolution.candidates,
      explanation: args.resolution.explanation,
      mayAuthorizeAction: args.resolution.mayAuthorizeAction,
    },
    claims: args.claims.map((c) => ({
      claimId: c.claimId,
      sourceClass: c.sourceClass,
      dataMode: c.dataMode,
      sourceUrl: c.sourceUrl,
      sourceId: c.sourceId,
      publisherOrAuthor: c.publisherOrAuthor,
      publishedAt: c.publishedAt,
      publishedAtPrecision: c.publishedAtPrecision,
      sourceContentSha256: c.sourceContentSha256,
      company: c.company,
      tokenSymbol: c.tokenSymbol,
      tokenAddress: c.tokenAddress,
      eventType: c.eventType,
      claimTextOrPointer: c.claimTextOrPointer,
      assertionLevel: c.assertionLevel,
      describesCompletedEvent: c.describesCompletedEvent,
      speculationMarkers: c.speculationMarkers,
      publisherDisclaimedVerification: c.publisherDisclaimedVerification,
      independenceGroup: c.independenceGroup,
      relation: c.relation,
      officialConfirmation: c.officialConfirmation,
      expiresAt: c.expiresAt,
      materiality: c.materiality,
      provenanceViolations: c.provenanceViolations,
      promotable: c.promotable,
    })),
    independence: args.graph.independence,
    selfRevision: args.graph.selfRevision,
    recency: args.graph.recency,
    independentOriginCount: args.graph.independentOriginCount,
    usableOriginCount: args.graph.usableOriginCount,
    revisedOriginKeys: args.graph.revisedOriginKeys,
    confidenceFactors: args.graph.confidenceFactors,
    // Nothing rejected a cluster proposal in the frozen set: the clusters are frozen by hand in
    // T0.2, so no model proposal existed to reject. Empty is the honest value, not a stub.
    rejectedProposals: [],
  };
}

// ---------------------------------------------------------------------------
// Scenario A — the rumour negative control (canonical mainnet replay)
// ---------------------------------------------------------------------------

const scenarioA = scenarioFile("scenario-a-rumor-watch.json");
const swapsA = swapFixture("a");
const decisionA = runScenario(scenarioA, swapsA);

const claimsA = normalizeClaims(scenarioA.claims);
const nowA = Math.floor(Date.parse(decisionA.record.assessedAt) / 1000);
const graphA = buildEvidenceGraph(claimsA, nowA, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
const resolutionA = resolveAsset(
  scenarioA.asset.company,
  scenarioA.asset.tokenSymbol,
  scenarioA.asset.tokenAddress,
);

const manifestDemo = readJson(join(buildDir, "t4-demo-manifest-xlayer-testnet.json"));
const manifestProd = readJson(
  join(buildDir, "t4-demo-manifest-xlayer-testnet-production-envelope.json"),
);
const sceneOf = (m: any, id: string) => m.scenes.find((s: any) => s.scene === id);

const sceneAProd = sceneOf(manifestProd, "A");
const sceneBDemo = sceneOf(manifestDemo, "B");
const sceneFDemo = sceneOf(manifestDemo, "F");

const onChainSteps = (scene: any) =>
  scene.steps.map((s: any) => ({
    step: s.step,
    atUnixSeconds: s.atUnixSeconds,
    txHash: s.txHash ?? null,
    note: s.note,
  }));

write("scenario-rumor-watch.json", {
  schemaVersion: "tinjau.scenario-result/1.0.0",
  scenarioId: "A-rumor-watch",
  role: "RUMOUR_NEGATIVE_CONTROL",
  title: "Rumour containment — a single origin behind four outlets cannot authorise a fee change",
  producedBy: {
    tasks: ["T0.2", "T2.1", "T2.3", "T3.3", "T4.1", "T4.4"],
    generator: "docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/generate.ts",
    modules: [
      "apps/server/src/evidence/normalize.ts",
      "apps/server/src/evidence/graph.ts",
      "apps/server/src/evidence/assets.ts",
      "apps/server/src/market/confirm.ts",
      "apps/server/src/risk/promote.ts",
      "apps/server/src/decision/orchestrate.ts",
    ],
  },
  provenance: {
    evidence: "REPLAYED_SOURCE_LINKED",
    marketLeg: "REPLAYED",
    marketVenue: "X_LAYER_MAINNET_CHAIN_196_THIRD_PARTY_POOL",
    outcomeOrigin: "CANONICAL_REPLAY",
    preRegistered: true,
    preRegisteredOutcome: "WATCH",
    matchesPreRegistration: true,
  },
  window: {
    chainId: swapsA.chainId,
    pool: swapsA.pool,
    fromBlock: swapsA.fromBlock,
    toBlock: swapsA.toBlock,
    fromIso: swapsA.fromIso,
    toIso: swapsA.toIso,
    swapCount: swapsA.swapCount,
    rpcRangeErrors: swapsA.rpcRangeErrors,
  },
  record: decisionA.record,
  evidenceGraph: evidenceGraphView({
    eventKey: decisionA.eventKey,
    label: "Reported NVIDIA/OpenAI investment talks (single origin, four outlets)",
    claims: claimsA,
    graph: graphA,
    resolution: resolutionA,
    assessedAtIso: decisionA.record.assessedAt,
  }),
  ruleVersions: decisionA.ruleVersions,
  derived: {
    postable: decisionA.postable,
    policyTargetFee: decisionA.policyTargetFee,
    effectiveConfirmation: decisionA.effectiveConfirmation,
    independentOriginCount: graphA.independentOriginCount,
    usableOriginCount: graphA.usableOriginCount,
  },
  onChain: {
    status: "POSTED_ON_X_LAYER_TESTNET",
    addressStatus: "T7.2 authoritative list, verified 2026-08-21. Both pools are builder-controlled test liquidity.",
    chainId: manifestProd.network.chainId,
    networkLabel: manifestProd.network.networkLabel,
    registry: manifestProd.network.addresses.registry,
    hook: manifestProd.network.addresses.hook,
    poolId: manifestProd.network.addresses.poolId,
    assetRemap: sceneAProd.assetRemap,
    steps: onChainSteps(sceneAProd),
    chargedFees: sceneAProd.swaps.map((s: any) => ({
      txHash: s.txHash,
      blockNumber: s.blockNumber,
      appliedFee: s.appliedFee,
      previewedFee: s.previewedFee,
      source: "PoolManager Swap event",
    })),
    passed: sceneAProd.passed,
  },
  limitations: [
    "The rumour claim is SIMULATED — fabricated by this project as a safety test. It carries sourceUrl: null and a simulated:// identifier. It supports no claim about live social monitoring, discovery, coverage, or latency.",
    "Record-level dataMode is SIMULATED because the least-live claim in the set decides it. Four of the five claims are genuinely replayed and source-linked; evidence[].dataMode carries each claim's own mode.",
    "The replay window contains ZERO swaps (measured, 0 RPC range errors), so the market leg is UNAVAILABLE and marketConfirmation.observedAt is null. Null means nothing was observed — it is not a missing value.",
    "The OKX leg is UNAVAILABLE: no committed OKX index data covers this anchor. No 'dual OKX/X Layer confirmation' may be claimed for this scenario.",
    "Two claims are paywalled WSJ originals with no retrievable URL. They are shown, not hidden — they are part of why the state is WATCH.",
    "The on-chain steps ran against a BUILDER-CONTROLLED testnet pool with mock tokens, and every evidence timestamp was shifted forward so the assessment was current relative to chain time. State and reason codes were verified identical to the unshifted canonical run.",
  ],
});

// ---------------------------------------------------------------------------
// Scenario B — confirmed protection. CONSTRUCTED market leg, reproduced offline.
// ---------------------------------------------------------------------------

const scenarioB = scenarioFile("scenario-b-confirmed-protect.json");
const swapsB = swapFixture("b");

/** The canonical mainnet replay: this is what the same evidence resolves to on real data. */
const canonicalB = runScenario(scenarioB, swapsB);

/**
 * The constructed run, reproduced from `runSceneB`'s recorded parameters.
 *
 * `nowUnixSeconds` is the instant the assessment was actually made on chain 1952, read from the
 * published manifest rather than from a clock, so this file is reproducible forever.
 */
const constructedNow: number = sceneBDemo.steps.find((s: any) => s.step === "decide")
  .atUnixSeconds;
const demoAddresses = manifestDemo.network.addresses;

const constructedWindow = buildConstructedProtectWindow({
  chainId: manifestDemo.network.chainId,
  pool: demoAddresses.poolId,
  token0: demoAddresses.token0,
  token1: demoAddresses.token1,
  endUnixSeconds: constructedNow,
});

const anchorB = Math.floor(Date.parse(scenarioB.decisionAnchor.at) / 1000);
const shiftedB = timeShiftScenario(scenarioB, constructedNow - anchorB);
const claimsB = normalizeClaims(shiftedB.claims);
const graphB = buildEvidenceGraph(claimsB, constructedNow, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
const resolutionB = resolveAsset(
  shiftedB.asset.company,
  shiftedB.asset.tokenSymbol,
  shiftedB.asset.tokenAddress,
);
const confirmationInputB = buildConfirmationInput(constructedWindow, {
  anchorUnixSeconds: constructedNow,
  nowUnixSeconds: constructedNow,
  okx: null,
  usReferenceMarketOpen: scenarioB.decisionAnchor.usReferenceMarketOpen ?? false,
});
const confirmationB = confirmMarket(confirmationInputB);

const constructedB = decide({
  eventKey: `tinjau.demo/${shiftedB.scenarioId}-constructed`,
  now: constructedNow,
  claims: claimsB,
  graph: graphB,
  resolution: resolutionB,
  confirmation: confirmationB,
  confirmationInput: confirmationInputB,
  officialEvidencePassed: true,
  chainId: manifestDemo.network.chainId,
  registryAddress: demoAddresses.registry,
  poolId: demoAddresses.poolId,
});

// Fail loudly rather than publish something that drifted from the on-chain run.
const postedB = sceneBDemo.steps.find((s: any) => s.step === "postAssessment").decoded
  .assessmentPosted;
if (constructedB.record.evidenceCommitment !== postedB.evidenceCommitment) {
  throw new Error(
    `constructed scenario B drifted from the posted run: ` +
      `${constructedB.record.evidenceCommitment} != ${postedB.evidenceCommitment}`,
  );
}
if (constructedB.record.state !== "PROTECT") {
  throw new Error(`constructed scenario B did not reach PROTECT: ${constructedB.record.state}`);
}

const swapFor = (step: string) => {
  const s = sceneBDemo.steps.find((x: any) => x.step === step);
  return sceneBDemo.swaps.find((w: any) => w.txHash === s.txHash);
};

write("scenario-confirmed-protect.json", {
  schemaVersion: "tinjau.scenario-result/1.0.0",
  scenarioId: "B-confirmed-protect-CONSTRUCTED",
  role: "CONFIRMED_EVENT_BOUNDED_ACTION_AND_RECOVERY",
  title:
    "Confirmed protection on a builder-controlled pool — CONSTRUCTED market leg, replayed evidence",
  producedBy: {
    tasks: ["T0.2", "T2.1", "T2.3", "T3.3", "T4.1", "T4.2", "T4.3", "T4.5"],
    generator: "docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/generate.ts",
    modules: [
      "apps/server/src/chain/tinjauScenes.ts (buildConstructedProtectWindow)",
      "apps/server/src/market/confirm.ts",
      "apps/server/src/risk/promote.ts",
      "apps/server/src/decision/orchestrate.ts",
    ],
  },
  provenance: {
    evidence: "REPLAYED_SOURCE_LINKED",
    marketLeg: "CONSTRUCTED",
    marketVenue: "X_LAYER_TESTNET_CHAIN_1952_BUILDER_CONTROLLED_POOL",
    outcomeOrigin: "CONSTRUCTED_MARKET_INPUTS",
    preRegistered: true,
    preRegisteredOutcome: "PROTECT conditional on fresh market confirmation; WATCH otherwise",
    matchesPreRegistration: true,
  },
  criticalCaveat: {
    headline: "THIS PROTECT IS NOT A REPLAY RESULT.",
    text:
      "The canonical mainnet replay of this exact evidence resolves to WATCH, because its market " +
      "leg is NOT_CONFIRMED (drawdown 235 bps clears the 200 bps floor but retains only ~10-13% " +
      "over the hold interval — the pool dipped and bounced). Tinjau reaches PROTECT on NONE of " +
      "the four frozen replay scenarios. To demonstrate the bounded action and its deterministic " +
      "recovery at all, the real replayed 8-K evidence was paired with a CONSTRUCTED price path " +
      "on the builder-controlled testnet pool. Only the market data is constructed: the CONFIRMED " +
      "verdict is the real confirmation engine's, under its own unmodified thresholds.",
    canonicalReplayState: canonicalB.record.state,
    canonicalReplayConfirmation: canonicalB.record.marketConfirmation.status,
    canonicalReplayReasonCodes: canonicalB.record.reasonCodes,
    reasonCodeDiff: sceneBDemo.steps.find(
      (s: any) => s.step === "compare:canonical-vs-constructed",
    ).decoded.reasonCodeDiff,
    uiRequirement:
      "Any surface showing this PROTECT must label it constructed, in the same visual weight as " +
      "the state itself. Presenting it as a replayed outcome would be the single most misleading " +
      "thing this project could publish.",
  },
  window: {
    chainId: constructedWindow.chainId,
    pool: constructedWindow.pool,
    fromIso: constructedWindow.fromIso,
    toIso: constructedWindow.toIso,
    swapCount: constructedWindow.swapCount,
    liquiditySource: constructedWindow.liquiditySource,
    construction: {
      openPrice: 100,
      fallBps: 300,
      fallSeconds: 600,
      holdSeconds: 900,
      intervalSeconds: 30,
      note: "Price falls 300 bps over 600 s then holds flat for 900 s. Fed to the real confirmMarket.",
    },
  },
  record: constructedB.record,
  evidenceGraph: evidenceGraphView({
    eventKey: constructedB.eventKey,
    label: "NVIDIA 8-K — contingent financial obligation (constructed market leg)",
    claims: claimsB,
    graph: graphB,
    resolution: resolutionB,
    assessedAtIso: constructedB.record.assessedAt,
  }),
  ruleVersions: constructedB.ruleVersions,
  derived: {
    postable: constructedB.postable,
    policyTargetFee: constructedB.policyTargetFee,
    effectiveConfirmation: constructedB.effectiveConfirmation,
    protectStartedAt: constructedB.protectStartedAt,
    remainingProtectSec: constructedB.remainingProtectSec,
  },
  onChain: {
    status: "POSTED_ON_X_LAYER_TESTNET",
    addressStatus: "T7.2 authoritative list, verified 2026-08-21. Both pools are builder-controlled test liquidity.",
    chainId: manifestDemo.network.chainId,
    networkLabel: manifestDemo.network.networkLabel,
    registry: demoAddresses.registry,
    hook: demoAddresses.hook,
    poolId: demoAddresses.poolId,
    envelope: manifestDemo.network.envelope,
    envelopeNote:
      "This is the 60x-COMPRESSED DEMO envelope (widen 60 s, decay 300 s, cap 360 s, cooldown " +
      "60 s). X Layer Testnet exposes no evm_increaseTime, so the production envelope's 21,600 s " +
      "recovery cannot be watched live. The compression preserves the invariants " +
      "cap == widen + decay and cooldown == widen. The production-envelope stack is deployed too " +
      "and is the one deployed-addresses.json marks as the production envelope.",
    assetRemap: sceneBDemo.assetRemap,
    steps: onChainSteps(sceneBDemo),
    passed: sceneBDemo.passed,
  },
  action: {
    authorizedByEvidence: constructedB.record.action.authorized,
    requestedFeePips: constructedB.record.action.requestedFee,
    appliedFeePips: String(swapFor("swap:widened").appliedFee),
    appliedTxHash: swapFor("swap:widened").txHash,
    feeSource: "PoolManager Swap event — what the pool charged, not what the hook returned",
  },
  recovery: {
    method: "DETERMINISTIC_TIME_DECAY",
    keeperTransactionRequired: false,
    llmInvolved: false,
    measured: [
      {
        label: "widened",
        atUnixSeconds: swapFor("swap:widened").atUnixSeconds,
        appliedFee: swapFor("swap:widened").appliedFee,
        previewedFee: swapFor("swap:widened").previewedFee,
        txHash: swapFor("swap:widened").txHash,
      },
      {
        label: "mid-decay",
        atUnixSeconds: swapFor("swap:mid-decay").atUnixSeconds,
        appliedFee: swapFor("swap:mid-decay").appliedFee,
        previewedFee: swapFor("swap:mid-decay").previewedFee,
        txHash: swapFor("swap:mid-decay").txHash,
      },
      {
        label: "recovered",
        atUnixSeconds: swapFor("swap:recovered").atUnixSeconds,
        appliedFee: swapFor("swap:recovered").appliedFee,
        previewedFee: swapFor("swap:recovered").previewedFee,
        txHash: swapFor("swap:recovered").txHash,
      },
    ],
    previewIsUpperBound:
      "previewedFee 9730 vs appliedFee 9470 mid-decay is NOT a discrepancy. The fee is continuous " +
      "in time and seconds elapse between the quote and inclusion, so a quoted fee is an upper " +
      "bound while decaying.",
    storedVsEffective:
      "After recovery the STORED record still reads PROTECT. Expiry is applied at read time " +
      "rather than by erasing history, so a consumer must read effectiveState, not the raw record.",
    cooldown: {
      seconds: manifestDemo.network.envelope.cooldown,
      provenOnChain: true,
      evidence:
        "postAssessment:blocked-by-cooldown reverted with CooldownActive — refused by the " +
        "contract, not by the off-chain engine.",
    },
  },
  failedActionCase: {
    scene: "F",
    purpose: "A failed action stays visible and claims no protection benefit (§0.11).",
    inducedBy: "A real guardian pause, refused on chain with ProtectionPaused.",
    actionStatus: "FAILED",
    feeAfterFailure: sceneFDemo.swaps[0].appliedFee,
    feeAfterFailureTxHash: sceneFDemo.swaps[0].txHash,
    steps: onChainSteps(sceneFDemo),
  },
  limitations: [
    "THE MARKET LEG IS CONSTRUCTED. The canonical replay of this same evidence is WATCH.",
    "The pool is BUILDER-CONTROLLED test liquidity with mock tokens on chain 1952. It demonstrates enforcement; it is not a market.",
    "The OKX leg is UNAVAILABLE here as well. No dual-confirmation claim is available.",
    "The record's on-chain dataMode is derived from the EVIDENCE only (REPLAY), so it cannot express 'evidence replayed, market constructed'. That distinction lives in provenance.marketLeg and criticalCaveat, not in dataMode.",
    "The asset field was remapped from the canonical mainnet wNVDAx to a freely-mintable mock on chain 1952. Only the asset field was remapped; the decision itself is unmodified.",
    "The recovery was demonstrated under the compressed DEMO envelope. The production envelope is deployed but its 21,600 s recovery was not watched live, because X Layer Testnet has no evm_increaseTime.",
    "No protection benefit is claimed for any interval here. See three-policy-comparison.json: canClaimLossAvoided is false.",
  ],
});

// ---------------------------------------------------------------------------
// three-policy-comparison.json (validates against proof-of-protection.schema.json)
// ---------------------------------------------------------------------------

const bench = readJson(join(buildDir, "three-policy-benchmark.json"));

/** The compact metric set the frontend needs, all of it copied verbatim with unit + basis. */
function metricsOf(economics: any) {
  if (economics === null) return null;
  const e = economics;
  return {
    swapCount: e.swapCount,
    rpcRangeErrors: e.rpcRangeErrors,
    totalNotionalUsd: e.totalNotionalUsd,
    feeRevenueGrossUsd: e.feeRevenueGrossUsd,
    feeRevenueToLpUsd: e.feeRevenueToLpUsd,
    protocolHaircutUsd: e.protocolHaircutUsd,
    primaryHorizonSec: e.primaryHorizonSec,
    markoutM0Usd: e.markoutM0Usd,
    markoutPrimaryUsd: e.markoutPrimaryUsd,
    markoutPrimaryBpsOfNotional: e.markoutPrimaryBpsOfNotional,
    markoutPrimaryBpsOfTvl: e.markoutPrimaryBpsOfTvl,
    adverseSelectionPrimaryUsd: e.adverseSelectionPrimaryUsd,
    markoutByHorizonUsd: e.markoutByHorizonUsd,
    distributionPrimaryUsd: e.distributionPrimaryUsd,
    tailConcentration: e.tailConcentration,
    tvlEventUsd: e.tvlEventUsd,
    amd002ConsistentBasis: e.amd002ConsistentBasis,
  };
}

write("three-policy-comparison.json", {
  schemaVersion: "tinjau.proof-of-protection/1.0.0",
  documentId: "three-policy-comparison",
  producedByTasks: bench.producedByTasks,
  derivedFrom: {
    file: "docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.json",
    schemaVersion: bench.schemaVersion,
    narrative: "docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.md",
    note:
      "This file is a lossless-for-display projection of the full benchmark: per-swap rows and " +
      "per-episode internals are dropped, every aggregate metric is copied verbatim with its " +
      "unit and basis. Nothing was recomputed here.",
  },

  method: {
    preRegistration: bench.preRegistration,
    identicalInput:
      "All three policies receive the SAME observed swap sequence, timestamps, initial " +
      "liquidity, costs and replay window. `replayInputFingerprint` is the sha256 of that input " +
      "and is identical across the three policies for a given scenario — check it rather than " +
      "trusting this sentence.",
    policies: {
      STATIC: {
        methodVersion: "tinjau.benchmark-static/1.0.0",
        description:
          "Constant 500 pips, the pool's actual live fee. Doubles as the reconciliation check " +
          "on the replay itself.",
        parameters: [{}],
      },
      VOLATILITY_ONLY: {
        methodVersion: bench.rows.find((r: any) => r.policyId === "VOLATILITY_ONLY").methodVersion,
        description:
          "Price and time only. No filing, news, rumour, event type, market-hours flag or " +
          "decision anchor is reachable from its input type — enforced by the type, not by " +
          "convention.",
        parameters: bench.kGrid.map((k: number) => ({ k })),
      },
      TINJAU: {
        methodVersion: bench.rows.find((r: any) => r.policyId === "TINJAU").methodVersion,
        description:
          "The same market data plus the versioned evidence path (T1.2 promotion, T2.3 evidence " +
          "graph, T3.3 confirmation).",
        parameters: bench.minDrawdownBpsGrid.map((minDrawdownBps: number) => ({ minDrawdownBps })),
      },
    },
    kGrid: bench.kGrid,
    minDrawdownBpsGrid: bench.minDrawdownBpsGrid,
    amendments: bench.amendments,
    metricBases: [
      {
        id: "PRE_REGISTERED",
        metric: "M_3600_LP",
        preRegistered: true,
        governsClaimGate: true,
        knownDefect:
          "M_h_LP = (dU + dS*P_h) - haircut debits the protocol's share of a COUNTERFACTUAL fee " +
          "the LP is never credited for earning. Raising a fee therefore strictly lowers this " +
          "metric, so it mechanically penalises every fee-raising policy. Published unchanged " +
          "because it is the frozen method; rewriting a metric after seeing results is exactly " +
          "what pre-registration exists to prevent.",
      },
      {
        id: "AMD_002_CONSISTENT",
        metric: "M_3600_LP_consistent",
        preRegistered: false,
        governsClaimGate: false,
        knownDefect:
          "POST-HOC. Applies one fee basis to both sides, which credits counterfactual fee " +
          "revenue assuming ZERO flow elasticity. It mechanically REWARDS every fee-raising " +
          "policy, Tinjau included. Structurally excluded from the claim gate.",
      },
    ],
  },

  interpretation: {
    headline: "ON MARKOUT, THIS BENCHMARK CANNOT DETERMINE WHICH POLICY DID BETTER.",
    text:
      "All 27 comparable cells flip from TINJAU_BEATS to TINJAU_LOSES between the pre-registered " +
      "basis and the AMD-002 post-hoc basis, on identical trades, triggers and fee schedules. " +
      "Neither basis is clean and they are biased in opposite directions, so the truth is " +
      "bracketed and the bracket spans the sign. Quoting either number alone would be picking a " +
      "winner by choosing an arithmetic convention. Both are published side by side.",
    whatItCanDetermine:
      "Behaviour: whether a policy fired, when, on what, and whether the event warranted it. " +
      "That is unaffected by the metric choice.",
    defensibleClaim:
      "Tinjau declined to act on two large price moves because neither had a qualifying cause, " +
      "and one of them a volatility-only policy would have traded on. This is a finding about " +
      "restraint, not a demonstration of protection.",
    prohibited: [
      "Tinjau reduces LP loss",
      "Tinjau avoided X dollars of loss",
      "Tinjau outperformed the baselines economically",
      "the pre-registered result is conservative",
      "the AMD-002 result is the real one",
    ],
  },

  headlineFindings: bench.headlineFindings,

  eventSelection: {
    disclosure:
      "Four scenarios were frozen in T0.2 BEFORE any result was inspected, and include a " +
      "neutral control (D, a routine Form 4) and a rumour negative control (A). The set was " +
      "not chosen to flatter Tinjau: the finding that carries the submission comes from the " +
      "CONTROL, not the showcase.",
    document: "docs/buildx-orion-2026/outputs/04-planning/t0-2-frozen-scenarios.md",
    scenarios: [
      {
        scenarioId: "A-rumor-watch",
        role: "RUMOUR_NEGATIVE_CONTROL",
        preRegisteredState: "WATCH",
        hasEconomicRow: false,
      },
      {
        scenarioId: "B-confirmed-protect",
        role: "MATERIAL_OFFICIAL_EVENT",
        preRegisteredState: "PROTECT conditional on fresh market confirmation; WATCH otherwise",
        hasEconomicRow: true,
      },
      {
        scenarioId: "C-two-origins-hard-case",
        role: "AMBIGUOUS_TWO_ORIGIN_BOUNDARY",
        preRegisteredState: "undecided at freeze; T1.2 froze the rule before scoring C's market",
        hasEconomicRow: true,
      },
      {
        scenarioId: "D-neutral-normal",
        role: "NEUTRAL_CONTROL",
        preRegisteredState: "NORMAL",
        hasEconomicRow: true,
      },
    ],
  },

  replayInputs: bench.scenarios,

  observedProtectedPoolResult: {
    exists: false,
    reason:
      "Tinjau reaches PROTECT on NONE of the four frozen replay scenarios, so no protected " +
      "interval exists on a real market to observe. Its fee stays at 500 pips for every window " +
      "and its replayed economics are IDENTICAL to STATIC, not better.",
    onlyProtectedIntervalAnywhere: {
      where: "X Layer Testnet chain 1952, BUILDER-CONTROLLED pool",
      artifact: "scenario-confirmed-protect.json",
      marketLeg: "CONSTRUCTED",
      warning:
        "That interval is not a market observation and carries no economic measurement. It " +
        "demonstrates enforcement and recovery, not benefit.",
    },
  },

  results: bench.rows.map((r: any) => ({
    scenarioId: r.scenarioId,
    policyId: r.policyId,
    parameters: r.parameters,
    methodVersion: r.methodVersion,
    replayInputFingerprint: r.replayInputFingerprint,
    metrics: metricsOf(r.economics),
    behaviour: {
      status: r.policyBehaviour.status,
      statusReason: r.policyBehaviour.statusReason,
      triggerCount: r.policyBehaviour.triggerCount,
      episodes: r.policyBehaviour.episodes,
      actionLatencySec: r.policyBehaviour.actionLatencySec,
      maxFeeReachedPips: r.policyBehaviour.maxFeeReachedPips,
      protectionDurationSec: r.policyBehaviour.protectionDurationSec,
      timeToDecaySec: r.policyBehaviour.timeToDecaySec,
      falsePositive: r.policyBehaviour.falsePositive,
      falseNegative: r.policyBehaviour.falseNegative,
    },
    notes: r.notes,
  })),

  comparisonCells: bench.cells,

  claimEligibility: {
    field: bench.claimGate.field,
    value: bench.claimGate.value,
    metricBasis: bench.claimGate.metricBasis,
    amd002Excluded: bench.claimGate._amd002Excluded,
    conditions: bench.claimGate.conditions,
    failedConditionIds: bench.claimGate.failedConditionIds,
    summary: bench.claimGate.summary,
    reason:
      "Tinjau TIES STATIC rather than beating it (27 of 27 comparable cells are TINJAU_TIES on " +
      "the pre-registered metric), and 'beats' means strictly greater. A tie is not a win.",
  },

  dataLimitations: [
    bench.counterfactualLimitation,
    "Scenario A's frozen window contains ZERO swaps, so it carries no economic row at all. Reported as null, never dropped or imputed. Widening the window to reach liquidity is explicitly forbidden by T0.2.",
    "The OKX leg is UNAVAILABLE for all four scenarios: no committed OKX index data covers any frozen anchor, and SVC-003 records that index history is not retroactively available. No 'dual OKX/X Layer confirmation' may be claimed for a replayed scenario.",
    "markoutPrimaryBpsOfTvl is null for scenarios that need an archive-block balanceOf nobody recorded. Null means unavailable, not zero.",
    "The pool is extraordinarily thin: only 0.53-2.29 wNVDAx (~$120-$517) is provably quotable within one tick range across the four windows. Executable exit depth is a LOWER BOUND (isLowerBound: true) because liquidity only changes at initialized ticks, which a swap log does not reveal.",
    "M_0 is NOT 'structurally >= 0' as the pre-registration annotated it: false for 216 of 4,777 swaps, every offender larger than the median trade. It is a small-trade property, not a theorem.",
    "The assessment instant is the window end. Moot for the frozen set since Tinjau never promotes, but if it ever did, protection would begin at the window end and almost no swaps would be re-priced — so the economic comparison for a PROMOTING Tinjau is not measurable on these windows.",
    "The X Layer mainnet market for this asset is weeks old (first pool bytecode 2026-07-22). No event before late July 2026 can be market-confirmed at all.",
  ],
});

// ---------------------------------------------------------------------------
// deployed-addresses.json
// ---------------------------------------------------------------------------

/**
 * Bytecode sizes below were re-verified by direct `eth_getCode` against
 * https://testrpc.xlayer.tech on 2026-08-21 at block 38826716, independently of the manifests,
 * and agree with what both manifests recorded at deploy time.
 */
const BYTECODE_VERIFIED_AT = {
  method: "eth_getCode(address, 'latest')",
  rpc: "https://testrpc.xlayer.tech",
  atBlockNumber: 38826716,
  atIso: "2026-08-21T04:30:00Z",
  note: "Re-verified independently of the demo manifests; both agree.",
};

const txOf = (scene: any, step: string) =>
  scene.steps.find((s: any) => s.step === step)?.txHash ?? null;

write("deployed-addresses.json", {
  schemaVersion: "tinjau.deployed-addresses/1.0.0",

  status: "T7_2_AUTHORITATIVE",
  statusText:
    "T7.2 AUTHORITATIVE LIST, verified 2026-08-21. Every address here was re-read on X Layer " +
    "Testnet and matches t7-2-authoritative-addresses.json exactly. Both pools remain " +
    "BUILDER-CONTROLLED test liquidity seeded with freely-mintable mock tokens that have no " +
    "value: these addresses prove enforcement, not a market.",

  network: {
    chainId: 1952,
    name: "X Layer Testnet",
    rpc: "https://testrpc.xlayer.tech",
    isTestnet: true,
    supportsTimeTravel: false,
    rpcWarning:
      "THE PUBLIC RPC SERVES STALE READS. Measured convergence lag 2,519-2,746 ms per write. A " +
      "consumer polling currentRecord can read NORMAL while a PROTECT is live. Pin reads to a " +
      "block number or follow the AssessmentPosted event. See api-contract.md §4.",
  },

  bytecodeVerification: BYTECODE_VERIFIED_AT,

  whyTwoStacks:
    "X Layer Testnet exposes no evm_increaseTime, so the production envelope's 21,600 s recovery " +
    "cannot be watched live. Two full stacks are therefore deployed: the PRODUCTION envelope " +
    "(the one T7.2 will publish) and a 60x-compressed DEMO envelope that preserves the " +
    "invariants cap == widen + decay and cooldown == widen. `advanceTime` REFUSES LOUDLY rather " +
    "than faking a curve, verified against the production stack, so three swaps at one instant " +
    "can never be presented as a decay curve.",

  stacks: [
    {
      stackId: "production-envelope",
      label: "Production envelope — T7.2 publishes this one",
      isDemoEnvelope: false,
      envelope: manifestProd.network.envelope,
      poolId: manifestProd.network.addresses.poolId,
      tickSpacing: manifestProd.network.addresses.tickSpacing,
      contracts: [
        {
          role: "TinjauRiskRegistry",
          address: "0x60062389a7AB08F0030FC06Adf9CE0C180537317",
          hasBytecode: true,
          codeSize: 6337,
          isBuilderControlled: true,
          note: "The §0.12 X Layer risk record. Read it directly; no dashboard required.",
        },
        {
          role: "TinjauFeeHook",
          address: "0x1092C9fe2dB084F26aa415A0fda14B001A786080",
          hasBytecode: true,
          codeSize: 6160,
          isBuilderControlled: true,
          note: "Uniswap v4 hook. Reads the registry, applies TinjauRiskPolicy, fails closed to baseFee.",
        },
        {
          role: "PoolManager (Uniswap v4)",
          address: "0x8F862A8b6f00C99b0610dc764228C661c4909ae1",
          hasBytecode: true,
          codeSize: 17151,
          isBuilderControlled: true,
          note: "Builder-controlled testnet deployment, shared by both stacks.",
        },
        {
          role: "swap router (test)",
          address: "0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9",
          hasBytecode: true,
          codeSize: 5035,
          isBuilderControlled: true,
          note: null,
        },
        {
          role: "liquidity router (test)",
          address: "0x1324A9A175779D53c65F9A43493CEa302cd54587",
          hasBytecode: true,
          codeSize: 4533,
          isBuilderControlled: true,
          note: null,
        },
        {
          role: "risk asset — MOCK wNVDAx",
          address: "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
          hasBytecode: true,
          codeSize: 1737,
          isBuilderControlled: true,
          note: "A freely-mintable MOCK standing in for canonical wNVDAx (0xa8ddb5cd96b5222afe198316e9a57caa642850d5 on chain 196). Never present it as the real tokenized asset.",
        },
        {
          role: "quote asset — MOCK USDG",
          address: "0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99",
          hasBytecode: true,
          codeSize: 1737,
          isBuilderControlled: true,
          note: "Mock quote asset.",
        },
      ],
      transactions: [
        {
          label: "Scene A — postAssessment (WATCH, rumour containment)",
          txHash: txOf(sceneAProd, "postAssessment"),
          scene: "A",
        },
        {
          label: "Scene A — swap, fee charged 500 (base)",
          txHash: txOf(sceneAProd, "swap"),
          scene: "A",
        },
        {
          label: "Scene F — guardian pause",
          txHash: txOf(sceneOf(manifestProd, "F"), "guardian:pause"),
          scene: "F",
        },
        {
          label: "Scene F — swap after the refused action, fee still 500",
          txHash: txOf(sceneOf(manifestProd, "F"), "swap:after-failure"),
          scene: "F",
        },
        {
          label: "Scene F — guardian unpause",
          txHash: txOf(sceneOf(manifestProd, "F"), "guardian:unpause"),
          scene: "F",
        },
      ],
      manifest:
        "docs/buildx-orion-2026/outputs/05-build/t4-demo-manifest-xlayer-testnet-production-envelope.json",
    },
    {
      stackId: "demo-envelope",
      label: "Demo envelope — 60x compressed, so recovery can be watched live",
      isDemoEnvelope: true,
      envelope: manifestDemo.network.envelope,
      poolId: manifestDemo.network.addresses.poolId,
      tickSpacing: manifestDemo.network.addresses.tickSpacing,
      contracts: [
        {
          role: "TinjauRiskRegistry",
          address: "0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1",
          hasBytecode: true,
          codeSize: 6337,
          isBuilderControlled: true,
          note: "Same bytecode size as the production-envelope registry; only constructor parameters differ.",
        },
        {
          role: "TinjauFeeHook",
          address: "0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080",
          hasBytecode: true,
          codeSize: 6160,
          isBuilderControlled: true,
          note: null,
        },
        {
          role: "PoolManager (Uniswap v4)",
          address: "0x8F862A8b6f00C99b0610dc764228C661c4909ae1",
          hasBytecode: true,
          codeSize: 17151,
          isBuilderControlled: true,
          note: "Shared with the production-envelope stack.",
        },
        {
          role: "swap router (test)",
          address: "0xE76D6fC0A5235155eEb60FbBA8623465520E19dC",
          hasBytecode: true,
          codeSize: 5035,
          isBuilderControlled: true,
          note: null,
        },
        {
          role: "liquidity router (test)",
          address: "0xefEC4A304eeaA95581B2018b50472D762eE0833c",
          hasBytecode: true,
          codeSize: 4533,
          isBuilderControlled: true,
          note: null,
        },
        {
          role: "risk asset — MOCK wNVDAx",
          address: "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
          hasBytecode: true,
          codeSize: 1737,
          isBuilderControlled: true,
          note: "Shared mock. Not the real tokenized asset.",
        },
        {
          role: "quote asset — MOCK USDG",
          address: "0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99",
          hasBytecode: true,
          codeSize: 1737,
          isBuilderControlled: true,
          note: null,
        },
      ],
      transactions: [
        {
          label: "Scene A — postAssessment (WATCH)",
          txHash: txOf(sceneOf(manifestDemo, "A"), "postAssessment"),
          scene: "A",
        },
        {
          label: "Scene A — swap, fee charged 500",
          txHash: txOf(sceneOf(manifestDemo, "A"), "swap"),
          scene: "A",
        },
        {
          label: "Scene B — postAssessment (PROTECT, CONSTRUCTED market leg)",
          txHash: txOf(sceneBDemo, "postAssessment"),
          scene: "B",
        },
        {
          label: "Scene B — swap at widened fee, charged 20000",
          txHash: txOf(sceneBDemo, "swap:widened"),
          scene: "B",
        },
        {
          label: "Scene B — swap mid-decay, charged 9470",
          txHash: txOf(sceneBDemo, "swap:mid-decay"),
          scene: "B",
        },
        {
          label: "Scene B — swap after deterministic recovery, charged 500 (no keeper tx)",
          txHash: txOf(sceneBDemo, "swap:recovered"),
          scene: "B",
        },
        {
          label: "Scene B — explicit stand-down, starts the cooldown clock",
          txHash: txOf(sceneBDemo, "postAssessment:stand-down"),
          scene: "B",
        },
        {
          label: "Scene F — guardian pause",
          txHash: txOf(sceneFDemo, "guardian:pause"),
          scene: "F",
        },
        {
          label: "Scene F — swap after the refused action, fee still 500",
          txHash: txOf(sceneFDemo, "swap:after-failure"),
          scene: "F",
        },
        {
          label: "Scene F — guardian unpause",
          txHash: txOf(sceneFDemo, "guardian:unpause"),
          scene: "F",
        },
      ],
      manifest: "docs/buildx-orion-2026/outputs/05-build/t4-demo-manifest-xlayer-testnet.json",
    },
  ],

  accounts: {
    assessor: {
      address: manifestDemo.network.accounts.assessor,
      role: "Signs EIP-712 assessments. Holds 0 OKB and is gas-less by design.",
      disclosure:
        "TESTNET ONLY. Derived as keccak256(posterKey || 'tinjau.rolekey/1.0.0:assessor') because " +
        "no independent assessor key existed. A derived key shares the fate of its parent, so " +
        "production requires an independently generated one. TINJAU_ASSESSOR_PRIVATE_KEY " +
        "overrides it with no code change.",
    },
    poster: {
      address: manifestDemo.network.accounts.poster,
      role: "Relays signed assessments and pays gas. Authority comes from the signature, not from this address.",
      disclosure: null,
    },
    relayer: {
      address: manifestDemo.network.accounts.relayer,
      role: "Executes swaps in the demo scenes.",
      disclosure: null,
    },
    guardian: {
      address: manifestDemo.network.accounts.guardian,
      role: "Can pause new protections. Equal to the poster, because pausing needs gas.",
      disclosure:
        "Guardian and poster are the same key on testnet. Anvil uses four distinct keys, so role " +
        "separation is genuinely demonstrated there.",
    },
  },

  historical: {
    note:
      "The AFTERHOURS contracts below are genuinely deployed and genuinely named AfterhoursFeeHook " +
      "etc. They are HISTORICAL EVIDENCE of the earlier prototype, NOT the final revised " +
      "contracts, and must never be renamed in copy or presented as the current system (§0.18).",
    chainId: 1952,
    contracts: [
      {
        role: "EventStateRegistry (historical)",
        address: "0x713f45f44e74616898FB366E11881196221933aA",
        hasBytecode: true,
        codeSize: 5940,
      },
      {
        role: "AfterhoursFeeHook (historical)",
        address: "0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080",
        hasBytecode: true,
        codeSize: 4900,
      },
      {
        role: "swap router (historical)",
        address: "0x6F554A0bEE654Ead7C7eACDD300A72170a674C62",
        hasBytecode: true,
        codeSize: 5035,
      },
      {
        role: "mock USD₮0 bond asset (historical)",
        address: "0x95F998c232A2a0F127488fb9769C54aEe52a3eFe",
        hasBytecode: true,
        codeSize: 1737,
      },
    ],
  },

  canonicalMainnetReferences: {
    note:
      "NOT deployed by this project. These are the real chain-196 addresses the frozen replay " +
      "windows were measured against. The testnet stack uses MOCKS standing in for them.",
    chainId: 196,
    wNVDAx: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
    referencePoolFirstBlockWithBytecode: 65946484,
    referencePoolFirstBlockIso: "2026-07-22T10:18:40Z",
    liquiditySource: "THIRD_PARTY",
  },

  notRecorded: [
    {
      item: "contract creation transaction hashes",
      reason:
        "The Foundry broadcast directory was deleted after the dry run so nothing in the " +
        "committed tree implied a deployment that had not happened, and the real deploy run's " +
        "broadcast artifacts were not preserved. The addresses and their bytecode are verified " +
        "directly by eth_getCode instead, which is the stronger check.",
      howToGet:
        "Look the address up on an X Layer Testnet explorer, or scan for the creation via an " +
        "archive node. Not required for any frontend surface.",
    },
  ],
});

console.log("done");
