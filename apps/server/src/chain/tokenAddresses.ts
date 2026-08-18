/**
 * Maps an off-chain tokenised-equity `tokenSymbol` (from `src/config/tickers.ts`) to the
 * on-chain address AFTERHOURS posts events against.
 *
 * `EventStateRegistry.token` is a pure identifier — verified against
 * `contracts/src/EventStateRegistry.sol`: it's used only in the `token == address(0)`
 * guard, as the `latestEventIdForToken` mapping key, and as an indexed event topic. No
 * external call is ever made on it. So on mainnet the "real" wrapped-equity address is a
 * safe, meaningful label to post.
 *
 * On testnet 1952 that's mostly still true EXCEPT for one consumer: `AfterhoursFeeHook`
 * keys its registry lookup on the pool's actual CURRENCY addresses. The one testnet demo
 * pool deployed (`contracts/broadcast/DeployTestnetHookAndPool.s.sol/1952/run-latest.json`)
 * pairs `mockWNVDAx` (`0xf07A9D89848bc694c7154Fda4cce707Eb409F903`, 18 decimals) against a
 * mock quote token — NOT the mainnet NVDAx address. So a later task that wants the hook to
 * visibly react to a posted event on testnet must post `token = mockWNVDAx`, not the
 * mainnet label, or the hook's lookup will simply miss.
 *
 * MSTRx has no deployed testnet pool at all, so its testnet row is just the mainnet label
 * — posting against it is a valid identifier, but nothing on testnet currently reads it
 * for a currency match.
 *
 * `testnet` defaults to the mainnet address (label-only) unless overridden by env, so new
 * symbols don't need a code change to get *a* postable testnet address, just an
 * intentional one when a real testnet pool exists for it.
 */

import { getAddress } from "viem";

export interface TokenAddressEntry {
  /** Real mainnet wrapped-equity token address (verified live, used as a semantic label). */
  mainnet: `0x${string}`;
  /** Address to actually post `token =` on X Layer Testnet (chain 1952). */
  testnet: `0x${string}`;
}

const MAINNET_ADDRESSES: Record<string, `0x${string}`> = {
  MSTRx: "0xae2f842ef90c0d5213259ab82639d5bbf649b08e",
  NVDAx: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
};

/**
 * Testnet overrides — only set where a real testnet pool exists for the symbol so the
 * hook's currency-keyed lookup actually resolves. `mockWNVDAx` verified live in
 * `contracts/broadcast/DeployTestnetHookAndPool.s.sol/1952/run-latest.json`
 * (AfterhoursFeeHook pool key `currency1`).
 */
const TESTNET_OVERRIDES: Record<string, `0x${string}` | undefined> = {
  NVDAx: (process.env.NVDAX_TESTNET_ADDRESS as `0x${string}` | undefined) ?? "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
  MSTRx: process.env.MSTRX_TESTNET_ADDRESS as `0x${string}` | undefined,
};

/**
 * Resolves the on-chain address to post `token =` for a given off-chain `tokenSymbol` and
 * network. Throws for unknown symbols rather than silently returning a zero-ish value —
 * `postEvent` reverts on `address(0)` anyway, but failing here gives a clearer error.
 */
export function resolveTokenAddress(tokenSymbol: string, network: "testnet" | "mainnet"): `0x${string}` {
  const mainnet = MAINNET_ADDRESSES[tokenSymbol];
  if (!mainnet) {
    throw new Error(
      `No known token address mapping for tokenSymbol "${tokenSymbol}" — add it to ` +
        `MAINNET_ADDRESSES in src/chain/tokenAddresses.ts before posting.`,
    );
  }
  const raw = network === "mainnet" ? mainnet : (TESTNET_OVERRIDES[tokenSymbol] ?? mainnet);
  return getAddress(raw);
}

/**
 * Reverse of `resolveTokenAddress` — built from the exact same two tables so it can never
 * drift out of sync with them (task P5.3, tweet composition needs a symbol to post given
 * only the on-chain `token` address). Case-insensitive address comparison via `getAddress`
 * checksumming. Returns `undefined` for an address that isn't a currently-known mapping
 * for the given network (e.g. a stale/overridden testnet address from an old deploy).
 */
export function resolveSymbolForAddress(address: `0x${string}`, network: "testnet" | "mainnet"): string | undefined {
  const target = getAddress(address);
  for (const tokenSymbol of Object.keys(MAINNET_ADDRESSES)) {
    const candidate = network === "mainnet" ? MAINNET_ADDRESSES[tokenSymbol] : (TESTNET_OVERRIDES[tokenSymbol] ?? MAINNET_ADDRESSES[tokenSymbol]);
    if (getAddress(candidate) === target) return tokenSymbol;
  }
  return undefined;
}
