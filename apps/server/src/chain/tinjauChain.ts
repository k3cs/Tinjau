/**
 * Chain-agnostic wiring for the Tinjau enforcement stack (tasks T4.2–T4.5).
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS EXISTS ALONGSIDE `client.ts`.
 *
 * `client.ts` is the historical AFTERHOURS wiring. It hardcodes chain 1952, reads its RPC URL
 * and its keys from fixed environment variables, and memoises one public client per process.
 * That is fine for a poster that only ever talks to one chain, and it is deployed evidence, so
 * it is not touched here.
 *
 * The T4.2–T4.5 harness has a different requirement: the SAME code must run against a local
 * Anvil today and against X Layer Testnet afterwards, with only an RPC URL, a chain id, and a
 * set of addresses changing. A module-level cache keyed to one chain makes that impossible to
 * do honestly — the second run would silently reuse the first chain's client. So everything
 * here takes its configuration as an argument and caches nothing globally.
 *
 * If a future run needs a code change to point at a different chain, the harness was not
 * chain-agnostic and that is a finding, not something to patch in place.
 * ---------------------------------------------------------------------------------------
 *
 * KEY HANDLING. Private keys enter only through `TinjauAccounts`, are never logged, never
 * serialised into a manifest, and never written to a file. `describeConfig()` exists precisely
 * so that a caller wanting to print its configuration cannot reach a key by accident: it
 * returns addresses only.
 */

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Every address the harness needs. All supplied; none defaulted to a deployed constant. */
export interface TinjauAddresses {
  registry: `0x${string}`;
  hook: `0x${string}`;
  poolManager: `0x${string}`;
  swapRouter: `0x${string}`;
  liquidityRouter: `0x${string}`;
  riskAsset: `0x${string}`;
  quoteAsset: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  poolId: `0x${string}`;
  tickSpacing: number;
}

/** The fee envelope the deployed registry actually published. Read back, never assumed. */
export interface TinjauEnvelope {
  baseFee: number;
  maxFee: number;
  widenDuration: number;
  decayDuration: number;
  maxProtectDuration: number;
  cooldown: number;
  /** True when the stack was deployed with the compressed demo timings. */
  demoEnvelope: boolean;
}

export interface TinjauAccounts {
  /** Signs assessments. Its address must equal `registry.assessor()`. */
  assessor: PrivateKeyAccount;
  /** Pays gas to relay assessments. Needs no authority of its own. */
  poster: PrivateKeyAccount;
  /** Executes swaps. Deliberately not the poster: a third party pays the widened fee. */
  relayer: PrivateKeyAccount;
  /** May pause and vet assets. */
  guardian: PrivateKeyAccount;
}

export interface TinjauChainConfig {
  rpcUrl: string;
  chainId: number;
  /** Human label for artifacts, e.g. "anvil-local" or "x-layer-testnet". */
  networkLabel: string;
  addresses: TinjauAddresses;
  envelope: TinjauEnvelope;
  accounts: TinjauAccounts;
  /**
   * Whether this endpoint accepts `evm_increaseTime`. True for Anvil, false for any public
   * chain. The harness must ask rather than assume — silently failing to advance time would
   * turn a decay demonstration into a swap at t=0 repeated three times.
   */
  supportsTimeTravel: boolean;
  /**
   * Whether a chain that cannot warp may be advanced by waiting out the wall clock instead.
   *
   * Lives on the config rather than being passed at each call site, so that scene code stays
   * IDENTICAL across chains — which is the property the local and remote runs exist to test. A
   * scene that had to know which chain it was on would have disproved the chain-agnostic claim.
   */
  allowWallClockWait?: boolean;
  /** Refuse a wall-clock wait longer than this. Default 600s. */
  maxWallClockWaitSec?: number;
}

export interface TinjauClients {
  publicClient: PublicClient;
  chain: Chain;
  walletFor(account: PrivateKeyAccount): WalletClient;
  config: TinjauChainConfig;
}

// ---------------------------------------------------------------------------
// Client construction
// ---------------------------------------------------------------------------

/**
 * Builds a viem chain from the config rather than importing one.
 *
 * `viem/chains` has no entry for chain 1952 (its `xLayerTestnet` is the retired chain 195) and
 * obviously none for a local Anvil, so both would need a hand-written definition anyway. Doing
 * it from the config keeps the two paths identical.
 */
export function chainFromConfig(config: TinjauChainConfig): Chain {
  return defineChain({
    id: config.chainId,
    name: config.networkLabel,
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
    testnet: true,
  });
}

export function makeTinjauClients(config: TinjauChainConfig): TinjauClients {
  const chain = chainFromConfig(config);
  const transport = http(config.rpcUrl, {
    // X Layer's public RPC drops roughly 7% of calls (T3.2 measured 76 retries over 1 088
    // calls). Retrying at the transport layer means every read and write in the harness is
    // covered, rather than only the ones somebody remembered to wrap.
    retryCount: 5,
    retryDelay: 500,
    timeout: 30_000,
  });

  const publicClient = createPublicClient({ chain, transport }) as PublicClient;

  // Per-config, not per-process. Two configs in one process get two independent caches.
  const wallets = new Map<string, WalletClient>();

  return {
    publicClient,
    chain,
    config,
    walletFor(account: PrivateKeyAccount): WalletClient {
      const cacheKey = account.address.toLowerCase();
      let wallet = wallets.get(cacheKey);
      if (!wallet) {
        wallet = createWalletClient({ account, chain, transport });
        wallets.set(cacheKey, wallet);
      }
      return wallet;
    },
  };
}

