/**
 * S3.2 — the paired-pool protection experiment, executed exactly as S3.1 pre-registered it.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS IS. Two otherwise-identical builder-controlled testnet pools receive the same
 * replayed sequence of 120 real recorded trades. One is enforcing a Tinjau `PROTECT`; the other
 * has no hook at all. The question, and the ONLY question, is how much more or less of the
 * flow's notional the LP position retains in the protected pool.
 *
 * THE SPECIFICATION IS FROZEN AND IT IS NOT THIS FILE.
 * `docs/buildx-orion-2026/outputs/05-build/s3-1-paired-pool-preregistration.md` was committed
 * (7d1caa6) before any pool for this experiment existed. Every threshold, mark, band, slice
 * bound, tick range and liquidity figure below is transcribed from it. Nothing here may be
 * chosen, revised, or "clarified" after a number has been seen — §10 makes that rule void the
 * entire experiment, not just the changed value. Where following the document exactly was
 * impossible, the closest honest thing is implemented and recorded in `deviations`, which is
 * published in the artifact and in the write-up BEFORE the affected number is quoted.
 *
 * A NULL, ADVERSE, VOID OR SIGN-INDETERMINATE OUTCOME IS A SUCCESSFUL RUN. §6.3 lists what
 * would count as this experiment failing and none of those entries is a reason to change the
 * method. The band this script computes is written to the artifact and to the first paragraph
 * of the write-up whichever way it lands.
 *
 * TWO RUNS, IN ORDER. Run W is the control and it goes first, deliberately: it charges 500 on
 * both arms, so its retained-value difference must be EXACTLY ZERO in base units, and its
 * measured `|D_notional|` becomes the noise floor that run P has to clear (§6.1 guard 6,
 * §6.2's `F`). Measuring the floor before the treatment is what stops the floor being chosen
 * to fit the treatment.
 *
 * FRESH TOKENS PER RUN, AND WHY THAT IS NOT AN OPTIMISATION. `PoolKey` IS the pool's identity.
 * Reusing the deployed mocks at tick spacing 60 with this hook resolves to the already-
 * initialised, already-traded demo pool `0x5e9eff…f730`. A virgin pool per arm per run is only
 * obtainable with a virgin token pair, and a virgin (asset, poolId) key is also the only way to
 * guarantee this experiment can never write over a record that already exists.
 *
 * WHAT IT CANNOT SHOW. Everything in §8 of the pre-registration, carried here verbatim in
 * `buildLimitations()` and reproduced in the write-up. In particular: the trigger is
 * CONSTRUCTED, both pools hold valueless mock tokens and are not markets, only the fee plateau
 * is exercised, and no result from this run licenses the sentence "Tinjau reduces LP loss".
 * That sentence stays prohibited by `t0-4-benchmark-preregistration.md` §8.6 regardless of what
 * comes out of here.
 *
 * TESTNET ONLY. `assertTestnetOnly` is a positive allow-list of one — chain 1952. X Layer
 * mainnet (196) is deliberately absent and no mainnet action is authorised for this project.
 *
 * SECRETS. No key is printed, logged, or written. Error messages name environment VARIABLES,
 * never values. Before the artifact is written it is scanned against the actual secret values
 * present in `process.env`, by value and not by shape, exactly as `scenarioBBondedLive.ts`
 * does — this artifact legitimately contains hundreds of 64-hex transaction hashes and a shape
 * scan would either flag every honest run or be tuned until it flagged nothing.
 * ---------------------------------------------------------------------------------------
 *
 * CLI
 *
 *   npx tsx src/studies/pairedPoolExperiment.ts --dry-run
 *       Resolves and verifies every pinned input, reads balances, builds the frozen trade
 *       script, runs the real decision engine for BOTH runs, computes both pool ids, and
 *       exercises the §5/§6 evaluator on labelled synthetic inputs. Sends NOTHING. This is the
 *       default, because a run that deploys two tokens and sends 240 swaps is not something a
 *       script should start because nobody remembered a flag.
 *
 *   npx tsx src/studies/pairedPoolExperiment.ts --execute
 *       The real thing: run W complete, then run P.
 *
 *   --out <path>   Artifact destination.
 *   --help         Prints this and exits before any network call.
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeDeployData,
  encodeFunctionData,
  getContractAddress,
  keccak256,
  parseAbiParameters,
  type Hex,
  type PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { confirmMarket, buildConfirmationInput } from "../market/confirm.js";
import {
  XLAYER_BLOCK_TIMESTAMP_OFFSET,
  blockToUnixSeconds,
  type SwapWindowFixture,
} from "../market/poolTelemetry.js";
import { normalizeClaims } from "../evidence/normalize.js";
import { buildEvidenceGraph } from "../evidence/graph.js";
import { resolveAsset } from "../evidence/assets.js";
import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import { decide, type Decision } from "../decision/orchestrate.js";
import { runScenario, type FrozenScenario } from "../decision/scenarioRunner.js";
import type { ReasonCode } from "../risk/types.js";

import {
  chainNowSeconds,
  checkBytecode,
  makeTinjauClients,
  type TinjauChainConfig,
  type TinjauClients,
} from "../chain/tinjauChain.js";
import {
  ERC20_ABI,
  HOOK_DEGRADED_REASONS,
  POOL_MANAGER_ABI,
  POOL_SWAP_TEST_ABI,
  TINJAU_FEE_HOOK_ABI,
  TINJAU_RISK_REGISTRY_ABI,
  type HookDegradedReason,
} from "../chain/tinjauAbi.js";
import {
  DYNAMIC_FEE_FLAG,
  decodeRevert,
  readConsistencyLog,
  readRecord,
  waitForReadConsistency,
  type DecodedRevert,
  type DecodedRiskRecord,
  type PoolKeyTuple,
  type PostResult,
} from "../chain/tinjauHarness.js";
import {
  buildConstructedProtectWindow,
  setAssessorKey,
  signAndPostDecision,
  timeShiftScenario,
  timeShiftSwapWindow,
} from "../chain/tinjauScenes.js";
import { deriveRoleKey } from "../chain/tinjauRoleKeys.js";
import { normalizeKey } from "../chain/tinjauPreflight.js";
import { startLocalStack } from "../chain/tinjauLocalStack.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, "..", "..");
const repoRoot = join(serverRoot, "..", "..");
const buildOutDir = join(repoRoot, "docs", "buildx-orion-2026", "outputs", "05-build");

const SCENARIO_PATH = join(serverRoot, "scenarios", "scenario-b-confirmed-protect.json");
const SWAP_FIXTURE_PATH = join(serverRoot, "src", "market", "fixtures", "pool-scenario-b-swaps.json");
const DEPLOYED_ADDRESSES_PATH = join(buildOutDir, "frontend-handoff", "deployed-addresses.json");
const MOCK_ERC20_ARTIFACT_PATH = join(repoRoot, "contracts", "out", "MockERC20.sol", "MockERC20.json");

/**
 * Two destinations, and the reason is a deviation rather than an accident.
 *
 * §7.1 of the pre-registration names `s3-2-paired-pool-raw.json`. The S3.2 task tracker asks for
 * `data/s3_2_paired_pool_result.json`, alongside every other study's data artifact. The frozen
 * document wins on naming, so the pre-registered path is written; the tracker's path is written
 * too, with identical bytes, so neither reader has to know about the other. Recorded in
 * `deviations`.
 */
const PREREGISTERED_OUT_PATH = join(buildOutDir, "s3-2-paired-pool-raw.json");
const TRACKER_OUT_PATH = join(buildOutDir, "data", "s3_2_paired_pool_result.json");

const SCHEMA_VERSION = "tinjau.paired-pool-experiment/1.0.0";
const PRODUCED_BY = "apps/server/src/studies/pairedPoolExperiment.ts";
const PREREGISTRATION = "docs/buildx-orion-2026/outputs/05-build/s3-1-paired-pool-preregistration.md";
const PREREGISTRATION_COMMIT = "7d1caa6";

// ---------------------------------------------------------------------------
// Frozen inputs — every one of these is transcribed from the pre-registration
// ---------------------------------------------------------------------------

/**
 * Chain ids this script may touch.
 *
 * A positive allow-list of ONE. `tinjauDemoRun.ts` also allows 31337 because it can boot its own
 * Anvil; this script cannot, and an allow-list admitting a chain the script has no way to reach
 * is just an untested branch. X Layer mainnet (196) is absent and stays absent.
 */
const ALLOWED_CHAIN_IDS = new Set([1952]);

/**
 * The §10 rehearsal's allow-list, deliberately DISJOINT from the real one.
 *
 * A merged list would let a rehearsal touch the live testnet stack and a real run touch a local
 * chain, and both are ways to publish the wrong thing. Two lists mean the rehearsal can only
 * ever reach Anvil and the experiment can only ever reach 1952. X Layer mainnet (196) is on
 * neither and no mainnet action is authorised for this project.
 */
const ALLOWED_REHEARSAL_CHAIN_IDS = new Set([31337]);

export function assertTestnetOnly(chainId: number, rehearsal = false): void {
  const allowed = rehearsal ? ALLOWED_REHEARSAL_CHAIN_IDS : ALLOWED_CHAIN_IDS;
  if (!allowed.has(chainId)) {
    throw new Error(
      `Refusing to run against chain ${chainId}. This experiment is permitted on ` +
        `${[...allowed].join(", ")} only in this mode. X Layer mainnet (196) is deliberately not ` +
        `on either list; no mainnet action is authorised for this project.`,
    );
  }
}

/** §2.1 — the reused production-envelope stack, stated so a resolved address can be checked. */
const FROZEN_ADDRESSES = {
  poolManager: "0x8F862A8b6f00C99b0610dc764228C661c4909ae1",
  hook: "0x1092C9fe2dB084F26aa415A0fda14B001A786080",
  registry: "0x60062389a7AB08F0030FC06Adf9CE0C180537317",
  swapRouter: "0xe5823a180BFAcbC24Aa9a744B76f3Dfb8bbECDA9",
  liquidityRouter: "0x1324A9A175779D53c65F9A43493CEa302cd54587",
} as const;

/** §2.1 — the inherited, unmodifiable envelope. Read back from chain and compared, never assumed. */
const FROZEN_ENVELOPE = {
  baseFee: 500,
  maxFee: 20_000,
  widenDuration: 3_600,
  decayDuration: 18_000,
  maxProtectDuration: 21_600,
  cooldown: 3_600,
} as const;

/** §2.2 — the pool geometry, identical in both arms of both runs. */
const TICK_SPACING = 60;
const TICK_LOWER = -6_000;
const TICK_UPPER = 6_000;
const LIQUIDITY_DELTA = 1_000_000n * 10n ** 18n;
const POSITION_SALT = `0x${"00".repeat(32)}` as Hex;
/** Price 1.0, tick 0. */
const INITIAL_SQRT_PRICE_X96 = 79_228_162_514_264_337_593_543_950_336n;
const CONTROL_STATIC_FEE = 500;

/** §4.1 — the frozen trade-script slice. */
const SLICE_FROM_BLOCK = 68_201_457;
const N_TARGET = 120;
/** 1e12 = 10 ** ((6 + 18) / 2), the source pool's decimal midpoint. */
const L_SRC_DECIMAL_SCALE = 10n ** 12n;
/** The testnet position's human-scale liquidity: 1_000_000e18 / 1e18. */
const L_TEST_HUMAN = 10n ** 6n;

/** §6.2 — the bands. Both fractions are anchored to the deployed envelope, which predates S3.1. */
const BAND_CONFIRMS_FRACTION = 0.5;
const BAND_FLOOR_FRACTION = 0.05;
const BAND_NOISE_MULTIPLE = 3;

/** §6.1 guard 2 — the plateau budget the runner aborts against. */
const MAX_SECONDS_FROM_PROTECT_START = 3_000;

/** Wide bounds so a replayed swap is never rejected on price limits. From v4-core's own tests. */
const MIN_SQRT_PRICE_LIMIT = 4_295_128_739n + 1n;
const MAX_SQRT_PRICE_LIMIT =
  1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_342n - 1n;

/** Freely mintable, valueless. Generous so no arm can ever run short mid-replay. */
const MINT_AMOUNT = 10_000_000n * 10n ** 18n;

// ---------------------------------------------------------------------------
// ABI fragments this experiment needs and the shared harness does not carry
// ---------------------------------------------------------------------------

const POOL_KEY_COMPONENTS = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

/** §9 item 3 and 5: pool creation and state reads from TypeScript. Nothing in the tree does this. */
const POOL_MANAGER_EXTRA_ABI = [
  {
    type: "function",
    name: "initialize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "key", type: "tuple", components: POOL_KEY_COMPONENTS },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
  },
  {
    type: "function",
    name: "extsload",
    stateMutability: "view",
    inputs: [
      { name: "startSlot", type: "bytes32" },
      { name: "nSlots", type: "uint256" },
    ],
    outputs: [{ name: "values", type: "bytes32[]" }],
  },
] as const;

