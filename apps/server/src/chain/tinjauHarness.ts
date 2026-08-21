/**
 * On-chain steps for the Tinjau enforcement stack (tasks T4.2–T4.5).
 *
 * Every function here takes its clients and addresses as arguments, so the same code runs
 * against a local Anvil and against X Layer Testnet with nothing but configuration changing.
 *
 * ---------------------------------------------------------------------------------------
 * DECODED, NEVER RAW. §0.23 forbids asking anyone to decode ad hoc contract output, so every
 * step returns named fields: event arguments by name, enum ordinals mapped to strings, revert
 * data mapped to the error's name and arguments. A hex blob never leaves this module.
 *
 * MEASURED, NEVER ASSUMED. The fee a swap was charged is read from PoolManager's own `Swap`
 * event, not from the hook's view function and not from the pool's stored `lpFee`. A dynamic
 * fee override applies to a single swap and is never written to `slot0`, so a harness that
 * reported `previewFee` would be reporting an intention rather than an outcome.
 * ---------------------------------------------------------------------------------------
 */

import {
  decodeErrorResult,
  decodeEventLog,
  encodeFunctionData,
  type Hex,
  type PrivateKeyAccount,
  type TransactionReceipt,
} from "viem";

import {
  CONFIDENCE_BAND_NAMES,
  CONFIRMATION_STATUS_NAMES,
  DATA_MODE_NAMES,
  ERC20_ABI,
  HOOK_DEGRADED_REASONS,
  POOL_MANAGER_ABI,
  POOL_SWAP_TEST_ABI,
  RISK_STATE_NAMES,
  TINJAU_FEE_HOOK_ABI,
  TINJAU_RISK_REGISTRY_ABI,
  type HookDegradedReason,
} from "./tinjauAbi.js";
import { chainNowSeconds, type TinjauClients } from "./tinjauChain.js";
import type { AssessmentStruct } from "../decision/eip712.js";

// v4's `DYNAMIC_FEE_FLAG`. The pool must carry it or PoolManager ignores the hook's override.
export const DYNAMIC_FEE_FLAG = 0x800000;

/** Wide bounds so a demo swap is never rejected on price limits. From v4-core's own tests. */
const MIN_SQRT_PRICE_LIMIT = 4295128739n + 1n;
const MAX_SQRT_PRICE_LIMIT = 1461446703485210103287273052203988822378723970342n - 1n;

