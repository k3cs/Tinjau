/**
 * LLM provider isolation layer (tasks P1.3, P1.5; migration target P1.11).
 *
 * Everything in this repo that needs to call an LLM goes through `getLanguageModel()`
 * from this file — nowhere else imports `@ai-sdk/google` directly. That's the whole
 * point: SVC-004 (docs/buildx-orion-2026/SERVICES.md) records Gemini as a temporary,
 * cost-driven choice, with an explicit intent to migrate to Claude Opus 5 once billing
 * is set up (task P1.11). Vercel AI SDK's `generateObject` takes a `LanguageModel`
 * instance and doesn't care which provider produced it, so the migration should be:
 * add `@ai-sdk/anthropic`, change the body of `getLanguageModel()` below, done — no
 * changes needed in parseFiling.ts, gradeFiling.ts, or their Zod schemas.
 *
 * Reads the API key from GEMINI_API_KEY first (the name used throughout this project's
 * docs and task tracker), falling back to GOOGLE_GENERATIVE_AI_API_KEY (the SDK's own
 * default env var name) and GOOGLE_API_KEY (an alternate name some Google tooling uses).
 * Throws a clear, actionable error if none is set — see `assertGeminiApiKey()`.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"; // "Flash tier" per SVC-004 — corrected 2026-08-17,
// live API call confirmed "gemini-2.5-flash" is deprecated ("no longer available to new
// users"), Google's own error response named this as the replacement.
//
// Pinned 2026-08-21: "gemini-3.6-flash" is *the* model id for this project. It is what
// agent.ts runs, what SVC-004 records, and what .env.example documents. GEMINI_MODEL below
// is an escape hatch (quota exhaustion, one-off experiments), not a second default — anything
// published that records a different id was collected under an override and must say so. The
// one case in this repo is the p2.1 parse-accuracy sample, whose 30 rows carry five other ids;
// see docs/buildx-orion-2026/outputs/05-build/parse-accuracy-study.md.

/**
 * Resolves the Gemini API key from whichever supported env var is set, without
 * throwing. Returns undefined if none are set. Prefer `assertGeminiApiKey()` at call
 * sites that are about to make a real request.
 */
export function resolveGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    undefined
  );
}

/**
 * Throws a clear, actionable error if no Gemini API key is configured. Call this at the
 * start of any function that is about to make a real Gemini request, so a missing key
 * fails fast and legibly instead of surfacing as a cryptic fetch/auth error deep inside
 * the AI SDK.
 */
export function assertGeminiApiKey(): string {
  const key = resolveGeminiApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY not set — see docs/buildx-orion-2026/SERVICES.md SVC-004. " +
        "Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY) in your " +
        "environment before calling the LLM parsing pipeline. This is expected to be " +
        "unset in this environment per task P0.13 — code past this point is written but " +
        "cannot be exercised live until the key exists.",
    );
  }
  return key;
}

export function getGeminiModelId(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/**
 * Returns a ready-to-use LanguageModel instance for the current provider (Gemini).
 * This is the single choke point a future P1.11 migration edits.
 */
export function getLanguageModel(): LanguageModel {
  const apiKey = assertGeminiApiKey();
  const google = createGoogleGenerativeAI({ apiKey });
  return google(getGeminiModelId());
}