/**
 * Everything about a configuration that is safe to print or serialise.
 *
 * Accounts collapse to addresses. There is no code path from this return value back to a
 * private key, which is the point: a manifest writer cannot leak one by being careless.
 */
export function describeConfig(config: TinjauChainConfig): {
  networkLabel: string;
  chainId: number;
  addresses: TinjauAddresses;
  envelope: TinjauEnvelope;
  accounts: Record<keyof TinjauAccounts, `0x${string}`>;
  supportsTimeTravel: boolean;
} {
  return {
    networkLabel: config.networkLabel,
    chainId: config.chainId,
    addresses: config.addresses,
    envelope: config.envelope,
    accounts: {
      assessor: config.accounts.assessor.address,
      poster: config.accounts.poster.address,
      relayer: config.accounts.relayer.address,
      guardian: config.accounts.guardian.address,
    },
    supportsTimeTravel: config.supportsTimeTravel,
  };
}

// ---------------------------------------------------------------------------
// Time control
// ---------------------------------------------------------------------------

export interface TimeAdvance {
  requestedSeconds: number;
  method: "evm_increaseTime" | "wall-clock-wait" | "unsupported";
  beforeUnixSeconds: number;
  afterUnixSeconds: number;
  actualSeconds: number;
}

export class TimeTravelUnsupportedError extends Error {
  constructor(networkLabel: string, seconds: number) {
    super(
      `Cannot advance ${seconds}s on "${networkLabel}": this endpoint does not support ` +
        `evm_increaseTime. Either deploy with TINJAU_DEMO_ENVELOPE=1 so the recovery window ` +
        `fits inside a wall-clock wait, or run the decay scene against a local Anvil. ` +
        `Skipping the advance and reporting the swap anyway would present three swaps at the ` +
        `same instant as a decay curve.`,
    );
    this.name = "TimeTravelUnsupportedError";
  }
}

/**
 * Advances chain time.
 *
 * On Anvil this is `evm_increaseTime` + `evm_mine`. On a public chain there is no such call, so
 * the only honest options are to wait out the wall clock or to refuse. It refuses unless the
 * caller opts into waiting, because a silent no-op here would corrupt the one claim the decay
 * scene exists to make.
 */
export async function advanceTime(
  clients: TinjauClients,
  seconds: number,
  opts: { allowWallClockWait?: boolean; maxWallClockWaitSec?: number } = {},
): Promise<TimeAdvance> {
  const before = Number((await clients.publicClient.getBlock({ blockTag: "latest" })).timestamp);

  if (clients.config.supportsTimeTravel) {
    // viem's PublicClient does not expose Anvil methods on its typed surface; the transport
    // does. This is the whole reason `supportsTimeTravel` is a declared property rather than
    // something inferred from a failed call.
    const req = clients.publicClient.request as unknown as (
      args: { method: string; params: unknown[] },
    ) => Promise<unknown>;
    await req({ method: "evm_increaseTime", params: [seconds] });
    await req({ method: "evm_mine", params: [] });
    const after = Number((await clients.publicClient.getBlock({ blockTag: "latest" })).timestamp);
    return {
      requestedSeconds: seconds,
      method: "evm_increaseTime",
      beforeUnixSeconds: before,
      afterUnixSeconds: after,
      actualSeconds: after - before,
    };
  }

  const maxWait = opts.maxWallClockWaitSec ?? clients.config.maxWallClockWaitSec ?? 600;
  const mayWait = opts.allowWallClockWait ?? clients.config.allowWallClockWait ?? false;
  if (!mayWait || seconds > maxWait) {
    throw new TimeTravelUnsupportedError(clients.config.networkLabel, seconds);
  }

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  // Wall-clock waiting alone does not advance a chain's block timestamp — a block must be
  // produced. Public chains produce them on their own; poll until one lands past the target.
  const target = before + seconds;
  let after = before;
  const deadline = Date.now() + 120_000;
  while (after < target && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    after = Number((await clients.publicClient.getBlock({ blockTag: "latest" })).timestamp);
  }

  return {
    requestedSeconds: seconds,
    method: "wall-clock-wait",
    beforeUnixSeconds: before,
    afterUnixSeconds: after,
    actualSeconds: after - before,
  };
}

/** Current chain time. Every harness step stamps itself with this, never with `Date.now()`. */
export async function chainNowSeconds(clients: TinjauClients): Promise<number> {
  const block = await clients.publicClient.getBlock({ blockTag: "latest" });
  return Number(block.timestamp);
}

/**
 * Confirms bytecode exists at every published address.
 *
 * §0.23 requires a bytecode check beside any published address. Doing it here means the
 * manifest carries a measurement rather than an assertion.
 */
export async function checkBytecode(
  clients: TinjauClients,
  addresses: Record<string, `0x${string}`>,
): Promise<Record<string, { address: `0x${string}`; hasBytecode: boolean; codeSize: number }>> {
  const out: Record<string, { address: `0x${string}`; hasBytecode: boolean; codeSize: number }> = {};
  for (const [name, address] of Object.entries(addresses)) {
    const code = await clients.publicClient.getCode({ address });
    const size = code && code !== "0x" ? (code.length - 2) / 2 : 0;
    out[name] = { address, hasBytecode: size > 0, codeSize: size };
  }
  return out;
}
