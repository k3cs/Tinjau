import { explorerAddressUrl } from "@/lib/chain/chain";
import type { CapabilityMaturity } from "./capabilities";

export interface DeploymentEvidence {
  id: string;
  name: string;
  address: `0x${string}` | null;
  maturity: CapabilityMaturity;
  role: string;
  ownership: "BUILDER_CONTROLLED" | "HISTORICAL_PROTOCOL" | "FINAL_TINJAU";
  verifiedAt: string | null;
  limitation: string;
}

export const XLAYER_TESTNET_PROOF = {
  chainId: 1952,
  name: "X Layer Testnet",
  nativeCurrency: "OKB",
  verifiedAt: "2026-08-20T00:00:00Z",
} as const;

export const DEPLOYMENT_EVIDENCE: DeploymentEvidence[] = [
  {
    id: "historical-registry",
    name: "EventStateRegistry",
    address: "0x713f45f44e74616898FB366E11881196221933aA",
    maturity: "HISTORICAL",
    role: "Corporate-event registry prototype",
    ownership: "HISTORICAL_PROTOCOL",
    verifiedAt: XLAYER_TESTNET_PROOF.verifiedAt,
    limitation: "Deployed bytecode is real, but its schema predates the final versioned Tinjau risk record.",
  },
  {
    id: "historical-hook",
    name: "AfterhoursFeeHook",
    address: "0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080",
    maturity: "HISTORICAL",
    role: "Bounded dynamic-fee and decay prototype",
    ownership: "HISTORICAL_PROTOCOL",
    verifiedAt: XLAYER_TESTNET_PROOF.verifiedAt,
    limitation: "The immutable deployed name is historical. Final registry-to-hook integration remains pending.",
  },
  {
    id: "pool-manager",
    name: "PoolManager",
    address: "0x8F862A8b6f00C99b0610dc764228C661c4909ae1",
    maturity: "IMPLEMENTED",
    role: "X Layer testnet pool manager",
    ownership: "BUILDER_CONTROLLED",
    verifiedAt: XLAYER_TESTNET_PROOF.verifiedAt,
    limitation: "Builder-controlled testnet infrastructure; not canonical Uniswap deployment or production liquidity.",
  },
  {
    id: "swap-router",
    name: "Swap router",
    address: "0x6F554A0bEE654Ead7C7eACDD300A72170a674C62",
    maturity: "IMPLEMENTED",
    role: "Working test swap path",
    ownership: "BUILDER_CONTROLLED",
    verifiedAt: XLAYER_TESTNET_PROOF.verifiedAt,
    limitation: "Testnet-only route using builder-controlled mock liquidity.",
  },
  {
    id: "mock-wnvdax",
    name: "Mock wNVDAx",
    address: "0xf07A9D89848bc694c7154Fda4cce707Eb409F903",
    maturity: "IMPLEMENTED",
    role: "Mock tokenized-equity asset",
    ownership: "BUILDER_CONTROLLED",
    verifiedAt: XLAYER_TESTNET_PROOF.verifiedAt,
    limitation: "Freely mintable testnet mock; not the real mainnet token.",
  },
  {
    id: "mock-usdg",
    name: "Mock USDG",
    address: "0x666e81CCb9D4d6c2e7A3ed9f317E3dFBa2410e99",
    maturity: "IMPLEMENTED",
    role: "Mock quote asset",
    ownership: "BUILDER_CONTROLLED",
    verifiedAt: XLAYER_TESTNET_PROOF.verifiedAt,
    limitation: "Freely mintable testnet mock; no production capital is represented.",
  },
  {
    id: "final-risk-registry",
    name: "TinjauRiskRegistry",
    address: null,
    maturity: "PENDING",
    role: "Final versioned risk registry",
    ownership: "FINAL_TINJAU",
    verifiedAt: null,
    limitation: "Local contracts and tests exist, but final X Layer Testnet deployment is pending T7.2.",
  },
  {
    id: "final-fee-hook",
    name: "TinjauFeeHook integration",
    address: null,
    maturity: "PENDING",
    role: "Final signed registry-to-hook action path",
    ownership: "FINAL_TINJAU",
    verifiedAt: null,
    limitation: "No final deployment address or end-to-end PROTECT transaction exists yet.",
  },
];

export function deploymentExplorerUrl(deployment: DeploymentEvidence): string | null {
  return deployment.address ? explorerAddressUrl(deployment.address) : null;
}
