/**
 * Claim normalisation with full provenance (task T2.1).
 *
 * Every claim entering the Evidence Graph passes through here, whatever its origin. The
 * output records what the source said, who said it, when, where to check it, and how strongly
 * it was asserted — and refuses to invent any of those.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE (tracker §0.8): a claim with incomplete provenance is
 * not discarded, it is marked **non-promotable**. Discarding would hide that someone tried to
 * feed the pipeline an unattributed assertion; promoting it would let an unattributed
 * assertion move a fee. Recording it as visibly non-promotable does neither.
 */

import { analyseSpeculation, describesCompletedEvent, type AssertionLevel } from "./speculation.js";
import type { DataMode, SourceClass } from "../risk/types.js";

/** A claim after normalisation. Field names match tracker §0.24 where they overlap. */
export interface NormalizedClaim {
  claimId: string;
  sourceClass: SourceClass;
  dataMode: DataMode;

  // -- provenance ---------------------------------------------------------------
  /** Resolvable URL, or null. Null is CORRECT for a simulated claim and a defect otherwise. */
  sourceUrl: string | null;
  /** Stable identifier, always present, even when no URL exists. */
  sourceId: string;
  publisherOrAuthor: string | null;
  /** ISO 8601. */
  publishedAt: string;
  /** How precise `publishedAt` really is. A day-precision timestamp must not be treated as a second. */
  publishedAtPrecision: "SECOND" | "MINUTE" | "HOUR" | "DAY";
  /** sha256 of the exact source bytes, when the source is a document we hold. */
  sourceContentSha256: string | null;

  // -- subject ------------------------------------------------------------------
  company: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  eventType: string;

  // -- what was actually said ---------------------------------------------------
  /** Verbatim span or a pointer to one. NEVER a paraphrase. */
  claimTextOrPointer: string;
  assertionLevel: AssertionLevel;
  /** False for anything the source framed as talks, plans, or possibilities. */
  describesCompletedEvent: boolean;
  speculationMarkers: string[];
  publisherDisclaimedVerification: boolean;

  // -- graph position (filled by T2.2/T2.3, carried here so the shape is stable) --
  independenceGroup: string;
  relation: "ORIGIN" | "SUPPORTS" | "CONTRADICTS" | "DUPLICATE";
  officialConfirmation: boolean;
  expiresAt: string | null;
  materiality: "MATERIAL" | "NON_MATERIAL" | "UNKNOWN";

  // -- validation ---------------------------------------------------------------
  provenanceViolations: ProvenanceViolation[];
  /** Derived, never supplied. A claim with any violation can never support an action. */
  promotable: boolean;
}

export type ProvenanceViolation =
  | "MISSING_SOURCE_ID"
  | "MISSING_PUBLISHED_AT"
  | "INVALID_PUBLISHED_AT"
  | "MISSING_PUBLISHER_FOR_NON_SIMULATED"
  | "MISSING_URL_FOR_NON_SIMULATED"
  | "RESOLVABLE_URL_ON_SIMULATED_CLAIM"
  | "MISSING_CLAIM_TEXT"
  | "MISSING_COMPANY"
  | "MISSING_TOKEN_SYMBOL"
  | "OFFICIAL_WITHOUT_CONTENT_HASH"
  | "OFFICIAL_WITHOUT_RESOLVABLE_URL";

/** Raw input, before validation. Every provenance field is optional so its absence is detectable. */
export interface RawClaimInput {
  claimId: string;
  sourceClass: SourceClass;
  dataMode: DataMode;
  sourceUrl?: string | null;
  sourceId?: string;
  publisherOrAuthor?: string | null;
  publishedAt?: string;
  publishedAtPrecision?: NormalizedClaim["publishedAtPrecision"];
  sourceContentSha256?: string | null;
  company?: string;
  tokenSymbol?: string;
  tokenAddress?: string | null;
  eventType?: string;
  claimTextOrPointer?: string;
  independenceGroup?: string;
  relation?: NormalizedClaim["relation"];
  officialConfirmation?: boolean;
  expiresAt?: string | null;
  materiality?: NormalizedClaim["materiality"];
  /** Structural knowledge the caller has that language cannot supply. */
  assertionHint?: AssertionLevel;
}

function isIsoTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

/**
 * Normalises one claim and validates its provenance.
 *
 * Deterministic and pure: no model call, no network, no clock. The same raw input always
 * produces the same normalised claim, which is what lets the Evidence Graph be reproduced
 * from fixtures without re-prompting anything (tracker §0.9).
 */
