/**
 * Verifies a deployed Tinjau stack against the current source, and probes it functionally.
 *
 * Two independent questions, asked separately because they can disagree:
 *
 *   1. Is the deployed runtime bytecode this source? (`tinjauBytecodeAudit`)
 *   2. Does the deployed contract accept the CURRENT reason-code schema? Asked by `eth_call`,
 *      simulating a `postAssessment` carrying the newest reason bit. A contract built before
 *      that bit existed refuses it with `UnknownReasonBits` — which is correct fail-closed
 *      behaviour AND proof that the deployment predates the schema.
 *
 * The second question is the one that matters operationally: a stale registry does not merely
 * differ, it REJECTS assessments the current engine emits. Nothing here broadcasts.
 */

import "dotenv/config";
import { createPublicClient, defineChain, http } from "viem";

import { TINJAU_RISK_REGISTRY_ABI } from "./tinjauAbi.js";
import { ARTIFACTS, compareBytecode, type BytecodeComparison } from "./tinjauBytecodeAudit.js";
import { decodeRevert } from "./tinjauHarness.js";

const RPC = process.env.TINJAU_RPC_URL?.trim() || "https://testrpc.xlayer.tech";
const CHAIN_ID = Number(process.env.TINJAU_CHAIN_ID ?? 1952);

/** Highest defined reason bit in the current schema. Kept beside the probe that uses it. */
export const NEWEST_REASON_BIT = 1 << 22; // REASON_PERSISTENCE_UNOBSERVED

const chain = defineChain({
  id: CHAIN_ID,
  name: `chain-${CHAIN_ID}`,
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  testnet: true,
});

const client = createPublicClient({
  chain,
  transport: http(RPC, { retryCount: 5, retryDelay: 500, timeout: 30_000 }),
});

/**
 * Asks a deployed registry whether it understands a reason bit, without sending anything.
 *
 * The assessment is otherwise deliberately invalid (a zero signature), so the ONLY thing being
 * distinguished is WHICH error comes back. `postAssessment` validates reason bits before it
 * recovers a signer, so a schema-aware contract reaches the signature check and fails there,
 * while a schema-stale one stops earlier at `UnknownReasonBits`. Ordering is what makes this a
 * clean probe rather than a guess.
 */
export async function probeReasonBitSupport(
  registry: `0x${string}`,
  bit: number,
): Promise<{ understandsBit: boolean; error: string }> {
  // Timestamps must come from the CHAIN, not the local clock. `postAssessment` checks
  // `assessedAt > block.timestamp` (AssessmentFromFuture) BEFORE it validates reason bits, and
  // the public RPC lags the local clock by seconds — so a locally-stamped assessment reverts on
  // timing and never reaches the check this probe exists to make. The self-check in `main`
  // caught exactly that: every answer was "understood", including for a bit no schema defines.
  const block = await client.getBlock({ blockTag: "latest" });
  const now = block.timestamp - 300n;
  const assessment = {
    asset: (process.env.RISK_ASSET ?? "0xf07A9D89848bc694c7154Fda4cce707Eb409F903") as `0x${string}`,
    poolId: `0x${"00".repeat(31)}01` as `0x${string}`,
    state: 1,
    confidence: 3,
    dataMode: 3,
    confirmation: 4,
    reasonBits: bit,
    assessedAt: now,
    expiresAt: now + 7200n,
    evidenceCommitment: `0x${"11".repeat(32)}` as `0x${string}`,
    requestedFee: 0,
    nonce: now,
    deadline: now + 7200n,
  };

  try {
    await client.simulateContract({
      address: registry,
      abi: TINJAU_RISK_REGISTRY_ABI,
      functionName: "postAssessment",
      args: [assessment, `0x${"00".repeat(65)}`],
      account: "0x0000000000000000000000000000000000000001",
    });
    return { understandsBit: true, error: "no revert (unexpected)" };
  } catch (err) {
    const decoded = decodeRevert(err);
    // `UnknownReasonBits` means the bit is outside this deployment's REASON_ALL_DEFINED.
    return { understandsBit: decoded.errorName !== "UnknownReasonBits", error: decoded.errorName };
  }
}

export interface StackVerification {
  label: string;
  registry: `0x${string}`;
  hook: `0x${string}`;
  comparisons: BytecodeComparison[];
  reasonBitProbe: { understandsBit: boolean; error: string };
  stale: boolean;
}

export async function verifyStack(
  label: string,
  registry: `0x${string}`,
  hook: `0x${string}`,
): Promise<StackVerification> {
  const comparisons: BytecodeComparison[] = [];
  for (const [name, address, artifact] of [
    ["TinjauRiskRegistry", registry, ARTIFACTS.TinjauRiskRegistry],
    ["TinjauFeeHook", hook, ARTIFACTS.TinjauFeeHook],
  ] as const) {
    const code = await client.getCode({ address });
    comparisons.push(compareBytecode(name, address, code ?? "0x", artifact));
  }
  const reasonBitProbe = await probeReasonBitSupport(registry, NEWEST_REASON_BIT);
  const stale = comparisons.some((c) => c.verdict === "STALE") || !reasonBitProbe.understandsBit;
  return { label, registry, hook, comparisons, reasonBitProbe, stale };
}

