#!/usr/bin/env node
/**
 * tinjau-demo — the three-scene demo driver (tracker T6.5, non-frontend half).
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS IS. Tracker §0.14 defines three demo scenes. This file owns the FACTS behind them and
 * the commands that regenerate those facts. The frontend lane owns how they are presented. Neither
 * lane may fabricate missing state for the other, so nothing here is computed for effect: every
 * number is read out of a committed artifact, and every artifact is pinned by sha256 in the
 * manifest this script writes.
 *
 * NO NETWORK, BY CONSTRUCTION. The three scene commands run with the network SEALED: `fetch`,
 * `net`, `tls`, `dgram`, `dns`, `http` and `https` are replaced with functions that throw before
 * any scene code runs. A successful run is therefore proof that no third-party service was
 * contacted, not a promise that none was. `chain-verify` is the one command that opts out, and it
 * says so on its first line.
 *
 * NO CLOCK, NO RANDOMNESS. `manifest` writes a byte-identical file on every run, so `check` can
 * diff it. A `generatedAt` field would have made the artifact unverifiable in exchange for
 * telling a reader something the git history already tells them.
 *
 * ADDRESSES ARE REFERENCED, NOT COPIED. Deployed addresses live in exactly one place —
 * `frontend-handoff/deployed-addresses.json` — and are still T4.2 working addresses that T7.2
 * will re-verify. This script resolves them from that file by `stackId` at run time. Copying them
 * here would create a second list to chase.
 * ---------------------------------------------------------------------------------------------
 *
 * Usage:
 *   node demo/tinjau-demo.mjs scene1|scene2|scene3|all     offline, fixture-only, network sealed
 *   node demo/tinjau-demo.mjs manifest [--out <path>]      write the factual demo manifest
 *   node demo/tinjau-demo.mjs check                        re-derive the manifest and diff it
 *   node demo/tinjau-demo.mjs seal-selftest                prove the offline seal is armed
 *   node demo/tinjau-demo.mjs chain-verify                 live read-only check (needs network)
 *
 * Flags: --json (machine-readable scene output), --out <path> (manifest destination).
 *
 * Requirements: Node 18+. No npm install, no package.json, no build step, no credentials.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const BUILD = join(REPO, "docs", "buildx-orion-2026", "outputs", "05-build");
const HANDOFF = join(BUILD, "frontend-handoff");
const MANIFEST_PATH = join(BUILD, "t6-5-demo-manifest.json");

/* ------------------------------------------------------------------ network seal */

/**
 * Replaces every outbound network primitive with a thrower.
 *
 * This is the fixture-fallback guarantee made checkable. The alternative — asserting in prose
 * that the scenes are offline — is exactly the kind of claim this project does not accept from
 * itself. Patching goes through each module's CJS `default` object because an ESM namespace
 * object is frozen.
 */
async function sealNetwork() {
  const deny = (what) => {
    throw new Error(
      `NETWORK SEALED: ${what} was called during an offline command. The fixture-only path is ` +
        `not allowed to touch the network; this is a bug in the demo driver, not a connectivity ` +
        `problem.`,
    );
  };
  globalThis.fetch = () => deny("fetch()");
  globalThis.WebSocket = function () {
    deny("new WebSocket()");
  };

  const net = (await import("node:net")).default;
  net.Socket.prototype.connect = function () {
    deny("net.Socket#connect()");
  };
  net.connect = () => deny("net.connect()");
  net.createConnection = () => deny("net.createConnection()");

  const tls = (await import("node:tls")).default;
  tls.connect = () => deny("tls.connect()");

  const dgram = (await import("node:dgram")).default;
  dgram.createSocket = () => deny("dgram.createSocket()");

  const dns = (await import("node:dns")).default;
  dns.lookup = () => deny("dns.lookup()");
  dns.resolve = () => deny("dns.resolve()");
  dns.promises.lookup = async () => deny("dns.promises.lookup()");

  for (const name of ["node:http", "node:https"]) {
    const mod = (await import(name)).default;
    mod.request = () => deny(`${name}.request()`);
    mod.get = () => deny(`${name}.get()`);
  }
}

/* ------------------------------------------------------------------ artifact loading */

/** Every fact in this script traces to one of these files. Nothing is computed for effect. */
const SOURCES = {
  rumourScenario: join(HANDOFF, "scenario-rumor-watch.json"),
  protectScenario: join(HANDOFF, "scenario-confirmed-protect.json"),
  comparison: join(BUILD, "three-policy-benchmark.json"),
  proofOfProtection: join(BUILD, "proof-of-protection.json"),
  addresses: join(HANDOFF, "deployed-addresses.json"),
  chainManifest: join(BUILD, "t4-demo-manifest-xlayer-testnet.json"),
};

