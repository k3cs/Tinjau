/**
 * Runs the T4.2–T4.5 scenes against a chain and writes a decoded evidence manifest.
 *
 * ---------------------------------------------------------------------------------------
 * THE CHAIN-AGNOSTIC CLAIM, MADE CHECKABLE. This one entry point serves both targets:
 *
 *   local  : boots an Anvil, deploys the stack, runs the scenes
 *   remote : reads RPC URL, chain id and addresses from the environment, runs the same scenes
 *
 * The scene code below the dispatch is identical in both cases. If the remote run ever needs a
 * branch of its own, the harness was not chain-agnostic and that belongs in the report rather
 * than in a patch.
 *
 * KEYS. Remote keys come from the environment and are read exactly once each, here, to derive
 * an account. They are never printed, never returned, and never written into the manifest —
 * `describeConfig` deliberately exposes addresses only, and a test asserts a key cannot appear
 * in its serialised output.
 *
 * NEVER BROADCASTS TO MAINNET. `assertTestnetOnly` refuses any chain id that is not a known
 * testnet, before a single transaction is built.
 * ---------------------------------------------------------------------------------------
 *
 * Usage:
 *   npx tsx src/chain/tinjauDemoRun.ts --local
 *   npx tsx src/chain/tinjauDemoRun.ts --remote --out <path>
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

import {
  checkBytecode,
  describeConfig,
  makeTinjauClients,
  type TinjauChainConfig,
  type TinjauClients,
} from "./tinjauChain.js";
import { startLocalStack } from "./tinjauLocalStack.js";
import { runSceneA, runSceneB, runFailedActionScene, setAssessorKey, type SceneResult } from "./tinjauScenes.js";
import { TINJAU_RISK_REGISTRY_ABI } from "./tinjauAbi.js";
import { readConsistencyLog } from "./tinjauHarness.js";
import { deriveRoleKey } from "./tinjauRoleKeys.js";
import { normalizeKey } from "./tinjauPreflight.js";

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, "..", "..");
const repoRoot = join(serverRoot, "..", "..");

/**
 * Chain ids this runner is permitted to touch.
 *
 * X Layer MAINNET is 196 and is deliberately absent. The guardrail is a positive allow-list, not
 * a mainnet deny-list: a deny-list would let an unknown chain through, and "I did not think of
 * that network" is not a safety property.
 */
const ALLOWED_CHAIN_IDS = new Set([31337, 1952]);

export function assertTestnetOnly(chainId: number): void {
  if (!ALLOWED_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `Refusing to run against chain ${chainId}. This harness is permitted on ` +
        `${[...ALLOWED_CHAIN_IDS].join(", ")} only. X Layer mainnet (196) is deliberately not ` +
        `on the list; no mainnet action is authorised for this project.`,
    );
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    // The variable NAME only, never a value or a length.
    throw new Error(`${name} is not set. It is required for a remote run and is never committed.`);
  }
  return value;
}

