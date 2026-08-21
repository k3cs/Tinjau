/**
 * Off-chain ticker -> on-chain address mapping, mirrored from
 * `apps/server/src/chain/tokenAddresses.ts` (see that file for the full mainnet/testnet
 * rationale, reproduced in short form here).
 *
 * Only NVDAx and MSTRx are live-polled tickers today. NVDAx has a real testnet mock
 * contract deployed (`mockWNVDAx`); MSTRx's testnet slot falls back to its mainnet LABEL
 * address, which has zero bytecode on chain 1952, so a balance read against it will not
 * decode, and the UI must disclose that plainly rather than silently showing "0".
 */

export interface TrackedToken {
  symbol: string;
  /** Real mainnet wrapped-equity address, shown as the canonical identity of the token. */
  mainnet: `0x${string}`;
  /** Address actually queried on X Layer Testnet (chain 1952). */
  testnet: `0x${string}`;
  /** False when `testnet` has no deployed bytecode (mainnet-label-only placeholder). */
  testnetContractLive: boolean;
}

export const TRACKED_TOKENS: TrackedToken[] = [
  {
    symbol: "NVDAx",
    mainnet: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
    testnet: "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
    testnetContractLive: true,
  },
  {
    symbol: "MSTRx",
    mainnet: "0xae2f842ef90c0d5213259ab82639d5bbf649b08e",
    testnet: "0xae2f842ef90c0d5213259ab82639d5bbf649b08e",
    testnetContractLive: false,
  },
];

/** Configured but not yet polled, so a lookup involving these degrades to "not yet tracked". */
export const NOT_YET_TRACKED_TICKERS = [
  "AAPL",
  "GOOGL",
  "TSLA",
  "META",
  "SNDK",
  "CRCL",
  "COIN",
  "AMZN",
];

export function findTrackedTokenByTestnetAddress(address: string): TrackedToken | undefined {
  const lower = address.toLowerCase();
  return TRACKED_TOKENS.find((t) => t.testnet.toLowerCase() === lower);
}

export function findTrackedTokenBySymbol(symbol: string): TrackedToken | undefined {
  return TRACKED_TOKENS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}
