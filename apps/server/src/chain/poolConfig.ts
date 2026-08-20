/**
 * Verified addresses/constants for the P4.2 testnet demo pool (X Layer Testnet, chain
 * 1952) — the pool task P4.4's synthetic-injection test swaps against.
 *
 * Every default below was re-verified live during P4.4 planning/execution: `cast call`
 * against the deployed contracts, and cross-checked against
 * `contracts/broadcast/DeployTestnetHookAndPool.s.sol/1952/run-latest.json` and
 * `contracts/broadcast/DeployTestnetInfra.s.sol/1952/run-latest.json`. Matches
 * `client.ts`'s existing pattern: hardcoded default, overridable by env var.
 */

import type { Address } from "viem";

function envAddress(name: string, fallback: Address): Address {
  const raw = process.env[name]?.trim();
  return (raw && raw.length > 0 ? raw : fallback) as Address;
}

/** v4 PoolManager deployed by contracts/script/DeployTestnetInfra.s.sol (task P0.5). */
export function getPoolManagerAddress(): Address {
  return envAddress("POOL_MANAGER", "0x8F862A8b6f00C99b0610dc764228C661c4909ae1");
}

/** AfterhoursFeeHook deployed by contracts/script/DeployTestnetHookAndPool.s.sol (P4.2). */
export function getAfterhoursHookAddress(): Address {
  return envAddress("TINJAU_HOOK_ADDRESS", "0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080");
}

/** Mock wNVDAx (18 decimals) — currency1 of the demo pool, the token the hook resolves
 * registry events against for this pool (see tokenAddresses.ts). */
export function getMockWNvdaxAddress(): Address {
  return envAddress("MOCK_WNVDAX", "0xf07A9D89848bc694c7154Fda4cce707Eb409F903");
}

/** Mock USDG (6 decimals) — currency0 of the demo pool. */
export function getMockUsdgAddress(): Address {
  return envAddress("MOCK_USDG", "0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99");
}

/** PoolSwapTest router — deployed fresh for task P4.4 (P4.2 only deployed the liquidity
 * router). Must be set via POOL_SWAP_ROUTER once contracts/script/DeployTestnetSwapRouter.s.sol
 * has been run; no hardcoded default exists because none was deployed before this task. */
export function getPoolSwapRouterAddress(): Address {
  const raw = process.env.POOL_SWAP_ROUTER?.trim();
  if (!raw) {
    throw new Error(
      "POOL_SWAP_ROUTER not set — deploy contracts/script/DeployTestnetSwapRouter.s.sol first " +
        "and set POOL_SWAP_ROUTER in the root .env to the deployed address.",
    );
  }
  return raw as Address;
}

export interface VerifiedPoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

/** The exact PoolKey of the P4.2 demo pool, re-verified live (chain 1952). currency0 <
 * currency1 by address (v4 requirement) — USDG (0x666e...) < wNVDAx (0xf07A...), so wNVDAx
 * is currency1. `fee` is `LPFeeLibrary.DYNAMIC_FEE_FLAG` (0x800000 = 8388608), required for
 * a dynamic-fee pool for the hook's beforeSwap fee override to be honored. */
export function getPoolKey(): VerifiedPoolKey {
  return {
    currency0: getMockUsdgAddress(),
    currency1: getMockWNvdaxAddress(),
    fee: 8_388_608, // 0x800000, LPFeeLibrary.DYNAMIC_FEE_FLAG
    tickSpacing: 60,
    hooks: getAfterhoursHookAddress(),
  };
}

/** Uniswap v4 TickMath.MIN_SQRT_PRICE — verified against
 * contracts/lib/v4-core/src/libraries/TickMath.sol. */
export const MIN_SQRT_PRICE = 4295128739n;

/** Uniswap v4 TickMath.MAX_SQRT_PRICE — verified against
 * contracts/lib/v4-core/src/libraries/TickMath.sol. */
export const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;
