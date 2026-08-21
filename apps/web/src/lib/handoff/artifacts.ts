/**
 * The frontend's only data source.
 *
 * Everything rendered as a fact (every state, fee, timestamp, address, hash and
 * benchmark cell) is read from the published backend handoff at
 * `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/`. The artifacts are
 * imported rather than copied so that a backend regeneration reaches the UI, and
 * so no number on a screen can be one somebody typed here.
 *
 * That directory is read-only to this lane. If a field is wrong or missing it is
 * reported to the backend lane, never patched locally.
 *
 * The JSON is validated at module load (see `scenarios.ts`), so a handoff that
 * breaks its own contract fails the build rather than rendering something false.
 */
// Relative, not `@/lib/copy`: `test/ts-resolver.mjs` only retries relative
// specifiers, so an aliased import here would make this module untestable.
import { deepHouseStyle } from "../copy";

import deployedAddressesJson from "../../../../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/deployed-addresses.json";
import comparisonJson from "../../../../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/three-policy-comparison.json";
import confirmedJson from "../../../../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/scenario-confirmed-protect.json";
import rumourJson from "../../../../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/scenario-rumor-watch.json";

/**
 * A repository path, as something a reader can actually open.
 *
 * The handoff cites its own provenance by path. Printed as bare text on a page
 * that is a dead end: the file is public, but a visitor has no way to get to it.
 * Linked, the same string becomes the strongest thing on the page, because the
 * claim above it can be checked.
 */
export const REPO = "https://github.com/k3cs/Tinjau/blob/main";

export function repoUrl(path: string): string {
  return `${REPO}/${path.replace(/^\/+/, "")}`;
}

export const HANDOFF_DIR = "docs/buildx-orion-2026/outputs/05-build/frontend-handoff";

/** Regenerated 2026-08-21. Validated by `tools/validate.mjs` in that directory. */
export const HANDOFF_GENERATED = "2026-08-21";

export type MetricBasisId = "PRE_REGISTERED" | "AMD_002_CONSISTENT";

export type CellVerdict =
  | "TINJAU_BEATS"
  | "TINJAU_TIES"
  | "TINJAU_LOSES"
  | "NOT_COMPARABLE";

export interface ComparisonCell {
  scenarioId: string;
  k: number;
  minDrawdownBps: number;
  metric: string;
  metricBasis: MetricBasisId;
  unit: string;
  basis: "OBSERVED" | "COUNTERFACTUAL";
  staticUsd: number | null;
  volatilityOnlyUsd: number | null;
  tinjauUsd: number | null;
  volatilityStatus: string;
  tinjauState: string;
  vsStatic: CellVerdict;
  vsVolatilityOnly: CellVerdict;
  note?: string;
}

export interface MetricBasis {
  id: MetricBasisId;
  metric: string;
  preRegistered: boolean;
  governsClaimGate: boolean;
  knownDefect: string;
}

export interface Amendment {
  id: string;
  summary: string;
  direction: string;
  claimGateEffect: string;
}

export interface ClaimCondition {
  id: string;
  text: string;
  passed: boolean | null;
  detail: string;
}

export interface ComparisonDoc {
  documentId: string;
  headlineFindings: string[];
  interpretation: {
    headline: string;
    text: string;
    whatItCanDetermine: string;
    defensibleClaim: string;
    prohibited: string[];
  };
  method: {
    metricBases: MetricBasis[];
    amendments: Amendment[];
    policies: Record<string, { methodVersion: string; description: string }>;
    kGrid: number[];
    minDrawdownBpsGrid: number[];
    identicalInput: unknown;
  };
  eventSelection: {
    disclosure: string;
    document: string;
    scenarios: Array<{
      scenarioId: string;
      role: string;
      preRegisteredState: string;
      hasEconomicRow: boolean;
    }>;
  };
  observedProtectedPoolResult: {
    exists: boolean;
    reason: string;
    onlyProtectedIntervalAnywhere: {
      where: string;
      artifact: string;
      marketLeg: string;
      warning: string;
    };
  };
  /** One row per (scenario, policy, grid point). Behaviour plus economics. */
  results: unknown[];
  comparisonCells: ComparisonCell[];
  claimEligibility: {
    field: string;
    value: boolean;
    metricBasis: MetricBasisId;
    amd002Excluded: string;
    conditions: ClaimCondition[];
  };
  dataLimitations: string[];
}

