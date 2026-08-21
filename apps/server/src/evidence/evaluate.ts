/**
 * Evidence Graph evaluation runner (task T2.4).
 *
 * Runs the real pipeline end to end for every labelled case:
 *
 *   normalizeClaim (T2.1) -> buildEvidenceGraph (T2.3) -> resolveAsset (T2.2) -> promote (T1.2)
 *
 * and scores the result against gold labels written from tracker §0.7/§0.8.
 *
 * WHY THIS FILE EXISTS AT ALL. Each phase was tested in isolation, so each phase could be
 * right while the SEAM between them was wrong. The seam that matters most is T2.3 -> T1.2:
 * the graph derives how many origins genuinely corroborate an event, and the promotion rules
 * consume that count. Until something ran both together, "the derivation feeds the rules" was
 * an intention rather than a demonstrated fact. `wireGraphIntoPromotion` below is that seam,
 * and it is the only place in the codebase where the translation happens.
 *
 * A FAILING CASE IS A FINDING ABOUT THE CODE. The gold labels state intended behaviour. They
 * are never edited to match what the implementation happens to do.
 */

import {
  normalizeClaim,
  type NormalizedClaim,
  type ProvenanceViolation,
  type RawClaimInput,
} from "./normalize.js";
import { buildEvidenceGraph, type EvidenceGraph } from "./graph.js";
import { resolveAsset, type Resolution, type ResolutionOutcome } from "./assets.js";
import { promote, type EvidenceClaim, type PromotionResult } from "../risk/promote.js";
import { FROZEN_PROMOTION_CONFIG } from "../risk/promotionConfig.js";
import type { AssertionLevel } from "./speculation.js";
import type { ConfirmationStatus, RiskState } from "../risk/types.js";

// ---------------------------------------------------------------------------
// The labelled set, as it appears on disk
// ---------------------------------------------------------------------------

export type EvalDimension =
  | "EXTRACTION"
  | "CLUSTERING"
  | "ENTITY_RESOLUTION"
  | "INDEPENDENCE"
  | "CONTRADICTION"
  | "RUMOR_CONTAINMENT"
  | "MATERIALITY";

export interface EvalExpectation {
  state: RiskState;
  usableOriginCount: number;
  resolutionOutcome: ResolutionOutcome;
  allClaimsPromotable: boolean;
  assertionLevels?: Record<string, AssertionLevel>;
  revisedOriginKeys?: string[];
  expectedViolations?: Record<string, ProvenanceViolation[]>;
}

export interface EvalCase {
  caseId: string;
  dimension: EvalDimension;
  description: string;
  /** ISO 8601 assessment instant. Passed in, never read from a clock. */
  now: string;
  officialEvidencePassed: boolean;
  marketConfirmation: { status: ConfirmationStatus; observedAt: string };
  claims: RawClaimInput[];
  expected: EvalExpectation;
}

export interface EvalSet {
  _schemaVersion: string;
  _criticalMetric: string;
  cases: EvalCase[];
}

// ---------------------------------------------------------------------------
// The T2.3 -> T1.2 seam
// ---------------------------------------------------------------------------

/** Why a claim was refused the right to contribute an independent origin. */
export type OriginDisqualification =
  /** Its source line stated two different figures for this event (T1.2's frozen rule). */
  | "SELF_REVISED_ORIGIN"
  /** It admits to relaying someone's report without naming whose (T2.3). */
  | "RELAYS_UNNAMED_REPORT"
  /** Its provenance is incomplete, so it may be recorded but never support an action (T2.1). */
  | "PROVENANCE_INCOMPLETE";

export interface WiredClaim extends EvidenceClaim {
  /** Empty when the claim contributes a genuine independent origin. */
  disqualifications: OriginDisqualification[];
}