/** §9 item 4: liquidity add and full withdraw. */
const POOL_MODIFY_LIQUIDITY_TEST_ABI = [
  {
    type: "function",
    name: "modifyLiquidity",
    stateMutability: "payable",
    inputs: [
      { name: "key", type: "tuple", components: POOL_KEY_COMPONENTS },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
  },
] as const;

const MOCK_ERC20_CONSTRUCTOR_ABI = [
  {
    type: "constructor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
      { name: "_decimals", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  ...ERC20_ABI,
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArmId = "C" | "H";
type RunId = "W" | "P";

/**
 * The three things this script can be asked to do.
 *
 * `ANVIL_REHEARSAL` is the dry run §10 explicitly permits and encourages. Its numbers are
 * labelled and are NEVER reported as the result: it exists to prove the plumbing before a
 * 25-minute testnet replay, not to substitute for one.
 */
type RunMode = "DRY_RUN" | "ANVIL_REHEARSAL" | "EXECUTED";

/** §4.1 — one row of the frozen trade script, emitted before the first swap is sent. */
export interface TradeStep {
  index: number;
  sourceBlockNumber: number;
  sourceLogIndex: number;
  sourceAmount0: string;
  sourceAmount1: string;
  sourceLiquidity: string;
  side: "SELL_QUOTE" | "SELL_RISK";
  /** Human-scale input on the SOURCE pool, before scaling. Decimal string, for the record only. */
  inHuman: string;
  /** The exact base-unit input sent to both arms. Both mocks are 18 decimals. */
  amountInRaw: string;
}

export interface DroppedRow {
  sourceIndexInSlice: number;
  sourceBlockNumber: number;
  sourceLogIndex: number;
  reason: "AMBIGUOUS_OR_ZERO_DELTA" | "SCALED_TO_ZERO";
  sourceAmount0: string;
  sourceAmount1: string;
}

export interface TradeScript {
  sliceFromBlock: number;
  sliceRowsAvailable: number;
  nRequested: number;
  nUsed: number;
  firstRowLiquidity: string;
  /** `K` as the pre-registration defines it, rendered for a human reader. */
  kDecimal: string;
  /**
   * `K` materialised exactly. §4.1 writes `K = L_test_human / L_src_human`; since
   * `L_src_human = liquidity / 1e12` and `L_test_human = 1e6`, that is exactly `1e18 / liquidity`.
   * Applied as integer arithmetic so `amtRaw` carries no floating-point noise in its low digits.
   */
  kExactNumerator: string;
  kExactDenominator: string;
  sourceLiquidityMin: string;
  sourceLiquidityMax: string;
  firstSourceBlock: number;
  lastSourceBlock: number;
  steps: TradeStep[];
  dropped: DroppedRow[];
}

export interface SwapRow {
  run: RunId;
  arm: ArmId;
  index: number;
  side: TradeStep["side"];
  zeroForOne: boolean;
  requestedAmountInRaw: string;
  realisedAmountInRaw: string | null;
  amount0: string | null;
  amount1: string | null;
  /** What PoolManager charged, from its own `Swap` event. Never the hook's preview. */
  appliedFee: number | null;
  /** What the hook said it would charge, read immediately before. `null` on the hookless arm. */
  previewedFee: number | null;
  previewedReason: HookDegradedReason | null;
  tick: number | null;
  sqrtPriceX96: string | null;
  poolLiquidity: string | null;
  blockNumber: number | null;
  atUnixSeconds: number;
  txHash: `0x${string}` | null;
  gasUsed: string | null;
  ok: boolean;
  failure: DecodedRevert | null;
}

export interface PoolStateReading {
  /** "PINNED_BLOCK" whenever the caller knew the block this state belongs to. */
  readMethod: "PINNED_BLOCK" | "LATEST";
  sqrtPriceX96: string;
  tick: number;
  protocolFee: number;
  lpFee: number;
  poolLiquidity: string;
  positionLiquidity: string;
  atUnixSeconds: number;
  atBlockNumber: number;
}

export interface ArmRecord {
  arm: ArmId;
  poolKey: PoolKeyTuple;
  poolId: `0x${string}`;
  initializeTxHash: `0x${string}` | null;
  addLiquidityTxHash: `0x${string}` | null;
  withdrawTxHash: `0x${string}` | null;
  stateBeforeReplay: PoolStateReading | null;
  stateAfterReplay: PoolStateReading | null;
  /**
   * LP balances either side of the full burn, and the deltas they imply.
   *
   * Both readings are PINNED to block numbers around the withdrawal transaction, never taken at
   * the RPC's default "latest". See `withdrawFully` for why that is not a refinement but the
   * only way this venue's numbers mean anything.
   */
  withdrawal: {
    withdrawBlockNumber: number;
    readMethod: "PINNED_BLOCK" | "READ_CONSISTENCY_FALLBACK";
    balance0Before: string;
    balance1Before: string;
    balance0After: string;
    balance1After: string;
    w0: string;
    w1: string;
    wQuote: string;
    wRisk: string;
    /** Must read 0 after a full burn. A non-zero value means the read did not see the burn. */
    positionLiquidityAfterWithdraw: string;
    /**
     * The same two balances read at "latest" immediately either side of the call, exactly as a
     * naive implementation would. Published beside the pinned figures as measured evidence of
     * this RPC's read lag, not used in any metric.
     */
    unpinnedLatest: { balance0Before: string; balance1Before: string; balance0After: string; balance1After: string };
  } | null;
}

/** §5.2 — a valuation mark, carried as an exact rational so nothing is lost to floats. */
export interface Mark {
  id: "PRIMARY" | "S1" | "S2";
  label: string;
  /** Quote per risk, exact. */
  numerator: string;
  denominator: string;
  decimal: string;
}

export interface MarkedResult {
  markId: Mark["id"];
  retainedC: string;
  retainedH: string;
  retainedDelta: string;
  cumulativeNotional: string;
  dNotionalBps: number;
  dLpBps: number;
  sign: -1 | 0 | 1;
}

export interface ValidityGate {
  id: string;
  clause: string;
  requirement: string;
  passed: boolean;
  detail: string;
}

export interface RunRecord {
  run: RunId;
  label: string;
  purpose: string;
  marketLeg: "REPLAYED_CANONICAL" | "CONSTRUCTED";
  riskAsset: `0x${string}` | null;
  quoteAsset: `0x${string}` | null;
  currency0: `0x${string}` | null;
  currency1: `0x${string}` | null;
  quoteIsCurrency0: boolean | null;
  tokenDeployTxHashes: `0x${string}`[];
  setAssetSupportedTxHash: `0x${string}` | null;
  fundingTxHashes: `0x${string}`[];
  arms: { C: ArmRecord; H: ArmRecord } | null;
  decision: {
    state: string;
    reasonCodes: ReasonCode[];
    confidenceBand: string;
    confirmation: string;
    requestedFee: string | null;
    humanExplanation: string;
    timeShiftSeconds: number;
    shiftPreservedOutcome: boolean | null;
    canonicalState: string | null;
    canonicalReasonCodes: ReasonCode[] | null;
    reasonCodeDiff: { onlyInCanonical: string[]; onlyInConstructed: string[] } | null;
  } | null;
  post: PostResult | null;
  keyWasEmptyBeforePost: boolean | null;
  recordBeforeReplay: DecodedRiskRecord | null;
  recordAfterReplay: DecodedRiskRecord | null;
  protectStartedAt: number | null;
  firstSwapAtUnixSeconds: number | null;
  lastSwapAtUnixSeconds: number | null;
  swaps: SwapRow[];
  marks: Mark[];
  results: MarkedResult[];
  /** Realised fee differential in bps, from what the pools charged. §5.3. */
  deltaFeeBarBps: number | null;
  feeIncomeReconciliation: { arm: ArmId; derivedFeeIncome: string }[];
  gates: ValidityGate[];
  void: boolean;
  voidReasons: string[];
  aborted: boolean;
  abortReason: string | null;
  gasUsedWei: string;
  gasUsedUnits: string;
}

export interface Deviation {
  clause: string;
  what: string;
  why: string;
  effectOnBands: string;
}

export interface PairedPoolArtifact {
  schemaVersion: string;
  producedBy: string;
  preRegistration: string;
  preRegistrationCommit: string;
  runAtUtc: string;
  mode: RunMode;
  standingLabel: string;

  network: {
    chainId: number;
    networkLabel: string;
    rpcUrl: string;
    addresses: typeof FROZEN_ADDRESSES;
    addressesMatchPreRegistration: boolean;
    envelopeReadFromChain: Record<keyof typeof FROZEN_ENVELOPE, number>;
    envelopeMatchesPreRegistration: boolean;
    registryPaused: boolean | null;
    bytecode: Awaited<ReturnType<typeof checkBytecode>> | null;
    publishedPoolIds: string[];
  };
  accounts: { lp: `0x${string}`; swapper: `0x${string}`; assessor: `0x${string}`; guardian: `0x${string}` };
  balances: {
    label: string;
    lpWei: string;
    swapperWei: string;
    atStage: "BEFORE" | "AFTER";
  }[];

  tradeScript: TradeScript;
  runs: RunRecord[];

  outcome: {
    runW: string;
    runP: string;
    band: string;
    bandBasis: string;
    signHeldAcrossMarks: boolean | null;
    noiseFloorBps: number | null;
    floorF: number | null;
    deltaFeeBarBps: number | null;
    dNotionalPrimaryBps: number | null;
  };

  dryRunEvaluatorSelfCheck: unknown;
  /** Executions of this experiment that were attempted and did not produce a usable measurement. */
  priorAttempts: { label: string; whatHappened: string; whereItIs: string; theSingleFix: string }[];
  corrections: { foundBy: string; whatWasWrong: string; whatChanged: string; whatDidNotChange: string }[];
  deviations: Deviation[];
  readConsistency: { maxWaitedMs: number; totalWaitedMs: number; observations: typeof readConsistencyLog };
  claimGate: string;
  limitations: string[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function bigintSafe(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Round-half-up integer division for a non-negative numerator. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

/** Renders a rational as a decimal string with `places` digits. Reporting only. */
function ratioToDecimal(numerator: bigint, denominator: bigint, places = 12): string {
  if (denominator === 0n) return "NaN";
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const scale = 10n ** BigInt(places);
  const scaled = (n * scale) / d;
  const whole = scaled / scale;
  const frac = (scaled % scale).toString().padStart(places, "0");
  return `${negative && scaled !== 0n ? "-" : ""}${whole}.${frac}`;
}

/** A rational to a JS number, via a 30-digit intermediate so huge base-unit counts survive. */
function ratioToNumber(numerator: bigint, denominator: bigint): number {
  return Number(ratioToDecimal(numerator, denominator, 18));
}

/**
 * Refuses to write anything that contains a live secret.
 *
 * Scans BY VALUE against what is actually in the environment, not by hex shape. This artifact
 * legitimately contains several hundred 64-hex transaction hashes and a 32-byte evidence
 * commitment; a shape scan would either flag every honest run or be tuned until it flagged
 * nothing, and both are worse than no scan. The message names the variable, never the value.
 */
function assertNoSecretsInSerialized(serialized: string, extraSecrets: string[] = []): void {
  const envNames = [
    "POSTER_PRIVATE_KEY",
    "DEMO_RELAYER_PRIVATE_KEY",
    "TINJAU_ASSESSOR_PRIVATE_KEY",
    "GUARDIAN_PRIVATE_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
  ];
  const haystack = serialized.toLowerCase();
  const variants = (raw: string): string[] => {
    const v = raw.trim();
    const out = new Set<string>([v, v.toLowerCase()]);
    if (v.startsWith("0x")) out.add(v.slice(2).toLowerCase());
    else out.add(`0x${v}`.toLowerCase());
    return [...out];
  };

  for (const name of envNames) {
    const value = process.env[name]?.trim();
    if (!value || value.length < 8) continue;
    for (const candidate of variants(value)) {
      if (haystack.includes(candidate.toLowerCase())) {
        throw new Error(
          `Refusing to write the artifact: it contains the value of ${name}. Nothing was ` +
            `written. This is a bug in this script, not in your environment.`,
        );
      }
    }
  }
  for (const secret of extraSecrets) {
    if (!secret || secret.length < 8) continue;
    for (const candidate of variants(secret)) {
      if (haystack.includes(candidate.toLowerCase())) {
        throw new Error(
          "Refusing to write the artifact: it contains a derived signing key. Nothing was " +
            "written. This is a bug in this script.",
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pool key, pool id, and StateLibrary reads
// ---------------------------------------------------------------------------

/** `PoolIdLibrary.toId` is `keccak256(abi.encode(poolKey))`. Computed, never transcribed. */
export function poolIdOf(key: PoolKeyTuple): `0x${string}` {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("address, address, uint24, int24, address"), [
      key.currency0,
      key.currency1,
      key.fee,
      key.tickSpacing,
      key.hooks,
    ]),
  );
}

/** `StateLibrary.POOLS_SLOT` is 6, and the state slot is `keccak256(poolId . 6)`. */
function poolStateSlot(poolId: `0x${string}`): bigint {
  const packed = `${poolId}${(6n).toString(16).padStart(64, "0")}` as Hex;
  return BigInt(keccak256(packed));
}

function toBytes32(value: bigint): Hex {
  return `0x${value.toString(16).padStart(64, "0")}` as Hex;
}

/**
 * `Position.calculatePositionKey` — `keccak256(owner . tickLower . tickUpper . salt)`, packed,
 * 58 bytes. Written out rather than approximated: an off-by-one in the packing would silently
 * read position liquidity of zero and the "both pools identical before replay" gate would pass
 * for the wrong reason.
 */
function positionKeyOf(owner: `0x${string}`, tickLower: number, tickUpper: number, salt: Hex): Hex {
  const int24Hex = (v: number) => (v < 0 ? BigInt(v) + (1n << 24n) : BigInt(v)).toString(16).padStart(6, "0");
  const packed =
    `0x${owner.slice(2).toLowerCase()}${int24Hex(tickLower)}${int24Hex(tickUpper)}${salt.slice(2)}` as Hex;
  return keccak256(packed);
}

/**
 * Issues a read pinned to a block, waiting out any node that has not reached that block yet.
 *
 * PINNING ALONE IS NOT ENOUGH ON THIS VENUE, AND THE SECOND TESTNET ATTEMPT PROVED IT. Asking a
 * load-balanced RPC for state at block N right after a transaction confirmed in block N lands
 * on whichever node answers, and if that node is behind it does not return a stale answer — it
 * returns `block is out of range` and the read throws. That is strictly better than the silent
 * staleness that voided attempt 1, because it is loud, but it still has to be handled: the only
 * correct response is to wait for a node that has the block, never to fall back to "latest" and
 * never to accept an earlier block's answer.
 *
 * So: pin, and retry while the error says the block is not there yet. Anything else that throws
 * is a real failure and propagates immediately.
 */
async function pinnedRead<T>(read: () => Promise<T>, label: string, timeoutMs = 90_000): Promise<T> {
  const startedAt = Date.now();
  let attempts = 0;
  for (;;) {
    try {
      attempts++;
      const value = await read();
      readConsistencyLog.push({
        label: `pinnedRead ${label}`,
        waitedMs: Date.now() - startedAt,
        attempts,
        converged: true,
      });
      return value;
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
      const nodeIsBehind =
        message.includes("out of range") ||
        message.includes("header not found") ||
        message.includes("block not found") ||
        message.includes("missing trie node") ||
        message.includes("unknown block");
      if (!nodeIsBehind || Date.now() - startedAt >= timeoutMs) {
        readConsistencyLog.push({
          label: `pinnedRead ${label}`,
          waitedMs: Date.now() - startedAt,
          attempts,
          converged: false,
        });
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
}

/**
 * Reads a pool's slot0, liquidity and position liquidity.
 *
 * PINNED, NEVER "LATEST", WHENEVER THE CALLER KNOWS THE BLOCK. X Layer's public RPC is
 * load-balanced and serves reads from nodes at different heights — `deployed-addresses.json`
 * records a measured 2,519-2,746 ms convergence lag and `known-limitations.md` §1 calls it the
 * most important operational fact about this venue. An unpinned read issued right after a
 * confirmed transaction can therefore return the state BEFORE it. For a terminal price that sets
 * the primary valuation mark, being one swap behind is not a rounding error, it is the wrong
 * number. Pinning to a block number asks a specific block's state and cannot be answered by a
 * node that is behind.
 */
async function readPoolState(
  clients: TinjauClients,
  poolManager: `0x${string}`,
  poolId: `0x${string}`,
  positionOwner: `0x${string}`,
  atBlock?: bigint,
): Promise<PoolStateReading> {
  const stateSlot = poolStateSlot(poolId);
  const pin = atBlock === undefined ? {} : { blockNumber: atBlock };

  // slot0 and, three words later, `uint128 liquidity`. Read in one call so the two cannot come
  // from different block heights on a load-balanced RPC.
  const head = (await pinnedRead(
    () =>
      clients.publicClient.readContract({
        address: poolManager,
        abi: POOL_MANAGER_EXTRA_ABI,
        functionName: "extsload",
        args: [toBytes32(stateSlot), 4n],
        ...pin,
      }),
    `slot0 ${poolId.slice(0, 10)} @${atBlock ?? "latest"}`,
  )) as readonly Hex[];

  const slot0 = BigInt(head[0]);
  const sqrtPriceX96 = slot0 & ((1n << 160n) - 1n);
  const tickRaw = (slot0 >> 160n) & 0xffffffn;
  const tick = Number(tickRaw >= 1n << 23n ? tickRaw - (1n << 24n) : tickRaw);
  const protocolFee = Number((slot0 >> 184n) & 0xffffffn);
  const lpFee = Number((slot0 >> 208n) & 0xffffffn);
  const poolLiquidity = BigInt(head[3]) & ((1n << 128n) - 1n);

  const positionSlot = keccak256(
    `0x${positionKeyOf(positionOwner, TICK_LOWER, TICK_UPPER, POSITION_SALT).slice(2)}${toBytes32(
      stateSlot + 6n,
    ).slice(2)}` as Hex,
  );
  const positionWords = (await pinnedRead(
    () =>
      clients.publicClient.readContract({
        address: poolManager,
        abi: POOL_MANAGER_EXTRA_ABI,
        functionName: "extsload",
        args: [positionSlot, 1n],
        ...pin,
      }),
    `position ${poolId.slice(0, 10)} @${atBlock ?? "latest"}`,
  )) as readonly Hex[];

  const block =
    atBlock === undefined
      ? await clients.publicClient.getBlock({ blockTag: "latest" })
      : await pinnedRead(
          () => clients.publicClient.getBlock({ blockNumber: atBlock }),
          `block ${atBlock}`,
        );

  return {
    readMethod: atBlock === undefined ? "LATEST" : "PINNED_BLOCK",
    sqrtPriceX96: sqrtPriceX96.toString(),
    tick,
    protocolFee,
    lpFee,
    poolLiquidity: poolLiquidity.toString(),
    positionLiquidity: (BigInt(positionWords[0]) & ((1n << 128n) - 1n)).toString(),
    atUnixSeconds: Number(block.timestamp),
    atBlockNumber: Number(block.number),
  };
}

// ---------------------------------------------------------------------------
// §4.1 — the frozen trade script
// ---------------------------------------------------------------------------

/**
 * Builds the trade script exactly as §4.1 specifies, with `K` applied as exact integer
 * arithmetic.
 *
 * §4.1 writes `K = L_test_human / L_src_human` with `L_src_human = liquidity / 1e12` and
 * `L_test_human = 1e6`, so `K = 1e18 / liquidity`. Composing that with the per-row conversions
 * gives two closed forms with no floating point anywhere:
 *
 *   SELL_QUOTE:  amtRaw = round( amount0 * 1e30 / L_first )     # amount0 is 6-dec
 *   SELL_RISK:   amtRaw = round( amount1 * 1e18 / L_first )     # amount1 is 18-dec
 *
 * The decimal value of `K` is published alongside so the formula in the document and the
 * arithmetic in this function can be checked against each other by eye.
 */
export function buildTradeScript(fixture: SwapWindowFixture, nRequested = N_TARGET): TradeScript {
  const rows = (fixture.swaps as unknown as (string | number)[][]).filter(
    (r) => Number(r[0]) >= SLICE_FROM_BLOCK,
  );
  const taken = rows.slice(0, nRequested);
  if (taken.length === 0) {
    throw new Error(
      `No fixture rows at or after block ${SLICE_FROM_BLOCK}. The frozen slice is empty; this ` +
        `is a defect in the fixture path, not a result.`,
    );
  }

  const lFirst = BigInt(taken[0][5] as string);
  const steps: TradeStep[] = [];
  const dropped: DroppedRow[] = [];
  let liquidityMin = lFirst;
  let liquidityMax = lFirst;

  for (let i = 0; i < taken.length; i++) {
    const row = taken[i];
    const blockNumber = Number(row[0]);
    const logIndex = Number(row[1]);
    const a0 = BigInt(row[2] as string);
    const a1 = BigInt(row[3] as string);
    const liquidity = BigInt(row[5] as string);
    if (liquidity < liquidityMin) liquidityMin = liquidity;
    if (liquidity > liquidityMax) liquidityMax = liquidity;

    // §4.1: a zero quote delta, or two deltas with the same sign, is not a directional swap this
    // script can replay. Dropped, and the drop is published.
    if (a0 === 0n || a0 > 0n === a1 > 0n) {
      dropped.push({
        sourceIndexInSlice: i,
        sourceBlockNumber: blockNumber,
        sourceLogIndex: logIndex,
        reason: "AMBIGUOUS_OR_ZERO_DELTA",
        sourceAmount0: a0.toString(),
        sourceAmount1: a1.toString(),
      });
      continue;
    }

    // §4.1's own table: `amount0 > 0 -> inHuman = amount0 / 1e6`, `amount0 < 0 -> inHuman =
    // amount1 / 1e18`. Both are POSITIVE by construction, because the two pool-side deltas always
    // carry opposite signs and the input side is whichever one entered the pool. Negating either
    // would turn `amountSpecified = -amountIn` into an EXACT-OUTPUT swap, which is a different
    // trade entirely and would break gate 4 on every SELL_RISK row.
    const side: TradeStep["side"] = a0 > 0n ? "SELL_QUOTE" : "SELL_RISK";
    const amountInRaw =
      side === "SELL_QUOTE"
        ? divRound(a0 * 10n ** 30n, lFirst)
        : divRound(a1 * 10n ** 18n, lFirst);
    const inHuman =
      side === "SELL_QUOTE" ? ratioToDecimal(a0, 10n ** 6n, 6) : ratioToDecimal(a1, 10n ** 18n, 18);

    if (amountInRaw === 0n) {
      dropped.push({
        sourceIndexInSlice: i,
        sourceBlockNumber: blockNumber,
        sourceLogIndex: logIndex,
        reason: "SCALED_TO_ZERO",
        sourceAmount0: a0.toString(),
        sourceAmount1: a1.toString(),
      });
      continue;
    }

    steps.push({
      index: steps.length,
      sourceBlockNumber: blockNumber,
      sourceLogIndex: logIndex,
      sourceAmount0: a0.toString(),
      sourceAmount1: a1.toString(),
      sourceLiquidity: liquidity.toString(),
      side,
      inHuman,
      amountInRaw: amountInRaw.toString(),
    });
  }

  return {
    sliceFromBlock: SLICE_FROM_BLOCK,
    sliceRowsAvailable: rows.length,
    nRequested,
    nUsed: steps.length,
    firstRowLiquidity: lFirst.toString(),
    kDecimal: ratioToDecimal(L_TEST_HUMAN * L_SRC_DECIMAL_SCALE, lFirst, 12),
    kExactNumerator: (L_TEST_HUMAN * L_SRC_DECIMAL_SCALE).toString(),
    kExactDenominator: lFirst.toString(),
    sourceLiquidityMin: liquidityMin.toString(),
    sourceLiquidityMax: liquidityMax.toString(),
    firstSourceBlock: Number(taken[0][0]),
    lastSourceBlock: Number(taken[taken.length - 1][0]),
    steps,
    dropped,
  };
}

// ---------------------------------------------------------------------------
// §5 / §6 — metrics, marks and bands, as pure functions
// ---------------------------------------------------------------------------

export interface MarkInputs {
  quoteIsCurrency0: boolean;
  /** Arm C terminal sqrtPriceX96, read before any withdrawal. */
  terminalSqrtC: bigint;
  /** Arm H terminal sqrtPriceX96, read before any withdrawal. */
  terminalSqrtH: bigint;
}

/**
 * The three marks of §5.2, all computed, all published, none selected after the fact.
 *
 * `sqrtPriceX96` encodes `currency1 per currency0`. Quote-per-risk is therefore `1/P` when the
 * quote is currency0 and `P` when it is currency1 — derived from the run's own address sort and
 * never hardcoded, because fresh token addresses sort unpredictably.
 */
export function buildMarks(inputs: MarkInputs): Mark[] {
  const q96Sq = 1n << 192n;
  const quotePerRisk = (sqrt: bigint): { n: bigint; d: bigint } =>
    inputs.quoteIsCurrency0 ? { n: q96Sq, d: sqrt * sqrt } : { n: sqrt * sqrt, d: q96Sq };

  const primary = quotePerRisk(inputs.terminalSqrtC);
  const s2 = quotePerRisk(inputs.terminalSqrtH);

  return [
    {
      id: "PRIMARY",
      label: "arm C terminal price — the unmitigated flow's own answer",
      numerator: primary.n.toString(),
      denominator: primary.d.toString(),
      decimal: ratioToDecimal(primary.n, primary.d, 12),
    },
    {
      id: "S1",
      label: "initial price 1.0 — the conservative floor framing",
      numerator: "1",
      denominator: "1",
      decimal: "1.000000000000",
    },
    {
      id: "S2",
      label: "arm H terminal price — the framing that flatters Tinjau",
      numerator: s2.n.toString(),
      denominator: s2.d.toString(),
      decimal: ratioToDecimal(s2.n, s2.d, 12),
    },
  ];
}

export interface MetricInputs {
  wQuoteC: bigint;
  wRiskC: bigint;
  wQuoteH: bigint;
  wRiskH: bigint;
  /** Executed inputs, per step, with the side they were sent on. */
  executed: { side: TradeStep["side"]; amountIn: bigint }[];
}

/** §5.3 — the decision quantity, evaluated under one mark. All arithmetic exact until the last step. */
export function evaluateUnderMark(metrics: MetricInputs, mark: Mark): MarkedResult {
  const n = BigInt(mark.numerator);
  const d = BigInt(mark.denominator);

  // retained(arm) = Wq + Wr * P_ref, carried as a numerator over the common denominator `d`.
  const retainedCNum = metrics.wQuoteC * d + metrics.wRiskC * n;
  const retainedHNum = metrics.wQuoteH * d + metrics.wRiskH * n;
  const retainedDeltaNum = retainedHNum - retainedCNum;

  let quoteIn = 0n;
  let riskIn = 0n;
  for (const step of metrics.executed) {
    if (step.side === "SELL_QUOTE") quoteIn += step.amountIn;
    else riskIn += step.amountIn;
  }
  const cumulativeNotionalNum = quoteIn * d + riskIn * n;

  const dNotionalBps =
    cumulativeNotionalNum === 0n ? 0 : ratioToNumber(10_000n * retainedDeltaNum, cumulativeNotionalNum);
  const dLpBps = retainedCNum === 0n ? 0 : ratioToNumber(10_000n * retainedDeltaNum, retainedCNum);

  return {
    markId: mark.id,
    retainedC: ratioToDecimal(retainedCNum, d, 6),
    retainedH: ratioToDecimal(retainedHNum, d, 6),
    retainedDelta: ratioToDecimal(retainedDeltaNum, d, 6),
    cumulativeNotional: ratioToDecimal(cumulativeNotionalNum, d, 6),
    dNotionalBps,
    dLpBps,
    sign: retainedDeltaNum > 0n ? 1 : retainedDeltaNum < 0n ? -1 : 0,
  };
}

/** §5.3 — the realised fee differential, from the fees the pools actually charged. */
export function realisedFeeDifferentialBps(swaps: SwapRow[]): number | null {
  let weighted = 0n;
  let total = 0n;
  const byIndex = new Map<number, { c?: SwapRow; h?: SwapRow }>();
  for (const s of swaps) {
    const slot = byIndex.get(s.index) ?? {};
    if (s.arm === "C") slot.c = s;
    else slot.h = s;
    byIndex.set(s.index, slot);
  }
  for (const { c, h } of byIndex.values()) {
    if (!c || !h || c.appliedFee === null || h.appliedFee === null) continue;
    const amountIn = BigInt(c.requestedAmountInRaw);
    weighted += BigInt(h.appliedFee - c.appliedFee) * amountIn;
    total += amountIn;
  }
  if (total === 0n) return null;
  // Fees are in pips (1e-6). Dividing by 100 converts a pip differential to basis points.
  return ratioToNumber(weighted, total) / 100;
}

export type OutcomeBand = "CONFIRMS" | "WEAK" | "NULL" | "ADVERSE" | "SIGN-INDETERMINATE" | "VOID";

/** §6.2 — the bands, evaluated in the order the document fixes them. */
export function classify(
  results: MarkedResult[],
  deltaFeeBarBps: number,
  noiseFloorBps: number,
): { band: OutcomeBand; floorF: number; signHeld: boolean; d: number } {
  const primary = results.find((r) => r.markId === "PRIMARY");
  if (!primary) throw new Error("No primary-mark result. §5.2's primary mark is not optional.");
  const d = primary.dNotionalBps;
  const floorF = Math.max(
    BAND_FLOOR_FRACTION * deltaFeeBarBps,
    BAND_NOISE_MULTIPLE * Math.abs(noiseFloorBps),
  );

  const signs = new Set(results.map((r) => Math.sign(r.dNotionalBps)));
  const signHeld = signs.size === 1;
  if (!signHeld) return { band: "SIGN-INDETERMINATE", floorF, signHeld, d };

  if (d >= BAND_CONFIRMS_FRACTION * deltaFeeBarBps && d >= floorF) {
    return { band: "CONFIRMS", floorF, signHeld, d };
  }
  if (d >= floorF && d < BAND_CONFIRMS_FRACTION * deltaFeeBarBps) {
    return { band: "WEAK", floorF, signHeld, d };
  }
  if (d <= -floorF) return { band: "ADVERSE", floorF, signHeld, d };
  return { band: "NULL", floorF, signHeld, d };
}

// ---------------------------------------------------------------------------
// Address resolution — read from the published list, checked against §2.1
// ---------------------------------------------------------------------------

interface DeployedStack {
  stackId: string;
  poolId: `0x${string}`;
  tickSpacing: number;
  contracts: { role: string; address: `0x${string}` }[];
}
interface DeployedAddressesFile {
  network: { chainId: number; rpc: string; name: string };
  stacks: DeployedStack[];
}

interface ResolvedTarget {
  chainId: number;
  rpcUrl: string;
  networkLabel: string;
  registry: `0x${string}`;
  hook: `0x${string}`;
  poolManager: `0x${string}`;
  swapRouter: `0x${string}`;
  liquidityRouter: `0x${string}`;
  publishedPoolIds: string[];
  addressesMatchPreRegistration: boolean;
}

/**
 * Resolves the production-envelope stack.
 *
 * §9 says the script reads the same `TINJAU_*` variables `tinjauDemoRun.ts --remote` reads.
 * None of them is set in this environment, so the published, T7.2-verified address list is used
 * instead — the same source `scenarioBBondedLive.ts` uses, and the file the pre-registration's
 * own §2.1 table was transcribed FROM. Every resolved address is then compared against that
 * table, and a mismatch is recorded rather than silently accepted. Environment overrides remain
 * for the case where the file is genuinely wrong. Recorded in `deviations`.
 */
function resolveTarget(): ResolvedTarget {
  const file = readJson<DeployedAddressesFile>(DEPLOYED_ADDRESSES_PATH);
  const stack = file.stacks.find((s) => s.stackId === "production-envelope");
  if (!stack) {
    throw new Error(
      `No "production-envelope" stack in ${DEPLOYED_ADDRESSES_PATH}. §2.1 pins the experiment ` +
        `to that stack; this script will not guess which of the published stacks it meant.`,
    );
  }
  const addressFor = (role: string): `0x${string}` => {
    const found = stack.contracts.find((c) => c.role === role || c.role.startsWith(role));
    if (!found) {
      throw new Error(
        `Stack "production-envelope" has no contract with role "${role}". The address list ` +
          `changed shape; this script will not substitute a default.`,
      );
    }
    return found.address;
  };

  const chainId = Number(process.env.TINJAU_CHAIN_ID ?? file.network.chainId);
  assertTestnetOnly(chainId);

  const resolved = {
    registry: (process.env.TINJAU_REGISTRY?.trim() as `0x${string}`) || addressFor("TinjauRiskRegistry"),
    hook: (process.env.TINJAU_HOOK?.trim() as `0x${string}`) || addressFor("TinjauFeeHook"),
    poolManager: (process.env.POOL_MANAGER?.trim() as `0x${string}`) || addressFor("PoolManager"),
    swapRouter: (process.env.SWAP_ROUTER?.trim() as `0x${string}`) || addressFor("swap router"),
    liquidityRouter:
      (process.env.LIQUIDITY_ROUTER?.trim() as `0x${string}`) || addressFor("liquidity router"),
  };

  const matches = (Object.keys(FROZEN_ADDRESSES) as (keyof typeof FROZEN_ADDRESSES)[]).every(
    (k) => resolved[k].toLowerCase() === FROZEN_ADDRESSES[k].toLowerCase(),
  );

  return {
    chainId,
    rpcUrl: process.env.TINJAU_RPC_URL?.trim() || file.network.rpc,
    networkLabel: file.network.name,
    ...resolved,
    publishedPoolIds: file.stacks.map((s) => s.poolId.toLowerCase()),
    addressesMatchPreRegistration: matches,
  };
}

// ---------------------------------------------------------------------------
// Chain plumbing
// ---------------------------------------------------------------------------

interface Wallets {
  lp: PrivateKeyAccount;
  swapper: PrivateKeyAccount;
  assessor: PrivateKeyAccount;
  guardian: PrivateKeyAccount;
  assessorKey: `0x${string}`;
}

function loadWallets(): Wallets {
  const posterKey = normalizeKey(process.env.POSTER_PRIVATE_KEY, "POSTER_PRIVATE_KEY");
  const relayerKey = normalizeKey(process.env.DEMO_RELAYER_PRIVATE_KEY, "DEMO_RELAYER_PRIVATE_KEY");
  const assessorKey = process.env.TINJAU_ASSESSOR_PRIVATE_KEY?.trim()
    ? normalizeKey(process.env.TINJAU_ASSESSOR_PRIVATE_KEY, "TINJAU_ASSESSOR_PRIVATE_KEY")
    : deriveRoleKey(posterKey, "assessor");
  const guardianKey = process.env.GUARDIAN_PRIVATE_KEY?.trim()
    ? normalizeKey(process.env.GUARDIAN_PRIVATE_KEY, "GUARDIAN_PRIVATE_KEY")
    : posterKey;

  return {
    lp: privateKeyToAccount(posterKey),
    swapper: privateKeyToAccount(relayerKey),
    assessor: privateKeyToAccount(assessorKey),
    guardian: privateKeyToAccount(guardianKey),
    assessorKey,
  };
}

/**
 * Builds the client set.
 *
 * `riskAsset`, `quoteAsset`, `token0`, `token1` and `poolId` are mutated per run once the fresh
 * pair is deployed — `remapAssetForChain` and `postAssessment`'s read-back both consult them, so
 * they must name the key the record is actually written under or the post would wait ninety
 * seconds on a key nothing wrote.
 */
function buildClients(target: ResolvedTarget, wallets: Wallets): TinjauClients {
  const zero = "0x0000000000000000000000000000000000000000" as const;
  const config: TinjauChainConfig = {
    rpcUrl: target.rpcUrl,
    chainId: target.chainId,
    networkLabel: target.networkLabel,
    addresses: {
      registry: target.registry,
      hook: target.hook,
      poolManager: target.poolManager,
      swapRouter: target.swapRouter,
      liquidityRouter: target.liquidityRouter,
      riskAsset: zero,
      quoteAsset: zero,
      token0: zero,
      token1: zero,
      poolId: `0x${"00".repeat(32)}`,
      tickSpacing: TICK_SPACING,
    },
    envelope: { ...FROZEN_ENVELOPE, demoEnvelope: false },
    accounts: {
      assessor: wallets.assessor,
      poster: wallets.lp,
      relayer: wallets.swapper,
      guardian: wallets.guardian,
    },
    // No public chain accepts `evm_increaseTime`, and this experiment never advances a clock:
    // the whole replay sits inside the plateau by design.
    supportsTimeTravel: false,
    allowWallClockWait: false,
  };
  return makeTinjauClients(config);
}

/** Every transaction this script sends funnels through here, so gas accounting cannot be missed. */
interface GasLedger {
  units: bigint;
  wei: bigint;
}

async function sendTx(
  clients: TinjauClients,
  account: PrivateKeyAccount,
  tx: { to?: `0x${string}`; data: Hex },
  ledger: GasLedger,
): Promise<{
  hash: `0x${string}`;
  gasUsed: bigint;
  blockNumber: bigint;
  contractAddress: `0x${string}` | null;
}> {
  const wallet = clients.walletFor(account);
  const hash = await wallet.sendTransaction({
    account,
    chain: clients.chain,
    to: tx.to,
    data: tx.data,
  });
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  ledger.units += receipt.gasUsed;
  ledger.wei += receipt.gasUsed * receipt.effectiveGasPrice;
  if (receipt.status !== "success") {
    throw new Error(`Transaction ${hash} reverted on chain. Nothing is retried and nothing is forced.`);
  }
  return {
    hash,
    gasUsed: receipt.gasUsed,
    blockNumber: receipt.blockNumber,
    contractAddress: receipt.contractAddress ?? null,
  };
}

// ---------------------------------------------------------------------------
// §9 items 1–4 — the new capability
// ---------------------------------------------------------------------------

function mockErc20Bytecode(): { bytecode: Hex; sha256: string } {
  let raw: string;
  try {
    raw = readFileSync(MOCK_ERC20_ARTIFACT_PATH, "utf8");
  } catch {
    throw new Error(
      `Cannot read ${MOCK_ERC20_ARTIFACT_PATH}. contracts/out is not committed; run ` +
        `\`forge build\` in contracts/ before executing this experiment. Nothing was sent.`,
    );
  }
  const artifact = JSON.parse(raw) as { bytecode: { object: Hex } };
  return {
    bytecode: artifact.bytecode.object,
    sha256: createHash("sha256").update(artifact.bytecode.object).digest("hex"),
  };
}

async function deployMockToken(
  clients: TinjauClients,
  account: PrivateKeyAccount,
  name: string,
  symbol: string,
  ledger: GasLedger,
): Promise<{ address: `0x${string}`; txHash: `0x${string}` }> {
  const { bytecode } = mockErc20Bytecode();
  const data = encodeDeployData({
    abi: MOCK_ERC20_CONSTRUCTOR_ABI,
    bytecode,
    args: [name, symbol, 18],
  });
  const sent = await sendTx(clients, account, { data }, ledger);
  if (!sent.contractAddress) {
    throw new Error("Token deployment produced no contract address. Refusing to guess one.");
  }
  return { address: sent.contractAddress, txHash: sent.hash };
}

async function initializePool(
  clients: TinjauClients,
  account: PrivateKeyAccount,
  key: PoolKeyTuple,
  ledger: GasLedger,
): Promise<`0x${string}`> {
  const data = encodeFunctionData({
    abi: POOL_MANAGER_EXTRA_ABI,
    functionName: "initialize",
    args: [key, INITIAL_SQRT_PRICE_X96],
  });
  const sent = await sendTx(
    clients,
    account,
    { to: clients.config.addresses.poolManager, data },
    ledger,
  );
  return sent.hash;
}

async function modifyLiquidity(
  clients: TinjauClients,
  account: PrivateKeyAccount,
  key: PoolKeyTuple,
  liquidityDelta: bigint,
  ledger: GasLedger,
): Promise<{ hash: `0x${string}`; blockNumber: bigint }> {
  const data = encodeFunctionData({
    abi: POOL_MODIFY_LIQUIDITY_TEST_ABI,
    functionName: "modifyLiquidity",
    args: [
      key,
      { tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidityDelta, salt: POSITION_SALT },
      "0x",
    ],
  });
  const sent = await sendTx(
    clients,
    account,
    { to: clients.config.addresses.liquidityRouter, data },
    ledger,
  );
  return { hash: sent.hash, blockNumber: sent.blockNumber };
}

async function balanceOf(
  clients: TinjauClients,
  token: `0x${string}`,
  owner: `0x${string}`,
  atBlock?: bigint,
): Promise<bigint> {
  const read = () =>
    clients.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
      ...(atBlock === undefined ? {} : { blockNumber: atBlock }),
    }) as Promise<bigint>;
  return atBlock === undefined
    ? read()
    : pinnedRead(read, `balanceOf ${token.slice(0, 10)} @${atBlock}`);
}

/**
 * §9 item 1 — a swap against an EXPLICIT pool key, including a hookless static-fee pool.
 *
 * `executeSwap` in `tinjauHarness.ts` is hardwired to the single pool in `TinjauChainConfig` and
 * always reads `feeDetail` from the hook. Arm C has no hook, so there is no preview to read, and
 * both arms need a key the config does not carry. Everything else is the harness's discipline
 * unchanged: the fee is read from PoolManager's own `Swap` event, never from the hook's preview,
 * and the preview is recorded alongside where one exists so a divergence is visible.
 */
async function executeSwapOnKey(
  clients: TinjauClients,
  run: RunId,
  arm: ArmId,
  step: TradeStep,
  key: PoolKeyTuple,
  poolId: `0x${string}`,
  zeroForOne: boolean,
  ledger: GasLedger,
): Promise<SwapRow> {
  const swapper = clients.config.accounts.relayer;
  const wallet = clients.walletFor(swapper);
  const amountIn = BigInt(step.amountInRaw);
  const hasHook = key.hooks !== "0x0000000000000000000000000000000000000000";

  let previewedFee: number | null = null;
  let previewedReason: HookDegradedReason | null = null;
  if (hasHook) {
    const detail = (await clients.publicClient.readContract({
      address: key.hooks,
      abi: TINJAU_FEE_HOOK_ABI,
      functionName: "feeDetail",
      args: [key],
    })) as [number, number, number, bigint];
    previewedFee = Number(detail[0]);
    previewedReason = HOOK_DEGRADED_REASONS[detail[1]] ?? "RegistryUnreachable";
  }

  const atUnixSeconds = await chainNowSeconds(clients);
  const base: SwapRow = {
    run,
    arm,
    index: step.index,
    side: step.side,
    zeroForOne,
    requestedAmountInRaw: step.amountInRaw,
    realisedAmountInRaw: null,
    amount0: null,
    amount1: null,
    appliedFee: null,
    previewedFee,
    previewedReason,
    tick: null,
    sqrtPriceX96: null,
    poolLiquidity: null,
    blockNumber: null,
    atUnixSeconds,
    txHash: null,
    gasUsed: null,
    ok: false,
    failure: null,
  };

  try {
    // Simulated first. A revert here costs nothing and never reaches the chain; only a simulation
    // that passes is broadcast, and a broadcast that reverts aborts the run rather than retrying.
    const { request } = await clients.publicClient.simulateContract({
      account: swapper,
      address: clients.config.addresses.swapRouter,
      abi: POOL_SWAP_TEST_ABI,
      functionName: "swap",
      args: [
        key,
        {
          zeroForOne,
          amountSpecified: -amountIn, // negative = exact input
          sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT,
        },
        { takeClaims: false, settleUsingBurn: false },
        "0x",
      ],
    });
    const txHash = await wallet.writeContract(request);
    const receipt = await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
    ledger.units += receipt.gasUsed;
    ledger.wei += receipt.gasUsed * receipt.effectiveGasPrice;

    let decoded: {
      amount0: bigint;
      amount1: bigint;
      sqrtPriceX96: bigint;
      liquidity: bigint;
      tick: number;
      fee: number;
    } | null = null;
    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({ abi: POOL_MANAGER_ABI, data: log.data, topics: log.topics });
        if (event.eventName !== "Swap") continue;
        const args = event.args as unknown as {
          id: `0x${string}`;
          amount0: bigint;
          amount1: bigint;
          sqrtPriceX96: bigint;
          liquidity: bigint;
          tick: number;
          fee: number;
        };
        // One PoolManager serves both arms and every other pool on the chain. Only this pool's
        // swap counts, and matching on the id is the only way to be sure of that.
        if (args.id.toLowerCase() !== poolId.toLowerCase()) continue;
        decoded = args;
      } catch {
        // Not a PoolManager Swap log.
      }
    }

    if (!decoded) {
      return {
        ...base,
        txHash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        failure: {
          errorName: "NoSwapEventForThisPool",
          args: [],
          rawMessage: "The transaction succeeded but carried no Swap log for this pool id.",
        },
      };
    }

    const realised = zeroForOne ? -decoded.amount0 : -decoded.amount1;
    return {
      ...base,
      realisedAmountInRaw: realised.toString(),
      amount0: decoded.amount0.toString(),
      amount1: decoded.amount1.toString(),
      appliedFee: Number(decoded.fee),
      tick: Number(decoded.tick),
      sqrtPriceX96: decoded.sqrtPriceX96.toString(),
      poolLiquidity: decoded.liquidity.toString(),
      blockNumber: Number(receipt.blockNumber),
      txHash,
      gasUsed: receipt.gasUsed.toString(),
      ok: receipt.status === "success",
    };
  } catch (err) {
    return { ...base, failure: decodeRevert(err) };
  }
}

// ---------------------------------------------------------------------------
// §4.2 / §4.3 — the two risk states
// ---------------------------------------------------------------------------

/**
 * `runScenario`'s pipeline with this run's pool id threaded through.
 *
 * Every stage is the production module — `normalizeClaims`, `buildEvidenceGraph`, `resolveAsset`,
 * `buildConfirmationInput`, `confirmMarket`, `decide`. The ONLY difference from `runScenario` is
 * that the pool id is supplied rather than derived, which `RunScenarioOptions` does not expose,
 * and the record has to land on THIS run's pool or the hook could never read it. This is the same
 * composition `tinjauScenes.ts` makes privately for exactly the same reason; `assertPipelineAgrees`
 * below checks it against `runScenario` on the unshifted scenario so the two cannot drift.
 */
function decideFromScenario(
  clients: TinjauClients,
  scenario: FrozenScenario,
  swapWindow: SwapWindowFixture,
  poolId: `0x${string}`,
): Decision {
  const cfg = clients.config;
  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const windowEnd = swapWindow.toBlock + XLAYER_BLOCK_TIMESTAMP_OFFSET;

  const claims = normalizeClaims(scenario.claims);
  const graph = buildEvidenceGraph(claims, windowEnd, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
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

  return decide({
    eventKey: `tinjau.scenario/${scenario.scenarioId}`,
    now: windowEnd,
    claims,
    graph,
    resolution,
    confirmation: confirmMarket(confirmationInput),
    confirmationInput,
    officialEvidencePassed: true,
    chainId: cfg.chainId,
    registryAddress: cfg.addresses.registry,
    poolId,
  });
}

/** Run P's constructed leg, built the way `runSceneB` builds it, with this run's pool id. */
function decideConstructed(
  clients: TinjauClients,
  scenario: FrozenScenario,
  nowUnixSeconds: number,
  poolId: `0x${string}`,
): Decision {
  const cfg = clients.config;
  const window = buildConstructedProtectWindow({
    chainId: cfg.chainId,
    pool: poolId,
    token0: cfg.addresses.token0,
    token1: cfg.addresses.token1,
    endUnixSeconds: nowUnixSeconds,
  });

  const anchor = Math.floor(Date.parse(scenario.decisionAnchor.at) / 1000);
  const shifted = timeShiftScenario(scenario, nowUnixSeconds - anchor);
  const claims = normalizeClaims(shifted.claims);
  const graph = buildEvidenceGraph(claims, nowUnixSeconds, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);
  const resolution = resolveAsset(
    shifted.asset.company,
    shifted.asset.tokenSymbol,
    shifted.asset.tokenAddress,
  );
  const confirmationInput = buildConfirmationInput(window, {
    anchorUnixSeconds: nowUnixSeconds,
    nowUnixSeconds,
    okx: null,
    usReferenceMarketOpen: scenario.decisionAnchor.usReferenceMarketOpen ?? false,
  });

  return decide({
    eventKey: `tinjau.paired-pool/${shifted.scenarioId}-constructed`,
    now: nowUnixSeconds,
    claims,
    graph,
    resolution,
    confirmation: confirmMarket(confirmationInput),
    confirmationInput,
    officialEvidencePassed: true,
    chainId: cfg.chainId,
    registryAddress: cfg.addresses.registry,
    poolId,
  });
}

function sameOutcome(a: Decision, b: Decision): boolean {
  return (
    a.record.state === b.record.state &&
    JSON.stringify([...a.record.reasonCodes].sort()) ===
      JSON.stringify([...b.record.reasonCodes].sort())
  );
}

/** Market-leg reason codes, from `tinjauScenes.ts`. Constructing the market may move only these. */
const MARKET_LEG_REASON_CODES = new Set<string>([
  "MARKET_CONFIRMED",
  "MARKET_NOT_CONFIRMED",
  "MARKET_DATA_STALE",
  "MARKET_DATA_UNAVAILABLE",
  "ANTI_WICK_FAILED",
  "THIN_EXIT_DEPTH",
  "REFERENCE_MARKET_CLOSED",
  "INSUFFICIENT_SAMPLE",
]);

// ---------------------------------------------------------------------------
// Limitations and deviations
// ---------------------------------------------------------------------------

/** §8, carried forward unchanged now that a number exists. Not softened, not trimmed. */
function buildLimitations(mode: RunMode): string[] {
  const limitations = [
    "DOES NOT LICENSE \"Tinjau reduces LP loss\". That sentence stays prohibited until the " +
      "original pre-registered canClaimLossAvoided conditions (t0-4-benchmark-preregistration.md " +
      "§8.6) pass on canonical data. This experiment does not touch those conditions and cannot " +
      "open that gate. known-limitations.md §18 stands unchanged.",
    "NEITHER POOL IS A MARKET. Both hold builder-controlled, freely-mintable mock tokens that " +
      "anyone can mint. There is no external liquidity, no external participant, and no price " +
      "discovery. No figure here is a market result, and no amount in this artifact is money.",
    "THE TRIGGER IS CONSTRUCTED. Run P's market leg is a constructed price path fed to the real " +
      "confirmation engine (§4.2). The experiment ASSUMES protection; it does not earn it. It " +
      "says nothing about whether Tinjau would have protected on this event, and the published " +
      "answer to that question is that it would not (known-limitations.md §2).",
    "ZERO FLOW ELASTICITY IS ASSUMED. Identical trades are replayed under a 40x fee difference. " +
      "In reality a 2% fee deters much of the flow a 0.05% fee attracts. This OVERSTATES the fee " +
      "side and UNDERSTATES the adverse-selection side; the net sign of the bias is unmeasured " +
      "and anyone calling the result conservative is guessing.",
    "ONLY THE PLATEAU IS EXERCISED. The whole replay sits inside widenDuration at the constant " +
      "protection fee. The decay curve — most of a real protection episode — contributes nothing. " +
      "Any positive result is an UPPER BOUND on the benefit averaged over a full episode.",
    "ONE EVENT, ONE HOUR, 120 SWAPS, ONE ASSET, ONE MOCK POOL. No sentence may generalise from " +
      "it to tokenized equities, to other assets, or to real liquidity.",
    "THE MECHANISM IS ARITHMETICALLY FAVOURED BY CONSTRUCTION. Under a fixed trade list a higher " +
      "fee necessarily leaves the LP holding more of the input asset for the same output " +
      "delivered. What is genuinely uncertain is the MAGNITUDE after curve effects, whether the " +
      "harness is symmetric, and whether the sign survives the reference mark. This is closer to " +
      "a conformance test of the fee mechanism on a real trade shape than to a discovery.",
    "TIMING IS COMPRESSED. Recorded inter-arrival times are not preserved: roughly an hour of " +
      "mainnet arrivals is replayed back to back. Defensible only because the replay sits inside " +
      "the constant-fee plateau, where the fee does not depend on when a swap lands. It would " +
      "not be defensible under the demo envelope or across the decay curve.",
    "THE TRADES DID NOT CAUSE THE ASSESSMENT. The assessment instant is decoupled from the trade " +
      "script's own timeline (§3). known-limitations.md §17 is sidestepped, not solved; the " +
      "sidestep is machine-checked by gate 3 and nothing more.",
    "NOTHING HERE MAY APPEAR IN THE SAME TABLE AS THE THREE-POLICY BENCHMARK. That study is a " +
      "mainnet replay on a different pool and t0-4 §5.4 forbids combining the two into one figure.",
    "REGISTRY SIDE EFFECT. This experiment marks fresh mock tokens as supported assets on the " +
      "authoritative production-envelope registry. Their addresses and the marking transactions " +
      "are in this artifact and are experiment artifacts, not vetted production assets.",
  ];
  if (mode === "DRY_RUN") {
    limitations.push(
      "THIS IS A DRY RUN. No transaction was sent, no token was deployed, no pool exists, and " +
        "every number under `runs` is absent rather than measured. §10 forbids substituting a " +
        "simulation for the testnet result; nothing here is the result.",
    );
  }
  if (mode === "ANVIL_REHEARSAL") {
    limitations.push(
      "ANVIL_REHEARSAL. Every number in this artifact was produced on a LOCAL ANVIL against a " +
        "freshly deployed stack, not on X Layer Testnet. §10 permits this as a dry run and " +
        "forbids reporting it as the result. It is not the result, it is not published on the " +
        "S3.2 surfaces, and no band from it is quoted anywhere.",
    );
  }
  return limitations;
}

/**
 * Executions that were attempted and produced no usable measurement.
 *
 * Kept in the artifact rather than only in the write-up, because a reader who only ever opens
 * the raw JSON must still learn that this is not the first time this experiment was run on
 * chain, and why the first time does not count.
 */
const PRIOR_ATTEMPTS: PairedPoolArtifact["priorAttempts"] = [
  {
    label: "Testnet execution 1 — VOID as a measurement (2026-08-22, chain 1952)",
    whatHappened:
      "All seven §6.1 gates passed and the runner reported D = 49,804.7 bps, which is 255x the " +
      "arithmetic ceiling the fee differential can produce and is therefore not a measurement " +
      "of anything. Cause: §5.1's two `balanceOf` readings were taken at the RPC's default " +
      "\"latest\" either side of the withdrawal, and X Layer's public RPC served both from a " +
      "node that had not yet seen the burn. Three of the four arms differenced two identical " +
      "stale readings and recorded a withdrawal of exactly zero; the fourth differenced a stale " +
      "\"before\" against an \"after\" that had caught up by exactly one withdrawal, so its " +
      "delta was the OTHER arm's. §6.1 has no gate covering the withdrawal, so nothing stopped " +
      "it. The lag is a documented property of this venue (known-limitations.md §1; " +
      "deployed-addresses.json records 2,519-2,746 ms).",
    whereItIs:
      "docs/buildx-orion-2026/outputs/05-build/data/s3_2_paired_pool_run1_void_raw.json, with " +
      "its console output beside it. Published in full, unedited.",
    theSingleFix:
      "Pin every post-transaction read to the block number of the transaction that produced it, " +
      "instead of reading at \"latest\". Nothing in §2-§4 changed: same tokens-per-run rule, " +
      "same envelope, same tick range, same liquidity, same slice, same N, same K, same marks, " +
      "same bands.",
  },
  {
    label: "Testnet execution 2 — VOID, aborted by the runner (2026-08-22, chain 1952)",
    whatHappened:
      "With the readings pinned to block numbers, run W's terminal state read threw " +
      "`eth_call ... block is out of range` at the block its own last swap had just confirmed " +
      "in: the node answering had not reached that block. The runner published the attempt and " +
      "the failure rather than falling back to \"latest\", so run W never completed, no noise " +
      "floor existed, and run P was stopped by hand rather than left to compute a band that " +
      "§4.3 does not permit without a control. Same root cause as attempt 1 — this RPC's read " +
      "lag — surfacing loudly instead of silently.",
    whereItIs:
      "docs/buildx-orion-2026/outputs/05-build/data/s3_2_paired_pool_run2_void_console.log. No " +
      "raw artifact exists: the process was stopped before it wrote one.",
    theSingleFix:
      "A pinned read now retries while the answering node reports the block as out of range, " +
      "instead of throwing on the first attempt. It never falls back to \"latest\" and never " +
      "accepts an earlier block's answer. Nothing in §2-§4 changed.",
  },
];

/**
 * Defects found and fixed BEFORE any testnet number existed, recorded so the fix cannot be
 * mistaken for a post-hoc adjustment.
 */
const CORRECTIONS: PairedPoolArtifact["corrections"] = [
  {
    foundBy: "the §10 Anvil rehearsal, before any testnet transaction was sent",
    whatWasWrong:
      "For SELL_RISK rows the trade-script builder negated `amount1`, producing a negative " +
      "`amountInRaw`. Combined with `amountSpecified = -amountIn`, that turned all 50 SELL_RISK " +
      "steps into EXACT-OUTPUT swaps instead of exact-input ones, and gate 4 failed on 100 of " +
      "the 240 swaps in each run.",
    whatChanged:
      "The builder now follows §4.1's table literally: `amount0 > 0 -> inHuman = amount0 / 1e6`, " +
      "`amount0 < 0 -> inHuman = amount1 / 1e18`, both positive by construction.",
    whatDidNotChange:
      "No threshold, mark, band, slice bound, N, or scale constant. This made the code match the " +
      "frozen document; it did not change the document.",
  },
  {
    foundBy: "testnet execution 1, which is published as VOID",
    whatWasWrong:
      "Post-transaction reads were issued at the RPC's default \"latest\" and were served stale, " +
      "corrupting every withdrawal delta and one arm's terminal price.",
    whatChanged:
      "Balance readings are pinned to `withdrawBlock - 1` and `withdrawBlock`; each arm's " +
      "pre-replay state is pinned to its seeding block and its terminal state to the block of " +
      "its own last swap. The naive \"latest\" readings are recorded alongside as evidence of " +
      "the lag. A full burn that reads back with non-zero position liquidity, or with no balance " +
      "change, now aborts the run instead of flowing into a metric.",
    whatDidNotChange:
      "No threshold, mark, band, slice bound, N, or scale constant. §6.1's seven gates are " +
      "untouched. A gate 8 WAS added and is recorded as a deviation; it can only ever void a run.",
  },
  {
    foundBy: "testnet execution 2, which is published as VOID",
    whatWasWrong:
      "A read pinned to the block a transaction had just confirmed in threw `block is out of " +
      "range`, because the node answering was behind that block.",
    whatChanged:
      "Pinned reads retry while the node reports the block as missing, and never fall back to " +
      "\"latest\".",
    whatDidNotChange: "No threshold, mark, band, slice bound, N, or scale constant.",
  },
];

/** §10 — recorded before any affected number is quoted anywhere. */
function buildDeviations(target: ResolvedTarget, script: TradeScript): Deviation[] {
  const deviations: Deviation[] = [
    {
      clause: "§9 — script path",
      what:
        "The script lives at apps/server/src/studies/pairedPoolExperiment.ts, not " +
        "apps/server/src/chain/pairedPoolExperiment.ts, and is not wired to an " +
        "`npm run experiment:paired-pool` alias.",
      why:
        "src/chain holds the shared harness; src/studies holds one-off studies that consume it, " +
        "which is what this is. Same directory as scenarioBBondedLive.ts, whose shape this file " +
        "follows.",
      effectOnBands: "None. Location changes no input, threshold, mark or band.",
    },
    {
      clause: "§7.1 — raw artifact path",
      what:
        "The raw artifact is written to BOTH the pre-registered " +
        "docs/buildx-orion-2026/outputs/05-build/s3-2-paired-pool-raw.json AND " +
        "docs/buildx-orion-2026/outputs/05-build/data/s3_2_paired_pool_result.json, with " +
        "identical bytes.",
      why:
        "The pre-registration names the first; the S3.2 task tracker asks for the second, where " +
        "every other study's data artifact lives. Writing both means neither reader has to know " +
        "about the other, and the pre-registered name is not quietly dropped.",
      effectOnBands: "None.",
    },
    {
      clause: "§9 — environment",
      what:
        "Contract addresses are resolved from deployed-addresses.json (stack " +
        "`production-envelope`) rather than from TINJAU_REGISTRY / TINJAU_HOOK / POOL_MANAGER / " +
        "SWAP_ROUTER / LIQUIDITY_ROUTER, because none of those variables is set in this " +
        "environment. Every resolved address is compared against the §2.1 table and the " +
        "comparison is published.",
      why:
        "deployed-addresses.json is the T7.2-authoritative list and is the file §2.1's own table " +
        "was transcribed from. Retyping five addresses into a shell is how a run posts to the " +
        "wrong registry.",
      effectOnBands:
        `None. addressesMatchPreRegistration = ${target.addressesMatchPreRegistration}; a false ` +
        "there would itself be a VOID condition rather than an accepted substitution.",
    },
    {
      clause: "§4.1 — how K is applied",
      what:
        "K is materialised as exact integer arithmetic (amtRaw = round(amount0 * 1e30 / L_first) " +
        "for SELL_QUOTE and round(|amount1| * 1e18 / L_first) for SELL_RISK) rather than through " +
        "a floating-point K.",
      why:
        "K = L_test_human / L_src_human = 1e6 / (L_first/1e12) = 1e18 / L_first exactly, so the " +
        "two closed forms are algebraically identical to the document's formula. A double would " +
        "have left the low ~6 digits of a ~1e21 base-unit amount as floating-point noise, and " +
        "both arms must receive bit-identical inputs for the comparison to mean anything.",
      effectOnBands:
        "None on the bands. It makes the two arms provably identical in their inputs, which is " +
        "what gate 4 checks.",
    },
    {
      clause: "§9 — CLI flag",
      what:
        "The irreversible mode is `--execute`, not `--remote`. `--dry-run` is the default and " +
        "`--rehearse-local` is the §10 Anvil rehearsal.",
      why:
        "`--remote` in tinjauDemoRun.ts distinguishes a public chain from a local Anvil, which " +
        "is a different question from whether to spend anything. This script has a local mode " +
        "AND an irreversible mode, so the flag that gates 480 swaps is named for what it does.",
      effectOnBands: "None.",
    },
    {
      clause: "§9 — reuse",
      what:
        "`decideFromScenario` is composed locally from the exported production modules " +
        "(normalizeClaims, buildEvidenceGraph, resolveAsset, buildConfirmationInput, " +
        "confirmMarket, decide) rather than imported, because the equivalent glue in " +
        "tinjauScenes.ts is not exported and `runScenario` has no poolId option.",
      why:
        "The record must land on THIS run's pool id or the hook could never read it. Every stage " +
        "is the unmodified production module; only the composition is local, and it is asserted " +
        "against `runScenario` on the unshifted canonical scenario before either run proceeds.",
      effectOnBands: "None. A disagreement with `runScenario` aborts rather than being reported.",
    },
  ];

  deviations.push({
    clause: "§6.1 — a validity gate was ADDED",
    what:
      "A gate 8 was added that VOIDs a run when any arm's full burn does not read back as a " +
      "burn: no positive return in either currency, non-zero position liquidity afterwards, the " +
      "seeded liquidity missing beforehand, or the two arms' totals more than 2x apart. It is " +
      "not in the frozen §6.1 and the frozen document was not edited.",
    why:
      "The first testnet execution passed all seven of §6.1's gates and reported CONFIRMS at " +
      "49,804 bps — 255x the arithmetic ceiling — off three withdrawals that had not read back. " +
      "§6.1 contains no clause about the withdrawal, so nothing stopped it. That is a gap in the " +
      "frozen document, found by the run rather than by review, and it is recorded as such " +
      "rather than papered over.",
    effectOnBands:
      "One-directional by construction: this gate can only ever make a run VOID. It cannot turn " +
      "a NULL into a positive, cannot move a threshold, and cannot rescue a result — so adding " +
      "it after a number had been seen cannot flatter the experiment. It is also redundant with " +
      "an in-runner abort that stops a failed withdrawal reaching a metric at all.",
  });

  deviations.push({
    clause: "§5.1 / §5.2 — how the readings are taken",
    what:
      "Balance readings either side of the burn are pinned to `withdrawBlock - 1` and " +
      "`withdrawBlock`; each arm's pre-replay state is pinned to its seeding block and its " +
      "terminal state to the block of its own last swap; and a pinned read retries while the " +
      "answering node reports the block as out of range.",
    why:
      "§5.1 says `balanceOf` before and after, and §5.2 says the terminal price is read " +
      "immediately after the last swap. On this RPC an unpinned read taken at those instants is " +
      "routinely answered by a node that has not seen the write (attempt 1, silently) or refuses " +
      "the block outright (attempt 2, loudly). Pinning plus waiting is the only way to obtain the " +
      "quantity the frozen document names.",
    effectOnBands:
      "None. It is a no-op on a chain without read lag: the Anvil rehearsal produces bit-" +
      "identical retained values before and after the change.",
  });

  if (script.nUsed !== N_TARGET) {
    deviations.push({
      clause: "§4.1 — N",
      what: `N = ${script.nUsed}, not ${N_TARGET}. Dropped rows: ${script.dropped.length}.`,
      why: "§4.1's own drop rules. Every dropped row and its reason is in tradeScript.dropped.",
      effectOnBands:
        "None on the thresholds. A shorter script is a smaller sample and is published as such.",
    });
  }
  return deviations;
}

// ---------------------------------------------------------------------------
// The run driver
// ---------------------------------------------------------------------------

interface RunSpec {
  run: RunId;
  label: string;
  purpose: string;
  marketLeg: RunRecord["marketLeg"];
  riskName: string;
  riskSymbol: string;
  quoteName: string;
  quoteSymbol: string;
}

const RUN_SPECS: Record<RunId, RunSpec> = {
  W: {
    run: "W",
    label: "Run W — control, canonical scenario B, both arms charge baseFee",
    purpose:
      "The falsifiable one. Canonical scenario B resolves to WATCH, so both arms charge 500 and " +
      "v4's math is deterministic: the retained-value difference must be EXACTLY ZERO in base " +
      "units. Its measured |D_notional| is the noise floor run P must clear.",
    marketLeg: "REPLAYED_CANONICAL",
    riskName: "Mock wNVDAx (S3.1 run W)",
    riskSymbol: "wNVDAx31W",
    quoteName: "Mock USDG (S3.1 run W)",
    quoteSymbol: "USDG31W",
  },
  P: {
    run: "P",
    label: "Run P — treatment, constructed PROTECT enforced on arm H",
    purpose: "The conditional measurement of §1.",
    marketLeg: "CONSTRUCTED",
    riskName: "Mock wNVDAx (S3.1 run P)",
    riskSymbol: "wNVDAx31P",
    quoteName: "Mock USDG (S3.1 run P)",
    quoteSymbol: "USDG31P",
  },
};

function emptyRunRecord(spec: RunSpec): RunRecord {
  return {
    run: spec.run,
    label: spec.label,
    purpose: spec.purpose,
    marketLeg: spec.marketLeg,
    riskAsset: null,
    quoteAsset: null,
    currency0: null,
    currency1: null,
    quoteIsCurrency0: null,
    tokenDeployTxHashes: [],
    setAssetSupportedTxHash: null,
    fundingTxHashes: [],
    arms: null,
    decision: null,
    post: null,
    keyWasEmptyBeforePost: null,
    recordBeforeReplay: null,
    recordAfterReplay: null,
    protectStartedAt: null,
    firstSwapAtUnixSeconds: null,
    lastSwapAtUnixSeconds: null,
    swaps: [],
    marks: [],
    results: [],
    deltaFeeBarBps: null,
    feeIncomeReconciliation: [],
    gates: [],
    void: false,
    voidReasons: [],
    aborted: false,
    abortReason: null,
    gasUsedWei: "0",
    gasUsedUnits: "0",
  };
}

function gate(id: string, clause: string, requirement: string, passed: boolean, detail: string): ValidityGate {
  return { id, clause, requirement, passed, detail };
}

async function executeRun(
  clients: TinjauClients,
  target: ResolvedTarget,
  wallets: Wallets,
  spec: RunSpec,
  scenario: FrozenScenario,
  canonicalWindow: SwapWindowFixture,
  script: TradeScript,
  ledger: GasLedger,
): Promise<RunRecord> {
  const record = emptyRunRecord(spec);
  // Per-run gas, folded into the whole-experiment ledger by `finishRun`. Every transaction this
  // run sends passes through `sendTx` or `executeSwapOnKey`, and both charge this ledger, so a
  // transaction that is not accounted for is a transaction that was not sent.
  const runLedger: GasLedger = { units: 0n, wei: 0n };
  const log = (m: string) => console.log(`[s3.2:${spec.run}] ${m}`);

  // ---- fresh token pair (§2.2) --------------------------------------------------------
  log(`deploying a fresh 18-decimal mock pair`);
  const risk = await deployMockToken(clients, wallets.lp, spec.riskName, spec.riskSymbol, runLedger);
  const quote = await deployMockToken(clients, wallets.lp, spec.quoteName, spec.quoteSymbol, runLedger);
  record.riskAsset = risk.address;
  record.quoteAsset = quote.address;
  record.tokenDeployTxHashes = [risk.txHash, quote.txHash];

  const currency0 = risk.address.toLowerCase() < quote.address.toLowerCase() ? risk.address : quote.address;
  const currency1 = currency0 === risk.address ? quote.address : risk.address;
  const quoteIsCurrency0 = currency0.toLowerCase() === quote.address.toLowerCase();
  record.currency0 = currency0;
  record.currency1 = currency1;
  record.quoteIsCurrency0 = quoteIsCurrency0;
  log(`risk ${risk.address}  quote ${quote.address}  quoteIsCurrency0=${quoteIsCurrency0}`);

  clients.config.addresses.riskAsset = risk.address;
  clients.config.addresses.quoteAsset = quote.address;
  clients.config.addresses.token0 = currency0;
  clients.config.addresses.token1 = currency1;

  // ---- the two arms' keys and ids -----------------------------------------------------
  const keyH: PoolKeyTuple = {
    currency0,
    currency1,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: TICK_SPACING,
    hooks: target.hook,
  };
  const keyC: PoolKeyTuple = {
    currency0,
    currency1,
    fee: CONTROL_STATIC_FEE,
    tickSpacing: TICK_SPACING,
    hooks: "0x0000000000000000000000000000000000000000",
  };
  const poolIdH = poolIdOf(keyH);
  const poolIdC = poolIdOf(keyC);
  clients.config.addresses.poolId = poolIdH;
  log(`pool H ${poolIdH}`);
  log(`pool C ${poolIdC}`);

  // §6.1 gate 5, second clause — this experiment must not write over a published pool's record.
  if (target.publishedPoolIds.includes(poolIdH.toLowerCase())) {
    throw new Error(
      `Refusing to proceed: the computed arm-H pool id collides with a pool id published in ` +
        `deployed-addresses.json. Fresh tokens exist precisely so this cannot happen.`,
    );
  }

  // ---- guardian vets the risk asset (§2.2) --------------------------------------------
  const supportTx = await sendTx(
    clients,
    wallets.guardian,
    {
      to: target.registry,
      data: encodeFunctionData({
        abi: TINJAU_RISK_REGISTRY_ABI,
        functionName: "setAssetSupported",
        args: [risk.address, true],
      }),
    },
    runLedger,
  );
  record.setAssetSupportedTxHash = supportTx.hash;
  await waitForReadConsistency(
    () =>
      clients.publicClient.readContract({
        address: target.registry,
        abi: TINJAU_RISK_REGISTRY_ABI,
        functionName: "supportedAsset",
        args: [risk.address],
      }) as Promise<boolean>,
    (s) => s === true,
    `setAssetSupported(${spec.run} risk asset)`,
  );

  // ---- mint and approve (§9 item 2) ---------------------------------------------------
  const funding: `0x${string}`[] = [];
  for (const token of [currency0, currency1]) {
    for (const holder of [wallets.lp, wallets.swapper]) {
      const mint = await sendTx(
        clients,
        holder,
        {
          to: token,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "mint",
            args: [holder.address, MINT_AMOUNT],
          }),
        },
        runLedger,
      );
      funding.push(mint.hash);
    }
    const approveLp = await sendTx(
      clients,
      wallets.lp,
      {
        to: token,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [target.liquidityRouter, 2n ** 255n],
        }),
      },
      runLedger,
    );
    const approveSwapper = await sendTx(
      clients,
      wallets.swapper,
      {
        to: token,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [target.swapRouter, 2n ** 255n],
        }),
      },
      runLedger,
    );
    funding.push(approveLp.hash, approveSwapper.hash);
  }
  record.fundingTxHashes = funding;
  log(`minted and approved (${funding.length} transactions)`);

  // ---- initialise both pools, add liquidity to both -----------------------------------
  const armC: ArmRecord = {
    arm: "C",
    poolKey: keyC,
    poolId: poolIdC,
    initializeTxHash: null,
    addLiquidityTxHash: null,
    withdrawTxHash: null,
    stateBeforeReplay: null,
    stateAfterReplay: null,
    withdrawal: null,
  };
  const armH: ArmRecord = { ...armC, arm: "H", poolKey: keyH, poolId: poolIdH };
  record.arms = { C: armC, H: armH };

  armC.initializeTxHash = await initializePool(clients, wallets.lp, keyC, runLedger);
  armH.initializeTxHash = await initializePool(clients, wallets.lp, keyH, runLedger);
  log(`both pools initialised at sqrtPriceX96 ${INITIAL_SQRT_PRICE_X96}`);

  const seededC = await modifyLiquidity(clients, wallets.lp, keyC, LIQUIDITY_DELTA, runLedger);
  const seededH = await modifyLiquidity(clients, wallets.lp, keyH, LIQUIDITY_DELTA, runLedger);
  armC.addLiquidityTxHash = seededC.hash;
  armH.addLiquidityTxHash = seededH.hash;
  log(`one position [${TICK_LOWER}, ${TICK_UPPER}] seeded in each arm`);

  // ---- the risk state, posted and read-consistent BEFORE replay step 1 (§4.2) ----------
  const chainNow = await chainNowSeconds(clients);
  let decision: Decision;
  let canonical: Decision | null = null;
  let timeShiftSeconds = 0;
  let shiftPreservedOutcome: boolean | null = null;
  let reasonCodeDiff: { onlyInCanonical: string[]; onlyInConstructed: string[] } | null = null;

  if (spec.run === "W") {
    // Canonical scenario B, time-shifted so its assessment is postable at all. The shift must be
    // presentational: if it changes the verdict, the run measured the shift and this aborts.
    canonical = decideFromScenario(clients, scenario, canonicalWindow, poolIdH);
    timeShiftSeconds = chainNow - blockToUnixSeconds(canonicalWindow.toBlock);
    const shiftedScenario = timeShiftScenario(scenario, timeShiftSeconds);
    const shiftedWindow = timeShiftSwapWindow(canonicalWindow, timeShiftSeconds);
    decision = decideFromScenario(clients, shiftedScenario, shiftedWindow, poolIdH);
    shiftPreservedOutcome = sameOutcome(canonical, decision);
    if (!shiftPreservedOutcome) {
      record.aborted = true;
      record.abortReason =
        `The time shift changed run W's verdict (${canonical.record.state} -> ` +
        `${decision.record.state}). Nothing was posted. Publishing the shift's answer under the ` +
        `scenario's name is not an option §4.2 leaves open.`;
      return finishRun(record, runLedger, ledger);
    }
  } else {
    canonical = decideFromScenario(clients, scenario, canonicalWindow, poolIdH);
    decision = decideConstructed(clients, scenario, chainNow, poolIdH);
    const before = new Set<string>(canonical.record.reasonCodes);
    const after = new Set<string>(decision.record.reasonCodes);
    reasonCodeDiff = {
      onlyInCanonical: [...before].filter((r) => !after.has(r)).sort(),
      onlyInConstructed: [...after].filter((r) => !before.has(r)).sort(),
    };
    const strayed = [...reasonCodeDiff.onlyInCanonical, ...reasonCodeDiff.onlyInConstructed].filter(
      (r) => !MARKET_LEG_REASON_CODES.has(r),
    );
    if (strayed.length > 0) {
      record.aborted = true;
      record.abortReason =
        `Constructing the market leg changed non-market reasons: ${strayed.join(", ")}. ` +
        `The construction reached further than §4.2 declares, and that is a finding, not a detail.`;
      return finishRun(record, runLedger, ledger);
    }
  }

  record.decision = {
    state: decision.record.state,
    reasonCodes: [...decision.record.reasonCodes],
    confidenceBand: decision.record.confidenceBand,
    confirmation: String(decision.record.marketConfirmation?.status ?? "UNKNOWN"),
    requestedFee: decision.record.action.requestedFee ?? null,
    humanExplanation: decision.record.humanExplanation,
    timeShiftSeconds,
    shiftPreservedOutcome,
    canonicalState: canonical?.record.state ?? null,
    canonicalReasonCodes: canonical ? [...canonical.record.reasonCodes] : null,
    reasonCodeDiff,
  };

  const expectedState = spec.run === "W" ? "WATCH" : "PROTECT";
  if (decision.record.state !== expectedState) {
    record.aborted = true;
    record.abortReason =
      `Run ${spec.run} expected the engine to reach ${expectedState} and it reached ` +
      `${decision.record.state}: ${decision.record.humanExplanation}. §6.3 lists a refused ` +
      `constructed path as a way this experiment fails, not as a reason to adjust the path.`;
    return finishRun(record, runLedger, ledger);
  }

  // Rule: never write over published history. The key is fresh by construction; checked anyway.
  const priorRecord = await readRecord(clients);
  record.keyWasEmptyBeforePost = priorRecord.neverAssessed;
  if (!priorRecord.neverAssessed) {
    record.aborted = true;
    record.abortReason =
      `The registry already holds a record for (riskAsset, poolId_H) with assessedAt ` +
      `${priorRecord.assessedAt}. A freshly deployed token pair cannot collide with an existing ` +
      `key; something is wrong and nothing will be written over it.`;
    return finishRun(record, runLedger, ledger);
  }

  setAssessorKey(wallets.assessorKey);
  const posted = await signAndPostDecision(clients, decision);
  record.post = posted.post;
  if (!posted.post.ok) {
    record.aborted = true;
    record.abortReason =
      `Posting the ${expectedState} failed: ${posted.post.failure?.errorName ?? "unknown"}` +
      (posted.post.failure?.args.length ? `(${posted.post.failure.args.map(String).join(", ")})` : "") +
      `. Not retried and not forced.`;
    return finishRun(record, runLedger, ledger);
  }
  // `postAssessment` already waited for read consistency; this is the recorded reading.
  record.recordBeforeReplay = await readRecord(clients);
  record.protectStartedAt = record.recordBeforeReplay.protectStartedAt || null;
  log(
    `posted ${record.recordBeforeReplay.state} at ${record.post.txHash} ` +
      `(protectStartedAt ${record.protectStartedAt ?? "n/a"})`,
  );

  // ---- state before replay step 1 (§6.1 gate 1) ---------------------------------------
  //
  // Each arm is read at the block that seeded it: after its own position exists and before any
  // replayed swap touches it. Pinned for the same reason the withdrawal reads are.
  armC.stateBeforeReplay = await readPoolState(
    clients,
    target.poolManager,
    poolIdC,
    target.liquidityRouter,
    seededC.blockNumber,
  );
  armH.stateBeforeReplay = await readPoolState(
    clients,
    target.poolManager,
    poolIdH,
    target.liquidityRouter,
    seededH.blockNumber,
  );

  // ---- the replay, interleaved C then H (§4.1) ----------------------------------------
  log(`replaying ${script.steps.length} steps, interleaved C then H`);
  for (const step of script.steps) {
    const zeroForOne = (step.side === "SELL_QUOTE") === quoteIsCurrency0;

    // §6.1 gate 2 — abort rather than let the last swap fall off the plateau. The previous
    // step's own chain timestamp is used where there is one, so the check costs no extra RPC
    // round trip in a loop that is already latency-bound.
    if (record.protectStartedAt) {
      const now = record.lastSwapAtUnixSeconds ?? (await chainNowSeconds(clients));
      if (now - record.protectStartedAt >= MAX_SECONDS_FROM_PROTECT_START) {
        record.aborted = true;
        record.abortReason =
          `Aborted at step ${step.index}: ${now - record.protectStartedAt}s have elapsed since ` +
          `protectStartedAt, and §6.1 guard 2 bounds the run at ${MAX_SECONDS_FROM_PROTECT_START}s. ` +
          `Continuing would let later swaps fall off the constant-fee plateau, which is the one ` +
          `thing the compressed timing depends on not happening.`;
        return finishRun(record, runLedger, ledger);
      }
    }

    const c = await executeSwapOnKey(clients, spec.run, "C", step, keyC, poolIdC, zeroForOne, runLedger);
    record.swaps.push(c);
    const h = await executeSwapOnKey(clients, spec.run, "H", step, keyH, poolIdH, zeroForOne, runLedger);
    record.swaps.push(h);

    if (record.firstSwapAtUnixSeconds === null) record.firstSwapAtUnixSeconds = c.atUnixSeconds;
    record.lastSwapAtUnixSeconds = h.atUnixSeconds;

    if (!c.ok || !h.ok) {
      record.aborted = true;
      record.abortReason =
        `Step ${step.index} failed on arm ${!c.ok ? "C" : "H"}: ` +
        `${(!c.ok ? c.failure : h.failure)?.errorName ?? "unknown"}. The arms have diverged and ` +
        `no comparison across them is meaningful after that point, so the run stops here. Every ` +
        `attempted (run, arm, index) triple up to and including this one is in \`swaps\`.`;
      return finishRun(record, runLedger, ledger);
    }
    if ((step.index + 1) % 20 === 0) {
      log(`  step ${step.index + 1}/${script.steps.length}  feeC=${c.appliedFee} feeH=${h.appliedFee}`);
    }
  }

  // ---- terminal state, read BEFORE any withdrawal (§5.2) -------------------------------
  //
  // §5.2 wants the state "immediately after the last replayed swap and before any withdrawal".
  // Each arm is therefore pinned to the block of ITS OWN last swap, which is that instant
  // exactly. Nothing but this experiment's own transactions touches these fresh pools, so no
  // other write can sit between that block and the reading.
  const lastBlockC = record.swaps.filter((x) => x.arm === "C").at(-1)?.blockNumber;
  const lastBlockH = record.swaps.filter((x) => x.arm === "H").at(-1)?.blockNumber;
  armC.stateAfterReplay = await readPoolState(
    clients,
    target.poolManager,
    poolIdC,
    target.liquidityRouter,
    lastBlockC === undefined || lastBlockC === null ? undefined : BigInt(lastBlockC),
  );
  armH.stateAfterReplay = await readPoolState(
    clients,
    target.poolManager,
    poolIdH,
    target.liquidityRouter,
    lastBlockH === undefined || lastBlockH === null ? undefined : BigInt(lastBlockH),
  );
  record.recordAfterReplay = await readRecord(clients);

  // ---- withdraw both positions in full, C first (§5.1) --------------------------------
  //
  // THE READS ARE PINNED TO THE WITHDRAWAL'S OWN BLOCK, AND THAT IS NOT A REFINEMENT.
  // §5.1 measures retained value by burning the whole position and counting what comes back,
  // as the difference between two `balanceOf` readings taken either side of the call. On this
  // venue a `balanceOf` issued at the RPC's default "latest" right after a confirmed
  // transaction is routinely answered by a node that has not seen it — the measured lag is
  // 2,519-2,746 ms (`deployed-addresses.json`), and `known-limitations.md` §1 calls it the most
  // important operational fact here. The FIRST testnet execution of this experiment was voided
  // by exactly that: three of four arms differenced two stale readings and reported a
  // withdrawal of zero. So the authoritative pair is read at `withdrawBlock - 1` and
  // `withdrawBlock`, which asks two specific blocks' states and cannot be served by a node that
  // is behind. Nothing else about §5.1 changes: same full burn, same two currencies, same
  // difference.
  for (const arm of [armC, armH]) {
    const naive0Before = await balanceOf(clients, currency0, wallets.lp.address);
    const naive1Before = await balanceOf(clients, currency1, wallets.lp.address);

    const withdrawn = await modifyLiquidity(
      clients,
      wallets.lp,
      arm.poolKey,
      -LIQUIDITY_DELTA,
      runLedger,
    );
    arm.withdrawTxHash = withdrawn.hash;
    const blk = withdrawn.blockNumber;

    const naive0After = await balanceOf(clients, currency0, wallets.lp.address);
    const naive1After = await balanceOf(clients, currency1, wallets.lp.address);

    let readMethod: "PINNED_BLOCK" | "READ_CONSISTENCY_FALLBACK" = "PINNED_BLOCK";
    let b0Before: bigint;
    let b1Before: bigint;
    let b0After: bigint;
    let b1After: bigint;
    let positionAfter: string;
    try {
      b0Before = await balanceOf(clients, currency0, wallets.lp.address, blk - 1n);
      b1Before = await balanceOf(clients, currency1, wallets.lp.address, blk - 1n);
      b0After = await balanceOf(clients, currency0, wallets.lp.address, blk);
      b1After = await balanceOf(clients, currency1, wallets.lp.address, blk);
      positionAfter = (
        await readPoolState(clients, target.poolManager, arm.poolId, target.liquidityRouter, blk)
      ).positionLiquidity;
    } catch {
      // Some public endpoints refuse state at a past block. Falling back to polling "latest"
      // until it moves is weaker than pinning but still refuses to difference two stale reads.
      readMethod = "READ_CONSISTENCY_FALLBACK";
      b0Before = naive0Before;
      b1Before = naive1Before;
      const settled = await waitForReadConsistency(
        async () => ({
          b0: await balanceOf(clients, currency0, wallets.lp.address),
          b1: await balanceOf(clients, currency1, wallets.lp.address),
        }),
        (v) => v.b0 !== naive0Before || v.b1 !== naive1Before,
        `withdraw ${spec.run}/${arm.arm} balances`,
      );
      b0After = settled.b0;
      b1After = settled.b1;
      positionAfter = (
        await readPoolState(clients, target.poolManager, arm.poolId, target.liquidityRouter)
      ).positionLiquidity;
    }

    const w0 = b0After - b0Before;
    const w1 = b1After - b1Before;
    arm.withdrawal = {
      withdrawBlockNumber: Number(blk),
      readMethod,
      balance0Before: b0Before.toString(),
      balance1Before: b1Before.toString(),
      balance0After: b0After.toString(),
      balance1After: b1After.toString(),
      w0: w0.toString(),
      w1: w1.toString(),
      wQuote: (quoteIsCurrency0 ? w0 : w1).toString(),
      wRisk: (quoteIsCurrency0 ? w1 : w0).toString(),
      positionLiquidityAfterWithdraw: positionAfter,
      unpinnedLatest: {
        balance0Before: naive0Before.toString(),
        balance1Before: naive1Before.toString(),
        balance0After: naive0After.toString(),
        balance1After: naive1After.toString(),
      },
    };
    log(
      `arm ${arm.arm} withdrawn at block ${blk} (${readMethod}): ` +
        `Wq=${arm.withdrawal.wQuote} Wr=${arm.withdrawal.wRisk} posL_after=${positionAfter}`,
    );

    // A full burn that returns nothing, or leaves liquidity behind, is a READ that failed, not a
    // result. It is caught here and aborts the run rather than flowing into a metric: §6.1 is
    // frozen and has no gate for it, so it must never reach the point where a band is computed.
    if (positionAfter !== "0" || (w0 <= 0n && w1 <= 0n)) {
      record.aborted = true;
      record.abortReason =
        `Arm ${arm.arm}'s full burn did not read back as a burn: position liquidity after the ` +
        `withdrawal reads ${positionAfter} (must be 0) and the balance deltas are ` +
        `(${w0}, ${w1}). That is a failed measurement, not a measured zero, and §5.1's ` +
        `quantity was therefore never obtained for this arm.`;
      return finishRun(record, runLedger, ledger);
    }
  }

  return finishRun(record, runLedger, ledger);
}

function finishRun(record: RunRecord, runLedger: GasLedger, total: GasLedger): RunRecord {
  record.gasUsedUnits = runLedger.units.toString();
  record.gasUsedWei = runLedger.wei.toString();
  total.units += runLedger.units;
  total.wei += runLedger.wei;
  return record;
}

// ---------------------------------------------------------------------------
// §6.1 — the gates, and §5 — the marks, evaluated after a run completes
// ---------------------------------------------------------------------------

function evaluateRun(record: RunRecord, script: TradeScript, envelopeBaseFee: number): void {
  const gates: ValidityGate[] = [];
  const arms = record.arms;
  const complete =
    !record.aborted &&
    arms !== null &&
    arms.C.withdrawal !== null &&
    arms.H.withdrawal !== null &&
    arms.C.stateAfterReplay !== null &&
    arms.H.stateAfterReplay !== null;

  if (!complete) {
    record.void = true;
    record.voidReasons.push(
      record.abortReason ?? "The run did not complete; no metric is computed from a partial run.",
    );
    record.gates = gates;
    return;
  }

  const before = { C: arms.C.stateBeforeReplay, H: arms.H.stateBeforeReplay };
  const after = { C: arms.C.stateAfterReplay!, H: arms.H.stateAfterReplay! };

  // Gate 1 — identical starting state.
  const g1 =
    before.C !== null &&
    before.H !== null &&
    before.C.sqrtPriceX96 === before.H.sqrtPriceX96 &&
    before.C.tick === before.H.tick &&
    before.C.positionLiquidity === before.H.positionLiquidity &&
    arms.C.poolKey.tickSpacing === arms.H.poolKey.tickSpacing;
  gates.push(
    gate(
      "gate-1",
      "§6.1.1",
      "Both pools read identical sqrtPriceX96, tick, tick spacing and position liquidity before replay step 1.",
      g1,
      before.C && before.H
        ? `C: sqrt=${before.C.sqrtPriceX96} tick=${before.C.tick} posL=${before.C.positionLiquidity}; ` +
          `H: sqrt=${before.H.sqrtPriceX96} tick=${before.H.tick} posL=${before.H.positionLiquidity}`
        : "One or both pre-replay readings are missing.",
    ),
  );

  // Gate 2 — the plateau budget.
  const elapsed =
    record.protectStartedAt && record.lastSwapAtUnixSeconds
      ? record.lastSwapAtUnixSeconds - record.protectStartedAt
      : null;
  const g2 = record.run === "P" ? elapsed !== null && elapsed < MAX_SECONDS_FROM_PROTECT_START : true;
  gates.push(
    gate(
      "gate-2",
      "§6.1.2",
      `The last replayed swap of run P lands at protectStartedAt + t with t < ${MAX_SECONDS_FROM_PROTECT_START}s.`,
      g2,
      record.run === "P"
        ? `t = ${elapsed ?? "unmeasured"}s`
        : "Not applicable: run W enforces no protection, so there is no plateau to fall off.",
    ),
  );

  // Gate 3 — the §17 guard.
  const armH = record.swaps.filter((s) => s.arm === "H");
  const armC = record.swaps.filter((s) => s.arm === "C");
  const hAbove = armH.filter((s) => (s.appliedFee ?? 0) > envelopeBaseFee).length;
  const cExact = armC.filter((s) => s.appliedFee === envelopeBaseFee).length;
  const g3 =
    record.run === "P"
      ? hAbove === script.steps.length && cExact === script.steps.length
      : armC.every((s) => s.appliedFee === envelopeBaseFee) &&
        armH.every((s) => s.appliedFee === envelopeBaseFee);
  gates.push(
    gate(
      "gate-3",
      "§6.1.3",
      record.run === "P"
        ? `All N swaps on arm H record an applied fee > ${envelopeBaseFee}, and all N on arm C record exactly ${envelopeBaseFee}.`
        : `Run W's pre-registered prediction: both arms charge exactly ${envelopeBaseFee} on every swap.`,
      g3,
      `N = ${script.steps.length}; arm H above base: ${hAbove}/${armH.length}; ` +
        `arm C exactly base: ${cExact}/${armC.length}`,
    ),
  );

  // Gate 4 — no partial fill, on either arm.
  const partials = record.swaps.filter(
    (s) => s.realisedAmountInRaw === null || s.realisedAmountInRaw !== s.requestedAmountInRaw,
  );
  gates.push(
    gate(
      "gate-4",
      "§6.1.4",
      "Every swap's realised input equals its requested input, on both arms.",
      partials.length === 0,
      partials.length === 0
        ? `All ${record.swaps.length} swaps filled exactly.`
        : `${partials.length} swap(s) did not: ` +
          partials
            .slice(0, 5)
            .map((s) => `${s.arm}#${s.index} requested ${s.requestedAmountInRaw} realised ${s.realisedAmountInRaw}`)
            .join("; "),
    ),
  );

  // Gate 5 — the registry record, before and after.
  const rBefore = record.recordBeforeReplay;
  const rAfter = record.recordAfterReplay;
  const wantState = record.run === "P" ? "PROTECT" : "WATCH";
  const g5 =
    rBefore !== null &&
    rAfter !== null &&
    rBefore.state === wantState &&
    rAfter.state === wantState &&
    (record.run === "P"
      ? rBefore.confirmation === "CONFIRMED" &&
        rAfter.confirmation === "CONFIRMED" &&
        (rBefore.reasonBits & 1) === 0
      : true);
  gates.push(
    gate(
      "gate-5",
      "§6.1.5",
      record.run === "P"
        ? "The record for (riskAsset, poolId_H) reads PROTECT with confirmation == CONFIRMED and no REASON_RUMOR_ONLY bit, before and after the replay; and no record is written for any published pool id."
        : "The record for (riskAsset, poolId_H) reads WATCH before and after the replay; and no record is written for any published pool id.",
      g5,
      rBefore && rAfter
        ? `before: ${rBefore.state}/${rBefore.confirmation}/bits=${rBefore.reasonBits}; ` +
          `after: ${rAfter.state}/${rAfter.confirmation}/bits=${rAfter.reasonBits}`
        : "A registry reading is missing.",
    ),
  );

  // Gate 7 — protocol fee equal across arms, and its value recorded.
  const g7 = after.C.protocolFee === after.H.protocolFee;
  gates.push(
    gate(
      "gate-7",
      "§6.1.7",
      "Protocol fee is equal on both arms and its value is recorded.",
      g7,
      `arm C protocolFee = ${after.C.protocolFee}, arm H protocolFee = ${after.H.protocolFee}`,
    ),
  );

  // Gate 8 — ADDED BY S3.2, NOT PRESENT IN THE FROZEN §6.1. Recorded as a deviation.
  //
  // The first testnet execution passed all seven of §6.1's gates and printed CONFIRMS at 49,804
  // bps off three withdrawals that never read back. §6.1 has no clause about the withdrawal at
  // all, which is a genuine gap in the frozen document rather than only a bug in this file. The
  // gate is deliberately one-directional: it can only ever VOID a run. It cannot turn a null
  // into a positive, it cannot move a band, and it cannot rescue a result — so adding it after
  // a number was seen cannot flatter the experiment.
  const seeded = LIQUIDITY_DELTA;
  const withdrawalFailures: string[] = [];
  for (const arm of [arms.C, arms.H]) {
    const w = arm.withdrawal!;
    const w0 = BigInt(w.w0);
    const w1 = BigInt(w.w1);
    if (w0 <= 0n && w1 <= 0n) {
      withdrawalFailures.push(
        `arm ${arm.arm} returned nothing (W0=${w.w0}, W1=${w.w1}) from a full burn of ${seeded}`,
      );
    }
    if (w.positionLiquidityAfterWithdraw !== "0") {
      withdrawalFailures.push(
        `arm ${arm.arm} still reads position liquidity ${w.positionLiquidityAfterWithdraw} ` +
          `after a full burn`,
      );
    }
    if (arm.stateBeforeReplay && arm.stateBeforeReplay.positionLiquidity !== seeded.toString()) {
      withdrawalFailures.push(
        `arm ${arm.arm} was seeded with position liquidity ` +
          `${arm.stateBeforeReplay.positionLiquidity}, expected ${seeded}`,
      );
    }
  }
  // Both arms must return the same ORDER of magnitude. A withdrawal that reads back as a small
  // fraction of the other arm's is the attempt-1 signature (one arm read, one arm not) and is a
  // read failure rather than a 100x fee effect that no envelope could produce.
  const totalC = BigInt(arms.C.withdrawal!.w0) + BigInt(arms.C.withdrawal!.w1);
  const totalH = BigInt(arms.H.withdrawal!.w0) + BigInt(arms.H.withdrawal!.w1);
  if (totalC > 0n && totalH > 0n) {
    const ratioLow = totalC * 2n < totalH || totalH * 2n < totalC;
    if (ratioLow) {
      withdrawalFailures.push(
        `the two arms' total withdrawals differ by more than 2x (C=${totalC}, H=${totalH}). A ` +
          `fee differential bounded by the deployed envelope cannot do that; a failed read can.`,
      );
    }
  }
  gates.push(
    gate(
      "gate-8-ADDED",
      "ADDED BY S3.2 — not in the frozen §6.1; see deviations",
      "Every arm's full burn must read back as a burn: a positive return in at least one " +
        "currency, position liquidity 0 afterwards, the seeded liquidity present beforehand, and " +
        "the two arms' totals within 2x of each other.",
      withdrawalFailures.length === 0,
      withdrawalFailures.length === 0
        ? `arm C returned (W0=${arms.C.withdrawal!.w0}, W1=${arms.C.withdrawal!.w1}); ` +
          `arm H returned (W0=${arms.H.withdrawal!.w0}, W1=${arms.H.withdrawal!.w1}); ` +
          `both positions read 0 afterwards.`
        : withdrawalFailures.join(" | "),
    ),
  );

  record.gates = gates;

  // ---- §5 metrics ----------------------------------------------------------------------
  const marks = buildMarks({
    quoteIsCurrency0: record.quoteIsCurrency0!,
    terminalSqrtC: BigInt(after.C.sqrtPriceX96),
    terminalSqrtH: BigInt(after.H.sqrtPriceX96),
  });
  record.marks = marks;

  const metrics: MetricInputs = {
    wQuoteC: BigInt(arms.C.withdrawal!.wQuote),
    wRiskC: BigInt(arms.C.withdrawal!.wRisk),
    wQuoteH: BigInt(arms.H.withdrawal!.wQuote),
    wRiskH: BigInt(arms.H.withdrawal!.wRisk),
    executed: armC.map((s) => ({ side: s.side, amountIn: BigInt(s.realisedAmountInRaw ?? s.requestedAmountInRaw) })),
  };
  record.results = marks.map((m) => evaluateUnderMark(metrics, m));
  record.deltaFeeBarBps = realisedFeeDifferentialBps(record.swaps);
  record.feeIncomeReconciliation = (["C", "H"] as ArmId[]).map((arm) => {
    let income = 0n;
    for (const s of record.swaps.filter((x) => x.arm === arm)) {
      if (s.appliedFee === null) continue;
      income += (BigInt(s.appliedFee) * BigInt(s.requestedAmountInRaw)) / 1_000_000n;
    }
    return { arm, derivedFeeIncome: income.toString() };
  });

  // Gate 6 belongs to run W and is stated in its own terms.
  if (record.run === "W") {
    const rawIdentical =
      arms.C.withdrawal!.w0 === arms.H.withdrawal!.w0 && arms.C.withdrawal!.w1 === arms.H.withdrawal!.w1;
    const allZero = record.results.every((r) => r.sign === 0);
    gates.push(
      gate(
        "gate-6",
        "§6.1.6",
        "Run W's retainedDelta is exactly 0 in base units.",
        rawIdentical && allZero,
        `arm C returned (W0=${arms.C.withdrawal!.w0}, W1=${arms.C.withdrawal!.w1}); ` +
          `arm H returned (W0=${arms.H.withdrawal!.w0}, W1=${arms.H.withdrawal!.w1}). ` +
          `Per-mark retainedDelta: ${record.results.map((r) => `${r.markId}=${r.retainedDelta}`).join(", ")}`,
      ),
    );
    record.gates = gates;
  }

  record.void = gates.some((g) => !g.passed);
  record.voidReasons = gates.filter((g) => !g.passed).map((g) => `${g.id} (${g.clause}) failed: ${g.detail}`);
}

// ---------------------------------------------------------------------------
// The evaluator self-check — dry run only, on labelled synthetic inputs
// ---------------------------------------------------------------------------

/**
 * Exercises §5's arithmetic and §6.2's bands end to end without touching a chain.
 *
 * These numbers are INVENTED. They exist so the evaluator's code path is proven before real
 * money-free tokens are spent on a 25-minute replay, and they can never be reported as a result:
 * nothing downstream reads them and the write-up does not quote them.
 */
function evaluatorSelfCheck(): unknown {
  const one = 10n ** 18n;
  const marks = buildMarks({
    quoteIsCurrency0: true,
    terminalSqrtC: INITIAL_SQRT_PRICE_X96,
    terminalSqrtH: INITIAL_SQRT_PRICE_X96,
  });
  const executed = [
    { side: "SELL_QUOTE" as const, amountIn: 100_000n * one },
    { side: "SELL_RISK" as const, amountIn: 500n * one },
  ];
  const cases = [
    { name: "identical arms -> exactly zero", h: { q: 1000n * one, r: 1000n * one } },
    { name: "arm H retains 2% more risk", h: { q: 1000n * one, r: 1020n * one } },
    { name: "arm H retains 2% less risk", h: { q: 1000n * one, r: 980n * one } },
  ];
  return cases.map((c) => {
    const metrics: MetricInputs = {
      wQuoteC: 1000n * one,
      wRiskC: 1000n * one,
      wQuoteH: c.h.q,
      wRiskH: c.h.r,
      executed,
    };
    const results = marks.map((m) => evaluateUnderMark(metrics, m));
    const classified = classify(results, 195, 0);
    return {
      _label: "SYNTHETIC — not a result, never quoted",
      name: c.name,
      dNotionalBps: results.map((r) => ({ mark: r.markId, bps: r.dNotionalBps })),
      band: classified.band,
      floorF: classified.floorF,
    };
  });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `
S3.2 — the paired-pool protection experiment, as pre-registered in S3.1.

  npx tsx src/studies/pairedPoolExperiment.ts [--dry-run | --execute] [--out <path>]

  --rehearse-local
               The §10-sanctioned dry run: boots a local Anvil, deploys a full stack, and runs
               BOTH runs end to end through the identical code path. Labelled ANVIL_REHEARSAL,
               written to its own path, and never reported as the result.
  --dry-run    (default) Resolve and verify every pinned input, read balances, build the frozen
               trade script, run the real decision engine for both runs, compute both pool ids,
               and exercise the §5/§6 evaluator on labelled synthetic inputs. Sends NOTHING.
  --execute    Run W complete, then run P. Deploys 4 mock tokens, initialises 4 pools, seeds and
               withdraws 4 positions, sends 480 swaps and posts 2 assessments on X Layer Testnet.
  --out <path> Override the artifact destination. By default the artifact is written to BOTH
               the pre-registered §7.1 path and the S3.2 tracker's data path.

Environment: POSTER_PRIVATE_KEY (LP, guardian, gas), DEMO_RELAYER_PRIVATE_KEY (the swapper).
Optional: TINJAU_ASSESSOR_PRIVATE_KEY, GUARDIAN_PRIVATE_KEY, TINJAU_RPC_URL, TINJAU_REGISTRY.

Chain 1952 only. A NULL, ADVERSE, VOID or SIGN-INDETERMINATE outcome is a successful run.
`.trimStart();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const mode: RunMode = args.includes("--execute")
    ? "EXECUTED"
    : args.includes("--rehearse-local")
      ? "ANVIL_REHEARSAL"
      : "DRY_RUN";
  const outOverride = getArgValue(args, "--out");

  readConsistencyLog.length = 0;

  let target: ResolvedTarget;
  let wallets: Wallets;
  let clients: TinjauClients;
  let stopStack: (() => Promise<void>) | null = null;

  if (mode === "ANVIL_REHEARSAL") {
    const stack = await startLocalStack({ contractsDir: join(repoRoot, "contracts") });
    stopStack = stack.stop;
    assertTestnetOnly(stack.config.chainId, true);
    target = {
      chainId: stack.config.chainId,
      rpcUrl: stack.config.rpcUrl,
      networkLabel: stack.config.networkLabel,
      registry: stack.config.addresses.registry,
      hook: stack.config.addresses.hook,
      poolManager: stack.config.addresses.poolManager,
      swapRouter: stack.config.addresses.swapRouter,
      liquidityRouter: stack.config.addresses.liquidityRouter,
      // Nothing is published for a chain that exists for the next few minutes only.
      publishedPoolIds: [stack.config.addresses.poolId.toLowerCase()],
      addressesMatchPreRegistration: false,
    };
    wallets = {
      lp: stack.config.accounts.poster,
      swapper: stack.config.accounts.relayer,
      assessor: stack.config.accounts.assessor,
      guardian: stack.config.accounts.guardian,
      assessorKey: stack.assessorKey,
    };
    clients = makeTinjauClients({
      ...stack.config,
      addresses: { ...stack.config.addresses, tickSpacing: TICK_SPACING },
    });
  } else {
    target = resolveTarget();
    assertTestnetOnly(target.chainId);
    wallets = loadWallets();
    clients = buildClients(target, wallets);
  }

  const scenario = readJson<FrozenScenario>(SCENARIO_PATH);
  const canonicalWindow = readJson<SwapWindowFixture>(SWAP_FIXTURE_PATH);
  const script = buildTradeScript(canonicalWindow);

  console.log(`[s3.2] mode: ${mode}`);
  console.log(`[s3.2] chain ${target.chainId} (${target.networkLabel}) via ${target.rpcUrl}`);
  console.log(`[s3.2] addresses match the §2.1 table: ${target.addressesMatchPreRegistration}`);
  console.log(
    `[s3.2] trade script: ${script.nUsed} steps from block ${script.firstSourceBlock} ` +
      `to ${script.lastSourceBlock}, K = ${script.kDecimal}, dropped ${script.dropped.length}`,
  );

  // ---- pinned inputs, verified before anything is spent ---------------------------------
  const onChainChainId = await clients.publicClient.getChainId();
  assertTestnetOnly(onChainChainId, mode === "ANVIL_REHEARSAL");
  if (onChainChainId !== target.chainId) {
    throw new Error(
      `The RPC reports chain ${onChainChainId} but the resolved configuration says ` +
        `${target.chainId}. Refusing to send anything to a chain this run did not check.`,
    );
  }

  const envelopeRaw = (await clients.publicClient.readContract({
    address: target.registry,
    abi: TINJAU_RISK_REGISTRY_ABI,
    functionName: "envelope",
  })) as [number, number, number, number, number, number];
  const envelopeReadFromChain = {
    baseFee: Number(envelopeRaw[0]),
    maxFee: Number(envelopeRaw[1]),
    widenDuration: Number(envelopeRaw[2]),
    decayDuration: Number(envelopeRaw[3]),
    maxProtectDuration: Number(envelopeRaw[4]),
    cooldown: Number(envelopeRaw[5]),
  };
  const envelopeMatches = (Object.keys(FROZEN_ENVELOPE) as (keyof typeof FROZEN_ENVELOPE)[]).every(
    (k) => envelopeReadFromChain[k] === FROZEN_ENVELOPE[k],
  );
  console.log(
    `[s3.2] envelope on chain: base ${envelopeReadFromChain.baseFee} max ` +
      `${envelopeReadFromChain.maxFee} widen ${envelopeReadFromChain.widenDuration}s — ` +
      `matches §2.1: ${envelopeMatches}`,
  );

  const registryPaused = (await clients.publicClient.readContract({
    address: target.registry,
    abi: TINJAU_RISK_REGISTRY_ABI,
    functionName: "paused",
  })) as boolean;

  const bytecode = await checkBytecode(clients, {
    registry: target.registry,
    hook: target.hook,
    poolManager: target.poolManager,
    swapRouter: target.swapRouter,
    liquidityRouter: target.liquidityRouter,
  });

  const balancesBefore = {
    label: "before the experiment",
    lpWei: (await clients.publicClient.getBalance({ address: wallets.lp.address })).toString(),
    swapperWei: (await clients.publicClient.getBalance({ address: wallets.swapper.address })).toString(),
    atStage: "BEFORE" as const,
  };
  console.log(
    `[s3.2] balances: LP ${Number(balancesBefore.lpWei) / 1e18} OKB, ` +
      `swapper ${Number(balancesBefore.swapperWei) / 1e18} OKB`,
  );

  // The pipeline glue must agree with `runScenario` on the unshifted canonical scenario, or the
  // local composition has drifted from the published one and nothing below is trustworthy.
  const published = runScenario(scenario, canonicalWindow, {
    chainId: target.chainId,
    registryAddress: target.registry,
  });
  const localGlue = decideFromScenario(clients, scenario, canonicalWindow, published.assessment.poolId);
  if (!sameOutcome(published, localGlue)) {
    throw new Error(
      `The local decision glue disagreed with runScenario on the unshifted canonical scenario ` +
        `(${published.record.state} vs ${localGlue.record.state}). Nothing was sent.`,
    );
  }
  console.log(
    `[s3.2] canonical scenario B via runScenario: ${published.record.state} ` +
      `[${published.record.reasonCodes.join(", ")}] — local glue agrees`,
  );

  const ledger: GasLedger = { units: 0n, wei: 0n };
  const runs: RunRecord[] = [];
  let selfCheck: unknown = null;

  if (mode === "DRY_RUN") {
    selfCheck = evaluatorSelfCheck();
    // Prove the constructed leg reaches PROTECT through the unmodified engine, and prove the
    // pool-id computation, without deploying anything: nonce-derived addresses stand in for the
    // tokens this run WOULD deploy.
    const nonce = await clients.publicClient.getTransactionCount({ address: wallets.lp.address });
    const wouldBeRisk = getContractAddress({ from: wallets.lp.address, nonce: BigInt(nonce) });
    const wouldBeQuote = getContractAddress({ from: wallets.lp.address, nonce: BigInt(nonce + 1) });
    const c0 = wouldBeRisk.toLowerCase() < wouldBeQuote.toLowerCase() ? wouldBeRisk : wouldBeQuote;
    const c1 = c0 === wouldBeRisk ? wouldBeQuote : wouldBeRisk;
    clients.config.addresses.token0 = c0;
    clients.config.addresses.token1 = c1;
    const keyH: PoolKeyTuple = {
      currency0: c0,
      currency1: c1,
      fee: DYNAMIC_FEE_FLAG,
      tickSpacing: TICK_SPACING,
      hooks: target.hook,
    };
    const keyC: PoolKeyTuple = { ...keyH, fee: CONTROL_STATIC_FEE, hooks: "0x0000000000000000000000000000000000000000" };
    const poolIdH = poolIdOf(keyH);
    const chainNow = await chainNowSeconds(clients);

    const constructed = decideConstructed(clients, scenario, chainNow, poolIdH);
    const shiftSeconds = chainNow - blockToUnixSeconds(canonicalWindow.toBlock);
    const shiftedW = decideFromScenario(
      clients,
      timeShiftScenario(scenario, shiftSeconds),
      timeShiftSwapWindow(canonicalWindow, shiftSeconds),
      poolIdH,
    );

    console.log(`[s3.2] dry run — would-be pool H ${poolIdH}`);
    console.log(`[s3.2] dry run — would-be pool C ${poolIdOf(keyC)}`);
    console.log(
      `[s3.2] dry run — run W decision (shifted ${shiftSeconds}s): ${shiftedW.record.state} ` +
        `[${shiftedW.record.reasonCodes.join(", ")}], shift preserved outcome: ` +
        `${sameOutcome(published, shiftedW)}`,
    );
    console.log(
      `[s3.2] dry run — run P decision (constructed): ${constructed.record.state} ` +
        `confidence ${constructed.record.confidenceBand} ` +
        `requestedFee ${constructed.record.action.requestedFee}`,
    );
    console.log(`[s3.2] dry run — MockERC20 bytecode sha256 ${mockErc20Bytecode().sha256}`);
    console.log(`[s3.2] dry run — NOTHING was sent.`);

    for (const id of ["W", "P"] as RunId[]) {
      const rec = emptyRunRecord(RUN_SPECS[id]);
      rec.aborted = true;
      rec.abortReason = "DRY RUN — no transaction was sent and no number was measured.";
      rec.decision =
        id === "W"
          ? {
              state: shiftedW.record.state,
              reasonCodes: [...shiftedW.record.reasonCodes],
              confidenceBand: shiftedW.record.confidenceBand,
              confirmation: String(shiftedW.record.marketConfirmation?.status ?? "UNKNOWN"),
              requestedFee: shiftedW.record.action.requestedFee ?? null,
              humanExplanation: shiftedW.record.humanExplanation,
              timeShiftSeconds: shiftSeconds,
              shiftPreservedOutcome: sameOutcome(published, shiftedW),
              canonicalState: published.record.state,
              canonicalReasonCodes: [...published.record.reasonCodes],
              reasonCodeDiff: null,
            }
          : {
              state: constructed.record.state,
              reasonCodes: [...constructed.record.reasonCodes],
              confidenceBand: constructed.record.confidenceBand,
              confirmation: String(constructed.record.marketConfirmation?.status ?? "UNKNOWN"),
              requestedFee: constructed.record.action.requestedFee ?? null,
              humanExplanation: constructed.record.humanExplanation,
              timeShiftSeconds: 0,
              shiftPreservedOutcome: null,
              canonicalState: published.record.state,
              canonicalReasonCodes: [...published.record.reasonCodes],
              reasonCodeDiff: null,
            };
      evaluateRun(rec, script, envelopeReadFromChain.baseFee);
      runs.push(rec);
    }
  } else {
    if (mode === "EXECUTED" && (!target.addressesMatchPreRegistration || !envelopeMatches)) {
      throw new Error(
        "The resolved addresses or the on-chain envelope do not match the §2.1 table the " +
          "pre-registration froze. Nothing was sent. Running against a different stack would " +
          "not be this experiment.",
      );
    }
    if (registryPaused) {
      throw new Error(
        "The registry is paused. §6.1 guard 5 requires it unpaused throughout, so the run would " +
          "be VOID before it started. Nothing was sent.",
      );
    }

    // Run W FIRST, always. The noise floor is measured before the treatment so it cannot be
    // chosen to fit it (§4.3).
    for (const id of ["W", "P"] as RunId[]) {
      console.log(`\n[s3.2] ===== ${RUN_SPECS[id].label} =====`);
      // §10: "the run cannot execute at all ... S3.2 publishes the attempt and the failure."
      // A throw from any of the irreversible steps must therefore still reach the artifact,
      // rather than killing the process and leaving no record of what was attempted.
      let rec: RunRecord;
      try {
        rec = await executeRun(
          clients,
          target,
          wallets,
          RUN_SPECS[id],
          scenario,
          canonicalWindow,
          script,
          ledger,
        );
      } catch (err) {
        rec = emptyRunRecord(RUN_SPECS[id]);
        rec.aborted = true;
        rec.abortReason =
          `The run threw before it could complete: ` +
          `${err instanceof Error ? err.message : String(err)}. Published as an attempt and a ` +
          `failure, per §10. Nothing was simulated in its place.`;
        console.error(`[s3.2] run ${id} threw: ${rec.abortReason}`);
      }
      evaluateRun(rec, script, envelopeReadFromChain.baseFee);
      runs.push(rec);
      console.log(
        `[s3.2] run ${id}: ${rec.void ? "VOID" : "valid"}` +
          (rec.results.length
            ? `  D(primary) = ${rec.results.find((r) => r.markId === "PRIMARY")?.dNotionalBps.toFixed(4)} bps`
            : ""),
      );
      for (const reason of rec.voidReasons) console.log(`   ! ${reason}`);
      // §4.3: run W is evaluated before run P's bands can be applied. If run W did not complete,
      // run P still executes and is published — but its band is withheld below, not guessed.
    }
  }

  // ---- §6.2, applied in the order the document fixes ------------------------------------
  const runW = runs.find((r) => r.run === "W");
  const runP = runs.find((r) => r.run === "P");
  const noiseFloorBps =
    runW && !runW.void ? Math.abs(runW.results.find((r) => r.markId === "PRIMARY")?.dNotionalBps ?? 0) : null;

  let band = "NOT_EVALUATED";
  let bandBasis = "";
  let signHeld: boolean | null = null;
  let floorF: number | null = null;
  let dPrimary: number | null = null;

  if (mode === "DRY_RUN") {
    bandBasis = "Dry run. No band is computed from inputs that were never measured.";
  } else if (!runP || runP.void) {
    band = "VOID";
    bandBasis =
      `Run P failed at least one §6.1 validity gate, so it is a void run rather than a result: ` +
      (runP?.voidReasons.join(" | ") ?? "run P did not execute.");
  } else if (noiseFloorBps === null) {
    band = "VOID";
    bandBasis =
      "Run W did not produce a valid noise floor, and §6.1 guard 6 makes run P's bands " +
      "inapplicable until run W's asymmetry is explained. Run P's numbers are published; its " +
      "band is withheld rather than guessed.";
  } else {
    const deltaFeeBar = runP.deltaFeeBarBps ?? 0;
    const classified = classify(runP.results, deltaFeeBar, noiseFloorBps);
    band = classified.band;
    signHeld = classified.signHeld;
    floorF = classified.floorF;
    dPrimary = classified.d;
    bandBasis =
      `D = ${classified.d.toFixed(4)} bps under the primary mark; Δf̄ = ${deltaFeeBar.toFixed(4)} bps; ` +
      `noise floor |D_watch| = ${noiseFloorBps.toFixed(6)} bps; ` +
      `F = max(${BAND_FLOOR_FRACTION} × Δf̄, ${BAND_NOISE_MULTIPLE} × |D_watch|) = ${classified.floorF.toFixed(4)} bps; ` +
      `CONFIRMS threshold = ${(BAND_CONFIRMS_FRACTION * deltaFeeBar).toFixed(4)} bps.`;
  }

  // ---- artifact --------------------------------------------------------------------------
  const artifact: PairedPoolArtifact = {
    schemaVersion: SCHEMA_VERSION,
    producedBy: PRODUCED_BY,
    preRegistration: PREREGISTRATION,
    preRegistrationCommit: PREREGISTRATION_COMMIT,
    runAtUtc: new Date().toISOString(),
    mode,
    standingLabel:
      "BOTH POOLS HOLD BUILDER-CONTROLLED, FREELY-MINTABLE MOCK TOKENS WITH NO VALUE. Every " +
      "amount here is in base units of those mocks. No figure in this artifact is money, a " +
      "market result, or a price. Run P's market trigger is CONSTRUCTED (basis: CONSTRUCTED); " +
      "the trade script, the fees charged, the registry writes and the pool states are OBSERVED.",
    network: {
      chainId: target.chainId,
      networkLabel: target.networkLabel,
      rpcUrl: target.rpcUrl,
      addresses: FROZEN_ADDRESSES,
      addressesMatchPreRegistration: target.addressesMatchPreRegistration,
      envelopeReadFromChain,
      envelopeMatchesPreRegistration: envelopeMatches,
      registryPaused,
      bytecode,
      publishedPoolIds: target.publishedPoolIds,
    },
    accounts: {
      lp: wallets.lp.address,
      swapper: wallets.swapper.address,
      assessor: wallets.assessor.address,
      guardian: wallets.guardian.address,
    },
    balances: [
      balancesBefore,
      {
        label: "after the experiment",
        lpWei: (await clients.publicClient.getBalance({ address: wallets.lp.address })).toString(),
        swapperWei: (
          await clients.publicClient.getBalance({ address: wallets.swapper.address })
        ).toString(),
        atStage: "AFTER" as const,
      },
    ],
    tradeScript: script,
    runs,
    outcome: {
      runW: runW ? (runW.void ? `VOID — ${runW.voidReasons.join(" | ")}` : "valid control run") : "not run",
      runP: runP ? (runP.void ? `VOID — ${runP.voidReasons.join(" | ")}` : "valid treatment run") : "not run",
      band,
      bandBasis,
      signHeldAcrossMarks: signHeld,
      noiseFloorBps,
      floorF,
      deltaFeeBarBps: runP?.deltaFeeBarBps ?? null,
      dNotionalPrimaryBps: dPrimary,
    },
    dryRunEvaluatorSelfCheck: selfCheck,
    priorAttempts: PRIOR_ATTEMPTS,
    corrections: CORRECTIONS,
    deviations: buildDeviations(target, script),
    readConsistency: {
      maxWaitedMs: readConsistencyLog.reduce((m, o) => Math.max(m, o.waitedMs), 0),
      totalWaitedMs: readConsistencyLog.reduce((t, o) => t + o.waitedMs, 0),
      observations: [...readConsistencyLog],
    },
    claimGate:
      "PROHIBITED REGARDLESS OF THIS RESULT: \"Tinjau reduces LP loss\", and every variant of " +
      "it. canClaimLossAvoided stays false. This experiment does not touch the t0-4 §8.6 " +
      "conditions and cannot open that gate.",
    limitations: buildLimitations(mode),
  };

  const serialized = `${JSON.stringify(artifact, bigintSafe, 2)}\n`;
  assertNoSecretsInSerialized(serialized, [wallets.assessorKey]);

  // A rehearsal never touches a published path. §10 forbids reporting its numbers as the
  // result, and the simplest way to honour that is to make it structurally unable to overwrite
  // the artifact a real run produces.
  const destinations = outOverride
    ? [outOverride]
    : mode === "ANVIL_REHEARSAL"
      ? [join(buildOutDir, "data", "s3_2_paired_pool_anvil_rehearsal.json")]
      : [PREREGISTERED_OUT_PATH, TRACKER_OUT_PATH];
  for (const dest of destinations) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, serialized, "utf8");
    console.log(`[s3.2] artifact: ${dest}`);
  }

  console.log(`\n[s3.2] OUTCOME BAND: ${band}`);
  console.log(`[s3.2] ${bandBasis}`);
  console.log(`[s3.2] gas used: ${ledger.units} units, ${Number(ledger.wei) / 1e18} OKB`);
  if (stopStack) await stopStack();
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    // Message only. Every error path in the modules this touches names environment VARIABLES
    // rather than values, and a stack trace could carry an argument that is not.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