export interface CriticalCaveat {
  headline: string;
  text: string;
  canonicalReplayState: string;
  canonicalReplayConfirmation: string;
  canonicalReplayReasonCodes: string[];
  reasonCodeDiff: { onlyInCanonical: string[]; onlyInConstructed: string[] };
  uiRequirement: string;
}

export interface RecoveryStep {
  label: string;
  atUnixSeconds: number;
  appliedFee: number;
  previewedFee: number;
  txHash: string;
}

export interface ScenarioDoc {
  scenarioId: string;
  role: string;
  title: string;
  criticalCaveat?: CriticalCaveat;
  provenance: Record<string, unknown> & {
    evidence: string;
    marketLeg: string;
    marketVenue?: string;
    preRegistered: boolean;
    preRegisteredOutcome: string;
    matchesPreRegistration: boolean;
  };
  window: Record<string, unknown>;
  record: unknown;
  evidenceGraph: {
    label: string;
    independentOriginCount: number;
    usableOriginCount: number;
    selfRevision?: unknown;
    rejectedProposals?: unknown[];
  };
  derived: {
    postable: boolean;
    policyTargetFee: number;
    effectiveConfirmation: string;
    independentOriginCount?: number;
    usableOriginCount?: number;
    protectStartedAt?: number;
    remainingProtectSec?: number;
  };
  onChain?: {
    status: string;
    addressStatus: string;
    chainId: number;
    networkLabel: string;
    registry: string;
    hook: string;
    poolId: string;
    envelope: Record<string, number | boolean>;
    envelopeNote: string;
  };
  action?: {
    authorizedByEvidence: boolean;
    requestedFeePips: string;
    appliedFeePips: string;
    appliedTxHash: string;
    feeSource: string;
  };
  recovery?: {
    method: string;
    keeperTransactionRequired: boolean;
    llmInvolved: boolean;
    measured: RecoveryStep[];
    previewIsUpperBound: string;
    storedVsEffective: string;
    cooldown: { seconds: number; provenOnChain: boolean; evidence: string };
  };
  failedActionCase?: {
    scene: string;
    purpose: string;
    inducedBy: string;
    actionStatus: string;
    feeAfterFailure: number;
    feeAfterFailureTxHash: string;
    steps: Array<{ step: string; atUnixSeconds: number; txHash: string | null; note: string }>;
  };
  limitations: string[];
}

export interface DeployedAddressesDoc {
  status: string;
  statusText: string;
  network: Record<string, unknown>;
  bytecodeVerification: Record<string, unknown>;
  whyTwoStacks: unknown;
  stacks: Record<string, unknown>;
  historical: unknown;
  canonicalMainnetReferences: unknown;
  notRecorded: unknown;
}

// The imported JSON is structurally checked by `tools/validate.mjs` in the
// handoff directory and, for the risk records, by `validateRiskRecord` at load.
// The casts below narrow the inferred literal types to the interfaces above;
// they widen nothing that is not already guaranteed by those two checks.
//
// `deepHouseStyle` runs once per artifact, here, so the handoff's em dashes
// cannot reach the DOM through a component that forgot to sanitise. It rewrites
// string leaves only: no number, hash, address or boolean is touched, and no
// clause is dropped. See `src/lib/copy.ts`.
export const RUMOUR_SCENARIO = deepHouseStyle(rumourJson) as unknown as ScenarioDoc;
export const CONFIRMED_SCENARIO = deepHouseStyle(confirmedJson) as unknown as ScenarioDoc;
export const COMPARISON = deepHouseStyle(comparisonJson) as unknown as ComparisonDoc;
export const DEPLOYED = deepHouseStyle(deployedAddressesJson) as unknown as DeployedAddressesDoc;