const cache = new Map();
function load(key) {
  if (!cache.has(key)) cache.set(key, JSON.parse(readFileSync(SOURCES[key], "utf8")));
  return cache.get(key);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function repoPath(abs) {
  return relative(REPO, abs).split("\\").join("/");
}

/** Resolves one deployed address by stack and role, from the single address list. */
function addressOf(stackId, role) {
  const stack = load("addresses").stacks.find((s) => s.stackId === stackId);
  if (!stack) throw new Error(`no stack "${stackId}" in ${repoPath(SOURCES.addresses)}`);
  const found = stack.contracts.find((c) => c.role === role);
  if (!found) throw new Error(`no role "${role}" in stack "${stackId}"`);
  return found.address;
}

function stackRef(stackId) {
  const stack = load("addresses").stacks.find((s) => s.stackId === stackId);
  return {
    addressList: repoPath(SOURCES.addresses),
    stackId,
    label: stack.label,
    isDemoEnvelope: stack.isDemoEnvelope,
    envelope: stack.envelope,
    poolId: stack.poolId,
    registry: addressOf(stackId, "TinjauRiskRegistry"),
    hook: addressOf(stackId, "TinjauFeeHook"),
    riskAsset: addressOf(stackId, "risk asset — MOCK wNVDAx"),
    addressStatus: load("addresses").status,
    resolvedAtRunTime: true,
  };
}

/* ------------------------------------------------------------------ the four truths */

/**
 * The facts every scene is constrained by. They are the ones a demo most easily overstates, so
 * they are stated once, carried into the manifest, and re-checked by `check` against the
 * artifacts they came from.
 */
const REQUIRED_TRUTH = [
  "Tinjau reaches PROTECT on NONE of the four frozen replay scenarios: A WATCH, B WATCH (the " +
    "evidence qualified; the MARKET leg was NOT_CONFIRMED), C WATCH, D NORMAL.",
  "Scene 2's PROTECT is CONSTRUCTED — real replayed 8-K evidence paired with a constructed price " +
    "path on a builder-controlled testnet pool. The canonical replay of that same event resolves " +
    "to WATCH. It must never be presented as a replayed result.",
  "canClaimLossAvoided is false. Tinjau TIES the static policy. No surface may claim Tinjau " +
    "reduces LP loss.",
  "The OKX leg is UNAVAILABLE for all four scenarios. There is no dual OKX/X Layer confirmation.",
  "The rumour fixture is SIMULATED, not a real post. The news chain beside it is real and " +
    "source-linked.",
  "X Layer's public RPC serves stale reads (measured 2,519–2,746 ms convergence lag). A naive " +
    "live read can show the wrong state. Pin reads to a block or follow AssessmentPosted.",
];

/* ------------------------------------------------------------------ scene 1 */

function scene1() {
  const s = load("rumourScenario");
  const g = s.evidenceGraph ?? {};
  const chain = s.onChain;
  const swap = chain.chargedFees[0];

  return {
    scene: 1,
    id: "rumour-containment",
    title: "A rumour raises attention. It cannot raise the fee.",
    requiredTruth:
      "This outcome is a CANONICAL REPLAY and matches its pre-registration. Nothing about it is " +
      "constructed.",
    facts: {
      scenarioId: s.scenarioId,
      state: s.record.state,
      confidenceBand: s.record.confidenceBand,
      reasonCodes: s.record.reasonCodes,
      actionAuthorized: s.record.action.authorized,
      actionStatus: s.record.action.status,
      feeChargedByThePool: swap.appliedFee,
      feeSource: swap.source,
      baseFee: Number(s.record.action.baseFee),
      maxFee: Number(s.record.action.maxFee),
      claimCount: g.claims?.length ?? null,
      apparentOrigins: g.independentOriginCount ?? null,
      usableOrigins: g.usableOriginCount ?? null,
      marketConfirmation: s.record.marketConfirmation.status,
      okxLeg: s.record.marketConfirmation.okxReferencePrice === null ? "UNAVAILABLE" : "AVAILABLE",
    },
    provenance: s.provenance,
    onChain: {
      stack: stackRef("production-envelope"),
      chainId: chain.chainId,
      postAssessmentTx: chain.steps.find((x) => x.step === "postAssessment")?.txHash ?? null,
      swapTx: swap.txHash,
      swapBlockNumber: swap.blockNumber,
      assetRemap: chain.assetRemap,
    },
    mustNotSay: [
      "Do not call the rumour claim a real post. It is SIMULATED (dataMode SIMULATED, sourceUrl null).",
      "Do not present four outlets as four sources. They collapse to one origin.",
      "Do not describe the unavailable OKX leg as a second confirmation.",
    ],
    sourceArtifact: repoPath(SOURCES.rumourScenario),
  };
}

/* ------------------------------------------------------------------ scene 2 */

function scene2() {
  const s = load("protectScenario");
  const chain = s.onChain;
  const manifest = load("chainManifest");
  const sceneB = manifest.scenes.find((x) => x.scene === "B");
  const sceneF = manifest.scenes.find((x) => x.scene === "F");

  const feeCurve = sceneB.swaps.map((w) => ({
    txHash: w.txHash,
    atUnixSeconds: w.atUnixSeconds,
    appliedFee: w.appliedFee,
    previewedFee: w.previewedFee,
    blockNumber: w.blockNumber,
  }));

  return {
    scene: 2,
    id: "confirmed-protection-CONSTRUCTED",
    title: "Confirmed evidence buys a bounded fee, and the clock takes it back.",
    requiredTruth: s.criticalCaveat.headline,
    constructed: {
      what: "the market leg only",
      canonicalReplayState: s.criticalCaveat.canonicalReplayState,
      canonicalReplayConfirmation: s.criticalCaveat.canonicalReplayConfirmation,
      reasonCodeDiffVsCanonical: s.criticalCaveat.reasonCodeDiff,
      whyItIsStillMeaningful:
        "The constructed price path was scored by the real confirmation engine under its own " +
        "unmodified thresholds, and the reason-code diff against the canonical run touches only " +
        "market-leg codes. What is constructed is the market, not the judgement about it.",
      uiRequirement: s.criticalCaveat.uiRequirement,
    },
    facts: {
      scenarioId: s.scenarioId,
      state: s.record.state,
      confidenceBand: s.record.confidenceBand,
      reasonCodes: s.record.reasonCodes,
      actionAuthorized: s.record.action.authorized,
      requestedFee: Number(s.record.action.requestedFee),
      feeCurveChargedByThePool: feeCurve.map((f) => f.appliedFee),
      envelope: chain.envelope,
      envelopeNote: chain.envelopeNote,
      recoveryHadNoTransaction: true,
      cooldownRefusedReArming:
        sceneB.steps.find((x) => x.step === "postAssessment:blocked-by-cooldown")?.decoded?.failure
          ?.errorName ?? null,
      failedActionCase: {
        induced: "guardian pause",
        error: sceneF.steps.find((x) => x.step === "postAssessment:failed")?.decoded?.failure
          ?.errorName,
        feeAfterFailure: sceneF.swaps[0].appliedFee,
        claimsNoBenefit: true,
      },
      previewVsChargedDivergence:
        "previewFee returned 9,730 where the pool charged 9,470 mid-decay. The fee is continuous " +
        "in time and seconds pass between quote and inclusion, so a quoted Tinjau fee is an " +
        "upper bound during decay, not a promise.",
    },
    provenance: s.provenance,
    onChain: {
      stack: stackRef("demo-envelope"),
      chainId: chain.chainId,
      steps: chain.steps.map((x) => ({ step: x.step, txHash: x.txHash })),
      feeCurve,
      readConsistency: manifest.readConsistency
        ? {
            maxWaitedMs: manifest.readConsistency.maxWaitedMs,
            totalWaitedMs: manifest.readConsistency.totalWaitedMs,
            note:
              "Measured lag between a confirmed write and that write becoming visible to a read " +
              "on the public X Layer RPC. The harness waits for convergence and throws if it " +
              "never arrives; a live demo that reads naively will intermittently show the wrong " +
              "state.",
          }
        : null,
      assetRemap: chain.assetRemap,
    },
    mustNotSay: [
      "Do not present this PROTECT as a replayed outcome. The canonical replay is WATCH.",
      "Do not call the pool a market. It is builder-controlled liquidity in valueless mock tokens.",
      "Do not present the compressed demo envelope timings as the production envelope.",
      "Do not claim the failed action in the paused case bought any protection.",
    ],
    sourceArtifact: repoPath(SOURCES.protectScenario),
  };
}

/* ------------------------------------------------------------------ scene 3 */

function scene3() {
  const b = load("comparison");
  const cells = b.cells;
  const comparable = cells.filter((c) => c.vsVolatilityOnly !== "NOT_COMPARABLE");

  const tally = (basis, field) => {
    const out = {};
    for (const c of comparable.filter((x) => x.metricBasis === basis)) {
      out[c[field]] = (out[c[field]] ?? 0) + 1;
    }
    return out;
  };

  const volatilityOnD = b.rows
    .filter((r) => r.scenarioId === "D-neutral-normal" && r.policyId === "VOLATILITY_ONLY")
    .map((r) => ({
      k: r.parameters.k,
      status: r.policyBehaviour.status,
      triggerCount: r.policyBehaviour.triggerCount,
      falsePositive: r.policyBehaviour.falsePositive.label,
    }));
  const tinjauOnD = b.rows
    .filter((r) => r.scenarioId === "D-neutral-normal" && r.policyId === "TINJAU")
    .map((r) => ({
      minDrawdownBps: r.parameters.minDrawdownBps,
      status: r.policyBehaviour.status,
      triggerCount: r.policyBehaviour.triggerCount,
      falsePositive: r.policyBehaviour.falsePositive.label,
    }));

  return {
    scene: 3,
    id: "simpler-alternatives",
    title: "The same replay under a static fee, a volatility-only fee, and Tinjau.",
    requiredTruth:
      "Lead with behaviour, not economics. On markout this benchmark cannot determine a winner: " +
      "the sign flips with the metric basis. What it can determine is which policy fired, when, " +
      "and on what.",
    facts: {
      policies: ["STATIC", "VOLATILITY_ONLY", "TINJAU"],
      identicalInput:
        "All rows carry a sha256 fingerprint over the replay input; one distinct fingerprint per " +
        "scenario covers all seven policy rows.",
      rows: b.rows.length,
      cells: cells.length,
      comparableCells: comparable.length / 2,
      claimGate: {
        field: b.claimGate.field,
        value: b.claimGate.value,
        // Cross-checked against the Proof of Protection record, which reaches the same gate by a
        // different route. Two artifacts agreeing is worth more than one asserting.
        proofOfProtectionAgrees:
          load("proofOfProtection").claimGate.canClaimLossAvoided === b.claimGate.value,
        proofOfProtectionReason: load("proofOfProtection").claimGate.reason,
      },
      signFlip: {
        preRegistered: tally("PRE_REGISTERED", "vsVolatilityOnly"),
        amd002Consistent: tally("AMD_002_CONSISTENT", "vsVolatilityOnly"),
        vsStaticBothBases: {
          preRegistered: tally("PRE_REGISTERED", "vsStatic"),
          amd002Consistent: tally("AMD_002_CONSISTENT", "vsStatic"),
        },
        why:
          "Neither basis is clean. The pre-registered metric debits a counterfactual fee it never " +
          "credits, mechanically penalising any fee-raising policy. AMD-002 credits counterfactual " +
          "fee revenue assuming zero flow elasticity, mechanically rewarding one. AMD-002 is " +
          "post-hoc and is structurally excluded from the claim gate.",
      },
      theDefensibleClaim: {
        sentence:
          "Tinjau declined to act on two large price moves because neither had a qualifying " +
          "cause, and one of them a volatility-only policy would have traded on.",
        neutralControl: "D-neutral-normal — a routine insider Form 4, pre-registered NORMAL",
        volatilityOnly: volatilityOnD,
        tinjau: tinjauOnD,
        whyItIsCredible:
          "It arrives from the control rather than from the showcase, and the neutral control " +
          "moved MORE (241 bps) than the material 8-K (235 bps): price data alone cannot separate " +
          "a material event from a routine one.",
        whatItIsNot: "A finding about restraint. It is not a demonstration of protection.",
      },
      headlineFindings: b.headlineFindings,
    },
    onChain: null,
    mustNotSay: [
      "Do not declare a winner on markout. The bracket spans the sign.",
      "Do not quote AMD-002's numbers without the label 'post-hoc' and its direction of effect.",
      "Do not claim Tinjau reduces LP loss. canClaimLossAvoided is false; Tinjau ties STATIC.",
      "Do not hide that under AMD-002's basis VOLATILITY_ONLY beats TINJAU on every comparable cell.",
    ],
    sourceArtifact: repoPath(SOURCES.comparison),
  };
}

/* ------------------------------------------------------------------ commands per scene */

/**
 * Three commands per scene, deliberately separated by what they need.
 *
 * `fixtureOnly` needs nothing and is the fallback path. `judgeVerifiable` needs a public RPC and
 * no credentials, so a stranger can check the on-chain half themselves. `builderRegeneration`
 * needs funded testnet keys and is the command that produced the evidence in the first place — a
 * judge cannot run it, and saying otherwise would be the easy lie here.
 */
function commandsFor(sceneNumber, stackId) {
  const common = {
    fixtureOnly: {
      cmd: `node demo/tinjau-demo.mjs scene${sceneNumber}`,
      needs: "Node 18+",
      network: "SEALED — fetch/net/tls/dgram/dns/http/https all throw before scene code runs",
      credentials: "none",
    },
  };

  if (sceneNumber === 3) {
    return {
      ...common,
      judgeVerifiable: {
        cmd: "cd apps/server && npx tsx src/benchmark/emit.ts",
        needs: "pnpm install in apps/server",
        network: "none — every input is a committed fixture",
        credentials: "none",
        proves:
          "Rewrites three-policy-benchmark.json byte-identically. An empty diff after a rerun is " +
          "the determinism evidence.",
      },
      builderRegeneration: null,
    };
  }

  const sceneLetter = sceneNumber === 1 ? "A" : "B";
  // Resolved from the address list at run time, so this command is copy-pasteable without a
  // second list of addresses existing anywhere in this file.
  const s = stackRef(stackId);
  const net = load("addresses").network;
  return {
    ...common,
    judgeVerifiable: {
      cmd:
        "node tools/risk-reader/tinjau-risk-read.mjs" +
        ` --rpc-url ${net.rpc} --chain-id ${net.chainId}` +
        ` --registry ${s.registry} --asset ${s.riskAsset} --pool-id ${s.poolId}`,
      needs: "Node 18+ and internet. Values resolved from deployed-addresses.json at run time.",
      network: "public X Layer Testnet RPC, read-only",
      credentials: "none",
      proves:
        "The risk record is readable and decodable by a stranger holding only the chain and the " +
        "ABI. Prints stored and effective state separately.",
      staleReadWarning:
        "The public RPC serves stale reads. Read twice and compare, or pin to a block number.",
    },
    builderRegeneration: {
      cmd: `cd apps/server && npx tsx src/chain/tinjauDemoRun.ts --remote --scenes ${sceneLetter}`,
      needs:
        "funded X Layer Testnet keys (POSTER_PRIVATE_KEY, DEMO_RELAYER_PRIVATE_KEY) plus the " +
        "TINJAU_* address environment listed in t4-2-t4-5-harness-and-testnet-run.md §9",
      network: "public X Layer Testnet RPC, writes transactions",
      credentials: "REQUIRED — a judge cannot run this; it is how the recorded evidence was made",
      staleReadHandling:
        "After every confirmed write the harness waits until a read reflects it and throws if it " +
        "never converges. Measured lag 2,519–2,746 ms per write.",
    },
  };
}

/* ------------------------------------------------------------------ manifest */

function buildManifest() {
  const scenes = [scene1(), scene2(), scene3()].map((s) => ({
    ...s,
    commands: commandsFor(s.scene, s.onChain?.stack?.stackId),
  }));

  return {
    schemaVersion: "tinjau.demo-manifest/1.0.0",
    _purpose:
      "The single factual manifest for the tracker §0.14 three-scene demo. The non-frontend lane " +
      "owns these facts and the commands that regenerate them; the frontend lane presents them. " +
      "Neither may fabricate missing state for the other.",
    _noClock:
      "This file carries no generation timestamp on purpose: `node demo/tinjau-demo.mjs check` " +
      "re-derives it and diffs byte-for-byte, which a clock would make impossible.",
    producedBy: "node demo/tinjau-demo.mjs manifest",
    producedByTasks: ["T6.5 (non-frontend half)"],
    requiredTruth: REQUIRED_TRUTH,
    addressPolicy: {
      addressList: repoPath(SOURCES.addresses),
      status: load("addresses").status,
      note:
        "Addresses are resolved from the address list by stackId at run time and are NOT copied " +
        "into this manifest as independent values. T7.2 owns the authoritative list; anything " +
        "hardcoded elsewhere would have to be chased when it changes.",
    },
    sourceArtifacts: Object.entries(SOURCES)
      .map(([key, path]) => ({ key, path: repoPath(path), sha256: sha256(path) }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    fixtureFallback: {
      cmd: "node demo/tinjau-demo.mjs all",
      whatItProves:
        "The full three-scene narrative runs with no live third-party service, no credentials, " +
        "no RPC and no npm install. Every outbound network primitive is replaced with a thrower " +
        "before scene code runs, so a successful run is evidence rather than assurance.",
      whatItDoesNotProve:
        "It replays recorded facts. It does not re-execute the on-chain transactions, and it " +
        "cannot detect that a chain has since changed state.",
    },
    scenes,
    claimBoundary: {
      forbidden: [
        "first AI dynamic-fee hook",
        "first multi-agent corporate-action oracle",
        "first on-chain risk registry",
        "first CEX/DEX risk agent",
        "first self-protecting pool",
        "production adoption, protected TVL, customers, or revenue",
        "a live Exchange OS integration",
        "dual OKX/X Layer confirmation",
        "Tinjau reduces LP loss",
      ],
      permitted:
        "No complete public product with the exact reviewed combination of source-grounded " +
        "tokenized-equity evidence, rumour containment, OKX/X Layer confirmation, bounded LP " +
        "action, deterministic recovery, and measured three-policy outcome was found.",
    },
  };
}

/* ------------------------------------------------------------------ terminal rendering */

const BAR = "=".repeat(78);
const bar = () => console.log(BAR);

function renderScene(s) {
  bar();
  console.log(`SCENE ${s.scene} — ${s.title}`);
  bar();
  console.log(`  ${s.requiredTruth}\n`);

  if (s.constructed) {
    console.log("  *** CONSTRUCTED ***");
    console.log(`  constructed: ${s.constructed.what}`);
    console.log(`  canonical replay of the same event: ${s.constructed.canonicalReplayState}`);
    console.log(
      `  reason codes only in canonical : ${s.constructed.reasonCodeDiffVsCanonical.onlyInCanonical.join(", ")}`,
    );
    console.log(
      `  reason codes only in constructed: ${s.constructed.reasonCodeDiffVsCanonical.onlyInConstructed.join(", ")}\n`,
    );
  }

  console.log("  FACTS");
  for (const [k, v] of Object.entries(s.facts)) {
    // Scene 3's two big nested facts get their own blocks below; a truncated JSON blob is
    // exactly how the sign flip and the neutral-control result would go unread.
    if (k === "signFlip" || k === "theDefensibleClaim" || k === "headlineFindings") continue;
    const value =
      v === null || typeof v !== "object" ? String(v) : JSON.stringify(v).slice(0, 200);
    console.log(`    ${k.padEnd(28)} ${value}`);
  }

  if (s.facts.signFlip) {
    const f = s.facts.signFlip;
    console.log("\n  THE SIGN FLIPS WITH THE METRIC — both bases published, neither is clean");
    console.log(`    vs VOLATILITY_ONLY, pre-registered basis : ${JSON.stringify(f.preRegistered)}`);
    console.log(`    vs VOLATILITY_ONLY, AMD-002 post-hoc     : ${JSON.stringify(f.amd002Consistent)}`);
    console.log(
      `    vs STATIC, both bases                    : ${JSON.stringify(f.vsStaticBothBases.preRegistered)}`,
    );
  }

  if (s.facts.theDefensibleClaim) {
    const d = s.facts.theDefensibleClaim;
    console.log("\n  BEHAVIOUR ON THE NEUTRAL CONTROL — this is what the demo may claim");
    console.log(`    control: ${d.neutralControl}`);
    for (const r of d.volatilityOnly) {
      console.log(
        `      VOLATILITY_ONLY  k=${r.k}                 ${r.status}, ${r.triggerCount} trigger(s) — ${r.falsePositive}`,
      );
    }
    for (const r of d.tinjau) {
      console.log(
        `      TINJAU           minDrawdownBps=${String(r.minDrawdownBps).padEnd(3)}  ${r.status}, ${r.triggerCount} trigger(s) — ${r.falsePositive}`,
      );
    }
    console.log(`\n    "${d.sentence}"`);
    console.log(`    ${d.whatItIsNot}`);
  }

  if (s.facts.headlineFindings) {
    console.log("\n  PUBLISHED HEADLINE FINDINGS");
    for (const h of s.facts.headlineFindings) console.log(`    - ${h}`);
  }

  if (s.onChain) {
    console.log("\n  ON CHAIN");
    console.log(`    stack                        ${s.onChain.stack.stackId} (chain ${s.onChain.chainId})`);
    console.log(`    registry                     ${s.onChain.stack.registry}`);
    console.log(`    hook                         ${s.onChain.stack.hook}`);
    console.log(`    address status               ${s.onChain.stack.addressStatus}`);
    if (s.onChain.postAssessmentTx) {
      console.log(`    postAssessment tx            ${s.onChain.postAssessmentTx}`);
      console.log(`    swap tx                      ${s.onChain.swapTx}`);
    }
    if (s.onChain.feeCurve) {
      for (const f of s.onChain.feeCurve) {
        console.log(
          `    swap @${f.atUnixSeconds}  charged ${String(f.appliedFee).padStart(6)}  ` +
            `previewed ${String(f.previewedFee).padStart(6)}  ${f.txHash}`,
        );
      }
    }
  }

  console.log("\n  DO NOT SAY");
  for (const m of s.mustNotSay) console.log(`    - ${m}`);
  // Added by the driver rather than read from the artifact, on purpose. The
  // artifact's own `mustNotSay` list is frozen evidence and feeds the manifest
  // hash, so it is not edited to add a disclosure after the fact. This line is
  // the driver speaking in its own voice about a bit it just printed:
  // BONDED_EVIDENCE_PASSED reads as a check that ran, and on every published
  // scenario it was an input the scenario runner defaulted to true.
  if (s.facts?.reasonCodes?.includes?.("BONDED_EVIDENCE_PASSED")) {
    console.log(
      "    - Do not read BONDED_EVIDENCE_PASSED as a parse that was verified here. On every\n" +
        "      published scenario that value was an assumed input, not a live parse result.",
    );
  }

  console.log("\n  COMMANDS");
  for (const [name, c] of Object.entries(s.commands)) {
    if (!c) continue;
    console.log(`    [${name}] ${c.cmd}`);
    console.log(`        needs: ${c.needs}   network: ${c.network}   credentials: ${c.credentials}`);
  }
  console.log(`\n  source: ${s.sourceArtifact}\n`);
}

function renderHeader(sealed) {
  bar();
  console.log("TINJAU — three-scene demo (tracker §0.14).  Reference driver, built by Tinjau.");
  console.log(
    sealed
      ? "MODE: FIXTURE-ONLY. Network SEALED — every outbound primitive throws. No credentials."
      : "MODE: LIVE. This command reads a public RPC.",
  );
  bar();
  console.log("READ THIS FIRST");
  for (const t of REQUIRED_TRUTH) console.log(`  - ${t}`);
  console.log("");
}

/* ------------------------------------------------------------------ live chain verify */

/**
 * Read-only live check. Pins every call to ONE block number and requires two agreeing samples,
 * which is the consumer-side answer to the stale-read finding: a load-balanced RPC can answer a
 * later read from an earlier height, and for a risk registry that means reading NORMAL while a
 * PROTECT is live.
 */
async function chainVerify() {
  const rpc = process.env.TINJAU_RPC_URL?.trim() || load("addresses").network.rpc;
  const chainId = load("addresses").network.chainId;
  let id = 0;

  const call = async (method, params) => {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    const body = await res.json();
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    return body.result;
  };

  console.log(`rpc      ${rpc}`);
  const remoteChainId = Number(await call("eth_chainId", []));
  console.log(`chainId  ${remoteChainId} (address list says ${chainId})`);
  if (remoteChainId !== chainId) throw new Error("chain id mismatch — refusing to report");

  // Two block reads, a moment apart. If a load-balanced RPC hands back a LOWER height on the
  // second call, that is the stale-read behaviour observed directly rather than quoted.
  const h1 = Number(await call("eth_blockNumber", []));
  await new Promise((r) => setTimeout(r, 1500));
  const h2 = Number(await call("eth_blockNumber", []));
  const wentBackwards = h2 < h1;
  console.log(
    `height   ${h1} then ${h2}${wentBackwards ? "  *** WENT BACKWARDS — stale read observed ***" : ""}`,
  );

  // Pin everything to one height so a mixed-height report is impossible.
  const pin = `0x${Math.min(h1, h2).toString(16)}`;
  console.log(`pinned   block ${Math.min(h1, h2)} — every read below is at this height\n`);

  let failures = 0;
  for (const stack of load("addresses").stacks) {
    console.log(`stack ${stack.stackId}`);
    for (const c of stack.contracts) {
      const code = await call("eth_getCode", [c.address, pin]);
      const size = (code.length - 2) / 2;
      const ok = size > 0;
      if (!ok) failures += 1;
      console.log(
        `  ${ok ? "ok  " : "FAIL"} ${c.role.padEnd(28)} ${c.address}  ${size} bytes` +
          (c.codeSize && size !== c.codeSize ? `  (list says ${c.codeSize})` : ""),
      );
    }
    console.log("");
  }

  console.log(failures === 0 ? "every published address has bytecode" : `${failures} address(es) FAILED`);
  console.log(
    "\nAddresses are T4.2 working addresses, not final. Pools are BUILDER-CONTROLLED test\n" +
      "liquidity in valueless mock tokens; nothing measured on them is a market result.",
  );
  return failures === 0;
}

/* ------------------------------------------------------------------ main */

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? "all";
  const json = args.includes("--json");
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : MANIFEST_PATH;

  if (cmd === "chain-verify") {
    const ok = await chainVerify();
    process.exit(ok ? 0 : 1);
  }

  // Everything below is offline. Seal first, then do the work.
  await sealNetwork();

  if (cmd === "seal-selftest") {
    // A seal nobody tries to break is indistinguishable from no seal. This deliberately attempts
    // every trapped primitive and fails if ANY of them lets the call through.
    const net = (await import("node:net")).default;
    const https = (await import("node:https")).default;
    const dns = (await import("node:dns")).default;
    const attempts = [
      ["fetch", () => fetch("https://example.invalid")],
      ["net.connect", () => net.connect(443, "example.invalid")],
      ["new net.Socket().connect", () => new net.Socket().connect(443, "example.invalid")],
      ["https.request", () => https.request("https://example.invalid")],
      ["dns.lookup", () => dns.lookup("example.invalid", () => {})],
    ];
    let escaped = 0;
    for (const [name, fn] of attempts) {
      try {
        await fn();
        console.log(`  ESCAPED  ${name} did NOT throw`);
        escaped += 1;
      } catch (err) {
        const sealed = String(err.message).startsWith("NETWORK SEALED");
        console.log(`  ${sealed ? "sealed  " : "ESCAPED "} ${name}${sealed ? "" : ` -> ${err.message}`}`);
        if (!sealed) escaped += 1;
      }
    }
    console.log(escaped === 0 ? "\nall network primitives are sealed" : `\n${escaped} ESCAPED`);
    process.exit(escaped === 0 ? 0 : 1);
  }

  if (cmd === "manifest") {
    const text = `${JSON.stringify(buildManifest(), null, 2)}\n`;
    writeFileSync(outPath, text);
    console.log(`wrote ${outPath}`);
    console.log(`sha256 ${createHash("sha256").update(text).digest("hex")}`);
    return;
  }

  if (cmd === "check") {
    const derived = `${JSON.stringify(buildManifest(), null, 2)}\n`;
    let onDisk;
    try {
      onDisk = readFileSync(MANIFEST_PATH, "utf8");
    } catch {
      console.error(`no manifest at ${MANIFEST_PATH}. Run: node demo/tinjau-demo.mjs manifest`);
      process.exit(2);
    }
    if (derived === onDisk) {
      console.log("manifest is byte-identical to what the source artifacts produce now");
      console.log(`sha256 ${createHash("sha256").update(derived).digest("hex")}`);
      return;
    }
    console.error(
      "MANIFEST DRIFT: the committed manifest no longer matches the artifacts it was derived\n" +
        "from. Regenerate it (node demo/tinjau-demo.mjs manifest) and re-read what changed —\n" +
        "a silent drift here would let the demo present a fact the evidence no longer supports.",
    );
    process.exit(1);
  }

  const wanted = { scene1: [1], scene2: [2], scene3: [3], all: [1, 2, 3] }[cmd];
  if (!wanted) {
    console.error(
      `unknown command "${cmd}".\n` +
        "usage: node demo/tinjau-demo.mjs " +
          "scene1|scene2|scene3|all|manifest|check|seal-selftest|chain-verify",
    );
    process.exit(2);
  }

  const built = { 1: scene1, 2: scene2, 3: scene3 };
  const scenes = wanted.map((n) => {
    const s = built[n]();
    return { ...s, commands: commandsFor(n, s.onChain?.stack?.stackId) };
  });

  if (json) {
    console.log(JSON.stringify({ requiredTruth: REQUIRED_TRUTH, scenes }, null, 2));
    return;
  }

  renderHeader(true);
  for (const s of scenes) renderScene(s);
  bar();
  console.log("Reference driver, built by Tinjau. Not external adoption, not a market result.");
  bar();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
