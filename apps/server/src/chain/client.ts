/**
 * Chain client wiring for X Layer Testnet (chain 1952) — task P1.8.
 *
 * `viem/chains` does not include chain 1952: its exported `xLayerTestnet` is the old
 * chain 195. Defined inline here, verified live via `cast chain-id` against
 * `https://testrpc.xlayer.tech` on 2026-08-17/2026-08-16 (returns `1952`).
 *
 * Deploy receipts on this chain are `type: 0x2` (EIP-1559) — viem's default fee
 * estimation logic works as-is, no legacy-tx workaround needed.
 */

import "dotenv/config";
import { createPublicClient, createWalletClient, http, type Chain, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

const DEFAULT_RPC_URL = "https://testrpc.xlayer.tech";

/** Registry address deployed by contracts/script/DeployTestnetRegistry.s.sol on chain 1952. */
export const DEFAULT_EVENT_STATE_REGISTRY_ADDRESS = "0x713f45f44e74616898FB366E11881196221933aA" as const;

export function getRpcUrl(): string {
  return process.env.XLAYER_TESTNET_RPC_URL?.trim() || DEFAULT_RPC_URL;
}

export function getRegistryAddress(): `0x${string}` {
  return (process.env.EVENT_STATE_REGISTRY_ADDRESS?.trim() as `0x${string}` | undefined) ?? DEFAULT_EVENT_STATE_REGISTRY_ADDRESS;
}

export const xLayerTestnet: Chain = {
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: [DEFAULT_RPC_URL] },
  },
  testnet: true,
};

let cachedPublicClient: PublicClient | undefined;

export function getPublicClient(): PublicClient {
  if (!cachedPublicClient) {
    cachedPublicClient = createPublicClient({
      chain: xLayerTestnet,
      transport: http(getRpcUrl()),
    });
  }
  return cachedPublicClient;
}

/** Reads `POSTER_PRIVATE_KEY` from the environment and derives the signer account. */
export function getPosterAccount(): PrivateKeyAccount {
  const raw = process.env.POSTER_PRIVATE_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "POSTER_PRIVATE_KEY not set — required to sign postEvent() transactions. Set it in " +
        "the root .env (see apps/server/.env.example).",
    );
  }
  const pk = raw.trim().startsWith("0x") ? raw.trim() : `0x${raw.trim()}`;
  try {
    return privateKeyToAccount(pk as `0x${string}`);
  } catch (err) {
    throw new Error(
      `POSTER_PRIVATE_KEY is set but malformed (expected a 32-byte hex private key): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

let cachedWalletClient: WalletClient | undefined;

export function getWalletClient(): WalletClient {
  if (!cachedWalletClient) {
    cachedWalletClient = createWalletClient({
      account: getPosterAccount(),
      chain: xLayerTestnet,
      transport: http(getRpcUrl()),
    });
  }
  return cachedWalletClient;
}

/**
 * Reads `DEMO_RELAYER_PRIVATE_KEY` from the environment and derives the signer account
 * (task P4.4). All swaps use this key rather than `POSTER_PRIVATE_KEY` — it proves a
 * non-poster third party pays the widened fee (matching the eventual P6.2 relayer
 * pattern) and reserves the poster's OKB balance for registry-posting gas only.
 */
export function getDemoRelayerAccount(): PrivateKeyAccount {
  const raw = process.env.DEMO_RELAYER_PRIVATE_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "DEMO_RELAYER_PRIVATE_KEY not set — required to sign swap transactions. Set it in " +
        "the root .env (see apps/server/.env.example).",
    );
  }
  const pk = raw.trim().startsWith("0x") ? raw.trim() : `0x${raw.trim()}`;
  try {
    return privateKeyToAccount(pk as `0x${string}`);
  } catch (err) {
    throw new Error(
      `DEMO_RELAYER_PRIVATE_KEY is set but malformed (expected a 32-byte hex private key): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

const walletClientCacheByAddress = new Map<string, WalletClient>();

/**
 * Like `getWalletClient()`, but bound to an arbitrary already-derived account instead of
 * always the poster (task P4.4 — swaps sign with the demo-relayer account). Caches one
 * client per account address so repeated calls in the same process reuse the same
 * underlying viem client.
 */
export function getWalletClientFor(account: PrivateKeyAccount): WalletClient {
  const key = account.address.toLowerCase();
  let client = walletClientCacheByAddress.get(key);
  if (!client) {
    client = createWalletClient({
      account,
      chain: xLayerTestnet,
      transport: http(getRpcUrl()),
    });
    walletClientCacheByAddress.set(key, client);
  }
  return client;
}

export interface RetryOptions {
  retries: number;
  delayMs: number;
}

const DEFAULT_RPC_RETRY_OPTIONS: RetryOptions = { retries: 3, delayMs: 1000 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an RPC call on failure — X Layer Testnet has an observed ~10% RPC failure rate
 * (spec §7), so every read/write in the P1.8 flow should go through this wrapper rather
 * than calling viem directly.
 */
export async function withRpcRetry<T>(fn: () => Promise<T>, opts: RetryOptions = DEFAULT_RPC_RETRY_OPTIONS): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= opts.retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < opts.retries) {
        await sleep(opts.delayMs);
      }
    }
  }
  throw lastError;
}
