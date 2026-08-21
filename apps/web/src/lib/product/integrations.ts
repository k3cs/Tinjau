import type { CapabilityMaturity } from "./capabilities";

export interface IntegrationStep {
  title: string;
  description: string;
  maturity: CapabilityMaturity;
  proofCapabilityId: string;
  example?: string;
  exampleLabel?: string;
}

export interface IntegrationPath {
  id: string;
  audience: string;
  title: string;
  outcome: string;
  steps: IntegrationStep[];
}

export const INTEGRATION_PATHS: IntegrationPath[] = [
  {
    id: "pool-operator",
    audience: "Pool operator",
    title: "Connect a bounded liquidity response",
    outcome: "Use a versioned risk state to permit only capped, temporary fee protection.",
    steps: [
      { title: "Inspect the historical envelope", description: "Verify the deployed prototype's 500–20,000 pip band and deterministic decay on X Layer Testnet.", maturity: "HISTORICAL", proofCapabilityId: "fee-hook" },
      { title: "Map the pool and supported asset", description: "Use the builder-controlled test pool to verify token order, hook permissions, and swap behavior without production capital.", maturity: "IMPLEMENTED", proofCapabilityId: "pool-telemetry" },
      { title: "Wait for the final registry-to-hook deployment", description: "The signed final Tinjau assessment, nonce, cooldown, and action path are not deployed. No executable final integration command is published yet.", maturity: "PENDING", proofCapabilityId: "risk-registry" },
    ],
  },
  {
    id: "protocol-developer",
    audience: "Protocol developer",
    title: "Consume a fail-closed risk record",
    outcome: "Read state, reasons, evidence commitment, expiry, and action status without trusting presentation copy.",
    steps: [
      { title: "Validate the versioned payload", description: "Reject unknown schema versions and impossible state/action combinations before using the record.", maturity: "IMPLEMENTED", proofCapabilityId: "risk-policy", exampleLabel: "Repository validation pattern", example: `const record = validateRiskRecord(payload);\nif (record.state !== "PROTECT") denyFeeAction();\nif (Date.parse(record.expiresAt) <= Date.now()) expireRecord();` },
      { title: "Treat reasons as policy output", description: "Reason codes explain deterministic gates. They are not free-form instructions from the model.", maturity: "IMPLEMENTED", proofCapabilityId: "risk-policy" },
      { title: "Use the final on-chain record after deployment", description: "The final TinjauRiskRegistry address remains pending T7.2. Historical EventStateRegistry data is a different schema.", maturity: "PENDING", proofCapabilityId: "risk-registry" },
    ],
  },
  {
    id: "evidence-integrator",
    audience: "Evidence integrator",
    title: "Add source-grounded evidence",
    outcome: "Preserve provenance, independence, and epistemic status before a claim reaches policy.",
    steps: [
      { title: "Provide a canonical source identity", description: "Supply source class, source id, URL when resolvable, publisher, timestamp precision, and content commitment.", maturity: "IMPLEMENTED", proofCapabilityId: "official-intake", exampleLabel: "Evidence shape", example: `{\n  sourceClass: "OFFICIAL",\n  dataMode: "REPLAY",\n  sourceId: "edgar:<accession>",\n  sourceUrl: "https://www.sec.gov/...",\n  officialConfirmation: true\n}` },
      { title: "Keep duplicates and contradictions visible", description: "Share an independence group so syndication collapses without deleting the claims that explain WATCH.", maturity: "IMPLEMENTED", proofCapabilityId: "evidence-graph" },
      { title: "Do not connect a live X provider yet", description: "The current social negative control is simulated. No live X discovery provider is authorized for this MVP.", maturity: "PENDING", proofCapabilityId: "x-listener" },
    ],
  },
  {
    id: "observer",
    audience: "Observer / dashboard builder",
    title: "Explain state without action authority",
    outcome: "Render evidence, state, expiry, and limitations while remaining read-only.",
    steps: [
      { title: "Start with the guided missions", description: "Use the frozen, source-linked scenarios to learn the state and evidence vocabulary before building a consumer.", maturity: "IMPLEMENTED", proofCapabilityId: "evidence-graph" },
      { title: "Display both truth axes", description: "Show data mode separately from capability maturity wherever a result can be misinterpreted.", maturity: "IMPLEMENTED", proofCapabilityId: "risk-policy" },
      { title: "Wait for a public final risk API", description: "The currently deployed public scoreboard is stale and is not an approved evidence source. A final risk-record API is pending.", maturity: "PENDING", proofCapabilityId: "risk-registry" },
    ],
  },
];
