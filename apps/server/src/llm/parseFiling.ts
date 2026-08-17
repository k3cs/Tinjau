/**
 * Three independent structured-output parses per filing (task P1.3).
 *
 * Calls the LLM three separate times — three independent `generateObject` invocations,
 * not one call asked for three variations — against `BondedFilingFieldsSchema`. Each
 * call gets its own retry handling; a filing where the model is flaky produces partial
 * results (some of the three succeed, some don't) rather than throwing away the whole
 * attempt, and P1.4's diff logic is expected to treat fewer than 3 successful parses as
 * automatically not ready to auto-post (see diff/agreement.ts).
 *
 * `generateFn` is injectable so this module is unit-testable without hitting the real
 * Gemini API — see test/parseFiling.test.ts, which mocks it to verify retry behavior,
 * schema validation plumbing, and error paths without any network call or API key.
 */

import { generateObject, type LanguageModel } from "ai";
import { BondedFilingFieldsSchema, type BondedFilingFields } from "./schema.js";
import { getLanguageModel } from "./provider.js";

export interface FilingParseContext {
  ticker: string;
  form: string;
  filingDate: string;
  accessionNumber: string;
}

export type GenerateObjectFn = typeof generateObject;

export interface ParseAttemptSuccess {
  status: "ok";
  attempt: number;
  data: BondedFilingFields;
}

export interface ParseAttemptFailure {
  status: "error";
  attempt: number;
  error: string;
}

export type ParseAttemptResult = ParseAttemptSuccess | ParseAttemptFailure;

export interface RetryOptions {
  retries: number;
  delayMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = { retries: 2, delayMs: 500 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries `fn` up to `retries` additional times on throw, with a fixed delay between attempts. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = DEFAULT_RETRY_OPTIONS): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= opts.retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < opts.retries) {
        await sleep(opts.delayMs);
      }
    }
  }
  throw lastError;
}

function buildPrompt(cleanText: string, ctx: FilingParseContext): string {
  return [
    `You are parsing an SEC ${ctx.form} filing from ${ctx.ticker}, filed ${ctx.filingDate} ` +
      `(accession ${ctx.accessionNumber}), into structured fields.`,
    `Extract only what the document text actually states. Do not infer amounts or dates that ` +
      `are not present in the text. If the filing declares no numeric amounts, return an empty array.`,
    `--- FILING TEXT START ---`,
    cleanText,
    `--- FILING TEXT END ---`,
  ].join("\n\n");
}

/** One independent structured-output parse attempt. */
export async function parseOnce(
  cleanText: string,
  ctx: FilingParseContext,
  opts: {
    model?: LanguageModel;
    generateFn?: GenerateObjectFn;
    retryOptions?: RetryOptions;
  } = {},
): Promise<BondedFilingFields> {
  const generateFn = opts.generateFn ?? generateObject;
  const model = opts.model ?? getLanguageModel();

  return withRetry(async () => {
    const result = await generateFn({
      model,
      schema: BondedFilingFieldsSchema,
      prompt: buildPrompt(cleanText, ctx),
    });
    // generateObject validates against the Zod schema internally and throws
    // NoObjectGeneratedError on invalid output, so `result.object` is already schema-valid.
    return result.object as BondedFilingFields;
  }, opts.retryOptions);
}

/**
 * Runs three independent parses of the same clean text in parallel. Never throws —
 * failures (after retries) are captured as ParseAttemptFailure entries so callers can
 * decide how to handle partial results.
 */
export async function parseFilingThreeWays(
  cleanText: string,
  ctx: FilingParseContext,
  opts: {
    model?: LanguageModel;
    generateFn?: GenerateObjectFn;
    retryOptions?: RetryOptions;
  } = {},
): Promise<ParseAttemptResult[]> {
  const attempts = [1, 2, 3].map(async (attempt): Promise<ParseAttemptResult> => {
    try {
      const data = await parseOnce(cleanText, ctx, opts);
      return { status: "ok", attempt, data };
    } catch (err) {
      return {
        status: "error",
        attempt,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return Promise.all(attempts);
}
