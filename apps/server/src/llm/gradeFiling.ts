/**
 * Severity/direction grade (task P1.5) — a single, separate LLM call, same provider as
 * P1.3 (Gemini for now, via the same src/llm/provider.ts choke point).
 *
 * This module is intentionally NOT part of parseFiling.ts / schema's bonded-fields type.
 * `SeverityGradeSchema` (src/llm/schema.ts) shares no base type with
 * `BondedFilingFieldsSchema`, `gradeFilingSeverity()` is a distinct function with a
 * distinct return type (`SeverityGradeResult`), and nothing in diff/agreement.ts (P1.4,
 * which only ever consumes bonded fields) imports from this file. Per spec §3: "the
 * severity/direction grade is unbonded model judgment... do not describe the grade as
 * bonded." Keeping it structurally separate in the code's shape is the requirement, not
 * just a comment saying so.
 */

import { generateObject, type LanguageModel } from "ai";
import { SeverityGradeSchema, type SeverityGrade } from "./schema.js";
import { getLanguageModel } from "./provider.js";
import { withRetry, type RetryOptions, type GenerateObjectFn, type FilingParseContext } from "./parseFiling.js";

export interface SeverityGradeResult {
  /** Explicit marker so downstream code can never mistake this for a bonded field object. */
  kind: "unbonded_severity_grade";
  grade: SeverityGrade;
}

function buildGradePrompt(cleanText: string, ctx: FilingParseContext): string {
  return [
    `You are grading the severity and directional market implication of an SEC ${ctx.form} ` +
      `filing from ${ctx.ticker}, filed ${ctx.filingDate} (accession ${ctx.accessionNumber}).`,
    `This is a judgment call, not a factual extraction — grade how significant and how ` +
      `directionally positive/negative/unclear this event is likely to be for the affected token.`,
    `--- FILING TEXT START ---`,
    cleanText,
    `--- FILING TEXT END ---`,
  ].join("\n\n");
}

/**
 * Produces one severity/direction grade for a filing. Structurally and clearly separate
 * from parseFiling.ts's bonded three-way parse — never call this from P1.4's diff logic,
 * and never fold its output into a BondedFilingFields object.
 */
export async function gradeFilingSeverity(
  cleanText: string,
  ctx: FilingParseContext,
  opts: {
    model?: LanguageModel;
    generateFn?: GenerateObjectFn;
    retryOptions?: RetryOptions;
  } = {},
): Promise<SeverityGradeResult> {
  const generateFn = opts.generateFn ?? generateObject;
  const model = opts.model ?? getLanguageModel();

  const grade = await withRetry(async () => {
    const result = await generateFn({
      model,
      schema: SeverityGradeSchema,
      prompt: buildGradePrompt(cleanText, ctx),
    });
    return result.object as SeverityGrade;
  }, opts.retryOptions);

  return { kind: "unbonded_severity_grade", grade };
}
