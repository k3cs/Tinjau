import type { DataMode } from "@/lib/risk/model";

export type CapabilityMaturity = "IMPLEMENTED" | "HISTORICAL" | "PENDING" | "ROADMAP";

export interface ProductCapability {
  id: string;
  stage: string;
  name: string;
  summary: string;
  maturity: CapabilityMaturity;
  dataMode?: DataMode;
  evidence: string;
  limitation: string;
  href?: string;
}

export const PRODUCT_CAPABILITIES: ProductCapability[] = [
  {
    id: "official-intake",
    stage: "01 · Listen",
    name: "SEC / issuer intake",
    summary: "Preserves a canonical source, timestamp precision, and content commitment.",
    maturity: "IMPLEMENTED",
    dataMode: "REPLAY",
    evidence: "EDGAR adapter + immutable scenario fixtures",
    limitation: "The guided demo replays frozen filings; it does not claim continuous production coverage.",
    href: "/demo",
  },
  {
    id: "x-listener",
    stage: "01 · Listen",
    name: "X Listener",
    summary: "Treats social posts as potential evidence, never as automatic confirmation.",
    maturity: "PENDING",
    dataMode: "SIMULATED",
    evidence: "Negative-control social fixture",
    limitation: "No live X discovery provider is authorized for this MVP.",
    href: "/demo",
  },
  {
    id: "evidence-graph",
    stage: "02–04 · Understand",
    name: "AI Evidence Graph",
    summary: "Normalizes claims, resolves assets, collapses duplicates, and exposes contradictions.",
    maturity: "IMPLEMENTED",
    dataMode: "REPLAY",
    evidence: "14 labeled evaluation cases + evidence graph tests",
    limitation: "Heuristic derivations surface disagreements for review; they do not silently repair them.",
    href: "/demo",
  },
  {
    id: "risk-policy",
    stage: "05 · Decide",
    name: "Deterministic risk policy",
    summary: "Promotes NORMAL, WATCH, or PROTECT without letting a model bypass fixed rules.",
    maturity: "IMPLEMENTED",
    dataMode: "REPLAY",
    evidence: "Cross-language truth table and policy tests",
    limitation: "A final signed orchestration path is still pending.",
    href: "/demo",
  },
  {
    id: "okx-reference",
    stage: "06 · Confirm",
    name: "OKX reference adapter",
    summary: "Returns timestamped available, stale, or unavailable samples without manufacturing confirmation.",
    maturity: "IMPLEMENTED",
    dataMode: "OBSERVED",
    evidence: "Fixture-backed adapter and freshness tests",
    limitation: "The adapter supplies input; it is not the final confirmation engine.",
    href: "/demo",
  },
  {
    id: "pool-telemetry",
    stage: "06 · Confirm",
    name: "X Layer pool telemetry",
    summary: "Measures pool price, flow, liquidity, drawdown, velocity, and bounded exit depth with provenance.",
    maturity: "IMPLEMENTED",
    dataMode: "OBSERVED",
    evidence: "Chain-196 replay fixtures + telemetry tests",
    limitation: "Thin and empty windows remain unavailable or insufficient rather than being imputed.",
    href: "/demo",
  },
  {
    id: "confirmation-engine",
    stage: "06 · Confirm",
    name: "Market-confirmation engine",
    summary: "Target gate for basis, drawdown, velocity, exit depth, freshness, and anti-wick checks.",
    maturity: "IMPLEMENTED",
    dataMode: "REPLAY",
    evidence: "Confirmation rules tinjau.confirm/2.0.0, exercised by both published scenarios",
    limitation:
      "Anti-wick uses the median retention over the hold interval, so a price held down for more than half of it still passes. Not manipulation-proof.",
    href: "/risk",
  },
  {
    id: "risk-registry",
    stage: "07 · Record",
    name: "X Layer Risk Registry",
    summary: "Stores a versioned, expiring, reusable risk record without requiring dashboard trust.",
    maturity: "IMPLEMENTED",
    dataMode: "REPLAY",
    evidence: "Deployed on X Layer Testnet chain 1952; bytecode verified by eth_getCode",
    limitation:
      "The pool behind these addresses is builder-controlled test liquidity with freely-mintable mock tokens, so it demonstrates enforcement and is not a market.",
    href: "/risk",
  },
  {
    id: "fee-hook",
    stage: "08–09 · Act / recover",
    name: "Bounded fee hook",
    summary: "Reads the registry and charges a fee inside a 500 to 20,000 band that decays on a clock.",
    // Promoted from HISTORICAL on 2026-08-21. The old entry said the
    // registry-to-hook integration was still pending, which stopped being true
    // at T4.2: TinjauFeeHook is deployed on X Layer Testnet reading
    // TinjauRiskRegistry, and the fee it produces was decoded from
    // PoolManager's own Swap event rather than from a view function.
    maturity: "IMPLEMENTED",
    dataMode: "OBSERVED",
    evidence: "TinjauFeeHook on X Layer Testnet; fees read from PoolManager Swap events",
    limitation: "The pool is builder-controlled test liquidity with mock tokens, so it demonstrates enforcement and is not a market.",
    href: "/demo",
  },
  {
    id: "x-publisher",
    stage: "08 · Communicate",
    name: "X Publisher",
    summary: "Target path for source-linked, expiry-aware public risk communication.",
    maturity: "HISTORICAL",
    dataMode: "REPLAY",
    evidence: "Guarded registry-event X bot",
    limitation: "The existing bot is not yet integrated with the final risk pipeline.",
    href: "/demo",
  },
  {
    id: "policy-benchmark",
    stage: "Proof",
    name: "Three-policy benchmark",
    summary: "Compares static, volatility-only, and Tinjau using preregistered matched inputs.",
    maturity: "IMPLEMENTED",
    dataMode: "REPLAY",
    evidence: "three-policy-comparison.json (72 cells over four frozen scenarios)",
    limitation:
      "It ran and the claim gate stayed closed: canClaimLossAvoided is false, and the sign flips between the two metric bases. No economic advantage is claimed.",
    href: "/proof",
  },
  {
    id: "exchange-os",
    stage: "Expansion",
    name: "Exchange OS adapter",
    summary: "Potential future distribution and execution adapter across the wider ecosystem.",
    maturity: "ROADMAP",
    evidence: "Product roadmap only",
    limitation: "No live Exchange OS integration is claimed.",
  },
];

export function getCapability(id: string): ProductCapability {
  const capability = PRODUCT_CAPABILITIES.find((item) => item.id === id);
  if (!capability) throw new Error(`Unknown product capability: ${id}`);
  return capability;
}
