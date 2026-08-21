/**
 * The T4.2–T4.5 harness, run end to end against a real chain (a local Anvil).
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS TEST IS NOT A UNIT TEST. Every claim in T4.2–T4.5 is about what a POOL DID, not
 * about what a function returned. So this boots a real Anvil, deploys a real PoolManager, a
 * real registry, a real hook and a real pool, posts real signed assessments, executes real
 * swaps, and reads the fee back out of PoolManager's own `Swap` event. A mocked version of any
 * of those would test the mock.
 *
 * It is skipped, loudly, if `anvil` or `forge` is not on PATH — a silently-skipped end-to-end
 * test is worse than none, because the suite would report green while proving nothing.
 *
 * "Loudly" was aspirational until 2026-08-21. A skipped `describe` is never registered, so
 * node's summary printed `skipped 0` and the run simply reported 8 fewer tests than the 594
 * this project publishes, with nothing on screen to say why. The notice registered below fixes
 * that: it appears only on the no-Foundry path, so the full run still reports exactly 594.
 * ---------------------------------------------------------------------------------------
 */

import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import {
  startLocalStack,
  parseDeploymentOutput,
  type LocalStack,
} from "../src/chain/tinjauLocalStack.js";
import {
  makeTinjauClients,
  checkBytecode,
  describeConfig,
  advanceTime,
  chainNowSeconds,
} from "../src/chain/tinjauChain.js";
import {
  executeSwap,
  fundSwapper,
  poolKeyOf,
  readEffectiveState,
  readFeeDetail,
  readRecord,
  remapAssetForChain,
} from "../src/chain/tinjauHarness.js";
import {
  buildConstructedProtectWindow,
  decideConstructedProtect,
  runFailedActionScene,
  runSceneA,
  runSceneB,
  setAssessorKey,
  signAndPostDecision,
  timeShiftScenario,
  timeShiftSwapWindow,
} from "../src/chain/tinjauScenes.js";
import { TINJAU_RISK_REGISTRY_ABI } from "../src/chain/tinjauAbi.js";
import { runScenario } from "../src/decision/scenarioRunner.js";
import { XLAYER_BLOCK_TIMESTAMP_OFFSET } from "../src/market/poolTelemetry.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const contractsDir = join(repoRoot, "contracts");
const scenariosDir = join(here, "..", "scenarios");
const marketFixturesDir = join(here, "..", "src", "market", "fixtures");

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const scenarioA = readJson(join(scenariosDir, "scenario-a-rumor-watch.json"));
const scenarioB = readJson(join(scenariosDir, "scenario-b-confirmed-protect.json"));
const swapsA = readJson(join(marketFixturesDir, "pool-scenario-a-swaps.json"));
const swapsB = readJson(join(marketFixturesDir, "pool-scenario-b-swaps.json"));

function toolsAvailable(): boolean {
  for (const tool of ["anvil", "forge"]) {
    try {
      execFileSync("which", [tool], { stdio: "ignore" });
    } catch {
      return false;
    }
  }
  return true;
}

const HAVE_TOOLS = toolsAvailable();

// ---------------------------------------------------------------------------
// Pure tests — no chain needed
// ---------------------------------------------------------------------------

