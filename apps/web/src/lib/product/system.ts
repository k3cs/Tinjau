import { getCapability, type ProductCapability } from "./capabilities";

export interface SystemNode {
  index: string;
  capability: ProductCapability;
  input: string;
  output: string;
}

export const SYSTEM_NODES: SystemNode[] = [
  { index: "01", capability: getCapability("official-intake"), input: "SEC · News · X", output: "Source-pinned claims" },
  { index: "02", capability: getCapability("evidence-graph"), input: "Claims + provenance", output: "Evidence relationships" },
  { index: "03", capability: getCapability("risk-policy"), input: "Graph + fixed rules", output: "NORMAL · WATCH · PROTECT" },
  { index: "04", capability: getCapability("confirmation-engine"), input: "OKX + X Layer inputs", output: "Market gate" },
  { index: "05", capability: getCapability("risk-registry"), input: "Authorized assessment", output: "Reusable risk record" },
  { index: "06", capability: getCapability("fee-hook"), input: "Bounded record", output: "Fee · alert · proof · decay" },
];

export const BLIND_WINDOW = [
  { time: "T+00", title: "Information appears", detail: "A filing, report, or rumor enters public view." },
  { time: "T+01", title: "Reference market reacts", detail: "Price discovery can move before the LP pool understands why." },
  { time: "T+02", title: "The pool is context-blind", detail: "Static or purely reactive controls see flow, not evidence quality." },
  { time: "T+03", title: "Toxic flow reaches liquidity", detail: "LPs may quote through a discontinuity without a bounded response." },
] as const;

export const DEFENSE_ROWS = [
  { name: "Static fee", context: "No", confirmation: "No", action: "Fixed only" },
  { name: "Volatility-only", context: "No", confirmation: "Market signal only", action: "Implementation-dependent" },
  { name: "Black-box AI", context: "Unclear", confirmation: "Unclear", action: "Unclear" },
  { name: "Tinjau design", context: "Evidence graph", confirmation: "Evidence + market gate", action: "Policy + contract bounds" },
] as const;
