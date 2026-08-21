import { DEPLOYED } from "./artifacts";

/**
 * Deployed contracts, read from `deployed-addresses.json` rather than
 * transcribed.
 *
 * Two facts travel with every address and must reach the screen with it: the
 * list is **working, not final** (T7.2 owns the authoritative set), and every
 * pool behind it is **builder-controlled** with freely-mintable mock tokens.
 * An address shown without those two labels reads as a production system.
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
