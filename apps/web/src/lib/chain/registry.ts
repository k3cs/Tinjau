/**
 * Read-only helpers over `EventStateRegistry`, browser-side (no wallet, no gas — pure
 * `eth_call`s through the public RPC). Grouping by token is done by walking every posted
 * event id (1..nextEventId()-1) rather than via a per-token index, because the contract
 * exposes no "all events for token" list beyond the single latest id — fine at today's
 * scale (one posted event) and correct at whatever scale the registry grows to next,
 * since it never assumes a fixed count.
 */
import { getPublicClient, withRpcRetry, EVENT_STATE_REGISTRY_ADDRESS } from "./chain";
import { EVENT_STATE_REGISTRY_ABI, ERC20_ABI, type EventState } from "./registryAbi";
import { TRACKED_TOKENS, type TrackedToken } from "./tokenAddresses";

/** EventStateRegistry deployment block on X Layer Testnet 1952 (DeployTestnetRegistry.s.sol receipt). */
const REGISTRY_DEPLOY_BLOCK = 38507039n;

/**
 * Finds the exact posting transaction for an event by binary-searching for the block
 * whose timestamp matches `getEvent()`'s own `timestamp` field, then reading a narrow
 * `getLogs` window around it — bounded to ~15 RPC calls total, instead of chunk-scanning
 * the whole deploy-to-head range in <=100-block windows (X Layer's `eth_getLogs` cap),
 * which would be hundreds of calls. Returns null (never throws) when the search can't
 * resolve, so a caller always has a safe "no tx link available" fallback.
 */
export async function findEventPostedTx(
  eventId: bigint,
  eventTimestamp: bigint,
): Promise<{ txHash: `0x${string}`; blockNumber: bigint } | null> {
  const client = getPublicClient();
  try {
    const latest = await withRpcRetry(() => client.getBlockNumber());
    let lo = REGISTRY_DEPLOY_BLOCK;
    let hi = latest;
    while (lo < hi) {
      const mid = lo + (hi - lo) / 2n;
      const block = await withRpcRetry(() => client.getBlock({ blockNumber: mid }));
      if (block.timestamp >= eventTimestamp) hi = mid;
      else lo = mid + 1n;
    }
    const fromBlock = lo > REGISTRY_DEPLOY_BLOCK + 8n ? lo - 8n : REGISTRY_DEPLOY_BLOCK;
    const toBlock = lo + 8n > latest ? latest : lo + 8n;
    const logs = await withRpcRetry(() =>
      client.getLogs({
        address: EVENT_STATE_REGISTRY_ADDRESS,
        event: EVENT_STATE_REGISTRY_ABI.find((i) => i.type === "event" && i.name === "EventPosted")!,
        args: { eventId },
        fromBlock,
        toBlock,
      }),
    );
    const log = logs[0];
    if (!log) return null;
    return { txHash: log.transactionHash!, blockNumber: log.blockNumber! };
  } catch {
    return null;
  }
}

export interface RegistryEvent {
  id: bigint;
  event: EventState;
}

/** Every event currently posted to the registry, newest first. */
export async function fetchAllEvents(): Promise<RegistryEvent[]> {
  const client = getPublicClient();
  const nextId = await withRpcRetry(() =>
    client.readContract({
      address: EVENT_STATE_REGISTRY_ADDRESS,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "nextEventId",
    }),
  );

  const total = Number(nextId) - 1;
  if (total < 1) return [];

  const ids = Array.from({ length: total }, (_, i) => BigInt(total - i)); // newest first
  const results = await Promise.all(
    ids.map(async (id) => {
      const event = await withRpcRetry(() =>
        client.readContract({
          address: EVENT_STATE_REGISTRY_ADDRESS,
          abi: EVENT_STATE_REGISTRY_ABI,
          functionName: "getEvent",
          args: [id],
        }),
      );
      return { id, event: event as unknown as EventState };
    }),
  );
  return results;
}

export interface TokenBalance {
  token: TrackedToken;
  balance: bigint | null;
  decimals: number;
  /** True when the testnet address has no bytecode, so the read could not decode. */
  contractUnavailable: boolean;
}

/** Reads balanceOf(address) for every tracked token's testnet address. */
export async function fetchBalances(address: `0x${string}`): Promise<TokenBalance[]> {
  const client = getPublicClient();
  return Promise.all(
    TRACKED_TOKENS.map(async (token): Promise<TokenBalance> => {
      if (!token.testnetContractLive) {
        return { token, balance: null, decimals: 18, contractUnavailable: true };
      }
      try {
        const [balance, decimals] = await Promise.all([
          withRpcRetry(() =>
            client.readContract({
              address: token.testnet,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            }),
          ),
          withRpcRetry(() =>
            client.readContract({
              address: token.testnet,
              abi: ERC20_ABI,
              functionName: "decimals",
            }),
          ).catch(() => 18),
        ]);
        return { token, balance: balance as bigint, decimals: Number(decimals), contractUnavailable: false };
      } catch {
        return { token, balance: null, decimals: 18, contractUnavailable: true };
      }
    }),
  );
}

/** All registry events whose `token` field matches a tracked testnet token address. */
export function groupEventsByTrackedToken(events: RegistryEvent[]): Map<string, RegistryEvent[]> {
  const map = new Map<string, RegistryEvent[]>();
  for (const token of TRACKED_TOKENS) {
    map.set(token.symbol, []);
  }
  for (const re of events) {
    const match = TRACKED_TOKENS.find((t) => t.testnet.toLowerCase() === re.event.token.toLowerCase());
    if (match) {
      map.get(match.symbol)!.push(re);
    }
  }
  return map;
}

/** Events with a `nextEventDate` strictly in the future, across all tracked tokens. */
export function upcomingEvents(events: RegistryEvent[], nowSeconds: number): RegistryEvent[] {
  return events
    .filter((re) => re.event.nextEventDate > 0n && Number(re.event.nextEventDate) > nowSeconds)
    .sort((a, b) => Number(a.event.nextEventDate - b.event.nextEventDate));
}
