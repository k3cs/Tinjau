/**
 * X Layer Testnet (chain 1952) client wiring for the browser.
 *
 * Mirrors `apps/server/src/chain/client.ts` (not imported directly, because apps/server is a
 * separate package with no workspace link into apps/web, so the small pieces this app
 * needs are duplicated here rather than reaching across the package boundary).
 *
 * `viem/chains` does not ship chain 1952 (its `xLayerTestnet` export is the older chain
 * 195), so the chain is defined inline here, same as the server does.
 */
import { createPublicClient, http, type Chain } from "viem";

export const XLAYER_TESTNET_RPC_URL = "https://testrpc.xlayer.tech";
// Canonical form, verified 2026-08-17: the old "www.okx.com/web3/explorer/xlayer-test"
// path 301-redirects here. Both work in a browser, but this is the URL that actually
// resolves without an intermediate hop, so use it directly rather than relying on the redirect.
export const XLAYER_TESTNET_EXPLORER = "https://web3.okx.com/explorer/x-layer-testnet";

export const EVENT_STATE_REGISTRY_ADDRESS = "0x713f45f44e74616898FB366E11881196221933aA" as const;

export const xLayerTestnet: Chain = {
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: [XLAYER_TESTNET_RPC_URL] },
  },
  testnet: true,
};

let cachedClient: ReturnType<typeof createPublicClient> | undefined;

/** One shared browser-side public client, created lazily (SSR has no window/RPC need). */
export function getPublicClient() {
  if (!cachedClient) {
    cachedClient = createPublicClient({
      chain: xLayerTestnet,
      transport: http(XLAYER_TESTNET_RPC_URL),
    });
  }
  return cachedClient;
}

/** X Layer Testnet has an observed ~10% RPC failure rate, so retry every read through this. */
export async function withRpcRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 800): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

export function explorerTxUrl(hash: string): string {
  return `${XLAYER_TESTNET_EXPLORER}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${XLAYER_TESTNET_EXPLORER}/address/${address}`;
}
