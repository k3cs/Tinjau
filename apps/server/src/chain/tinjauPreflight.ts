/**
 * Pre-deployment check for a Tinjau testnet target.
 *
 * Answers, before anything is broadcast: is this the chain I think it is, do the wallets exist
 * and hold gas, do the contracts I intend to reuse actually have bytecode, and which addresses
 * will hold which role. Every one of those has failed silently at least once in this project's
 * history — a wrong chain id, an address with `codesize` 0, a role key that turned out to be the
 * same wallet as another.
 *
 * Prints ADDRESSES ONLY. No private key is printed, returned, or written.
 *
 * Usage:
 *   npx tsx src/chain/tinjauPreflight.ts
 */

import "dotenv/config";
import { fileURLToPath } from "node:url";
import { createPublicClient, defineChain, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { deriveRoleAddress, ROLE_KEY_DERIVATION_VERSION } from "./tinjauRoleKeys.js";

/** Testnet only. X Layer mainnet (196) is deliberately not on the list. */
const ALLOWED_CHAIN_IDS = new Set([31337, 1952]);

export function normalizeKey(raw: string | undefined, name: string): `0x${string}` {
  const value = raw?.trim();
  if (!value) throw new Error(`${name} is not set`);
  const withPrefix = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    // Shape only. Never the value, never a prefix, never a length.
    throw new Error(`${name} is set but is not a 0x-prefixed 32-byte hex string`);
  }
  return withPrefix as `0x${string}`;
}

async function main(): Promise<void> {
  const rpcUrl = process.env.TINJAU_RPC_URL?.trim() || "https://testrpc.xlayer.tech";
  const expectedChainId = Number(process.env.TINJAU_CHAIN_ID ?? 1952);
  if (!ALLOWED_CHAIN_IDS.has(expectedChainId)) {
    throw new Error(`chain ${expectedChainId} is not on the testnet allow-list`);
  }

  const posterKey = normalizeKey(process.env.POSTER_PRIVATE_KEY, "POSTER_PRIVATE_KEY");
  const relayerKey = normalizeKey(process.env.DEMO_RELAYER_PRIVATE_KEY, "DEMO_RELAYER_PRIVATE_KEY");

  const poster = privateKeyToAccount(posterKey);
  const relayer = privateKeyToAccount(relayerKey);
  // The assessor pays no gas — it only signs — so its key is derived rather than funded.
  const assessorAddress = deriveRoleAddress(posterKey, "assessor");

  const chain = defineChain({
    id: expectedChainId,
    name: `chain-${expectedChainId}`,
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    testnet: true,
  });
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, { retryCount: 5, retryDelay: 500, timeout: 30_000 }),
  });

  const actualChainId = await client.getChainId();
  console.log(`rpc            : ${rpcUrl}`);
  console.log(`chainId        : ${actualChainId} (expected ${expectedChainId})`);
  if (actualChainId !== expectedChainId) {
    throw new Error("chain id mismatch — refusing to proceed");
  }

  console.log(`role derivation: ${ROLE_KEY_DERIVATION_VERSION}`);
  for (const [role, address] of Object.entries({
    "poster + guardian + deployer": poster.address,
    "swap relayer": relayer.address,
    "assessor (derived, no gas needed)": assessorAddress,
  })) {
    const balance = await client.getBalance({ address: address as `0x${string}` });
    console.log(`${role.padEnd(34)}: ${address}  ${formatEther(balance)} OKB`);
  }

  const reuse: Record<string, string> = {
    POOL_MANAGER: process.env.POOL_MANAGER ?? "0x8F862A8b6f00C99b0610dc764228C661c4909ae1",
    RISK_ASSET: process.env.RISK_ASSET ?? "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
    QUOTE_ASSET: process.env.QUOTE_ASSET ?? "0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99",
  };
  for (const [name, address] of Object.entries(reuse)) {
    const code = await client.getCode({ address: address as `0x${string}` });
    const size = code && code !== "0x" ? (code.length - 2) / 2 : 0;
    console.log(`${name.padEnd(34)}: ${address}  codeSize=${size}${size === 0 ? "  <-- NO BYTECODE" : ""}`);
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
