import { getCapability, type ProductCapability } from "./capabilities";

export interface SystemNode {
  index: string;
  capability: ProductCapability;
  input: string;
  output: string;
  /**
   * One or two words, for the pipeline drawing.
   *
   * The full `capability.name` is the right label in a list and the wrong one on
   * a rail: six of them across one viewport collide before they can be read.
   * Kept beside the long name rather than replacing it, because the two labels
   * are for two different jobs.
   */
  short: string;
  shortOutput: string;
}

export const SYSTEM_NODES: SystemNode[] = [
  { index: "01", capability: getCapability("official-intake"), input: "SEC · News · X", output: "Source-pinned claims", short: "Read", shortOutput: "Claims" },
  { index: "02", capability: getCapability("evidence-graph"), input: "Claims + provenance", output: "Evidence relationships", short: "Group", shortOutput: "Origins" },
  { index: "03", capability: getCapability("risk-policy"), input: "Graph + fixed rules", output: "NORMAL · WATCH · PROTECT", short: "Decide", shortOutput: "A state" },
  { index: "04", capability: getCapability("confirmation-engine"), input: "OKX + X Layer inputs", output: "Market gate", short: "Check", shortOutput: "Market gate" },
  { index: "05", capability: getCapability("risk-registry"), input: "Authorized assessment", output: "Reusable risk record", short: "Record", shortOutput: "On chain" },
  { index: "06", capability: getCapability("fee-hook"), input: "Bounded record", output: "Fee · alert · proof · decay", short: "Act", shortOutput: "One fee" },
];

export const DEFENSE_ROWS = [
  { name: "Static fee", context: "No", confirmation: "No", action: "Fixed only" },
  { name: "Volatility-only", context: "No", confirmation: "Market signal only", action: "Implementation-dependent" },
  { name: "Black-box AI", context: "Unclear", confirmation: "Unclear", action: "Unclear" },
  { name: "Tinjau design", context: "Evidence graph", confirmation: "Evidence + market gate", action: "Policy + contract bounds" },
] as const;
