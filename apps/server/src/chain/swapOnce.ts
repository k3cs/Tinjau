/**
 * Executes one real swap against the P4.2 demo pool via `PoolSwapTest` on X Layer Testnet
 * (task P4.4). Signs with the demo-relayer key (never the poster key) — see
 * `client.ts::getDemoRelayerAccount`.
 *
 * Usage:
 *   tsx src/chain/swapOnce.ts --amount <raw> --direction one-for-zero|zero-for-one \
 *     --label <text> [--expect-fee <n>]
 *
 * `--amount` is the raw (base-unit) exact-input amount. `one-for-zero` sells currency1
 * (mock wNVDAx, 18 decimals) for currency0 (mock USDG, 6 decimals); `zero-for-one` sells
 * currency0 for currency1.
 *
 * `PoolSwapTest.swap()`'s callback settles debts via `CurrencySettler.settle()`, which — for
 * an ERC20 currency and a payer other than the router itself — calls
 * `IERC20Minimal(token).transferFrom(payer, address(manager), amount)` (verified in
 * `contracts/lib/v4-core/test/utils/CurrencySettler.sol`). `CurrencySettler` is a Solidity
 * `library` whose `internal` functions get inlined into the caller's bytecode (no
 * delegatecall) — so when this `transferFrom` executes, `msg.sender` as seen by the ERC20
 * token is `PoolSwapTest` (the router), NOT `PoolManager`, even though `PoolManager` is the
 * `to` address. So the ERC20 approval this script grants must be to the **`PoolSwapTest`
 * router**, not to `PoolManager` — confirmed empirically: approving `PoolManager` first
 * produced an on-chain `insufficient allowance` revert from the swap itself.
 *
 * Exit code 1 on `--expect-fee` mismatch, or on any failure.
 */

import "dotenv/config";
import { parseEventLogs } from "viem";
import { getDemoRelayerAccount, getPublicClient, getRegistryAddress, getWalletClientFor, withRpcRetry } from "./client.js";
import { TINJAU_HOOK_ABI, MOCK_ERC20_ABI, POOL_MANAGER_ABI, POOL_SWAP_TEST_ABI } from "./poolAbi.js";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE, getAfterhoursHookAddress, getPoolKey, getPoolManagerAddress, getPoolSwapRouterAddress } from "./poolConfig.js";
import { EVENT_STATE_REGISTRY_ABI } from "./registryAbi.js";
import { computeFee, type EventTypeValue } from "./expectedFee.js";

const EXPLORER_BASE = "https://www.okx.com/web3/explorer/xlayer-test";

type Direction = "one-for-zero" | "zero-for-one";

interface CliArgs {
  amount: bigint;
  direction: Direction;
  label: string;
  expectFee?: bigint;
}

function parseArgs(argv: string[]): CliArgs {
  let amount: bigint | undefined;
  let direction: Direction | undefined;
  let label: string | undefined;
  let expectFee: bigint | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--amount":
        amount = BigInt(argv[++i]);
        break;
      case "--direction": {
        const d = argv[++i];
        if (d !== "one-for-zero" && d !== "zero-for-one") {
          throw new Error(`--direction must be "one-for-zero" or "zero-for-one", got "${d}"`);
        }
        direction = d;
        break;
      }
      case "--label":
        label = argv[++i];
        break;
      case "--expect-fee":
        expectFee = BigInt(argv[++i]);
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (amount === undefined || !direction || !label) {
    throw new Error(
      "Usage: tsx src/chain/swapOnce.ts --amount <raw> --direction one-for-zero|zero-for-one --label <text> [--expect-fee <n>]",
    );
  }
  return { amount, direction, label, expectFee };
}

/**
 * Independently recomputes the policy's fee prediction for the current pool/registry
 * state at a given block, using the pure `expectedFee.ts` reimplementation rather than
 * trusting the hook's own `previewFee()` output — this is what proves the emitted fee
 * matches the policy's math, not just the hook's self-report.
 */
