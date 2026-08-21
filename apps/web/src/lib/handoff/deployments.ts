import { DEPLOYED } from "./artifacts";

/**
 * Deployed contracts, read from `deployed-addresses.json` rather than
 * transcribed.
 *
 * The fact that must reach the screen with every address is that the pool
 * behind it is **builder-controlled**, seeded with freely-mintable mock tokens
 * that have no value. An address shown without that label reads as a production
 * system.
 *
 * The list itself is no longer provisional: T7.2 re-read every address on chain
 * on 2026-08-21 and `status` is `T7_2_AUTHORITATIVE`. The older "working, not
 * final" wording outlived its truth and was rendering on /proof directly under
 * a heading announcing the opposite.
 */
export interface DeployedContract {
  role: string;
  address: string;
  hasBytecode: boolean;
  codeSize: number;
  isBuilderControlled: boolean;
  note: string | null;
}

export interface DeployedStack {
  stackId: string;
  label: string;
  isDemoEnvelope: boolean;
  envelope: Record<string, number | boolean>;
  poolId: string;
  tickSpacing: number;
  contracts: DeployedContract[];
}

const rawStacks = DEPLOYED.stacks as unknown as Record<string, DeployedStack>;

export const DEPLOYED_STACKS: DeployedStack[] = Object.values(rawStacks);

export const DEPLOYED_STATUS = DEPLOYED.status;
export const DEPLOYED_STATUS_TEXT = DEPLOYED.statusText;

export const DEPLOYED_NETWORK = DEPLOYED.network as unknown as {
  chainId: number;
  name: string;
  rpc: string;
  isTestnet: boolean;
  supportsTimeTravel: boolean;
  rpcWarning: string;
};

export const BYTECODE_CHECK = DEPLOYED.bytecodeVerification as unknown as {
  method: string;
  rpc: string;
  atBlockNumber: number;
  atIso: string;
  note: string;
};

export function explorerUrl(address: string): string {
  return `https://www.oklink.com/x-layer-testnet/address/${address}`;
}
