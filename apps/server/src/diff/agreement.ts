/**
 * Per-field diff + agreement level (task P1.4).
 *
 * Pure logic, no LLM calls — takes the three P1.3 parse attempts (some of which may
 * have failed after retries) and compares them FIELD BY FIELD, not document-by-document.
 * Every field in the output carries an explicit agreement level; disagreements record
 * every distinct value seen, never silently pick one.
 *
 * "Key fields" (eventType, affectedToken) are the ones whose disagreement blocks
 * auto-posting — chosen because they determine *what* the record even claims happened
 * and *which* token it's about; a downstream consumer (the registry, the hook, the
 * holder digest) cannot act sensibly on a record that can't agree on either. Disagreement
 * on a non-key field (a specific date, an amount) still gets recorded and surfaced, but
 * doesn't by itself block auto-post — those cases still fail closed if there aren't 3
 * successful parses to compare in the first place (see `readyToPost` logic below).
 */

import type { ParseAttemptResult } from "../llm/parseFiling.js";
import type { BondedFilingFields } from "../llm/schema.js";

export type DiffableField = "eventType" | "affectedToken" | "effectiveDates" | "declaredAmounts" | "futureAnnouncedDates";

/** Fields whose disagreement blocks auto-posting the record. */
export const KEY_FIELDS: readonly DiffableField[] = ["eventType", "affectedToken"];

const ALL_DIFF_FIELDS: readonly DiffableField[] = [
  "eventType",
  "affectedToken",
  "effectiveDates",
  "declaredAmounts",
  "futureAnnouncedDates",
];

export type AgreementLevel = "agree" | "disagree";

export interface FieldDiff {
  field: DiffableField;
  isKeyField: boolean;
  agreement: AgreementLevel;
  /**
   * One entry per successful parse, in attempt order — always fully populated
   * regardless of agreement, so nothing is dropped even when they all agree.
   */
  values: unknown[];
  /** Present only when agreement === "agree" — the single shared value, for convenience. */
  agreedValue?: unknown;
}

export type FlagReason =
  | "insufficient_successful_parses"
  | "key_field_disagreement"
  | "no_successful_parses";

export interface AgreementReport {
  fields: FieldDiff[];
  successfulParseCount: number;
  totalAttempts: number;
  readyToPost: boolean;
  flaggedForReview: boolean;
  flagReasons: FlagReason[];
  /** summary field is carried through for human review but never diffed (free text, expected to vary). */
  summaries: string[];
}

/** Canonicalizes a field value so structurally-equal-but-differently-ordered values compare equal. */
function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((v) => canonicalize(v));
    items.sort();
    return JSON.stringify(items);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const normalized: Record<string, unknown> = {};
    for (const k of sortedKeys) normalized[k] = canonicalize(obj[k]);
    return JSON.stringify(normalized);
  }
  return JSON.stringify(value);
}

function diffField(field: DiffableField, values: unknown[]): FieldDiff {
  const canonical = values.map(canonicalize);
  const distinct = new Set(canonical);
  const agreement: AgreementLevel = distinct.size <= 1 ? "agree" : "disagree";

  return {
    field,
    isKeyField: KEY_FIELDS.includes(field),
    agreement,
    values,
    ...(agreement === "agree" && values.length > 0 ? { agreedValue: values[0] } : {}),
  };
}

/**
 * Builds the per-field agreement report from three (or fewer, if some failed)
 * independent parse attempts of the same filing.
 */
export function buildAgreementReport(attempts: ParseAttemptResult[]): AgreementReport {
  const successful = attempts.filter(
    (a): a is Extract<ParseAttemptResult, { status: "ok" }> => a.status === "ok",
  );
  const successfulData: BondedFilingFields[] = successful.map((a) => a.data);

  const fields: FieldDiff[] = ALL_DIFF_FIELDS.map((field) =>
    diffField(
      field,
      successfulData.map((d) => d[field]),
    ),
  );

  const flagReasons: FlagReason[] = [];

  if (successfulData.length === 0) {
    flagReasons.push("no_successful_parses");
  } else if (successfulData.length < 3) {
    flagReasons.push("insufficient_successful_parses");
  }

  const keyFieldDisagreement = fields.some((f) => f.isKeyField && f.agreement === "disagree");
  if (keyFieldDisagreement) {
    flagReasons.push("key_field_disagreement");
  }

  const flaggedForReview = flagReasons.length > 0;
  const readyToPost = !flaggedForReview;

  return {
    fields,
    successfulParseCount: successfulData.length,
    totalAttempts: attempts.length,
    readyToPost,
    flaggedForReview,
    flagReasons,
    summaries: successfulData.map((d) => d.summary),
  };
}