/**
 * The deployment record, transcribed once from `contracts/broadcast/.../1952/run-*.json`.
 *
 * Only the transaction hashes are transcribed. Every address is re-read from chain and every
 * `codeSize` is measured at emit time, so the published artifact carries measurements rather
 * than a list somebody typed.
 */
export const DEPLOYMENT_RECORD = {
  "production-envelope": {
    purpose:
      "THE STACK JUDGES SHOULD READ. Inherited envelope: baseFee 500, maxFee 20000, widen 3600s, decay 18000s, cap 21600s, cooldown 3600s.",
    deployBlock: 38824844,
    registry: {
      address: "0x60062389a7AB08F0030FC06Adf9CE0C180537317",
      deployTx: "0x4fb85332f652b1fecdc7c3089afeb2f1c3ef008265001553b2ce3c8f43d9c552",
    },
    hook: {
      address: "0x1092C9fe2dB084F26aa415A0fda14B001A786080",
      deployTx: "0xaf4cfcbe9450e8c69b8199fad5c1fe93661af52e84a17baf3aeb951cb5a2f17e",
      note: "CREATE2 via the canonical factory; low 14 bits = 0x2080 = beforeInitialize|beforeSwap",
    },
    swapRouter: {
      address: "0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9",
      deployTx: "0x4e3ea8883b91bb92164e3c1243ab942aa3594009e1aecc4c1002a4ce167521a8",
    },
    liquidityRouter: {
      address: "0x1324A9A175779D53c65F9A43493CEa302cd54587",
      deployTx: "0xc657f11081aabae834b604ec791d277fbdca247ccdc76dbdb3584f2b62e9cac4",
    },
    poolId: "0x5e9eff19074225e9132eb73dc25cf0e3ff55c3fb31c9b28ab633851d2b54f730",
    demoTransactions: {
      sceneA_post: "0x69c11cf4115037431bb1330cf7cd3bd32f3339b0aee2aa392a3b86ac0a96922c",
      note: "Scenes A and F only. Scene B cannot run here: its 21600s recovery window exceeds any acceptable wall-clock wait on a chain without evm_increaseTime.",
    },
  },
  "demo-envelope": {
    purpose:
      "EXISTS ONLY BECAUSE X LAYER TESTNET HAS NO evm_increaseTime. Same envelope shape compressed 60x (widen 60s, decay 300s, cap 360s, cooldown 60s), preserving cap == widen + decay and cooldown == widen. Anything shown from it must be labelled demo timings.",
    deployBlock: 38824870,
    registry: {
      address: "0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1",
      deployTx: "0x86caff4b57a216b83e4b5d8a5c2f6ef3baf47a5431003141e77a0e287b6d8a24",
    },
    hook: {
      address: "0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080",
      deployTx: "0x8f4b736a31e1c103383a0ef9438b7393449a5085b46024d05670d133c4229aa9",
      note: "CREATE2 via the canonical factory; low 14 bits = 0x2080 = beforeInitialize|beforeSwap",
    },
    swapRouter: {
      address: "0xE76D6fC0A5235155eEb60FbBA8623465520E19dC",
      deployTx: "0x65c20374f7f86a5f967f78923d4e00569a638842fcdfc23b06cabfb85468ec0c",
    },
    liquidityRouter: {
      address: "0xefEC4A304eeaA95581B2018b50472D762eE0833c",
      deployTx: "0x4f487f18951a16e3557fa6382a5f5cfaa46779507ba7cde01ca2804ae493c2e2",
    },
    poolId: "0x3b3942b682bd59383474974127140a3f0b0c2dff946b8164341c4812985a4a8c",
    demoTransactions: {
      sceneA_post: "0x69c11cf4115037431bb1330cf7cd3bd32f3339b0aee2aa392a3b86ac0a96922c",
      sceneA_swap: "0xcdfd10400ee82305dd733b8a2c554f208e919adecc640409fcc197e6b4046b5f",
      sceneB_post: "0x659cb5553e2f53364445bdc4521dee3e87843b59d31f5861c0e196d471b3be7b",
      sceneB_swapWidened: "0x2e313c44bae3112cbb3c2430cf0e5e745327c197b54697f9f1e1ccca7df3f787",
      sceneB_swapMidDecay: "0x93ae1e2470eec2e0d42cf4a252d8ab5363636387f963e7770b132adfe7e17bab",
      sceneB_swapRecovered: "0xcf229e22b8af4b4841437d57bee33af31edb5fbebbb79178cd9d36ac8546b7c0",
      sceneB_standDown: "0x85e854b34937b7857c8f32a0e1e2e19b445b41460c75b7c867a0bb448f2cfa46",
      sceneF_pause: "0xcde601502330cd606c15395910c1c7ea9951ca88ff3b5ab0586a4eb579686d47",
      sceneF_swapAfterFailure: "0x6932b3e722ea1ec213955a189656b23408c2b6e254c82949c03eedc79a99a095",
      sceneF_unpause: "0x8065953c7c57f86b5f6709415d228c23e66fdd848019976e7ff97ccb5ed41f70",
    },
  },
} as const;