export interface PoolKeyTuple {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

export function poolKeyOf(clients: TinjauClients): PoolKeyTuple {
  const a = clients.config.addresses;
  return {
    currency0: a.token0,
    currency1: a.token1,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: a.tickSpacing,
    hooks: a.hook,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface DecodedRiskRecord {
  asset: `0x${string}`;
  poolId: `0x${string}`;
  state: (typeof RISK_STATE_NAMES)[number];
  confidence: (typeof CONFIDENCE_BAND_NAMES)[number];
  dataMode: (typeof DATA_MODE_NAMES)[number];
  confirmation: (typeof CONFIRMATION_STATUS_NAMES)[number];
  reasonBits: number;
  assessedAt: number;
  expiresAt: number;
  protectStartedAt: number;
  evidenceCommitment: `0x${string}`;
  policyVersion: string;
  /** True when nothing was ever posted for this key. Distinguished from "assessed as NORMAL". */
  neverAssessed: boolean;
}

/** ASCII-decodes a `bytes32` version string, stopping at the first NUL. */
function bytes32ToAscii(value: Hex): string {
  const hex = value.slice(2);
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

export async function readRecord(clients: TinjauClients): Promise<DecodedRiskRecord> {
  const a = clients.config.addresses;
  const raw = (await clients.publicClient.readContract({
    address: a.registry,
    abi: TINJAU_RISK_REGISTRY_ABI,
    functionName: "currentRecord",
    args: [a.riskAsset, a.poolId],
  })) as {
    asset: `0x${string}`;
    poolId: `0x${string}`;
    state: number;
    confidence: number;
    dataMode: number;
    confirmation: number;
    reasonBits: number;
    assessedAt: bigint;
    expiresAt: bigint;
    protectStartedAt: bigint;
    evidenceCommitment: `0x${string}`;
    policyVersion: `0x${string}`;
  };

  return {
    asset: raw.asset,
    poolId: raw.poolId,
    state: RISK_STATE_NAMES[raw.state] ?? "NORMAL",
    confidence: CONFIDENCE_BAND_NAMES[raw.confidence] ?? "UNKNOWN",
    dataMode: DATA_MODE_NAMES[raw.dataMode] ?? "UNKNOWN",
    confirmation: CONFIRMATION_STATUS_NAMES[raw.confirmation] ?? "UNKNOWN",
    reasonBits: Number(raw.reasonBits),
    assessedAt: Number(raw.assessedAt),
    expiresAt: Number(raw.expiresAt),
    protectStartedAt: Number(raw.protectStartedAt),
    evidenceCommitment: raw.evidenceCommitment,
    policyVersion: bytes32ToAscii(raw.policyVersion),
    neverAssessed: raw.assessedAt === 0n,
  };
}

export interface DecodedEffectiveState {
  state: (typeof RISK_STATE_NAMES)[number];
  fee: number;
  endsAt: number;
}

export async function readEffectiveState(clients: TinjauClients): Promise<DecodedEffectiveState> {
  const a = clients.config.addresses;
  const [state, fee, endsAt] = (await clients.publicClient.readContract({
    address: a.registry,
    abi: TINJAU_RISK_REGISTRY_ABI,
    functionName: "effectiveState",
    args: [a.riskAsset, a.poolId],
  })) as [number, number, bigint];

  return { state: RISK_STATE_NAMES[state] ?? "NORMAL", fee: Number(fee), endsAt: Number(endsAt) };
}

export interface DecodedFeeDetail {
  fee: number;
  reason: HookDegradedReason;
  state: (typeof RISK_STATE_NAMES)[number];
  protectEndsAt: number;
}

export async function readFeeDetail(clients: TinjauClients): Promise<DecodedFeeDetail> {
  const [fee, reason, state, protectEndsAt] = (await clients.publicClient.readContract({
    address: clients.config.addresses.hook,
    abi: TINJAU_FEE_HOOK_ABI,
    functionName: "feeDetail",
    args: [poolKeyOf(clients)],
  })) as [number, number, number, bigint];

  return {
    fee: Number(fee),
    reason: HOOK_DEGRADED_REASONS[reason] ?? "RegistryUnreachable",
    state: RISK_STATE_NAMES[state] ?? "NORMAL",
    protectEndsAt: Number(protectEndsAt),
  };
}

// ---------------------------------------------------------------------------
// Read-after-write consistency
// ---------------------------------------------------------------------------

/**
 * Observed lag between a confirmed write and that write being visible to a read.
 *
 * Recorded rather than merely handled: on a public, load-balanced RPC this is a property of the
 * network that a consumer of the risk registry inherits, and it is more useful published than
 * quietly absorbed.
 */
export interface ReadConsistencyWait {
  label: string;
  waitedMs: number;
  attempts: number;
  converged: boolean;
}

export const readConsistencyLog: ReadConsistencyWait[] = [];

/**
 * Blocks until a read reflects a write that is already mined, or gives up loudly.
 *
 * WHY THIS EXISTS. On a local Anvil a receipt means the next read sees the new state. On X
 * Layer's public RPC it does not: requests are served by several nodes at different heights, so
 * a read issued immediately after a confirmed transaction can return the PREVIOUS record. That
 * was measured here — a `postAssessment` whose own event decoded to `state: PROTECT` was
 * followed by a `currentRecord` that still returned the earlier WATCH, while the swap in the
 * same scene was correctly charged the widened fee.
 *
 * Returning a stale read without waiting would make the harness report that the registry and
 * the pool disagreed, which is false and would be the worst possible thing for this artifact to
 * claim. Timing out is reported as a failure, never as a pass.
 */
export async function waitForReadConsistency<T>(
  read: () => Promise<T>,
  isCurrent: (value: T) => boolean,
  label: string,
  timeoutMs = 90_000,
): Promise<T> {
  const startedAt = Date.now();
  let attempts = 0;
  let last = await read();
  attempts++;
  if (isCurrent(last)) {
    readConsistencyLog.push({ label, waitedMs: 0, attempts, converged: true });
    return last;
  }

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1_000));
    last = await read();
    attempts++;
    if (isCurrent(last)) {
      readConsistencyLog.push({ label, waitedMs: Date.now() - startedAt, attempts, converged: true });
      return last;
    }
  }

  readConsistencyLog.push({ label, waitedMs: Date.now() - startedAt, attempts, converged: false });
  throw new Error(
    `Read did not catch up with a confirmed write within ${timeoutMs}ms (${label}). The write ` +
      `is on chain; the RPC is serving an older view. Proceeding would report a registry/pool ` +
      `disagreement that does not exist.`,
  );
}

// ---------------------------------------------------------------------------
// Revert decoding
// ---------------------------------------------------------------------------

export interface DecodedRevert {
  errorName: string;
  args: unknown[];
  /** The raw message, kept only when nothing could be decoded from it. */
  rawMessage: string | null;
}

/**
 * Turns a viem contract error into a named registry error.
 *
 * Walks the whole error chain for revert data, because viem nests the original cause several
 * layers deep and the useful part — `CooldownActive(1234, 3600)` — is otherwise buried in a
 * multi-line string that nobody downstream should have to parse.
 */
export function decodeRevert(err: unknown): DecodedRevert {
  const seen = new Set<unknown>();
  let cursor: unknown = err;
  while (cursor && typeof cursor === "object" && !seen.has(cursor)) {
    seen.add(cursor);
    const candidate = cursor as { data?: unknown; cause?: unknown };
    const data = candidate.data;
    const hex =
      typeof data === "string"
        ? data
        : data && typeof data === "object" && typeof (data as { data?: unknown }).data === "string"
          ? (data as { data: string }).data
          : null;
    if (hex && hex.startsWith("0x") && hex.length >= 10) {
      try {
        const decoded = decodeErrorResult({ abi: TINJAU_RISK_REGISTRY_ABI, data: hex as Hex });
        return {
          errorName: decoded.errorName,
          args: decoded.args ? [...(decoded.args as readonly unknown[])] : [],
          rawMessage: null,
        };
      } catch {
        // Not one of the registry's errors; keep walking rather than guessing.
      }
    }
    cursor = candidate.cause;
  }

  const message = err instanceof Error ? err.message : String(err);
  // Foundry/Anvil surface `require` strings rather than custom errors for the script guards.
  const match = /reverted with reason string '([^']*)'/.exec(message);
  return {
    errorName: match ? "Error" : "UnknownRevert",
    args: match ? [match[1]] : [],
    rawMessage: message,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface PostResult {
  ok: boolean;
  txHash: `0x${string}` | null;
  blockNumber: number | null;
  gasUsed: string | null;
  /** Decoded `AssessmentPosted`, when the post succeeded. */
  assessmentPosted: {
    key: `0x${string}`;
    asset: `0x${string}`;
    poolId: `0x${string}`;
    state: (typeof RISK_STATE_NAMES)[number];
    reasonBits: number;
    assessedAt: number;
    expiresAt: number;
    evidenceCommitment: `0x${string}`;
  } | null;
  /** Decoded `ProtectionEnded`, when this post stood a protection down. */
  protectionEnded: { key: `0x${string}`; endedAt: number } | null;
  failure: DecodedRevert | null;
}

/**
 * Relays a signed assessment.
 *
 * The poster pays gas and holds no authority; the assessor's signature is what makes the write
 * valid. Failure is returned rather than thrown, because a failed action is a result the record
 * has to be able to state (§0.11) and not an exception to be swallowed.
 */
export async function postAssessment(
  clients: TinjauClients,
  assessment: AssessmentStruct,
  signature: `0x${string}`,
  poster: PrivateKeyAccount = clients.config.accounts.poster,
): Promise<PostResult> {
  const wallet = clients.walletFor(poster);
  try {
    const { request } = await clients.publicClient.simulateContract({
      account: poster,
      address: clients.config.addresses.registry,
      abi: TINJAU_RISK_REGISTRY_ABI,
      functionName: "postAssessment",
      args: [assessment, signature],
    });
    const txHash = await wallet.writeContract(request);
    const receipt = await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
    const decoded = decodeRegistryLogs(receipt);

    // The write is mined. Do not return until a read can see it, or every subsequent readback
    // in the scene would be describing the previous record.
    if (receipt.status === "success") {
      await waitForReadConsistency(
        () => readRecord(clients),
        (r) => r.assessedAt === Number(assessment.assessedAt),
        `postAssessment assessedAt=${assessment.assessedAt}`,
      );
    }

    return {
      ok: receipt.status === "success",
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      assessmentPosted: decoded.assessmentPosted,
      protectionEnded: decoded.protectionEnded,
      failure: null,
    };
  } catch (err) {
    return {
      ok: false,
      txHash: null,
      blockNumber: null,
      gasUsed: null,
      assessmentPosted: null,
      protectionEnded: null,
      failure: decodeRevert(err),
    };
  }
}

function decodeRegistryLogs(receipt: TransactionReceipt): {
  assessmentPosted: PostResult["assessmentPosted"];
  protectionEnded: PostResult["protectionEnded"];
} {
  let assessmentPosted: PostResult["assessmentPosted"] = null;
  let protectionEnded: PostResult["protectionEnded"] = null;

  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({
        abi: TINJAU_RISK_REGISTRY_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (event.eventName === "AssessmentPosted") {
        const a = event.args as unknown as {
          key: `0x${string}`;
          asset: `0x${string}`;
          poolId: `0x${string}`;
          state: number;
          reasonBits: number;
          assessedAt: bigint;
          expiresAt: bigint;
          evidenceCommitment: `0x${string}`;
        };
        assessmentPosted = {
          key: a.key,
          asset: a.asset,
          poolId: a.poolId,
          state: RISK_STATE_NAMES[a.state] ?? "NORMAL",
          reasonBits: Number(a.reasonBits),
          assessedAt: Number(a.assessedAt),
          expiresAt: Number(a.expiresAt),
          evidenceCommitment: a.evidenceCommitment,
        };
      } else if (event.eventName === "ProtectionEnded") {
        const a = event.args as unknown as { key: `0x${string}`; endedAt: bigint };
        protectionEnded = { key: a.key, endedAt: Number(a.endedAt) };
      }
    } catch {
      // Logs from other contracts in the same transaction. Not an error.
    }
  }
  return { assessmentPosted, protectionEnded };
}

// ---------------------------------------------------------------------------
// Swaps
// ---------------------------------------------------------------------------

export interface SwapResult {
  ok: boolean;
  txHash: `0x${string}` | null;
  blockNumber: number | null;
  atUnixSeconds: number;
  /** The fee PoolManager actually charged, decoded from its own `Swap` event. */
  appliedFee: number | null;
  amount0: string | null;
  amount1: string | null;
  tick: number | null;
  /** What the hook said it would charge, read immediately before the swap. */
  previewedFee: number;
  previewedReason: HookDegradedReason;
  failure: DecodedRevert | null;
}

/**
 * Funds and approves the relayer so it can swap.
 *
 * Mock tokens only, freely mintable, no value. Called once per scene rather than per swap so a
 * scene's transaction list stays readable.
 */
export async function fundSwapper(
  clients: TinjauClients,
  amount = 10_000n * 10n ** 18n,
): Promise<`0x${string}`[]> {
  const a = clients.config.addresses;
  const relayer = clients.config.accounts.relayer;
  const wallet = clients.walletFor(relayer);
  const hashes: `0x${string}`[] = [];

  for (const token of [a.token0, a.token1]) {
    const mint = await wallet.sendTransaction({
      account: relayer,
      chain: clients.chain,
      to: token,
      data: encodeFunctionData({ abi: ERC20_ABI, functionName: "mint", args: [relayer.address, amount] }),
    });
    await clients.publicClient.waitForTransactionReceipt({ hash: mint });
    hashes.push(mint);

    const approve = await wallet.sendTransaction({
      account: relayer,
      chain: clients.chain,
      to: token,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [a.swapRouter, 2n ** 255n],
      }),
    });
    await clients.publicClient.waitForTransactionReceipt({ hash: approve });
    hashes.push(approve);
  }
  return hashes;
}

