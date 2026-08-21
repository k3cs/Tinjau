import {
  CONFIRMED_SCENARIO,
  RUMOUR_SCENARIO,
  type CriticalCaveat,
  type RecoveryStep,
  type ScenarioDoc,
} from "./artifacts";
import type { RiskRecordView } from "../risk/model";
import { validateRiskRecord } from "../risk/validate";

export type ScenarioSlug = "rumour-watch" | "confirmed-protect";

export interface ScenarioView {
  slug: ScenarioSlug;
  /** Rail label. Short enough to sit in a tab. */
  tab: string;
  /** What this scenario is for, in one line. */
  purpose: string;
  scenarioId: string;
  record: RiskRecordView;
  /** Present only where the outcome was constructed. Must be rendered. */
  caveat: CriticalCaveat | null;
  provenance: ScenarioDoc["provenance"];
  /** Distinct origins that survived independence and self-revision checks. */
  usableOriginCount: number;
  /** Raw origin count before those checks. Never shown alone. */
  independentOriginCount: number;
  effectiveConfirmation: string;
  policyTargetFee: number;
  onChain: ScenarioDoc["onChain"];
  action: ScenarioDoc["action"];
  recovery: ScenarioDoc["recovery"];
  failedActionCase: ScenarioDoc["failedActionCase"];
  limitations: string[];
}

function build(
  doc: ScenarioDoc,
  slug: ScenarioSlug,
  tab: string,
  purpose: string,
): ScenarioView {
  // Validated at module load. A handoff document that breaks the published view
  // model fails the build here rather than rendering something untrue.
  const record = validateRiskRecord(doc.record);
  return {
    slug,
    tab,
    purpose,
    scenarioId: doc.scenarioId,
    record,
    caveat: doc.criticalCaveat ?? null,
    provenance: doc.provenance,
    usableOriginCount:
      doc.derived.usableOriginCount ?? doc.evidenceGraph.usableOriginCount,
    independentOriginCount:
      doc.derived.independentOriginCount ?? doc.evidenceGraph.independentOriginCount,
    effectiveConfirmation: doc.derived.effectiveConfirmation,
    policyTargetFee: doc.derived.policyTargetFee,
    onChain: doc.onChain,
    action: doc.action,
    recovery: doc.recovery,
    failedActionCase: doc.failedActionCase,
    limitations: doc.limitations,
  };
}

export const SCENARIOS: ScenarioView[] = [
  build(
    RUMOUR_SCENARIO,
    "rumour-watch",
    "Rumour",
    "A rumour and four outlets that collapse to one origin. The negative control.",
  ),
  build(
    CONFIRMED_SCENARIO,
    "confirmed-protect",
    "Confirmed event",
    "A real 8-K paired with a constructed price path, so the bounded action can be shown at all.",
  ),
];

export function getScenario(slug?: string): ScenarioView {
  return SCENARIOS.find((scenario) => scenario.slug === slug) ?? SCENARIOS[0];
}

export type { CriticalCaveat, RecoveryStep };
