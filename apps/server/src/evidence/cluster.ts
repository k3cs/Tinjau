/**
 * Claim clustering and event identity (task T2.2).
 *
 * The job: decide which differently-worded claims are about the SAME underlying event.
 * "Nvidia eyes $3bn SB Energy stake" and "Nvidia in talks to invest in SoftBank unit" are one
 * event; a Form 4 filed the same week is a different one.
 *
 * WHY AI BELONGS HERE, AND WHERE IT STOPS. Grouping paraphrases is genuinely a language
 * problem — headline wording, entity aliases, and partial overlap defeat string matching. So a
 * model may PROPOSE the grouping. It may not decide anything else: the proposal is validated
 * against deterministic rules below, and the resulting structure is frozen so the graph can be
 * reproduced from fixtures without re-prompting (tracker §0.9).
 *
 * The validation is what makes the proposal safe to use. A model that hallucinated a cluster
 * spanning two companies, or invented a claim id, cannot corrupt the graph — those proposals
 * are rejected, not repaired.
 */

import type { NormalizedClaim } from "./normalize.js";
import { resolveAsset, type Resolution } from "./assets.js";

/** What a model (or a deterministic fallback) proposes. Nothing here is trusted yet. */
export interface ClusterProposal {
  /** Stable identity for the underlying event. */
  eventKey: string;
  /** Claim ids the proposer believes describe this event. */
  claimIds: string[];
  /** Short label for humans. Never used in any decision. */
  label: string;
}

export type ClusterRejection =
  | "UNKNOWN_CLAIM_ID"
  | "DUPLICATE_CLAIM_ASSIGNMENT"
  | "SPANS_MULTIPLE_COMPANIES"
  | "EMPTY_CLUSTER"
  | "DUPLICATE_EVENT_KEY";

export interface EventCluster {
  eventKey: string;
  label: string;
  claims: NormalizedClaim[];
  /** The deterministic company -> token -> pool resolution for this cluster. */
  resolution: Resolution;
  /**
   * Derived. An action may be proposed for this cluster only when the asset resolved to
   * exactly one supported pool. Ambiguity is not a tie-break, it is a refusal.
   */
  mayAuthorizeAction: boolean;
}

export interface ClusteringResult {
  clusters: EventCluster[];
  /** Claims no accepted cluster covers. Never dropped — an unclustered claim is a finding. */
  unclustered: NormalizedClaim[];
  /** Rejected proposals, with the reason, so a model's failure is visible not silent. */
  rejections: { proposal: ClusterProposal; reason: ClusterRejection }[];
}

/**
 * Validates proposals against the claim set and resolves each surviving cluster's asset.
 *
 * Pure and deterministic given the same claims and proposals, which is what lets a frozen
 * proposal stand in for a live model call in tests and in the demo's fixture fallback.
 */
export function buildClusters(
  claims: readonly NormalizedClaim[],
  proposals: readonly ClusterProposal[],
): ClusteringResult {
  const byId = new Map(claims.map((c) => [c.claimId, c]));
  const assigned = new Set<string>();
  const seenKeys = new Set<string>();
  const clusters: EventCluster[] = [];
  const rejections: ClusteringResult["rejections"] = [];

  for (const proposal of proposals) {
    if (seenKeys.has(proposal.eventKey)) {
      rejections.push({ proposal, reason: "DUPLICATE_EVENT_KEY" });
      continue;
    }
    if (proposal.claimIds.length === 0) {
      rejections.push({ proposal, reason: "EMPTY_CLUSTER" });
      continue;
    }

    // A proposal naming a claim that does not exist is a hallucination, not a near miss.
    const members = proposal.claimIds.map((id) => byId.get(id));
    if (members.some((m) => m === undefined)) {
      rejections.push({ proposal, reason: "UNKNOWN_CLAIM_ID" });
      continue;
    }
    const claimsInCluster = members as NormalizedClaim[];

    // One claim may belong to one event. Overlapping clusters would double-count a source
    // when independence is measured, which is the one arithmetic that must not be inflatable.
    if (claimsInCluster.some((c) => assigned.has(c.claimId))) {
      rejections.push({ proposal, reason: "DUPLICATE_CLAIM_ASSIGNMENT" });
      continue;
    }

    // A cluster spanning two companies cannot resolve to one pool, so it cannot be acted on.
    const companies = new Set(claimsInCluster.map((c) => c.company.trim().toUpperCase()));
    if (companies.size > 1) {
      rejections.push({ proposal, reason: "SPANS_MULTIPLE_COMPANIES" });
      continue;
    }

    // Resolution uses the address when any claim carries one, since an address is
    // unambiguous where a symbol is not.
    const withAddress = claimsInCluster.find((c) => c.tokenAddress);
    const resolution = resolveAsset(
      claimsInCluster[0].company,
      claimsInCluster[0].tokenSymbol,
      withAddress?.tokenAddress ?? null,
    );

    for (const c of claimsInCluster) assigned.add(c.claimId);
    seenKeys.add(proposal.eventKey);

    clusters.push({
      eventKey: proposal.eventKey,
      label: proposal.label,
      claims: claimsInCluster,
      resolution,
      mayAuthorizeAction: resolution.mayAuthorizeAction,
    });
  }

  return {
    clusters,
    unclustered: claims.filter((c) => !assigned.has(c.claimId)),
    rejections,
  };
}

/**
 * A deterministic clusterer, used when no model is available.
 *
 * Groups by `(company, eventType)`. This is deliberately crude: it is a FALLBACK, not a
 * substitute for language understanding, and it will split one event that two outlets
 * described with different event types. Splitting is the safe direction — it under-counts
 * corroboration, so it can only ever hold a state lower, never promote one it should not.
 *
 * The demo's fixture path uses frozen model proposals; this exists so the pipeline still runs
 * with no provider configured, and so tests never need a network call.
 */
export function proposeClustersDeterministically(
  claims: readonly NormalizedClaim[],
): ClusterProposal[] {
  const groups = new Map<string, NormalizedClaim[]>();
  for (const c of claims) {
    const key = `${c.company.trim().toUpperCase()}::${c.eventType}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()].map(([key, members]) => ({
    eventKey: `deterministic:${key}`,
    claimIds: members.map((m) => m.claimId),
    label: `${members[0].company} — ${members[0].eventType}`,
  }));
}