describe("harness helpers", () => {
  test("time shifting moves every timestamp by one constant and nothing else", () => {
    const delta = 1_234_567;
    const shifted = timeShiftScenario(scenarioA, delta);

    assert.equal(
      Date.parse(shifted.decisionAnchor.at) - Date.parse(scenarioA.decisionAnchor.at),
      delta * 1000,
    );
    assert.equal(shifted.claims.length, scenarioA.claims.length);
    for (let i = 0; i < shifted.claims.length; i++) {
      // Non-temporal fields must survive untouched: a shift that quietly rewrote a source URL
      // or a claim's text would change the evidence, not its clock.
      assert.equal(shifted.claims[i].sourceUrl, scenarioA.claims[i].sourceUrl);
      assert.equal(shifted.claims[i].sourceClass, scenarioA.claims[i].sourceClass);
      assert.equal(shifted.claims[i].dataMode, scenarioA.claims[i].dataMode);
    }
  });

  test("shifting a swap window moves blocks and timestamps together", () => {
    const delta = 5_000;
    const shifted = timeShiftSwapWindow(swapsA, delta);
    assert.equal(shifted.toBlock - swapsA.toBlock, delta);
    assert.equal(Date.parse(shifted.toIso) - Date.parse(swapsA.toIso), delta * 1000);
    // X Layer is one block per second, so the two must move by the same amount or the window's
    // own block-to-time mapping stops holding.
    assert.equal(
      shifted.toBlock + XLAYER_BLOCK_TIMESTAMP_OFFSET,
      Math.floor(Date.parse(shifted.toIso) / 1000),
    );
  });

  test("the constructed window is built to be scored, not to assert its own verdict", () => {
    const end = 1_800_000_000;
    const w = buildConstructedProtectWindow({
      chainId: 31337,
      pool: "0x" + "11".repeat(32),
      token0: "0x" + "22".repeat(20),
      token1: "0x" + "33".repeat(20),
      endUnixSeconds: end,
    });
    assert.equal(w.liquiditySource, "BUILDER_CONTROLLED", "must never claim third-party liquidity");
    assert.ok(w.swapCount >= 30, `needs at least 30 swaps to be scoreable, has ${w.swapCount}`);
    assert.equal(w.toBlock + XLAYER_BLOCK_TIMESTAMP_OFFSET, end);
    // Nothing in the fixture states a verdict. `confirmMarket` decides.
    assert.equal("status" in w, false);
  });

  test("shifting the evidence without the market changes the answer — which is why the guard exists", () => {
    const canonical = runScenario(scenarioA, swapsA);
    const delta = 30 * 24 * 3600;

    // Evidence moved a month forward, market left where it was. Every relationship between the
    // two legs is now wrong.
    const desynced = runScenario(timeShiftScenario(scenarioA, delta), swapsA);

    assert.notDeepEqual(
      [...desynced.record.reasonCodes].sort(),
      [...canonical.record.reasonCodes].sort(),
      "if a desynchronised shift produced the same answer, Scene A's invariance check would be " +
        "vacuous and a broken shift could pass unnoticed",
    );

    // And the guard's positive case: shifting BOTH legs together preserves the answer.
    const synced = runScenario(timeShiftScenario(scenarioA, delta), timeShiftSwapWindow(swapsA, delta));
    assert.deepEqual([...synced.record.reasonCodes].sort(), [...canonical.record.reasonCodes].sort());
  });

  test("the deploy-output parser refuses an empty block rather than returning nothing", () => {
    assert.throws(() => parseDeploymentOutput("no sentinels here"), /no TINJAU-DEPLOYMENT block/);
    const parsed = parseDeploymentOutput(
      "noise\n---TINJAU-DEPLOYMENT-BEGIN---\n  CHAIN_ID= 31337\n  TINJAU_HOOK= 0xabc\n---TINJAU-DEPLOYMENT-END---\n",
    );
    assert.equal(parsed.CHAIN_ID, "31337");
    assert.equal(parsed.TINJAU_HOOK, "0xabc");
  });

  test("the asset remap changes exactly one field", () => {
    const original = {
      asset: "0x" + "aa".repeat(20),
      poolId: "0x" + "bb".repeat(32),
      state: 2,
      confidence: 3,
      dataMode: 3,
      confirmation: 4,
      reasonBits: 65536,
      assessedAt: 1n,
      expiresAt: 2n,
      evidenceCommitment: "0x" + "cc".repeat(32),
      requestedFee: 0,
      nonce: 7n,
      deadline: 9n,
    } as Parameters<typeof remapAssetForChain>[0];

    const { assessment, remap } = remapAssetForChain(original, `0x${"dd".repeat(20)}`, 31337);
    const differing = Object.keys(original).filter(
      (k) =>
        (assessment as unknown as Record<string, unknown>)[k] !==
        (original as unknown as Record<string, unknown>)[k],
    );
    assert.deepEqual(differing, ["asset"], "the remap must not become a place decisions get edited");
    assert.equal(remap.canonicalAsset, original.asset);
    assert.match(remap.note, /BUILDER-CONTROLLED/);
  });
});