function remoteConfigFromEnv(): { config: TinjauChainConfig; assessorKey: `0x${string}` } {
  const chainId = Number(requiredEnv("TINJAU_CHAIN_ID"));
  assertTestnetOnly(chainId);

  const posterKey = normalizeKey(requiredEnv("POSTER_PRIVATE_KEY"), "POSTER_PRIVATE_KEY");

  // An explicit assessor key wins. Failing that, one is derived from the poster's — the
  // assessor pays no gas, so it needs no funded wallet, and deriving beats collapsing the
  // signing role onto the relaying wallet. See `tinjauRoleKeys.ts` for why this is a testnet
  // arrangement and not a production one.
  const assessorKey = process.env.TINJAU_ASSESSOR_PRIVATE_KEY?.trim()
    ? normalizeKey(process.env.TINJAU_ASSESSOR_PRIVATE_KEY, "TINJAU_ASSESSOR_PRIVATE_KEY")
    : deriveRoleKey(posterKey, "assessor");

  // The guardian must pay gas to pause, so it falls back to the poster's funded wallet rather
  // than to a derived key that could never afford to act.
  const guardianKey = process.env.GUARDIAN_PRIVATE_KEY?.trim()
    ? normalizeKey(process.env.GUARDIAN_PRIVATE_KEY, "GUARDIAN_PRIVATE_KEY")
    : posterKey;

  const config: TinjauChainConfig = {
    rpcUrl: requiredEnv("TINJAU_RPC_URL"),
    chainId,
    networkLabel: process.env.TINJAU_NETWORK_LABEL?.trim() || `chain-${chainId}`,
    addresses: {
      registry: requiredEnv("TINJAU_REGISTRY") as `0x${string}`,
      hook: requiredEnv("TINJAU_HOOK") as `0x${string}`,
      poolManager: requiredEnv("POOL_MANAGER") as `0x${string}`,
      swapRouter: requiredEnv("SWAP_ROUTER") as `0x${string}`,
      liquidityRouter: requiredEnv("LIQUIDITY_ROUTER") as `0x${string}`,
      riskAsset: requiredEnv("RISK_ASSET") as `0x${string}`,
      quoteAsset: requiredEnv("QUOTE_ASSET") as `0x${string}`,
      token0: requiredEnv("TOKEN0") as `0x${string}`,
      token1: requiredEnv("TOKEN1") as `0x${string}`,
      poolId: requiredEnv("POOL_ID") as `0x${string}`,
      tickSpacing: Number(requiredEnv("TICK_SPACING")),
    },
    // Placeholder; overwritten below by what the registry actually published. The envelope is
    // never taken on trust from the environment — a wrong value would silently mis-time every
    // advance and turn the decay scene into three readings at the same point on the curve.
    envelope: {
      baseFee: 0,
      maxFee: 0,
      widenDuration: 0,
      decayDuration: 0,
      maxProtectDuration: 0,
      cooldown: 0,
      demoEnvelope: false,
    },
    accounts: {
      assessor: privateKeyToAccount(assessorKey),
      poster: privateKeyToAccount(posterKey),
      relayer: privateKeyToAccount(
        normalizeKey(requiredEnv("DEMO_RELAYER_PRIVATE_KEY"), "DEMO_RELAYER_PRIVATE_KEY"),
      ),
      guardian: privateKeyToAccount(guardianKey),
    },
    // No public chain accepts `evm_increaseTime`. Declared, not discovered by a failed call.
    supportsTimeTravel: false,
    // Waiting out the clock is the only way to advance a public chain. Permitted here, bounded,
    // and only viable against a registry deployed with the compressed demo timings — which is
    // checked below once the envelope has been read back from the chain.
    allowWallClockWait: true,
    maxWallClockWaitSec: Number(process.env.TINJAU_MAX_WAIT_SEC ?? 900),
  };

  return { config, assessorKey };
}

/** Reads the envelope from the deployed registry, so the harness times itself against reality. */
async function loadEnvelopeFromChain(clients: TinjauClients): Promise<void> {
  const [baseFee, maxFee, widenDuration, decayDuration, maxProtectDuration, cooldown] =
    (await clients.publicClient.readContract({
      address: clients.config.addresses.registry,
      abi: TINJAU_RISK_REGISTRY_ABI,
      functionName: "envelope",
    })) as [number, number, number, number, number, number];

  const production =
    widenDuration === 3600 && decayDuration === 18_000 && maxProtectDuration === 21_600;

  clients.config.envelope = {
    baseFee: Number(baseFee),
    maxFee: Number(maxFee),
    widenDuration: Number(widenDuration),
    decayDuration: Number(decayDuration),
    maxProtectDuration: Number(maxProtectDuration),
    cooldown: Number(cooldown),
    demoEnvelope: !production,
  };
}

export interface DemoManifest {
  _purpose: string;
  _warning: string;
  generatedAt: string;
  network: ReturnType<typeof describeConfig>;
  bytecode: Awaited<ReturnType<typeof checkBytecode>>;
  addressStatus: string;
  /**
   * Measured lag between a confirmed write and that write becoming visible to a read.
   *
   * Published rather than absorbed: on a public, load-balanced RPC this is a property any
   * consumer of the risk registry inherits, and for a registry a stale read means reading
   * NORMAL while a PROTECT is live.
   */
  readConsistency: {
    maxWaitedMs: number;
    totalWaitedMs: number;
    observations: typeof readConsistencyLog;
  };
  scenes: SceneResult[];
  allPassed: boolean;
}

