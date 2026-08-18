/**
 * Hand-written `as const` ABI mirrors for the Uniswap v4 contracts task P4.4 talks to on
 * X Layer Testnet (chain 1952) — style matches `registryAbi.ts`. Only the
 * functions/events this codebase actually calls are included.
 *
 * Signatures verified against:
 *   - `contracts/src/AfterhoursFeeHook.sol` (`previewFee`, `baseFee`, `maxFee`,
 *     `widenDuration`, `decayDuration`, `registry`, `poolManager`)
 *   - `contracts/lib/v4-core/src/interfaces/IPoolManager.sol` (`Swap` event)
 *   - `contracts/lib/v4-core/src/test/PoolSwapTest.sol` (`swap(...)`)
 *   - `contracts/src/mocks/MockERC20.sol` (`mint`, `approve`, `allowance`, `balanceOf`,
 *     `decimals`)
 *
 * If any of those source files change, update this file to match.
 */

const poolKeyComponents = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

export const AFTERHOURS_HOOK_ABI = [
  {
    type: "function",
    name: "previewFee",
    stateMutability: "view",
    inputs: [{ name: "key", type: "tuple", components: poolKeyComponents }],
    outputs: [{ name: "", type: "uint24" }],
  },
  {
    type: "function",
    name: "baseFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint24" }],
  },
  {
    type: "function",
    name: "maxFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint24" }],
  },
  {
    type: "function",
    name: "widenDuration",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decayDuration",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "registry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "poolManager",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Only the `Swap` event — this codebase never calls PoolManager's functions directly, only
 * decodes the event a `PoolSwapTest.swap(...)` transaction emits. */
export const POOL_MANAGER_ABI = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount0", type: "int128", indexed: false },
      { name: "amount1", type: "int128", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "tick", type: "int24", indexed: false },
      { name: "fee", type: "uint24", indexed: false },
    ],
  },
] as const;

export const POOL_SWAP_TEST_ABI = [
  {
    type: "function",
    name: "swap",
    stateMutability: "payable",
    inputs: [
      { name: "key", type: "tuple", components: poolKeyComponents },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      {
        name: "testSettings",
        type: "tuple",
        components: [
          { name: "takeClaims", type: "bool" },
          { name: "settleUsingBurn", type: "bool" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
  },
] as const;

/** Minimal ERC-20 ABI for the mock wNVDAx/USDG tokens — mirrors `registryAbi.ts`'s
 * `ERC20_ABI` plus `decimals`, which `swapOnce.ts` needs to size mint amounts correctly
 * across the two mocks' differing decimals (USDG 6, wNVDAx 18). */
export const MOCK_ERC20_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