/**
 * Executes one swap and reports the fee the pool charged.
 *
 * `previewedFee` is captured immediately before and returned alongside, so a divergence between
 * what the hook said and what the pool did is visible in the artifact instead of having to be
 * hunted for. They are expected to be equal; the value of recording both is the case where they
 * are not.
 */
export async function executeSwap(
  clients: TinjauClients,
  opts: { zeroForOne?: boolean; amountIn?: bigint } = {},
): Promise<SwapResult> {
  const a = clients.config.addresses;
  const relayer = clients.config.accounts.relayer;
  const wallet = clients.walletFor(relayer);
  const zeroForOne = opts.zeroForOne ?? true;
  const amountIn = opts.amountIn ?? 10n ** 15n;

  const detail = await readFeeDetail(clients);
  const atUnixSeconds = await chainNowSeconds(clients);

  try {
    const { request } = await clients.publicClient.simulateContract({
      account: relayer,
      address: a.swapRouter,
      abi: POOL_SWAP_TEST_ABI,
      functionName: "swap",
      args: [
        poolKeyOf(clients),
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

    let appliedFee: number | null = null;
    let amount0: string | null = null;
    let amount1: string | null = null;
    let tick: number | null = null;

    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({ abi: POOL_MANAGER_ABI, data: log.data, topics: log.topics });
        if (event.eventName === "Swap") {
          const args = event.args as unknown as {
            id: `0x${string}`;
            amount0: bigint;
            amount1: bigint;
            tick: number;
            fee: number;
          };
          // A hook instance can serve many pools; only this pool's swap counts.
          if (args.id.toLowerCase() !== a.poolId.toLowerCase()) continue;
          appliedFee = Number(args.fee);
          amount0 = args.amount0.toString();
          amount1 = args.amount1.toString();
          tick = Number(args.tick);
        }
      } catch {
        // Not a PoolManager Swap log.
      }
    }

    return {
      ok: receipt.status === "success" && appliedFee !== null,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      atUnixSeconds,
      appliedFee,
      amount0,
      amount1,
      tick,
      previewedFee: detail.fee,
      previewedReason: detail.reason,
      failure: null,
    };
  } catch (err) {
    return {
      ok: false,
      txHash: null,
      blockNumber: null,
      atUnixSeconds,
      appliedFee: null,
      amount0: null,
      amount1: null,
      tick: null,
      previewedFee: detail.fee,
      previewedReason: detail.reason,
      failure: decodeRevert(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Guardian controls
// ---------------------------------------------------------------------------

export async function setPaused(clients: TinjauClients, value: boolean): Promise<`0x${string}`> {
  const guardian = clients.config.accounts.guardian;
  const wallet = clients.walletFor(guardian);
  const { request } = await clients.publicClient.simulateContract({
    account: guardian,
    address: clients.config.addresses.registry,
    abi: TINJAU_RISK_REGISTRY_ABI,
    functionName: "setPaused",
    args: [value],
  });
  const hash = await wallet.writeContract(request);
  await clients.publicClient.waitForTransactionReceipt({ hash });

  // Same reason as the post path. `postAssessment` checks `paused` before `cooldown`, so a
  // stale `paused == false` sends the transaction down a different branch entirely and the
  // scene would report a CooldownActive refusal where a ProtectionPaused one was induced.
  await waitForReadConsistency(
    () =>
      clients.publicClient.readContract({
        address: clients.config.addresses.registry,
        abi: TINJAU_RISK_REGISTRY_ABI,
        functionName: "paused",
      }) as Promise<boolean>,
    (p) => p === value,
    `setPaused(${value})`,
  );
  return hash;
}

// ---------------------------------------------------------------------------
// Asset remapping — declared, not hidden
// ---------------------------------------------------------------------------

export interface AssetRemap {
  canonicalAsset: `0x${string}`;
  deployedStandIn: `0x${string}`;
  chainId: number;
  note: string;
}

/**
 * Points a decided assessment at this chain's stand-in token.
 *
 * WHY THIS IS NEEDED AND WHY IT IS ONLY ONE FIELD. `decide()` resolves evidence to the canonical
 * asset identity — wNVDAx as deployed on X Layer mainnet, chain 196. The enforcement stack runs
 * on a different chain, where that token does not exist and the builder-controlled pool trades a
 * freely-mintable mock standing in for it. Something has to bridge the two, and doing it here,
 * explicitly, is better than teaching the decision engine about test deployments.
 *
 * Exactly ONE field changes: `asset`. Everything else — state, reason bits, confidence, data
 * mode, confirmation status, evidence commitment, timestamps, nonce, deadline — is whatever
 * `decide()` produced. `test/tinjauHarness.test.ts` asserts that no other field differs, so this
 * cannot quietly grow into a place where decisions get edited.
 *
 * The remap is recorded in the scene artifact. A stand-in must never be presentable as the real
 * asset.
 */
export function remapAssetForChain(
  assessment: AssessmentStruct,
  deployedStandIn: `0x${string}`,
  chainId: number,
): { assessment: AssessmentStruct; remap: AssetRemap } {
  return {
    assessment: { ...assessment, asset: deployedStandIn },
    remap: {
      canonicalAsset: assessment.asset,
      deployedStandIn,
      chainId,
      note:
        "The decision resolved the canonical asset on X Layer mainnet (chain 196). This chain " +
        "carries a freely-mintable mock standing in for it in a BUILDER-CONTROLLED pool. Only " +
        "the `asset` field was remapped; the decision itself is unmodified.",
    },
  };
}