async function computeExpectedFeeAtBlock(blockNumber: bigint): Promise<bigint> {
  const publicClient = getPublicClient();
  const key = getPoolKey();
  const hookAddress = getAfterhoursHookAddress();
  const registryAddress = getRegistryAddress();

  const [baseFee, maxFee, widenDuration, decayDuration] = await Promise.all([
    withRpcRetry(() =>
      publicClient.readContract({ address: hookAddress, abi: TINJAU_HOOK_ABI, functionName: "baseFee", blockNumber }),
    ),
    withRpcRetry(() =>
      publicClient.readContract({ address: hookAddress, abi: TINJAU_HOOK_ABI, functionName: "maxFee", blockNumber }),
    ),
    withRpcRetry(() =>
      publicClient.readContract({ address: hookAddress, abi: TINJAU_HOOK_ABI, functionName: "widenDuration", blockNumber }),
    ),
    withRpcRetry(() =>
      publicClient.readContract({ address: hookAddress, abi: TINJAU_HOOK_ABI, functionName: "decayDuration", blockNumber }),
    ),
  ]);

  // Both pool currencies are checked against the registry, matching
  // AfterhoursFeeHook._resolveRelevantEvent — in the P4.2 demo topology only currency1
  // (mock wNVDAx) is ever expected to carry an event, but check both for correctness.
  const [id0, id1] = await Promise.all([
    withRpcRetry(() =>
      publicClient.readContract({
        address: registryAddress,
        abi: EVENT_STATE_REGISTRY_ABI,
        functionName: "latestEventIdForToken",
        args: [key.currency0],
        blockNumber,
      }),
    ),
    withRpcRetry(() =>
      publicClient.readContract({
        address: registryAddress,
        abi: EVENT_STATE_REGISTRY_ABI,
        functionName: "latestEventIdForToken",
        args: [key.currency1],
        blockNumber,
      }),
    ),
  ]);

  let eventId = 0n;
  if (id0 !== 0n && id1 !== 0n) {
    const [e0, e1] = await Promise.all([
      withRpcRetry(() =>
        publicClient.readContract({ address: registryAddress, abi: EVENT_STATE_REGISTRY_ABI, functionName: "getEvent", args: [id0], blockNumber }),
      ),
      withRpcRetry(() =>
        publicClient.readContract({ address: registryAddress, abi: EVENT_STATE_REGISTRY_ABI, functionName: "getEvent", args: [id1], blockNumber }),
      ),
    ]);
    eventId = e0.timestamp >= e1.timestamp ? id0 : id1;
  } else if (id0 !== 0n) {
    eventId = id0;
  } else if (id1 !== 0n) {
    eventId = id1;
  }

  if (eventId === 0n) {
    return BigInt(baseFee); // matches computeFee(hasEvent=false) === baseFee
  }

  const summary = await withRpcRetry(() =>
    publicClient.readContract({ address: registryAddress, abi: EVENT_STATE_REGISTRY_ABI, functionName: "getEventSummary", args: [eventId], blockNumber }),
  );
  const [eventType, agreement, severity, timestamp, isDisputedUnresolved] = summary;
  const block = await withRpcRetry(() => publicClient.getBlock({ blockNumber }));

  return computeFee({
    eventType: eventType as EventTypeValue,
    agreement,
    severity,
    isDisputedUnresolved,
    eventTimestamp: timestamp,
    hasEvent: true,
    nowTimestamp: block.timestamp,
    baseFee: BigInt(baseFee),
    maxFee: BigInt(maxFee),
    widenDuration: BigInt(widenDuration),
    decayDuration: BigInt(decayDuration),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const account = getDemoRelayerAccount();
  const walletClient = getWalletClientFor(account);
  const publicClient = getPublicClient();

  const key = getPoolKey();
  const poolManagerAddress = getPoolManagerAddress();
  const hookAddress = getAfterhoursHookAddress();
  const routerAddress = getPoolSwapRouterAddress();

  const zeroForOne = args.direction === "zero-for-one";
  const inputToken = zeroForOne ? key.currency0 : key.currency1;
  const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n;

  // --- Preflight: relayer identity, native balance ---
  const nativeBalance = await withRpcRetry(() => publicClient.getBalance({ address: account.address }));
  if (nativeBalance === 0n) {
    throw new Error(`Preflight failed: demo-relayer ${account.address} has 0 native OKB balance — cannot pay gas.`);
  }
  console.log(`[swapOnce] preflight OK — relayer=${account.address}, OKB balance=${nativeBalance}`);

  // --- Mint/approve input token if short ---
  const balance = await withRpcRetry(() =>
    publicClient.readContract({ address: inputToken, abi: MOCK_ERC20_ABI, functionName: "balanceOf", args: [account.address] }),
  );
  if (balance < args.amount) {
    const mintAmount = args.amount - balance;
    console.log(`[swapOnce] input token balance ${balance} < required ${args.amount} — minting ${mintAmount}`);
    const mintTxHash = await withRpcRetry(() =>
      walletClient.writeContract({
        account,
        chain: walletClient.chain,
        address: inputToken,
        abi: MOCK_ERC20_ABI,
        functionName: "mint",
        args: [account.address, mintAmount],
      }),
    );
    await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash: mintTxHash }));
    console.log(`[swapOnce] mint tx confirmed: ${mintTxHash}`);
  }

  // Approval target is the PoolSwapTest router, NOT the PoolManager — see module doc.
  const allowance = await withRpcRetry(() =>
    publicClient.readContract({
      address: inputToken,
      abi: MOCK_ERC20_ABI,
      functionName: "allowance",
      args: [account.address, routerAddress],
    }),
  );
  if (allowance < args.amount) {
    console.log(`[swapOnce] allowance to router ${allowance} < required ${args.amount} — approving`);
    const approveTxHash = await withRpcRetry(() =>
      walletClient.writeContract({
        account,
        chain: walletClient.chain,
        address: inputToken,
        abi: MOCK_ERC20_ABI,
        functionName: "approve",
        args: [routerAddress, args.amount],
      }),
    );
    await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash: approveTxHash }));
    console.log(`[swapOnce] approve tx confirmed: ${approveTxHash}`);
  }

  // --- Read previewFee before the swap ---
  const previewFee = await withRpcRetry(() =>
    publicClient.readContract({ address: hookAddress, abi: TINJAU_HOOK_ABI, functionName: "previewFee", args: [key] }),
  );
  console.log(`[swapOnce] hook.previewFee(key) = ${previewFee}`);

  const swapParams = {
    zeroForOne,
    amountSpecified: -args.amount, // negative = exact input, per v4 convention
    sqrtPriceLimitX96,
  } as const;
  const testSettings = { takeClaims: false, settleUsingBurn: false } as const;
  const swapArgs = [key, swapParams, testSettings, "0x"] as const;

  // --- Simulate, then write ---
  await withRpcRetry(() =>
    publicClient.simulateContract({
      account,
      address: routerAddress,
      abi: POOL_SWAP_TEST_ABI,
      functionName: "swap",
      args: swapArgs,
    }),
  );

  const swapTxHash = await withRpcRetry(() =>
    walletClient.writeContract({
      account,
      chain: walletClient.chain,
      address: routerAddress,
      abi: POOL_SWAP_TEST_ABI,
      functionName: "swap",
      args: swapArgs,
    }),
  );
  console.log(`[swapOnce] swap tx sent: ${swapTxHash}`);

  const receipt = await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash: swapTxHash }));

  const swapLogs = parseEventLogs({ abi: POOL_MANAGER_ABI, eventName: "Swap", logs: receipt.logs }).filter(
    (l) => l.address.toLowerCase() === poolManagerAddress.toLowerCase(),
  );
  const swapLog = swapLogs[0];
  if (!swapLog) {
    throw new Error(`swap tx ${swapTxHash} confirmed (status ${receipt.status}) but no Swap log from PoolManager was found.`);
  }

  const { amount0, amount1, sqrtPriceX96, liquidity, tick, fee } = swapLog.args;
  // amount0/amount1 follow the SWAPPER's balance-change convention (same sign as the
  // BalanceDelta returned to the caller, and as `amountSpecified` itself): negative = the
  // swapper pays that amount, positive = the swapper receives it. Confirmed empirically
  // against the baseline swap's live event data — IPoolManager.sol's doc comment ("delta of
  // the currency balance of the pool") reads as the opposite sign convention, but the
  // observed values (amount1 === amountSpecified exactly, amount0 positive on a swap that
  // nets currency0 in) only make sense under the swapper-perspective convention used here.
  const amountIn = zeroForOne ? -amount0 : -amount1;
  const amountOut = zeroForOne ? amount1 : amount0;

  // `fee` decodes as a JS `number` (uint24, <=48 bits) — compare against the bigint CLI
  // arg via BigInt() rather than `!==`, which would always be true across types.
  const feeMismatch = args.expectFee !== undefined && BigInt(fee) !== args.expectFee;
  if (feeMismatch) {
    console.error(`[swapOnce] FEE MISMATCH: expected ${args.expectFee}, emitted ${fee}`);
  }

  // --- Independently recompute the policy's expected fee via expectedFee.ts, using the
  // exact block the swap landed in, so the evidence block proves "exactly the fee the
  // policy predicts" rather than just "some fee changed". ---
  const expectedFee = await computeExpectedFeeAtBlock(receipt.blockNumber);

  console.log(`\n=== EVIDENCE BLOCK (P4.4 swap: ${args.label}) ===`);
  console.log(`label: ${args.label}`);
  console.log(`direction: ${args.direction}`);
  console.log(`txHash: ${swapTxHash}`);
  console.log(`txExplorer: ${EXPLORER_BASE}/tx/${swapTxHash}`);
  console.log(`block: ${receipt.blockNumber}`);
  console.log(`amountIn (raw): ${amountIn}`);
  console.log(`amountOut (raw): ${amountOut}`);
  console.log(`emittedFee: ${fee}`);
  console.log(`previewFee (pre-swap): ${previewFee}`);
  console.log(`expectedFee (expectedFee.ts, recomputed independently): ${expectedFee}`);
  console.log(`sqrtPriceX96 (post-swap): ${sqrtPriceX96}`);
  console.log(`liquidity (post-swap): ${liquidity}`);
  console.log(`tick (post-swap): ${tick}`);
  console.log(`gasUsed: ${receipt.gasUsed}`);
  console.log(`=== END EVIDENCE BLOCK ===\n`);

  if (feeMismatch) {
    console.error(`[swapOnce] --expect-fee ${args.expectFee} did not match emitted fee ${fee} — exiting 1.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[swapOnce] failed:", err);
  process.exit(1);
});