/** Reused from the historical deployment (tracker §0.16), unchanged by this work. */
export const REUSED_ADDRESSES = {
  PoolManager: "0x8F862A8b6f00C99b0610dc764228C661c4909ae1",
  mockWNVDAx: "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
  mockUSDG: "0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99",
} as const;

async function main(): Promise<void> {
  const stacks: [string, `0x${string}`, `0x${string}`][] = [
    ["production-envelope", "0x60062389a7AB08F0030FC06Adf9CE0C180537317", "0x1092C9fe2dB084F26aa415A0fda14B001A786080"],
    ["demo-envelope", "0x1a1e17306f789f5Ec7012B1E2CB866DeDB61E2b1", "0xAb448f70fE44fbbF5f41225F7797fcC7e56c2080"],
  ];
  console.log(`chain ${await client.getChainId()} via ${RPC}\n`);
  const verifications: StackVerification[] = [];

  // Self-check the probe before trusting its verdicts. Bit 30 has no meaning in any schema
  // version, so a probe that cannot report it as unknown cannot report anything as unknown,
  // and every "understands the current schema" answer below would be vacuous.
  const control = await probeReasonBitSupport(stacks[0][1], 1 << 30);
  console.log(
    `probe self-check (undefined bit 1<<30): understandsBit=${control.understandsBit} ` +
      `revert=${control.error} ${control.understandsBit ? "  <-- PROBE IS BROKEN" : "(discriminates)"}\n`,
  );

  for (const [label, registry, hook] of stacks) {
    const v = await verifyStack(label, registry, hook);
    console.log(`--- ${label}  ${v.stale ? "STALE" : "CURRENT"}`);
    for (const c of v.comparisons) {
      console.log(
        `    ${c.name.padEnd(20)} ${c.address}  size ${c.deployedSize}/${c.localSize}  ` +
          `bodyDiff=${c.bodyDifferences}  metaDiffers=${c.metadataDiffers}  ` +
          `immutables=${c.immutableSlots}  -> ${c.verdict}`,
      );
    }
    console.log(
      `    reason bit 1<<22 understood by deployed registry: ${v.reasonBitProbe.understandsBit} ` +
        `(revert: ${v.reasonBitProbe.error})\n`,
    );
    verifications.push(v);
  }

  const emitIndex = process.argv.indexOf("--emit");
  if (emitIndex >= 0) {
    const outPath = process.argv[emitIndex + 1];
    const measured: Record<string, unknown> = {};
    for (const [label, record] of Object.entries(DEPLOYMENT_RECORD)) {
      const v = verifications.find((x) => x.label === label)!;
      const roles: Record<string, unknown> = {};
      for (const role of ["registry", "hook", "swapRouter", "liquidityRouter"] as const) {
        const entry = record[role] as { address: string; deployTx: string; note?: string };
        const code = await client.getCode({ address: entry.address as `0x${string}` });
        const codeSize = code && code !== "0x" ? (code.length - 2) / 2 : 0;
        const comparison = v.comparisons.find((c) =>
          c.address.toLowerCase() === entry.address.toLowerCase(),
        );
        roles[role] = {
          ...entry,
          codeSize,
          hasBytecode: codeSize > 0,
          sourceVerification: comparison
            ? { verdict: comparison.verdict, bodyDifferences: comparison.bodyDifferences }
            : "not compared (third-party test router, deployed from v4-core unchanged)",
        };
      }
      measured[label] = {
        ...record,
        roles,
        schemaCurrent: v.reasonBitProbe.understandsBit,
        stale: v.stale,
      };
    }

    const artifact = {
      _purpose:
        "T7.2 authoritative deployed-address list for the Tinjau enforcement stack on X Layer " +
        "Testnet. Addresses are re-read and codeSize measured at emit time; only transaction " +
        "hashes are transcribed.",
      _warning:
        "BOTH POOLS ARE BUILDER-CONTROLLED TEST LIQUIDITY seeded with freely-mintable mock " +
        "tokens that have no value. They demonstrate enforcement. They are not markets, and no " +
        "figure measured on them is a market result.",
      _readStaleness:
        "X Layer's public RPC is load-balanced and serves reads from nodes at differing " +
        "heights. A read issued right after a confirmed write can return the PREVIOUS record " +
        "— for this registry that means reading NORMAL while a PROTECT is live. Measured lag " +
        "2519-2746 ms per write. Consumers should pin reads to a block number or follow the " +
        "AssessmentPosted event rather than polling currentRecord.",
      generatedAt: new Date().toISOString(),
      chainId: await client.getChainId(),
      rpc: RPC,
      reused: REUSED_ADDRESSES,
      stacks: measured,
    };
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`address book: ${outPath}`);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
