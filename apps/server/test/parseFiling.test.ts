/**
 * Tests P1.3's surrounding logic (retry handling, schema-shaped plumbing, error paths,
 * and the missing-API-key failure mode) WITHOUT hitting the real Gemini API. This is
 * required reading for the report: live testing of P1.3/P1.5 against the real Gemini
 * API is blocked in this environment because no GEMINI_API_KEY (or equivalent) is set
 * (task P0.13). This file verifies the code around the LLM call is correct; it does not
 * and cannot verify Gemini actually returns schema-valid output for real filing text.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import type { LanguageModel } from "ai";
import { parseOnce, parseFilingThreeWays, withRetry, type GenerateObjectFn, type FilingParseContext } from "../src/llm/parseFiling.js";
import { gradeFilingSeverity } from "../src/llm/gradeFiling.js";
import { resolveGeminiApiKey, assertGeminiApiKey } from "../src/llm/provider.js";

const FAKE_MODEL = {} as unknown as LanguageModel;

const CTX: FilingParseContext = {
  ticker: "MSTR",
  form: "8-K",
  filingDate: "2026-08-10",
  accessionNumber: "0001193125-26-341297",
};

const VALID_BONDED_OBJECT = {
  eventType: "dividend_declaration" as const,
  effectiveDates: ["2026-08-10"],
  declaredAmounts: [{ label: "dividend per share", value: 0.5, unit: "USD" }],
  affectedToken: "MSTRx" as const,
  futureAnnouncedDates: [],
  summary: "MSTR declared a dividend.",
};

const VALID_GRADE_OBJECT = {
  severity: "NORMAL" as const,
  direction: "unclear" as const,
  rationale: "Routine dividend declaration.",
};

function makeGenerateFn(impl: (callCount: number) => { object: unknown } | Promise<never>): {
  fn: GenerateObjectFn;
  callCount: () => number;
} {
  let calls = 0;
  const fn = (async (..._args: unknown[]) => {
    calls += 1;
    const result = impl(calls);
    return result;
  }) as unknown as GenerateObjectFn;
  return { fn, callCount: () => calls };
}

// --- provider.ts: missing API key fails clearly ---

test("resolveGeminiApiKey returns undefined when no known env var is set", () => {
  const saved = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  try {
    assert.equal(resolveGeminiApiKey(), undefined);
    assert.throws(() => assertGeminiApiKey(), /GEMINI_API_KEY not set/);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("resolveGeminiApiKey picks up GEMINI_API_KEY when set", () => {
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-fake-key-not-real";
  try {
    assert.equal(resolveGeminiApiKey(), "test-fake-key-not-real");
    assert.doesNotThrow(() => assertGeminiApiKey());
  } finally {
    if (saved === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved;
  }
});

// --- withRetry ---

test("withRetry succeeds immediately when the function succeeds on the first try", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry retries on failure and succeeds once the underlying call succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient failure");
      return "recovered";
    },
    { retries: 2, delayMs: 1 },
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry exhausts retries and throws the last error", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error(`fail #${calls}`);
      },
      { retries: 2, delayMs: 1 },
    ),
    /fail #3/,
  );
  assert.equal(calls, 3); // initial attempt + 2 retries
});

// --- parseOnce (mocked generateObject) ---

test("parseOnce returns schema-shaped data from a mocked successful call", async () => {
  const { fn, callCount } = makeGenerateFn(() => ({ object: VALID_BONDED_OBJECT }));
  const data = await parseOnce("clean filing text", CTX, { model: FAKE_MODEL, generateFn: fn });
  assert.deepEqual(data, VALID_BONDED_OBJECT);
  assert.equal(callCount(), 1);
});

test("parseOnce retries through transient failures then succeeds", async () => {
  const { fn, callCount } = makeGenerateFn((n) => {
    if (n < 2) throw new Error("simulated 503");
    return { object: VALID_BONDED_OBJECT };
  });
  const data = await parseOnce("clean filing text", CTX, {
    model: FAKE_MODEL,
    generateFn: fn,
    retryOptions: { retries: 2, delayMs: 1 },
  });
  assert.deepEqual(data, VALID_BONDED_OBJECT);
  assert.equal(callCount(), 2);
});

test("parseOnce throws after exhausting retries on persistent failure", async () => {
  const { fn } = makeGenerateFn(() => {
    throw new Error("persistent schema validation failure");
  });
  await assert.rejects(
    parseOnce("clean filing text", CTX, { model: FAKE_MODEL, generateFn: fn, retryOptions: { retries: 1, delayMs: 1 } }),
    /persistent schema validation failure/,
  );
});

// --- parseFilingThreeWays ---

test("parseFilingThreeWays makes three independent calls, all succeeding", async () => {
  const { fn, callCount } = makeGenerateFn(() => ({ object: VALID_BONDED_OBJECT }));
  const results = await parseFilingThreeWays("clean filing text", CTX, { model: FAKE_MODEL, generateFn: fn });

  assert.equal(results.length, 3);
  assert.equal(callCount(), 3);
  assert.deepEqual(
    results.map((r) => r.attempt),
    [1, 2, 3],
  );
  for (const r of results) {
    assert.equal(r.status, "ok");
  }
});

test("parseFilingThreeWays captures a partial failure without throwing or losing the other two", async () => {
  // Each of the 3 independent calls gets its own generateFn instance in reality (3 separate
  // parseOnce calls), so we simulate "attempt 2 always fails" via a shared counter keyed by
  // call order: with retries:0, 3 concurrent parseOnce calls each invoke generateFn once,
  // and Promise.all's ordering of concurrent async calls isn't guaranteed — so instead we
  // model failure via a call-count parity trick: every 2nd invocation across all three
  // concurrent attempts fails. What matters for this test is only the aggregate shape, not
  // which attempt index failed.
  let calls = 0;
  const fn = (async () => {
    calls += 1;
    if (calls === 2) throw new Error("simulated flaky failure");
    return { object: VALID_BONDED_OBJECT };
  }) as unknown as GenerateObjectFn;

  const results = await parseFilingThreeWays("clean filing text", CTX, {
    model: FAKE_MODEL,
    generateFn: fn,
    retryOptions: { retries: 0, delayMs: 1 },
  });

  assert.equal(results.length, 3);
  const successes = results.filter((r) => r.status === "ok");
  const failures = results.filter((r) => r.status === "error");
  assert.equal(successes.length, 2);
  assert.equal(failures.length, 1);
  assert.match((failures[0] as { error: string }).error, /simulated flaky failure/);
});

// --- gradeFilingSeverity (P1.5) — structurally separate from P1.3 ---

test("gradeFilingSeverity returns an unbonded-marked grade from a mocked call", async () => {
  const { fn, callCount } = makeGenerateFn(() => ({ object: VALID_GRADE_OBJECT }));
  const result = await gradeFilingSeverity("clean filing text", CTX, { model: FAKE_MODEL, generateFn: fn });

  assert.equal(result.kind, "unbonded_severity_grade");
  assert.deepEqual(result.grade, VALID_GRADE_OBJECT);
  assert.equal(callCount(), 1);
  // Structural separation check: the grade result must not carry any bonded-field keys.
  assert.ok(!("eventType" in result.grade));
  assert.ok(!("affectedToken" in result.grade));
});

test("gradeFilingSeverity retries on transient failure like parseOnce does", async () => {
  const { fn, callCount } = makeGenerateFn((n) => {
    if (n < 2) throw new Error("simulated timeout");
    return { object: VALID_GRADE_OBJECT };
  });
  const result = await gradeFilingSeverity("clean filing text", CTX, {
    model: FAKE_MODEL,
    generateFn: fn,
    retryOptions: { retries: 2, delayMs: 1 },
  });
  assert.equal(result.grade.severity, "NORMAL");
  assert.equal(callCount(), 2);
});