export async function runAllScenes(
  clients: TinjauClients,
  assessorKey: `0x${string}`,
  only?: ReadonlySet<string>,
): Promise<DemoManifest> {
  assertTestnetOnly(clients.config.chainId);
  setAssessorKey(assessorKey);
  readConsistencyLog.length = 0;

  const scenariosDir = join(serverRoot, "scenarios");
  const fixturesDir = join(serverRoot, "src", "market", "fixtures");
  const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));

  const scenarioA = readJson(join(scenariosDir, "scenario-a-rumor-watch.json"));
  const scenarioB = readJson(join(scenariosDir, "scenario-b-confirmed-protect.json"));
  const swapsA = readJson(join(fixturesDir, "pool-scenario-a-swaps.json"));
  const swapsB = readJson(join(fixturesDir, "pool-scenario-b-swaps.json"));

  const a = clients.config.addresses;
  const bytecode = await checkBytecode(clients, {
    registry: a.registry,
    hook: a.hook,
    poolManager: a.poolManager,
    swapRouter: a.swapRouter,
    liquidityRouter: a.liquidityRouter,
    riskAsset: a.riskAsset,
    quoteAsset: a.quoteAsset,
  });

  // Scene order is deliberate. A runs first, on a registry with no record at all, so its
  // baseFee result cannot be inherited from an earlier scene's leftovers.
  const scenes: SceneResult[] = [];
  const wanted = (id: string) => !only || only.has(id);
  if (wanted("A")) scenes.push(await runSceneA(clients, scenarioA, swapsA));
  // Scene B is the only one that needs to advance time. On a chain that cannot warp, it is
  // viable only against a registry deployed with the compressed demo timings; against the
  // production envelope its 21 600s window exceeds any acceptable wall-clock wait, and
  // `advanceTime` refuses rather than reporting three swaps at one instant as a decay curve.
  if (wanted("B")) scenes.push(await runSceneB(clients, scenarioB, swapsB));
  if (wanted("F")) scenes.push(await runFailedActionScene(clients, scenarioB));

  return {
    _purpose:
      "Decoded evidence for T4.2 (poster/registry/hook wiring), T4.3 (expiry and deterministic " +
      "recovery), T4.4 (rumour negative control) and T4.5 (confirmed-event path). Every fee is " +
      "the value PoolManager charged, read from its own Swap event.",
    _warning:
      "ADDRESSES HERE ARE T4.2 WORKING ADDRESSES, NOT FINAL. T7.2 re-verifies and owns the " +
      "authoritative list. The pool is BUILDER-CONTROLLED test liquidity and is not a market. " +
      "Scene B's market leg is CONSTRUCTED and must never be presented as a replay.",
    generatedAt: new Date().toISOString(),
    network: describeConfig(clients.config),
    bytecode,
    addressStatus: "T4.2 working addresses — not final; T7.2 owns the authoritative list",
    readConsistency: {
      maxWaitedMs: readConsistencyLog.reduce((m, o) => Math.max(m, o.waitedMs), 0),
      totalWaitedMs: readConsistencyLog.reduce((t, o) => t + o.waitedMs, 0),
      observations: [...readConsistencyLog],
    },
    scenes,
    allPassed: scenes.every((s) => s.passed),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args.includes("--remote") ? "remote" : "local";
  const outIndex = args.indexOf("--out");
  const defaultOut = join(
    repoRoot,
    "docs",
    "buildx-orion-2026",
    "outputs",
    "05-build",
    mode === "local" ? "t4-demo-manifest-anvil.json" : "t4-demo-manifest-xlayer-testnet.json",
  );
  const outPath = outIndex >= 0 ? args[outIndex + 1] : defaultOut;
  const scenesIndex = args.indexOf("--scenes");
  const only =
    scenesIndex >= 0
      ? new Set(args[scenesIndex + 1].split(",").map((s) => s.trim().toUpperCase()))
      : undefined;

  let stop: (() => Promise<void>) | null = null;
  let clients: TinjauClients;
  let assessorKey: `0x${string}`;

  if (mode === "local") {
    const stack = await startLocalStack({ contractsDir: join(repoRoot, "contracts") });
    stop = stack.stop;
    clients = makeTinjauClients(stack.config);
    assessorKey = stack.assessorKey;
  } else {
    const remote = remoteConfigFromEnv();
    clients = makeTinjauClients(remote.config);
    assessorKey = remote.assessorKey;
    await loadEnvelopeFromChain(clients);
  }

  try {
    const manifest = await runAllScenes(clients, assessorKey, only);
    mkdirSync(dirname(outPath), { recursive: true });
    // Decoded revert arguments arrive as bigints (`CooldownActive(uint64, uint32)`), which JSON
    // cannot represent. Rendered as decimal strings rather than dropped: the numbers in a
    // refusal are the part a reader most needs.
    const bigintSafe = (_key: string, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value;
    writeFileSync(outPath, `${JSON.stringify(manifest, bigintSafe, 2)}\n`);

    for (const scene of manifest.scenes) {
      const fees = scene.swaps.map((s) => s.appliedFee).join(" -> ");
      console.log(
        `Scene ${scene.scene}: ${scene.passed ? "PASS" : "FAIL"}  state=${scene.decisionState}  ` +
          `fees charged: ${fees}`,
      );
      for (const failure of scene.failures) console.log(`   ! ${failure}`);
    }
    console.log(`\nmanifest: ${outPath}`);
    if (!manifest.allPassed) process.exitCode = 1;
  } finally {
    if (stop) await stop();
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
