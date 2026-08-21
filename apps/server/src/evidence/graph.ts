/**
 * Independence, contradiction and recency (task T2.3).
 *
 * Until now `independenceGroup` and `relation` arrived hand-labelled on the frozen fixtures.
 * That was fine for freezing evidence, but it meant the system had never actually
 * DEMONSTRATED that it can tell a syndication from an independent report — the answer was
 * written in by hand. This module derives both from the claim text, so the capability is real
 * and the hand labels become something to check against rather than something to trust.
 *
 * Three derivations live here:
 *
 *   1. `deriveIndependence` — reads attribution phrases ("the Wall Street Journal reported")
 *      and collapses every outlet carrying one story into that story's origin.
 *   2. `detectSelfRevision` — spots one source line stating two different figures for the
 *      same event, which is the input T1.2's self-revision rule consumes. Deriving it closes
 *      the loop: the rule no longer depends on a human noticing the revision.
 *   3. `applyRecency` — marks evidence outside its window, without deleting it.
 *
 * WHAT IS DELIBERATELY NOT HERE: bare-amount comparison across different claims. "$250bn of
 * guarantees" and "$3bn equity stake" are different quantities about the same deal, and a
 * detector that flagged them as contradictory would manufacture contradictions out of normal
 * reporting. Contradiction is only asserted where the SAME source line changed its OWN
 * figure, or where a claim explicitly declares a contradiction.
 */

import type { NormalizedClaim } from "./normalize.js";

// ---------------------------------------------------------------------------
// 1. Independence
// ---------------------------------------------------------------------------

/**
 * Publishers whose names appear in attribution phrases, mapped to a canonical origin key.
 *
 * Aliases matter: "the Information", "The Information" and "Information" all appear in real
 * wire copy for the same outlet.
 */
const PUBLISHER_ALIASES: Record<string, string> = {
  "wall street journal": "wsj",
  wsj: "wsj",
  "the information": "theinformation",
  information: "theinformation",
  reuters: "reuters",
  bloomberg: "bloomberg",
  cnbc: "cnbc",
  "financial times": "ft",
  ft: "ft",
  axios: "axios",
  benzinga: "benzinga",
};

/**
 * Phrases that attribute a claim to someone else.
 *
 * Each captures the publisher name. Ordered longest-context-first so "citing people familiar"
 * does not swallow "the Wall Street Journal reported".
 */
const ATTRIBUTION_PATTERNS: RegExp[] = [
  /\bthe ([a-z][a-z\s]{2,30}?) reported\b/i,
  /\b([a-z][a-z\s]{2,30}?) reported (?:on|that)\b/i,
  /\baccording to (?:the )?([a-z][a-z\s]{2,30}?)[,.]/i,
  /\breporting (?:a|an) ([a-z][a-z\s]{2,30}?) (?:story|report)\b/i,
  /\b(?:the )?([a-z][a-z\s]{2,30}?) (?:says|said)\b/i,
  /\bciting (?:a )?(?:report (?:by|from) )?(?:the )?([a-z][a-z\s]{2,30}?)[,.]/i,
];

/**
 * Phrases where a claim flags itself as relaying someone else's reporting WITHOUT naming who.
 *
 * A headline ending "- report" is saying outright that it is not the origin. We cannot tell
 * which origin it belongs to, so we cannot merge it into one — but neither can we count it as
 * an independent source, because independence is precisely what it has disclaimed. It is
 * excluded from the origin count, which is the conservative direction: under-counting
 * corroboration can only hold a state lower.
 */