export function normalizeClaim(raw: RawClaimInput): NormalizedClaim {
  const violations: ProvenanceViolation[] = [];

  const simulated = raw.dataMode === "SIMULATED";
  const sourceUrl = raw.sourceUrl ?? null;
  const sourceId = raw.sourceId?.trim() ?? "";
  const publishedAt = raw.publishedAt?.trim() ?? "";
  const claimText = raw.claimTextOrPointer?.trim() ?? "";
  const company = raw.company?.trim() ?? "";
  const tokenSymbol = raw.tokenSymbol?.trim() ?? "";

  if (sourceId.length === 0) violations.push("MISSING_SOURCE_ID");
  if (publishedAt.length === 0) violations.push("MISSING_PUBLISHED_AT");
  else if (!isIsoTimestamp(publishedAt)) violations.push("INVALID_PUBLISHED_AT");
  if (claimText.length === 0) violations.push("MISSING_CLAIM_TEXT");
  if (company.length === 0) violations.push("MISSING_COMPANY");
  if (tokenSymbol.length === 0) violations.push("MISSING_TOKEN_SYMBOL");

  if (simulated) {
    // A fabricated claim carrying a resolvable URL is the most dangerous shape in this
    // system: it looks checkable and is not. Flagged as a violation in its own right.
    if (sourceUrl !== null && /^https?:\/\//i.test(sourceUrl)) {
      violations.push("RESOLVABLE_URL_ON_SIMULATED_CLAIM");
    }
  } else {
    if (sourceUrl === null || sourceUrl.trim().length === 0) {
      violations.push("MISSING_URL_FOR_NON_SIMULATED");
    }
    if (raw.publisherOrAuthor === null || (raw.publisherOrAuthor ?? "").trim().length === 0) {
      violations.push("MISSING_PUBLISHER_FOR_NON_SIMULATED");
    }
  }

  // Official evidence keeps the stronger requirements the existing bonded path already
  // imposes. Weakening them here would let the new pipeline launder a filing that the old
  // one would have rejected.
  if (raw.sourceClass === "OFFICIAL") {
    if (!raw.sourceContentSha256 || raw.sourceContentSha256.trim().length === 0) {
      violations.push("OFFICIAL_WITHOUT_CONTENT_HASH");
    }
    if (!sourceUrl || !/^https:\/\/www\.sec\.gov\//.test(sourceUrl)) {
      violations.push("OFFICIAL_WITHOUT_RESOLVABLE_URL");
    }
  }

  const speculation = analyseSpeculation(claimText, raw.assertionHint);
  const completed = describesCompletedEvent(speculation.level);

  // NOTE ON A CHECK THAT IS DELIBERATELY ABSENT.
  //
  // An earlier version flagged `officialConfirmation === true` on a hedged non-official claim
  // as "speculation recorded as completed event". That was wrong, and the frozen scenario B
  // caught it: `officialConfirmation` means "an official document later confirmed this
  // claim", not "this source asserted the event had happened". Those are different facts, and
  // a hedged report that a subsequent filing confirms is the normal, honest shape of breaking
  // financial news — scenario B is exactly that.
  //
  // The §0.8 protection is not lost, it lives somewhere better: `describesCompletedEvent` is
  // DERIVED from the source's own language and cannot be supplied by a caller, so no upstream
  // component can assert that a hedged claim describes a finished event. The related
  // graph-level question — whether a claim marked as officially confirmed is actually backed
  // by an OFFICIAL claim in the same set — cannot be answered from one claim in isolation and
  // belongs to T2.3.

  return {
    claimId: raw.claimId,
    sourceClass: raw.sourceClass,
    dataMode: raw.dataMode,
    sourceUrl,
    sourceId,
    publisherOrAuthor: raw.publisherOrAuthor ?? null,
    publishedAt,
    publishedAtPrecision: raw.publishedAtPrecision ?? "DAY",
    sourceContentSha256: raw.sourceContentSha256 ?? null,
    company,
    tokenSymbol,
    tokenAddress: raw.tokenAddress ?? null,
    eventType: raw.eventType ?? "UNKNOWN",
    claimTextOrPointer: claimText,
    assertionLevel: speculation.level,
    describesCompletedEvent: completed,
    speculationMarkers: speculation.matchedMarkers,
    publisherDisclaimedVerification: speculation.publisherDisclaimedVerification,
    independenceGroup: raw.independenceGroup ?? "",
    relation: raw.relation ?? "ORIGIN",
    officialConfirmation: raw.officialConfirmation ?? false,
    expiresAt: raw.expiresAt ?? null,
    materiality: raw.materiality ?? "UNKNOWN",
    provenanceViolations: violations,
    // Derived, never supplied by the caller. This is the field the promotion engine reads,
    // and making it computed means no upstream component can assert its own promotability.
    promotable: violations.length === 0,
  };
}

export function normalizeClaims(raws: readonly RawClaimInput[]): NormalizedClaim[] {
  return raws.map(normalizeClaim);
}

/**
 * Splits a normalised set into the claims that may support an action and those that may not.
 *
 * Both halves are returned. The non-promotable half is not garbage to be dropped — it is the
 * record of what was seen and why it did not count, which is what makes a `WATCH` explainable.
 */
export function partitionByPromotability(claims: readonly NormalizedClaim[]): {
  promotable: NormalizedClaim[];
  nonPromotable: NormalizedClaim[];
} {
  return {
    promotable: claims.filter((c) => c.promotable),
    nonPromotable: claims.filter((c) => !c.promotable),
  };
}
