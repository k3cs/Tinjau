import { expect, test } from "@playwright/test";
import { DEMO_SCENARIOS } from "../src/lib/risk/demo-fixtures";
import { validateRiskRecord } from "../src/lib/risk/validate";

test("validated fixture preserves unavailable numeric values", () => {
  const record = validateRiskRecord(DEMO_SCENARIOS[0].record);
  expect(record.marketConfirmation.okxReferencePrice).toBeNull();
  expect(record.marketConfirmation.basisBps).toBeNull();
});

test("unknown state fails closed", () => {
  const input = structuredClone(DEMO_SCENARIOS[0].record);
  (input as unknown as { state: string }).state = "ALARM";
  expect(() => validateRiskRecord(input)).toThrow(/unknown value/);
});

test("WATCH cannot authorize an action", () => {
  const input = structuredClone(DEMO_SCENARIOS[0].record);
  input.action.authorized = true;
  expect(() => validateRiskRecord(input)).toThrow(/must be false outside PROTECT/);
});

test("simulated evidence cannot receive a resolvable source URL", () => {
  const input = structuredClone(DEMO_SCENARIOS[0].record);
  input.evidence[0].sourceUrl = "https://example.com/fabricated-proof";
  expect(() => validateRiskRecord(input)).toThrow(/must be null for SIMULATED evidence/);
});