/**
 * Translates normalised claims plus a derived Evidence Graph into promotion-engine input.
 *
 * Two fields carry the translation:
 *
 *   `independenceGroup` <- the graph's DERIVED origin key, not the fixture's hand label. This
 *   is the whole point of T2.4: promotion now counts origins the system worked out from the
 *   attribution text, so "four outlets, one story" is a demonstrated capability rather than a
 *   number somebody typed into a JSON file.
 *
 * ---------------------------------------------------------------------------------------
 * THREE DISTINCT DISQUALIFICATIONS, each travelling under its own name.
 *
 * A claim can fail to add to the independent-origin count for three different reasons, and
 * they behave differently:
 *
 *   1. the source line revised its own figure  -> `selfRevised`, which is GROUP-WIDE, because
 *      a revision belongs to the source line rather than to one article;
 *   2. the claim disclaims being an origin      -> `contributesIndependentOrigin: false`,
 *      PER-CLAIM, because one relayed headline does not taint that outlet's other reporting;
 *   3. the claim's provenance is incomplete     -> also per-claim, same field.
 *
 * T2.4's evaluation originally had to overload `selfRevised` for all three, because
 * `EvidenceClaim` had no other lever. That was a real safety hole in the other direction too:
 * a caller who did NOT overload it let evidence which had explicitly disclaimed its own
 * independence count as a full origin, flipping a WATCH into a PROTECT. `promote.ts` now
 * carries `contributesIndependentOrigin`, so each fact is expressed precisely and
 * `disqualifications` still records which one applied.
 * ---------------------------------------------------------------------------------------
 */
export function wireGraphIntoPromotion(
  claims: readonly NormalizedClaim[],
  graph: EvidenceGraph,
): WiredClaim[] {
  const findingById = new Map(graph.independence.map((f) => [f.claimId, f]));

  return claims.map((claim) => {
    const finding = findingById.get(claim.claimId);
    const derivedOrigin = finding?.derivedOriginKey ?? `unresolved:${claim.claimId}`;

    const disqualifications: OriginDisqualification[] = [];

    // Group-wide: a revision taints the whole source line.
    const selfRevised = graph.revisedOriginKeys.includes(derivedOrigin);
    if (selfRevised) disqualifications.push("SELF_REVISED_ORIGIN");

    // Per-claim: this article cannot corroborate, but its outlet's other reporting still can.
    if (finding?.relaysUnnamedReport) disqualifications.push("RELAYS_UNNAMED_REPORT");
    if (!claim.promotable) disqualifications.push("PROVENANCE_INCOMPLETE");

    const contributesIndependentOrigin =
      !finding?.relaysUnnamedReport && claim.promotable;

    return {
      claimId: claim.claimId,
      sourceClass: claim.sourceClass,
      // The derived key, not `claim.independenceGroup`. See the doc comment above.
      independenceGroup: derivedOrigin,
      relation: claim.relation,
      publishedAt: Math.floor(Date.parse(claim.publishedAt) / 1000),
      officialConfirmation: claim.officialConfirmation,
      materiality: claim.materiality,
      selfRevised,
      contributesIndependentOrigin,
      disqualifications,
    };
  });
}

// ---------------------------------------------------------------------------
// Running one case
// ---------------------------------------------------------------------------