const UNNAMED_RELAY_PATTERNS: RegExp[] = [
  // A trailing quote is allowed because claim text is often stored as a quoted headline
  // (`Headline (verbatim): "… - report"`), and the marker is the last word of the headline
  // itself rather than of the stored string.
  /[-–—]\s*report\s*["'”’]?\s*$/i,
  /:\s*report\s*["'”’]?\s*$/i,
  /\breportedly\b/i,
  /\bis reported to\b/i,
];

export interface IndependenceFinding {
  claimId: string;
  /** Canonical origin key this claim's reporting traces back to. */
  derivedOriginKey: string;
  /** Whether the claim attributes its reporting to someone else. */
  isSyndication: boolean;
  /** The publisher named in the attribution, if any. */
  attributedTo: string | null;
  /** The matched phrase, so the derivation can be checked rather than trusted. */
  evidence: string | null;
  /**
   * True when the claim admits it is relaying a report but does not say whose. Such a claim
   * cannot be merged into an origin, and must not be counted as one either.
   */
  relaysUnnamedReport: boolean;
  /** The group the fixture declared, when one was supplied. */
  declaredGroup: string | null;
  /** True when the derivation and the hand label disagree about syndication. */
  disagreesWithDeclared: boolean;
}

function canonicalPublisher(name: string): string | null {
  const cleaned = name.trim().toLowerCase().replace(/\s+/g, " ");
  return PUBLISHER_ALIASES[cleaned] ?? null;
}

/**
 * Canonicalises a claim's OWN publisher.
 *
 * Only the leading segment of the publisher field is considered — the part before a comma or
 * dash. A field like "CNBC, reporting a Wall Street Journal story" names two outlets, and
 * scanning the whole string for any known alias would resolve CNBC's identity to WSJ. The
 * publisher is who published; anyone else named in that field is an attribution, and
 * attributions are handled separately below.
 */
function ownOriginKey(claim: NormalizedClaim): string {
  const publisher = (claim.publisherOrAuthor ?? "").toLowerCase();
  const leading = publisher.split(/[,—–]|\s-\s/)[0].trim();

  for (const [alias, key] of Object.entries(PUBLISHER_ALIASES)) {
    if (leading === alias || leading.startsWith(`${alias} `) || leading.endsWith(` ${alias}`)) {
      return key;
    }
  }
  // Unrecognised publishers get their own key derived from the source id's host portion, so
  // two unknown outlets are never merged just because neither is in the alias table.
  return `unrecognised:${claim.sourceId.split("/")[0] || claim.claimId}`;
}

/**
 * Derives which origin each claim's reporting traces back to.
 *
 * The rule: if a claim's text attributes the story to a publisher OTHER than itself, it is a
 * syndication of that publisher, not an independent source. This is the §0.7 invariant
 * "duplicated syndications of one origin count as one source" turned into a derivation.
 */
export function deriveIndependence(claims: readonly NormalizedClaim[]): IndependenceFinding[] {
  return claims.map((claim) => {
    // Attribution can appear in the claim text or in the publisher field — a byline reading
    // "CNBC, reporting a Wall Street Journal story" states the relationship outright.
    const searchable = `${claim.claimTextOrPointer} ${claim.publisherOrAuthor ?? ""}`;

    let attributedTo: string | null = null;
    let evidence: string | null = null;

    for (const pattern of ATTRIBUTION_PATTERNS) {
      const match = searchable.match(pattern);
      if (!match) continue;
      const canonical = canonicalPublisher(match[1]);
      if (canonical === null) continue;
      attributedTo = canonical;
      evidence = match[0];
      break;
    }

    const own = ownOriginKey(claim);
    // Attributing to yourself is not syndication — an outlet may restate its own scoop.
    const isSyndication = attributedTo !== null && attributedTo !== own;
    const derivedOriginKey = isSyndication ? (attributedTo as string) : own;

    const relaysUnnamedReport =
      attributedTo === null &&
      UNNAMED_RELAY_PATTERNS.some((p) => p.test(claim.claimTextOrPointer.trim()));

    if (relaysUnnamedReport) evidence = evidence ?? claim.claimTextOrPointer.trim().slice(-40);

    const declaredGroup = claim.independenceGroup.length > 0 ? claim.independenceGroup : null;
    const declaredSaysDuplicate = claim.relation === "DUPLICATE";

    return {
      claimId: claim.claimId,
      derivedOriginKey,
      isSyndication,
      attributedTo,
      evidence,
      relaysUnnamedReport,
      declaredGroup,
      // A disagreement is surfaced, never auto-resolved: the derivation could be wrong, and
      // so could the hand label. Which one is right is a question for a human.
      // A claim that admits to relaying an unnamed report is not counted as a disagreement —
      // the hand label knows whose story it is and the derivation cannot, so they are
      // answering different questions rather than contradicting each other.
      disagreesWithDeclared:
        declaredGroup !== null && !relaysUnnamedReport && declaredSaysDuplicate !== isSyndication,
    };
  });
}

/**
 * Counts distinct derived origins.
 *
 * Two exclusions, both §0.7 invariants rather than tuning:
 *   - rumours never corroborate;
 *   - a claim that admits to relaying an unnamed report cannot be counted as an origin,
 *     because independence is exactly what it disclaimed.
 */
export function countDerivedIndependentOrigins(
  claims: readonly NormalizedClaim[],
  findings: readonly IndependenceFinding[],
): number {
  const byId = new Map(findings.map((f) => [f.claimId, f]));
  const origins = new Set<string>();
  for (const claim of claims) {
    if (claim.sourceClass === "RUMOR") continue;
    const finding = byId.get(claim.claimId);
    if (!finding || finding.relaysUnnamedReport) continue;
    origins.add(finding.derivedOriginKey);
  }
  return origins.size;
}

// ---------------------------------------------------------------------------
// 2. Self-revision
// ---------------------------------------------------------------------------

export interface MoneyAmount {
  /** Value in whole units of currency. */
  value: number;
  /** The matched text, verbatim, so the extraction is checkable. */
  text: string;
}

const SCALES: Record<string, number> = {
  trillion: 1e12,
  billion: 1e9,
  million: 1e6,
};

/**
 * Extracts dollar amounts with scale words from free text.
 *
 * Deliberately narrow: `$250 billion`, `$1.5 billion`. It does not attempt to understand what
 * each amount refers to, which is exactly why it is only ever used WITHIN one source line
 * (see `detectSelfRevision`) and never to compare two different reports.
 */
export function extractMoneyAmounts(text: string): MoneyAmount[] {
  const out: MoneyAmount[] = [];
  const re = /\$\s?([\d,]+(?:\.\d+)?)\s*(trillion|billion|million)?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(raw)) continue;
    const scale = match[2] ? SCALES[match[2].toLowerCase()] ?? 1 : 1;
    out.push({ value: raw * scale, text: match[0].trim() });
  }
  return out;
}

