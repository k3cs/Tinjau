/**
 * Posts a mapped `PipelineResult` to the live `EventStateRegistry` on X Layer Testnet
 * (task P1.8). Orchestrates: map -> gate on readyToPost -> preflight -> mint/approve bond
 * -> simulate -> write -> wait for receipt -> decode `eventId` from the `EventPosted` log.
 */

import { encodeFunctionData, formatEther, parseEventLogs } from "viem";
import { EVENT_STATE_REGISTRY_ABI, ERC20_ABI } from "./registryAbi.js";
import { getPublicClient, getWalletClient, getPosterAccount, getRegistryAddress, withRpcRetry } from "./client.js";
import { mapPipelineResultToPostArgs, type PostEventArgs } from "./mapEventToRegistry.js";
import type { PipelineResult } from "../pipeline.js";

export interface PostPipelineResultOptions {
  /** Bond amount in USD₮0 BASE UNITS (6 decimals) — e.g. 10_000_000n == 10.000000 USD₮0. */
  bondAmountBaseUnits: bigint;
  /** Post even if `result.agreement.readyToPost === false`. Preserves P1.4's "not
   * auto-posted" guarantee by default — only set this deliberately and note it loudly. */
  force?: boolean;
  /** Stop after building + printing args, before any preflight/tx. */
  dryRun?: boolean;
  network?: "testnet" | "mainnet";
}

export interface PostPipelineResultOutcome {
  args: PostEventArgs;
  dryRun: true;
}

export interface PostPipelineResultTxOutcome {
  args: PostEventArgs;
  dryRun: false;
  eventId: bigint;
  postTxHash: `0x${string}`;
  mintTxHash?: `0x${string}`;
  approveTxHash?: `0x${string}`;
  gasUsed: bigint;
}

export async function postPipelineResult(
  result: PipelineResult,
  opts: PostPipelineResultOptions,
): Promise<PostPipelineResultOutcome | PostPipelineResultTxOutcome> {
  const network = opts.network ?? "testnet";
  const args = mapPipelineResultToPostArgs(result, { network });

  if (!result.agreement.readyToPost && !opts.force) {
    throw new Error(
      `Refusing to post: result.agreement.readyToPost === false (flagReasons: ` +
        `${JSON.stringify(result.agreement.flagReasons)}). Pass force:true to override — ` +
        `this preserves P1.4's "not auto-posted" guarantee by default.`,
    );
  }
  if (!result.agreement.readyToPost && opts.force) {
    console.warn(
      `[postEvent] FORCING post despite readyToPost=false (flagReasons: ` +
        `${JSON.stringify(result.agreement.flagReasons)}) — force:true was explicitly set.`,
    );
  }

  if (opts.dryRun) {
    return { args, dryRun: true };
  }

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const account = getPosterAccount();
  const registryAddress = getRegistryAddress();

  // --- Preflight: poster identity, native balance, bond token address ---
  const onChainPoster = await withRpcRetry(() =>
    publicClient.readContract({ address: registryAddress, abi: EVENT_STATE_REGISTRY_ABI, functionName: "poster" }),
  );
  if (onChainPoster.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(
      `Preflight failed: local signer ${account.address} does not match registry.poster() ` +
        `${onChainPoster} — postEvent() would revert with NotPoster().`,
    );
  }

  const nativeBalance = await withRpcRetry(() => publicClient.getBalance({ address: account.address }));
  if (nativeBalance === 0n) {
    throw new Error(`Preflight failed: poster ${account.address} has 0 native OKB balance — cannot pay gas.`);
  }
  console.log(`[postEvent] preflight OK — poster=${account.address}, OKB balance=${formatEther(nativeBalance)}`);

  const bondTokenAddress = await withRpcRetry(() =>
    publicClient.readContract({ address: registryAddress, abi: EVENT_STATE_REGISTRY_ABI, functionName: "bondToken" }),
  );

  let mintTxHash: `0x${string}` | undefined;
  let approveTxHash: `0x${string}` | undefined;

  if (opts.bondAmountBaseUnits > 0n) {
    const balance = await withRpcRetry(() =>
      publicClient.readContract({
        address: bondTokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      }),
    );

    if (balance < opts.bondAmountBaseUnits) {
      const mintAmount = opts.bondAmountBaseUnits - balance;
      console.log(
        `[postEvent] bond token balance ${balance} < required ${opts.bondAmountBaseUnits} — minting ${mintAmount} to ${account.address}`,
      );
      mintTxHash = await withRpcRetry(() =>
        walletClient.writeContract({
          account,
          chain: walletClient.chain,
          address: bondTokenAddress,
          abi: ERC20_ABI,
          functionName: "mint",
          args: [account.address, mintAmount],
        }),
      );
      await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash: mintTxHash! }));
      console.log(`[postEvent] mint tx confirmed: ${mintTxHash}`);
    }

    const allowance = await withRpcRetry(() =>
      publicClient.readContract({
        address: bondTokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account.address, registryAddress],
      }),
    );

    if (allowance < opts.bondAmountBaseUnits) {
      console.log(`[postEvent] allowance ${allowance} < required ${opts.bondAmountBaseUnits} — approving`);
      approveTxHash = await withRpcRetry(() =>
        walletClient.writeContract({
          account,
          chain: walletClient.chain,
          address: bondTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [registryAddress, opts.bondAmountBaseUnits],
        }),
      );
      await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash: approveTxHash! }));
      console.log(`[postEvent] approve tx confirmed: ${approveTxHash}`);
    }
  }

  // --- Simulate, then write ---
  const postEventArgList = [
    args.token,
    args.eventType,
    args.eventTypeLabel,
    args.facts,
    args.agreement,
    args.severity,
    args.sourceUrl,
    args.sourceContentHash,
    args.nextEventDate,
    opts.bondAmountBaseUnits,
  ] as const;

  await withRpcRetry(() =>
    publicClient.simulateContract({
      account,
      address: registryAddress,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "postEvent",
      args: postEventArgList,
    }),
  );

  const postTxHash = await withRpcRetry(() =>
    walletClient.writeContract({
      account,
      chain: walletClient.chain,
      address: registryAddress,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "postEvent",
      args: postEventArgList,
    }),
  );
  console.log(`[postEvent] postEvent tx sent: ${postTxHash}`);

  const receipt = await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash: postTxHash }));

  const logs = parseEventLogs({ abi: EVENT_STATE_REGISTRY_ABI, eventName: "EventPosted", logs: receipt.logs });

  const eventPostedLog = logs.find((l) => l.eventName === "EventPosted");
  if (!eventPostedLog) {
    throw new Error(
      `postEvent tx ${postTxHash} confirmed (status ${receipt.status}) but no EventPosted log was found — ` +
        `cannot determine eventId. Inspect the tx manually.`,
    );
  }
  const eventId = eventPostedLog.args.eventId;

  console.log(`[postEvent] confirmed — eventId=${eventId}, gasUsed=${receipt.gasUsed}, status=${receipt.status}`);

  return {
    args,
    dryRun: false,
    eventId,
    postTxHash,
    mintTxHash,
    approveTxHash,
    gasUsed: receipt.gasUsed,
  };
}

export function encodePostEventCalldata(args: PostEventArgs, bondAmountBaseUnits: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: EVENT_STATE_REGISTRY_ABI,
    functionName: "postEvent",
    args: [
      args.token,
      args.eventType,
      args.eventTypeLabel,
      args.facts,
      args.agreement,
      args.severity,
      args.sourceUrl,
      args.sourceContentHash,
      args.nextEventDate,
      bondAmountBaseUnits,
    ],
  });
}