// ---------------------------------------------------------------------------
// End to end against a real chain
// ---------------------------------------------------------------------------

// Registered only when Foundry is absent, for the reason given in the file header: it names the
// omission so the reduced test count explains itself. It always passes, because a missing tool is
// a missing input, not a failing assertion.
if (!HAVE_TOOLS) {
  test("local-chain harness needs Foundry: install anvil and forge, or this run reports 8 fewer than 594 tests", () => {
    console.log(
      [
        "",
        "  SKIPPED: the 8 end-to-end local-chain tests did not run.",
        "  They boot a real Anvil and need `anvil` and `forge` on PATH.",
        "  Everything they prove is about what a pool actually did, so there is no unit-test",
        "  substitute: a mocked version would test the mock.",
        "  Fix: install Foundry (https://getfoundry.sh), then re-run `npm test` here.",
        "  Nothing is broken: this is a missing tool, not a failing assertion.",
        "",
      ].join("\n"),
    );
  });
}

describe("T4.2-T4.5 end to end on a local chain", { skip: !HAVE_TOOLS && "anvil/forge not on PATH" }, () => {
  let stack: LocalStack;
  let clients: ReturnType<typeof makeTinjauClients>;

  before(async () => {
    stack = await startLocalStack({ contractsDir });
    clients = makeTinjauClients(stack.config);
    setAssessorKey(stack.assessorKey);
  });

  after(async () => {
    if (stack) await stack.stop();
  });

  test("every published address has bytecode", async () => {
    const a = clients.config.addresses;
    const checked = await checkBytecode(clients, {
      registry: a.registry,
      hook: a.hook,
      poolManager: a.poolManager,
      swapRouter: a.swapRouter,
      liquidityRouter: a.liquidityRouter,
      riskAsset: a.riskAsset,
      quoteAsset: a.quoteAsset,
    });
    for (const [name, result] of Object.entries(checked)) {
      assert.ok(result.hasBytecode, `${name} at ${result.address} has no bytecode`);
    }
  });

  test("the deployed stack is wired the way the harness assumes", async () => {
    const a = clients.config.addresses;
    const assessorOnChain = await clients.publicClient.readContract({
      address: a.registry,
      abi: TINJAU_RISK_REGISTRY_ABI,
      functionName: "assessor",
    });
    assert.equal(
      String(assessorOnChain).toLowerCase(),
      clients.config.accounts.assessor.address.toLowerCase(),
      "a signature from a different key would be rejected as BadSignature with no explanation",
    );

    const supported = await clients.publicClient.readContract({
      address: a.registry,
      abi: TINJAU_RISK_REGISTRY_ABI,
      functionName: "supportedAsset",
      args: [a.riskAsset],
    });
    assert.equal(supported, true, "the hook cannot resolve an unvetted asset");

    // The hook must be looking at the same pool the harness swaps on.
    const resolved = (await clients.publicClient.readContract({
      address: a.hook,
      abi: (await import("../src/chain/tinjauAbi.js")).TINJAU_FEE_HOOK_ABI,
      functionName: "resolveAsset",
      args: [poolKeyOf(clients)],
    })) as [string, string, number];
    assert.equal(resolved[0].toLowerCase(), a.riskAsset.toLowerCase());
    assert.equal(resolved[1].toLowerCase(), a.poolId.toLowerCase());
    assert.equal(resolved[2], 0, "asset resolution must be clean, not degraded");
  });

  test("with nothing assessed the pool charges baseFee", async () => {
    const record = await readRecord(clients);
    assert.equal(record.neverAssessed, true);
    const detail = await readFeeDetail(clients);
    assert.equal(detail.reason, "NoRecord");
    assert.equal(detail.fee, clients.config.envelope.baseFee);

    await fundSwapper(clients);
    const swap = await executeSwap(clients);
    assert.ok(swap.ok, `swap failed: ${JSON.stringify(swap.failure)}`);
    assert.equal(swap.appliedFee, clients.config.envelope.baseFee);
  });

  test("Scene A: the frozen rumour reaches WATCH and a real swap is charged baseFee", async () => {
    const scene = await runSceneA(clients, scenarioA, swapsA);
    assert.deepEqual(scene.failures, [], "Scene A assertions failed");
    assert.equal(scene.decisionState, "WATCH");
    assert.equal(scene.provenance.pool, "BUILDER_CONTROLLED");

    const swap = scene.swaps.at(-1);
    assert.equal(
      swap?.appliedFee,
      clients.config.envelope.baseFee,
      "the safety claim: a rumour must never buy the aggressive fee",
    );
    // Measured, not previewed.
    assert.ok(swap?.txHash, "the scene must record a real transaction hash");
    assert.equal(swap?.previewedFee, swap?.appliedFee);
  });

  test("Scene B: PROTECT is charged, decays deterministically, recovers, and cooldown blocks re-entry", async () => {
    const scene = await runSceneB(clients, scenarioB, swapsB);
    assert.deepEqual(scene.failures, [], "Scene B assertions failed");
    assert.equal(scene.decisionState, "PROTECT");
    assert.equal(scene.provenance.marketLeg, "CONSTRUCTED");

    // The measured form of "only the market leg is constructed": against the real mainnet
    // replay, the ONLY reason codes that moved are market-leg ones. The evidence-leg
    // conclusions — official filing, bonded evidence, syndication, staleness of the claims —
    // are identical in both runs.
    const compare = scene.steps.find((s) => s.step === "compare:canonical-vs-constructed");
    assert.ok(compare, "the canonical comparison must be recorded");
    const cmp = compare!.decoded as {
      canonicalState: string;
      reasonCodeDiff: { onlyInCanonical: string[]; onlyInConstructed: string[] };
    };
    assert.equal(cmp.canonicalState, "WATCH", "the published replay result must be unchanged");
    assert.deepEqual(cmp.reasonCodeDiff.onlyInCanonical, ["ANTI_WICK_FAILED", "MARKET_NOT_CONFIRMED"]);
    assert.deepEqual(cmp.reasonCodeDiff.onlyInConstructed, ["MARKET_CONFIRMED"]);
    assert.ok(
      scene.provenance.caveats.some((c) => /MARKET LEG IS CONSTRUCTED/.test(c)),
      "a constructed PROTECT must say so unmissably",
    );

    const [widened, mid, recovered, afterBlocked] = scene.swaps;
    const env = clients.config.envelope;

    assert.equal(widened.appliedFee, env.maxFee, "high-confidence PROTECT should reach the ceiling");
    assert.ok(mid.appliedFee! > env.baseFee && mid.appliedFee! < widened.appliedFee!);
    assert.equal(recovered.appliedFee, env.baseFee);
    assert.equal(afterBlocked.appliedFee, env.baseFee);

    // The curve must be monotone across the three observed points, or "deterministic decay" is
    // just three unrelated readings.
    assert.ok(widened.appliedFee! >= mid.appliedFee!);
    assert.ok(mid.appliedFee! >= recovered.appliedFee!);

    const cooldownStep = scene.steps.find((s) => s.step === "postAssessment:blocked-by-cooldown");
    assert.ok(cooldownStep, "the cooldown step must be recorded");
    assert.equal(
      (cooldownStep!.decoded as { failure: { errorName: string } }).failure.errorName,
      "CooldownActive",
      "the refusal must be the contract's own decoded error, not a string match",
    );
  });

  test("Scene F: a failed action stays visible and buys no protection", async () => {
    const scene = await runFailedActionScene(clients, scenarioB);
    assert.deepEqual(scene.failures, [], "Scene F assertions failed");

    const failedStep = scene.steps.find((s) => s.step === "postAssessment:failed");
    const action = (failedStep!.decoded as { action: Record<string, unknown> }).action;
    assert.equal(action.status, "FAILED");
    assert.equal(action.appliedFee, null);
    assert.equal(action.txHash, null);
    assert.equal(action.authorized, true, "the evidence did authorise it; only the write failed");
    assert.match(String(action.failureReason), /ProtectionPaused/);

    assert.equal(scene.swaps.at(-1)?.appliedFee, clients.config.envelope.baseFee);
  });

  test("expiry is enforced at read time, with no transaction to end it", async () => {
    // Scene B leaves the key standing down and inside its cooldown, so a fresh PROTECT has to
    // wait it out. This test owns its own state rather than inheriting the previous one's.
    const env = clients.config.envelope;
    await advanceTime(clients, env.cooldown + 10);

    const now = await chainNowSeconds(clients);
    const decision = await decideConstructedProtect(clients, scenarioB, now);
    assert.equal(decision.record.state, "PROTECT");
    // T7.1: `protectStartedAt` is stamped by the registry from the block that mines the post,
    // while `expiresAt` was computed off chain from the block read one call earlier. When a
    // wall-clock second elapses between the two, they differ by one — and every assertion below
    // must survive that. Setting T71_FORCE_SECOND_BOUNDARY=1 makes the race happen every run.
    if (process.env.T71_FORCE_SECOND_BOUNDARY === "1") {
      await new Promise((r) => setTimeout(r, 1_100));
    }
    const { post } = await signAndPostDecision(clients, decision);
    assert.ok(post.ok, `posting failed: ${JSON.stringify(post.failure)}`);

    const before = await readEffectiveState(clients);
    assert.equal(before.state, "PROTECT");
    assert.ok(before.fee > env.baseFee);
    assert.ok(before.endsAt > 0, "an active protection must publish when it ends");

    // NOTHING is sent between these two reads. Only the clock moves. That is the whole claim:
    // recovery does not depend on a keeper appearing.
    await advanceTime(clients, env.maxProtectDuration + 60);

    const after = await readEffectiveState(clients);
    assert.equal(after.state, "NORMAL", "a lapsed PROTECT must read as NORMAL");
    assert.equal(after.fee, env.baseFee);

    // History is not rewritten by a read: the stored record still says what it said.
    const stored = await readRecord(clients);
    assert.equal(stored.state, "PROTECT");
    // `endsAt` is the EARLIER of the duration cap and the assessment's own expiry — that is
    // `TinjauRiskPolicy.protectionEndsAt`'s rule, and both bounds are checked here rather than
    // assuming the cap always binds. It did not always bind: `protectStartedAt` is stamped from
    // the block that mines the post while `expiresAt` came from the block read one RPC call
    // earlier, so a wall-clock second landing between them puts the expiry one second below the
    // cap. Asserting `protectStartedAt === endsAt - maxProtectDuration` was therefore a coin
    // flip on that second, and it is the T7.1 flake (adjacent Unix seconds, ~1 run in 20).
    assert.equal(
      before.endsAt,
      Math.min(stored.protectStartedAt + env.maxProtectDuration, stored.expiresAt),
      "endsAt must be the earlier of the duration cap and the record's expiry",
    );
    // The bounded action is never longer than the cap, whichever bound binds.
    assert.ok(before.endsAt - stored.protectStartedAt <= env.maxProtectDuration);

    const swap = await executeSwap(clients);
    assert.equal(swap.appliedFee, env.baseFee, "the pool must charge baseline after expiry");
    const detail = await readFeeDetail(clients);
    assert.equal(detail.reason, "LapsedOrExpired", "the hook must say WHY it is back at baseline");
  });

  test("describeConfig exposes addresses and never a key", () => {
    const described = describeConfig(clients.config);
    const serialised = JSON.stringify(described);
    // The deployer/guardian key's first bytes. If any of them reach a serialisable surface, a
    // manifest writer could leak one by being careless, which is the failure this guards.
    assert.equal(serialised.includes("ac0974be"), false, "a private key must never be serialisable");
    assert.equal(serialised.includes("59c6995e"), false, "a private key must never be serialisable");
    assert.equal(described.accounts.assessor, clients.config.accounts.assessor.address);
    assert.equal(described.chainId, clients.config.chainId);
  });
});