export interface CheckResult {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

export interface CaseResult {
  caseId: string;
  dimension: EvalDimension;
  description: string;
  passed: boolean;
  checks: CheckResult[];
  /** Present so a reviewer can see what the pipeline actually produced. */
  observed: {
    state: RiskState;
    reasonCodes: string[];
    explanation: string;
    usableOriginCount: number;
    independentOriginCount: number;
    revisedOriginKeys: string[];
    resolutionOutcome: ResolutionOutcome;
    allClaimsPromotable: boolean;
    derivedOrigins: Record<string, string>;
    disqualifications: Record<string, OriginDisqualification[]>;
    confidenceFactors: string[];
  };
  /**
   * True when the gold state was NORMAL or WATCH but the pipeline returned PROTECT. This is
   * the only failure mode that means the safety invariants are broken rather than the quality
   * being short of target.
   */
  unsupportedProtect: boolean;
}

function check(name: string, expected: unknown, actual: unknown): CheckResult {
  return {
    name,
    passed: JSON.stringify(expected) === JSON.stringify(actual),
    expected,
    actual,
  };
}

export function runCase(evalCase: EvalCase): CaseResult {
  const nowSec = Math.floor(Date.parse(evalCase.now) / 1000);

  // --- T2.1: normalise, preserving provenance and refusing to invent any of it -------------
  const normalized = evalCase.claims.map((raw) => normalizeClaim(raw));

  // --- T2.3: derive independence, self-revision and recency from the text ------------------
  const graph = buildEvidenceGraph(normalized, nowSec, FROZEN_PROMOTION_CONFIG.evidenceWindowSec);

  // --- T2.2: resolve company -> token -> pool ----------------------------------------------
  // The address is the most precise hint available, so it is preferred where any claim has one.
  const first = normalized[0];
  const withAddress = normalized.find((c) => c.tokenAddress);
  const resolution: Resolution = resolveAsset(
    first?.company ?? "",
    first?.tokenSymbol ?? null,
    withAddress?.tokenAddress ?? null,
  );

  // --- The seam, then T1.2 -----------------------------------------------------------------
  const wired = wireGraphIntoPromotion(normalized, graph);
  const promotion: PromotionResult = promote({
    claims: wired,
    marketConfirmation: {
      status: evalCase.marketConfirmation.status,
      observedAt: Math.floor(Date.parse(evalCase.marketConfirmation.observedAt) / 1000),
    },
    now: nowSec,
    currentState: "NORMAL",
    // Both flags come from the deterministic resolution, never from the fixture. An
    // unsupported or ambiguous mapping cannot authorise an action against a specific pool.
    resolutionOutcome: resolution.outcome,
    officialEvidencePassed: evalCase.officialEvidencePassed,
  });

  const allClaimsPromotable = normalized.every((c) => c.promotable);

  const checks: CheckResult[] = [
    check("state", evalCase.expected.state, promotion.state),
    check("usableOriginCount", evalCase.expected.usableOriginCount, graph.usableOriginCount),
    check("resolutionOutcome", evalCase.expected.resolutionOutcome, resolution.outcome),
    check("allClaimsPromotable", evalCase.expected.allClaimsPromotable, allClaimsPromotable),
  ];

  // The aggressive-fee flag must track the state exactly. Checked on every case rather than
  // only where it is interesting, because a mismatch anywhere is a safety failure.
  checks.push(
    check(
      "aggressiveFeeAuthorized",
      evalCase.expected.state === "PROTECT",
      promotion.aggressiveFeeAuthorized,
    ),
  );

  if (evalCase.expected.assertionLevels) {
    for (const [claimId, level] of Object.entries(evalCase.expected.assertionLevels)) {
      const claim = normalized.find((c) => c.claimId === claimId);
      checks.push(check(`assertionLevel[${claimId}]`, level, claim?.assertionLevel));
    }
  }

  if (evalCase.expected.revisedOriginKeys) {
    checks.push(
      check(
        "revisedOriginKeys",
        [...evalCase.expected.revisedOriginKeys].sort(),
        [...graph.revisedOriginKeys].sort(),
      ),
    );
  }

  if (evalCase.expected.expectedViolations) {
    for (const [claimId, violations] of Object.entries(evalCase.expected.expectedViolations)) {
      const claim = normalized.find((c) => c.claimId === claimId);
      checks.push(
        check(
          `violations[${claimId}]`,
          [...violations].sort(),
          [...(claim?.provenanceViolations ?? [])].sort(),
        ),
      );
    }
  }

  const goldForbidsProtect = evalCase.expected.state !== "PROTECT";

  return {
    caseId: evalCase.caseId,
    dimension: evalCase.dimension,
    description: evalCase.description,
    passed: checks.every((c) => c.passed),
    checks,
    observed: {
      state: promotion.state,
      reasonCodes: promotion.reasonCodes,
      explanation: promotion.explanation,
      usableOriginCount: graph.usableOriginCount,
      independentOriginCount: graph.independentOriginCount,
      revisedOriginKeys: graph.revisedOriginKeys,
      resolutionOutcome: resolution.outcome,
      allClaimsPromotable,
      derivedOrigins: Object.fromEntries(
        graph.independence.map((f) => [f.claimId, f.derivedOriginKey]),
      ),
      disqualifications: Object.fromEntries(
        wired.filter((w) => w.disqualifications.length > 0).map((w) => [w.claimId, w.disqualifications]),
      ),
      confidenceFactors: graph.confidenceFactors.map((f) => `${f.direction}:${f.code}`),
    },
    unsupportedProtect: goldForbidsProtect && promotion.state === "PROTECT",
  };
}

// ---------------------------------------------------------------------------
// Scoring the whole set
// ---------------------------------------------------------------------------

export interface DimensionMetric {
  dimension: EvalDimension;
  total: number;
  passed: number;
  accuracy: number;
}

export interface EvalReport {
  schemaVersion: string;
  totalCases: number;
  passedCases: number;
  overallAccuracy: number;
  byDimension: DimensionMetric[];
  /**
   * The critical metric. Share of cases whose gold state forbids PROTECT that nonetheless
   * returned PROTECT. Target is exactly 0 — this is a safety invariant, not a quality bar.
   */
  unsupportedProtectRate: number;
  unsupportedProtectCases: string[];
  /** Share of cases with a rumour present whose state stayed at or below WATCH. */
  rumorToWatchRate: number;
  results: CaseResult[];
}

function ratio(passed: number, total: number): number {
  return total === 0 ? 1 : passed / total;
}

export function evaluate(set: EvalSet): EvalReport {
  const results = set.cases.map(runCase);

  const dimensions = [...new Set(set.cases.map((c) => c.dimension))];
  const byDimension: DimensionMetric[] = dimensions.map((dimension) => {
    const inDimension = results.filter((r) => r.dimension === dimension);
    const passed = inDimension.filter((r) => r.passed).length;
    return { dimension, total: inDimension.length, passed, accuracy: ratio(passed, inDimension.length) };
  });

  // Denominator is every case whose gold label forbids PROTECT, which is where an unsupported
  // promotion could occur at all.
  const forbidProtect = results.filter(
    (r) => set.cases.find((c) => c.caseId === r.caseId)!.expected.state !== "PROTECT",
  );
  const unsupported = forbidProtect.filter((r) => r.unsupportedProtect);

  // A case counts toward rumour containment when any claim in it is a RUMOR.
  const withRumor = set.cases.filter((c) => c.claims.some((x) => x.sourceClass === "RUMOR"));
  const rumorContained = withRumor.filter((c) => {
    const result = results.find((r) => r.caseId === c.caseId)!;
    return result.observed.state !== "PROTECT";
  });

  const passedCases = results.filter((r) => r.passed).length;

  return {
    schemaVersion: set._schemaVersion,
    totalCases: results.length,
    passedCases,
    overallAccuracy: ratio(passedCases, results.length),
    byDimension,
    unsupportedProtectRate: forbidProtect.length === 0 ? 0 : unsupported.length / forbidProtect.length,
    unsupportedProtectCases: unsupported.map((r) => r.caseId),
    rumorToWatchRate: ratio(rumorContained.length, withRumor.length),
    results,
  };
}

/** Renders a compact human-readable summary, used by the test's failure output. */
export function formatReport(report: EvalReport): string {
  const lines: string[] = [
    `cases: ${report.passedCases}/${report.totalCases} (${(report.overallAccuracy * 100).toFixed(1)}%)`,
    `unsupportedProtectRate: ${report.unsupportedProtectRate}`,
    `rumorToWatchRate: ${report.rumorToWatchRate}`,
  ];
  for (const d of report.byDimension) {
    lines.push(`  ${d.dimension}: ${d.passed}/${d.total}`);
  }
  for (const failure of report.results.filter((r) => !r.passed)) {
    lines.push(`FAIL ${failure.caseId}:`);
    for (const c of failure.checks.filter((x) => !x.passed)) {
      lines.push(`  ${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`);
    }
  }
  return lines.join("\n");
}
