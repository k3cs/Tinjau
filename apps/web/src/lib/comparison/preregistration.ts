export type PolicyId = "STATIC" | "VOLATILITY_ONLY" | "TINJAU";

export interface PreregisteredScenario {
  slug: string;
  shortLabel: string;
  title: string;
  role: string;
  anchorAt: string;
  fromBlock: string;
  toBlock: string;
  observedSwaps: number;
  carriesEconomicRow: boolean;
  expectedEvidenceState: string;
  inputChecksum: string;
}

export interface PreregisteredPolicy {
  id: PolicyId;
  name: string;
  input: string;
  evidenceAccess: string;
  behavior: string;
  variants: string[];
}

export const COMPARISON_SCENARIOS: PreregisteredScenario[] = [
  {
    slug: "false-rumor",
    shortLabel: "Scene A",
    title: "False rumor",
    role: "Evidence-path negative control; degraded market data",
    anchorAt: "2026-07-27T20:33:00Z",
    fromBlock: "66411744",
    toBlock: "66436944",
    observedSwaps: 0,
    carriesEconomicRow: false,
    expectedEvidenceState: "WATCH",
    inputChecksum: "a69691da55a84968c9076b6f71d6dd64fbca2a647e8a03785dd3598d2f03fc22",
  },
  {
    slug: "confirmed-event",
    shortLabel: "Scene B",
    title: "Confirmed event",
    role: "Conditional protection path",
    anchorAt: "2026-08-17T12:41:33Z",
    fromBlock: "68197857",
    toBlock: "68223057",
    observedSwaps: 4145,
    carriesEconomicRow: true,
    expectedEvidenceState: "PROTECT only with fresh confirmation",
    inputChecksum: "c4774e470dd970d0778add24d509148ebba6587debc1c93cbf5a4a14b3a5f2da",
  },
  {
    slug: "hard-case",
    shortLabel: "Scene C",
    title: "Two-origin hard case",
    role: "Self-revising non-official source line",
    anchorAt: "2026-08-15T19:38:26Z",
    fromBlock: "68050070",
    toBlock: "68075270",
    observedSwaps: 265,
    carriesEconomicRow: true,
    expectedEvidenceState: "WATCH under frozen self-revision rule",
    inputChecksum: "375142f7ba1b4ec145a031c3d3cd39870cc76a013407e87e97deb6204ce67876",
  },
  {
    slug: "neutral",
    shortLabel: "Scene D",
    title: "Neutral control",
    role: "Primary economic false-positive probe",
    anchorAt: "2026-08-12T21:13:10Z",
    fromBlock: "67796554",
    toBlock: "67821754",
    observedSwaps: 367,
    carriesEconomicRow: true,
    expectedEvidenceState: "NORMAL",
    inputChecksum: "6872ab5452ef3dc57da3b0c000f06c9349e6f5d9f55effc20c3c130d7953ab76",
  },
];

export const COMPARISON_POLICIES: PreregisteredPolicy[] = [
  {
    id: "STATIC",
    name: "Static fee",
    input: "Identical observed swaps",
    evidenceAccess: "No market signal · no evidence",
    behavior: "Constant 500 pips (0.05%)",
    variants: [],
  },
  {
    id: "VOLATILITY_ONLY",
    name: "Volatility-only",
    input: "Identical swaps + market telemetry",
    evidenceAccess: "No filing, news, rumor, or event semantics",
    behavior: "Same fee ceiling and decay curve",
    variants: ["k=2", "k=3", "k=5"],
  },
  {
    id: "TINJAU",
    name: "Tinjau",
    input: "Identical swaps + market telemetry + evidence path",
    evidenceAccess: "Evidence never bypasses market confirmation",
    behavior: "Same fee ceiling and decay curve",
    variants: [],
  },
];

export const COMPARISON_METRICS = [
  { label: "Fee revenue", unit: "USD", basis: "Observed for static; counterfactual otherwise" },
  { label: "LP markout at 3600s", unit: "USD", basis: "Counterfactual" },
  { label: "Adverse selection", unit: "USD", basis: "Counterfactual" },
  { label: "Action latency", unit: "seconds", basis: "Counterfactual" },
  { label: "Maximum fee", unit: "pips", basis: "Counterfactual" },
  { label: "Protection duration", unit: "seconds", basis: "Counterfactual" },
  { label: "Time to decay", unit: "seconds", basis: "Counterfactual" },
  { label: "False positive", unit: "boolean + USD cost", basis: "Counterfactual" },
  { label: "False negative", unit: "boolean where determinable", basis: "Counterfactual" },
] as const;

export function getComparisonScenario(slug?: string): PreregisteredScenario {
  return COMPARISON_SCENARIOS.find((scenario) => scenario.slug === slug) ?? COMPARISON_SCENARIOS[0];
}
