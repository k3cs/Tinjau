/**
 * Tests P1.4's per-field diff + agreement logic against synthetic 3-parse inputs.
 * Pure logic, no LLM calls, no API key needed — covers: all-agree, key-field-disagree,
 * minor-field-disagree, and partial-failure (fewer than 3 successful parses) cases.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgreementReport } from "../src/diff/agreement.js";
import type { ParseAttemptResult } from "../src/llm/parseFiling.js";
import type { BondedFilingFields } from "../src/llm/schema.js";

function baseFields(overrides: Partial<BondedFilingFields> = {}): BondedFilingFields {
  return {
    eventType: "dividend_declaration",
    effectiveDates: ["2026-08-10"],
    declaredAmounts: [{ label: "dividend per share", value: 0.5, unit: "USD" }],
    affectedToken: "MSTRx",
    futureAnnouncedDates: [
      { kind: "dividend_payment_date", date: "2026-09-01", description: "Dividend payment date" },
    ],
    summary: "MSTR declared a dividend.",
    ...overrides,
  };
}

function ok(attempt: number, data: BondedFilingFields): ParseAttemptResult {
  return { status: "ok", attempt, data };
}

function fail(attempt: number, error = "simulated failure"): ParseAttemptResult {
  return { status: "error", attempt, error };
}

test("all-agree case: readyToPost true, every field marked agree", () => {
  const attempts = [ok(1, baseFields()), ok(2, baseFields()), ok(3, baseFields())];
  const report = buildAgreementReport(attempts);

  assert.equal(report.readyToPost, true);
  assert.equal(report.flaggedForReview, false);
  assert.deepEqual(report.flagReasons, []);
  assert.equal(report.successfulParseCount, 3);
  for (const f of report.fields) {
    assert.equal(f.agreement, "agree", `expected ${f.field} to agree`);
  }
  // Order-insensitive equality: differently-ordered arrays of the same content still agree.
  const futureDatesField = report.fields.find((f) => f.field === "futureAnnouncedDates")!;
  assert.equal(futureDatesField.agreement, "agree");
});

test("key-field disagreement (eventType): flagged, not ready to post", () => {
  const attempts = [
    ok(1, baseFields({ eventType: "dividend_declaration" })),
    ok(2, baseFields({ eventType: "dividend_declaration" })),
    ok(3, baseFields({ eventType: "other" })),
  ];
  const report = buildAgreementReport(attempts);

  assert.equal(report.readyToPost, false);
  assert.equal(report.flaggedForReview, true);
  assert.ok(report.flagReasons.includes("key_field_disagreement"));

  const eventTypeField = report.fields.find((f) => f.field === "eventType")!;
  assert.equal(eventTypeField.agreement, "disagree");
  assert.equal(eventTypeField.isKeyField, true);
  // All three differing values preserved, none silently dropped.
  assert.deepEqual(eventTypeField.values, ["dividend_declaration", "dividend_declaration", "other"]);
  assert.equal(eventTypeField.agreedValue, undefined);
});

test("key-field disagreement (affectedToken): flagged, not ready to post", () => {
  const attempts = [
    ok(1, baseFields({ affectedToken: "MSTRx" })),
    ok(2, baseFields({ affectedToken: "NVDAx" })),
    ok(3, baseFields({ affectedToken: "MSTRx" })),
  ];
  const report = buildAgreementReport(attempts);

  assert.equal(report.readyToPost, false);
  assert.ok(report.flagReasons.includes("key_field_disagreement"));
  const tokenField = report.fields.find((f) => f.field === "affectedToken")!;
  assert.equal(tokenField.agreement, "disagree");
});

test("minor-field disagreement only (declaredAmounts): still ready to post", () => {
  const attempts = [
    ok(1, baseFields({ declaredAmounts: [{ label: "dividend per share", value: 0.5, unit: "USD" }] })),
    ok(2, baseFields({ declaredAmounts: [{ label: "dividend per share", value: 0.5, unit: "USD" }] })),
    ok(3, baseFields({ declaredAmounts: [{ label: "dividend per share", value: 0.55, unit: "USD" }] })),
  ];
  const report = buildAgreementReport(attempts);

  const amountsField = report.fields.find((f) => f.field === "declaredAmounts")!;
  assert.equal(amountsField.agreement, "disagree");
  assert.equal(amountsField.isKeyField, false);

  // Key fields (eventType, affectedToken) still agree in this scenario, so it stays postable.
  assert.equal(report.readyToPost, true);
  assert.equal(report.flaggedForReview, false);
  assert.deepEqual(report.flagReasons, []);
});

test("fewer than 3 successful parses: flagged, not ready to post, even if key fields agree", () => {
  const attempts = [ok(1, baseFields()), ok(2, baseFields()), fail(3, "model timeout")];
  const report = buildAgreementReport(attempts);

  assert.equal(report.successfulParseCount, 2);
  assert.equal(report.totalAttempts, 3);
  assert.equal(report.readyToPost, false);
  assert.ok(report.flagReasons.includes("insufficient_successful_parses"));
  // Key fields still compared across the 2 that did succeed.
  const eventTypeField = report.fields.find((f) => f.field === "eventType")!;
  assert.equal(eventTypeField.values.length, 2);
});

test("all three parses fail: flagged, not ready to post, empty field values", () => {
  const attempts = [fail(1), fail(2), fail(3)];
  const report = buildAgreementReport(attempts);

  assert.equal(report.successfulParseCount, 0);
  assert.equal(report.readyToPost, false);
  assert.ok(report.flagReasons.includes("no_successful_parses"));
  for (const f of report.fields) {
    assert.deepEqual(f.values, []);
  }
  assert.deepEqual(report.summaries, []);
});

test("summaries are carried through but never affect agreement/flagging", () => {
  const attempts = [
    ok(1, baseFields({ summary: "Summary A, worded one way." })),
    ok(2, baseFields({ summary: "Summary B, worded differently." })),
    ok(3, baseFields({ summary: "Summary C, worded yet another way." })),
  ];
  const report = buildAgreementReport(attempts);

  assert.equal(report.readyToPost, true);
  assert.equal(report.summaries.length, 3);
  assert.ok(!report.fields.some((f) => (f.field as string) === "summary"));
});