export interface SelfRevisionFinding {
  originKey: string;
  revised: boolean;
  /** The distinct amounts this source line stated, in claim order. */
  amounts: { claimId: string; amount: MoneyAmount }[];
  explanation: string;
}

/**
 * Detects a source line stating materially different figures for the same event.
 *
 * This is the input T1.2's self-revision rule consumes. Deriving it here means the rule no
 * longer depends on someone hand-labelling `revisesClaim` on a fixture.
 *
 * Threshold-free by design, matching the rule it feeds: ANY distinct stated amount within one
 * origin counts as a revision. There is no ratio to tune, and the outcome can only ever
 * withhold corroboration, never grant it.
 */
export function detectSelfRevision(
  claims: readonly NormalizedClaim[],
  findings: readonly IndependenceFinding[],
): SelfRevisionFinding[] {
  const byId = new Map(findings.map((f) => [f.claimId, f]));
  const byOrigin = new Map<string, { claimId: string; amount: MoneyAmount }[]>();

  for (const claim of claims) {
    const origin = byId.get(claim.claimId)?.derivedOriginKey;
    if (!origin) continue;
    for (const amount of extractMoneyAmounts(claim.claimTextOrPointer)) {
      byOrigin.set(origin, [...(byOrigin.get(origin) ?? []), { claimId: claim.claimId, amount }]);
    }
  }

  return [...byOrigin.entries()].map(([originKey, amounts]) => {
    const distinct = new Set(amounts.map((a) => a.amount.value));
    const revised = distinct.size > 1;
    return {
      originKey,
      revised,
      amounts,
      explanation: revised
        ? `Source line "${originKey}" stated ${distinct.size} different figures for this event ` +
          `(${[...distinct].map((v) => `$${v.toLocaleString("en-US")}`).join(", ")}). ` +
          `It may support monitoring, but cannot count toward independent corroboration.`
        : `Source line "${originKey}" stated a consistent figure.`,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Recency
// ---------------------------------------------------------------------------

export interface RecencyFinding {
  claimId: string;
  ageSeconds: number;
  withinWindow: boolean;
  /** True when the claim is dated after the assessment instant, which is a data defect. */
  fromFuture: boolean;
}

/**
 * Marks which claims fall inside the evidence window. Nothing is deleted: an expired claim is
 * part of why a state is what it is, and dropping it would make the record unexplainable.
 */
export function applyRecency(
  claims: readonly NormalizedClaim[],
  nowEpochSeconds: number,
  windowSeconds: number,
): RecencyFinding[] {
  return claims.map((claim) => {
    const published = Math.floor(Date.parse(claim.publishedAt) / 1000);
    const age = nowEpochSeconds - published;
    return {
      claimId: claim.claimId,
      ageSeconds: age,
      withinWindow: age >= 0 && age <= windowSeconds,
      fromFuture: age < 0,
    };
  });
}

// ---------------------------------------------------------------------------
// The assembled graph
// ---------------------------------------------------------------------------

/** One machine-readable reason the confidence is what it is. */
export interface ConfidenceFactor {
  code:
    | "SINGLE_ORIGIN"
    | "MULTIPLE_INDEPENDENT_ORIGINS"
    | "SYNDICATION_DETECTED"
    | "SELF_REVISED_SOURCE"
    | "CONTRADICTION_DECLARED"
    | "STALE_EVIDENCE_PRESENT"
    | "OFFICIAL_CONFIRMATION_PRESENT"
    | "UNVERIFIED_ATTRIBUTION";
  /** Which way this factor pushes confidence. */
  direction: "RAISES" | "LOWERS";
  explanation: string;
  claimIds: string[];
}

export interface EvidenceGraph {
  independence: IndependenceFinding[];
  selfRevision: SelfRevisionFinding[];
  recency: RecencyFinding[];
  /** Distinct non-rumour origins, after collapsing syndications. */
  independentOriginCount: number;
  /** Origins disqualified from corroboration by self-revision. */
  revisedOriginKeys: string[];
  /** Independent origins that may actually corroborate, which is what promotion counts. */
  usableOriginCount: number;
  confidenceFactors: ConfidenceFactor[];
}

export function buildEvidenceGraph(
  claims: readonly NormalizedClaim[],
  nowEpochSeconds: number,
  windowSeconds: number,
): EvidenceGraph {
  const independence = deriveIndependence(claims);
  const selfRevision = detectSelfRevision(claims, independence);
  const recency = applyRecency(claims, nowEpochSeconds, windowSeconds);

  const inWindow = new Set(recency.filter((r) => r.withinWindow).map((r) => r.claimId));
  const liveClaims = claims.filter((c) => inWindow.has(c.claimId));
  const liveFindings = independence.filter((f) => inWindow.has(f.claimId));

  const independentOriginCount = countDerivedIndependentOrigins(liveClaims, liveFindings);
  const revisedOriginKeys = selfRevision.filter((s) => s.revised).map((s) => s.originKey);

  const liveOrigins = new Set(
    liveClaims
      .filter((c) => c.sourceClass !== "RUMOR")
      .map((c) => liveFindings.find((f) => f.claimId === c.claimId))
      .filter((f): f is IndependenceFinding => f !== undefined && !f.relaysUnnamedReport)
      .map((f) => f.derivedOriginKey),
  );
  const usableOriginCount = [...liveOrigins].filter((k) => !revisedOriginKeys.includes(k)).length;

  const factors: ConfidenceFactor[] = [];

  const syndicated = liveFindings.filter((f) => f.isSyndication);
  if (syndicated.length > 0) {
    factors.push({
      code: "SYNDICATION_DETECTED",
      direction: "LOWERS",
      explanation:
        `${syndicated.length} claim(s) attribute their reporting to another outlet, so they ` +
        `were collapsed into that origin rather than counted separately.`,
      claimIds: syndicated.map((f) => f.claimId),
    });
  }

  if (usableOriginCount >= 2) {
    factors.push({
      code: "MULTIPLE_INDEPENDENT_ORIGINS",
      direction: "RAISES",
      explanation: `${usableOriginCount} genuinely independent origins report this event.`,
      claimIds: liveClaims.map((c) => c.claimId),
    });
  } else if (liveClaims.length > 0) {
    factors.push({
      code: "SINGLE_ORIGIN",
      direction: "LOWERS",
      explanation:
        `Only ${usableOriginCount} independent origin(s) can corroborate this event, below the ` +
        `two required for non-official promotion.`,
      claimIds: liveClaims.map((c) => c.claimId),
    });
  }

  for (const revision of selfRevision.filter((s) => s.revised)) {
    factors.push({
      code: "SELF_REVISED_SOURCE",
      direction: "LOWERS",
      explanation: revision.explanation,
      claimIds: revision.amounts.map((a) => a.claimId),
    });
  }

  const contradicting = liveClaims.filter((c) => c.relation === "CONTRADICTS");
  if (contradicting.length > 0) {
    factors.push({
      code: "CONTRADICTION_DECLARED",
      direction: "LOWERS",
      explanation: "At least one claim directly contradicts another in this set.",
      claimIds: contradicting.map((c) => c.claimId),
    });
  }

  const stale = recency.filter((r) => !r.withinWindow);
  if (stale.length > 0) {
    factors.push({
      code: "STALE_EVIDENCE_PRESENT",
      direction: "LOWERS",
      explanation: `${stale.length} claim(s) fall outside the evidence window and do not count.`,
      claimIds: stale.map((r) => r.claimId),
    });
  }

  const official = liveClaims.filter((c) => c.sourceClass === "OFFICIAL");
  if (official.length > 0) {
    factors.push({
      code: "OFFICIAL_CONFIRMATION_PRESENT",
      direction: "RAISES",
      explanation: `${official.length} official filing(s) are present in the evidence window.`,
      claimIds: official.map((c) => c.claimId),
    });
  }

  const unverified = liveClaims.filter((c) => c.assertionLevel === "REPORTED_UNVERIFIED");
  if (unverified.length > 0) {
    factors.push({
      code: "UNVERIFIED_ATTRIBUTION",
      direction: "LOWERS",
      explanation:
        `${unverified.length} claim(s) rest on unnamed sources or were explicitly not verified ` +
        `by the publisher.`,
      claimIds: unverified.map((c) => c.claimId),
    });
  }

  return {
    independence,
    selfRevision,
    recency,
    independentOriginCount,
    revisedOriginKeys,
    usableOriginCount,
    confidenceFactors: factors,
  };
}
