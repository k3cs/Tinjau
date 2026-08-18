/**
 * Tests P1.8's pure mapping logic (src/chain/mapEventToRegistry.ts): the off-chain
 * EVENT_TYPES x filing.form -> on-chain EventType table, modal-value selection / agreement
 * counting, fixed-point declaredAmount scaling, severity mapping, and the extraData JSON
 * builder. Pure logic, no network, no chain client — matches the style of the other three
 * test files in this directory.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapEventType,
  ON_CHAIN_EVENT_TYPE,
  mapPipelineResultToPostArgs,
  mapSeverity,
  scaleDeclaredAmount,
  isoDateToUnixSeconds,
  stableStringify,
} from "../src/chain/mapEventToRegistry.js";
import { EVENT_TYPES, type BondedFilingFields } from "../src/llm/schema.js";
import type { ParseAttemptResult } from "../src/llm/parseFiling.js";
import type { PipelineResult } from "../src/pipeline.js";
import type { FilingRecord } from "../src/types.js";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------
// Table-driven: every off-chain EVENT_TYPES -> expected on-chain uint8
// ---------------------------------------------------------------------

test("mapEventType: every off-chain EVENT_TYPES entry maps to the documented uint8 (8-K form)", () => {
  const expected: Record<(typeof EVENT_TYPES)[number], number> = {
    dividend_declaration: ON_CHAIN_EVENT_TYPE.Form8K_Material,
    dividend_payment: ON_CHAIN_EVENT_TYPE.Form8K_Material,
    stock_split: ON_CHAIN_EVENT_TYPE.Form8K_Material,
    insider_transaction: ON_CHAIN_EVENT_TYPE.Form8K_Material, // via 8-K form branch
    earnings_announcement: ON_CHAIN_EVENT_TYPE.Form8K_Earnings,
    material_agreement: ON_CHAIN_EVENT_TYPE.Form8K_Material,
    executive_change: ON_CHAIN_EVENT_TYPE.Form8K_ExecutiveChange,
    capital_raise: ON_CHAIN_EVENT_TYPE.Form8K_Material,
    acquisition_or_divestiture: ON_CHAIN_EVENT_TYPE.Form8K_MAndA,
    bankruptcy_or_restructuring: ON_CHAIN_EVENT_TYPE.Form8K_Bankruptcy,
    restatement: ON_CHAIN_EVENT_TYPE.Form8K_Restatement,
    other: ON_CHAIN_EVENT_TYPE.Unknown,
  };

  for (const offChainType of EVENT_TYPES) {
    const got = mapEventType(offChainType, "8-K", []);
    assert.equal(got, expected[offChainType], `expected ${offChainType} (form 8-K) -> ${expected[offChainType]}, got ${got}`);
  }
});

test("mapEventType: insider_transaction on Form 4 with sell-keyword label -> Form4_InsiderSell", () => {
  const got = mapEventType("insider_transaction", "4", ["Disposition of common stock"]);
  assert.equal(got, ON_CHAIN_EVENT_TYPE.Form4_InsiderSell);
});

test("mapEventType: insider_transaction on Form 4 with buy-keyword label -> Form4_InsiderBuy", () => {
  const got = mapEventType("insider_transaction", "4", ["Acquisition of common stock"]);
  assert.equal(got, ON_CHAIN_EVENT_TYPE.Form4_InsiderBuy);
});

test("mapEventType: insider_transaction on Form 4 with no matching keyword -> Unknown", () => {
  const got = mapEventType("insider_transaction", "4", ["Gift of common stock"]);
  assert.equal(got, ON_CHAIN_EVENT_TYPE.Unknown);
});

test("mapEventType: insider_transaction on Form 4 with no declaredAmounts at all -> Unknown", () => {
  const got = mapEventType("insider_transaction", "4", []);
  assert.equal(got, ON_CHAIN_EVENT_TYPE.Unknown);
});

test("mapEventType: Form8K_Delisting (7) is unreachable — no input yields it", () => {
  const allInputs: Array<[string, string, string[]]> = [
    ...EVENT_TYPES.map((t): [string, string, string[]] => [t, "8-K", []]),
    ...EVENT_TYPES.map((t): [string, string, string[]] => [t, "4", ["sold", "bought", "gift"]]),
    ["other", "8-K", []],
    ["insider_transaction", "4", ["disposition"]],
    ["insider_transaction", "4", ["acquisition"]],
  ];
  for (const [offChainType, form, labels] of allInputs) {
    const got = mapEventType(offChainType, form, labels);
    assert.notEqual(got, ON_CHAIN_EVENT_TYPE.Form8K_Delisting, `${offChainType}/${form} unexpectedly mapped to Form8K_Delisting`);
  }
});

// ---------------------------------------------------------------------
// Fixed-point declaredAmount scaling
// ---------------------------------------------------------------------

test("scaleDeclaredAmount: 0.08 -> 80000n", () => {
  assert.equal(scaleDeclaredAmount(0.08), 80000n);
});

test("scaleDeclaredAmount: negative value preserved", () => {
  assert.equal(scaleDeclaredAmount(-1.5), -1500000n);
});

test("scaleDeclaredAmount: rejects non-finite input", () => {
  assert.throws(() => scaleDeclaredAmount(NaN), /non-finite/);
  assert.throws(() => scaleDeclaredAmount(Infinity), /non-finite/);
  assert.throws(() => scaleDeclaredAmount(-Infinity), /non-finite/);
});

// ---------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------

test("mapSeverity: GRAVE/negative -> -90", () => {
  const { severity } = mapSeverity({ severity: "GRAVE", direction: "negative", rationale: "x" }, 3);
  assert.equal(severity, -90);
});

test("mapSeverity: ELEVATED/unclear -> 0 regardless of magnitude", () => {
  const { severity } = mapSeverity({ severity: "ELEVATED", direction: "unclear", rationale: "x" }, 3);
  assert.equal(severity, 0);
});

test("mapSeverity: NORMAL/positive -> +20", () => {
  const { severity } = mapSeverity({ severity: "NORMAL", direction: "positive", rationale: "x" }, 3);
  assert.equal(severity, 20);
});

test("mapSeverity: confidence derived as round(100 * minCoreAgreement / 3)", () => {
  assert.equal(mapSeverity({ severity: "NORMAL", direction: "positive", rationale: "x" }, 3).confidence, 100);
  assert.equal(mapSeverity({ severity: "NORMAL", direction: "positive", rationale: "x" }, 2).confidence, 67);
  assert.equal(mapSeverity({ severity: "NORMAL", direction: "positive", rationale: "x" }, 0).confidence, 0);
});

// ---------------------------------------------------------------------
// ISO date conversion
// ---------------------------------------------------------------------

test("isoDateToUnixSeconds: converts YYYY-MM-DD to UTC-midnight unix seconds", () => {
  assert.equal(isoDateToUnixSeconds("2026-08-10"), 1786320000n);
});

test("isoDateToUnixSeconds: rejects malformed input", () => {
  assert.throws(() => isoDateToUnixSeconds("not-a-date"));
  assert.throws(() => isoDateToUnixSeconds("2026/08/10"));
});

// ---------------------------------------------------------------------
// stableStringify: key-order-independent hashing
// ---------------------------------------------------------------------

test("stableStringify: sha256 is stable regardless of input key insertion order", () => {
  const a = { z: 1, a: { y: 2, x: 3 }, m: [3, 2, 1] };
  const b = { a: { x: 3, y: 2 }, m: [3, 2, 1], z: 1 };
  const hashOf = (v: unknown) => createHash("sha256").update(stableStringify(v), "utf8").digest("hex");
  assert.equal(hashOf(a), hashOf(b));
});

// ---------------------------------------------------------------------
// Agreement counting via full mapPipelineResultToPostArgs, using synthetic PipelineResults
// ---------------------------------------------------------------------

function bondedFields(overrides: Partial<BondedFilingFields> = {}): BondedFilingFields {
  return {
    eventType: "material_agreement",
    effectiveDates: ["2026-08-10"],
    declaredAmounts: [{ label: "dividend per share", value: 0.08, unit: "USD" }],
    affectedToken: "MSTRx",
    futureAnnouncedDates: [],
    summary: "MSTR entered a material agreement.",
    ...overrides,
  };
}

function ok(attempt: number, data: BondedFilingFields): ParseAttemptResult {
  return { status: "ok", attempt, data };
}

function fail(attempt: number, error = "simulated failure"): ParseAttemptResult {
  return { status: "error", attempt, error };
}

const FILING: FilingRecord = {
  ticker: "MSTR",
  tokenSymbol: "MSTRx",
  cik: "0001050446",
  form: "8-K",
  accessionNumber: "0001193125-26-341297",
  filingDate: "2026-08-10",
  acceptanceDateTime: "2026-08-10T12:00:15.000Z",
  primaryDocument: "mstr-20260810.htm",
  primaryDocDescription: null,
  documentUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312526341297/mstr-20260810.htm",
};

function buildResult(attempts: ParseAttemptResult[]): PipelineResult {
  const successful = attempts.filter((a): a is Extract<ParseAttemptResult, { status: "ok" }> => a.status === "ok");
  return {
    filing: FILING,
    contentHash: "b8d705f296596d777bbd7ad2e76e2482808cbf7817febf066f8e2dc43a8e1b58",
    strippedTextLength: 1000,
    attempts,
    agreement: {
      fields: [],
      successfulParseCount: successful.length,
      totalAttempts: attempts.length,
      readyToPost: successful.length === 3,
      flaggedForReview: successful.length !== 3,
      flagReasons: successful.length === 3 ? [] : ["insufficient_successful_parses"],
      summaries: successful.map((s) => s.data.summary),
    },
    severityGrade: {
      kind: "unbonded_severity_grade",
      grade: { severity: "ELEVATED", direction: "negative", rationale: "Material agreement disclosed." },
    },
  };
}

test("mapPipelineResultToPostArgs: 3-of-3 agreement -> agreement counts of 3", () => {
  const attempts = [ok(1, bondedFields()), ok(2, bondedFields()), ok(3, bondedFields())];
  const args = mapPipelineResultToPostArgs(buildResult(attempts), { network: "testnet" });

  assert.equal(args.agreement.eventTypeAgreement, 3);
  assert.equal(args.agreement.affectedTokenAgreement, 3);
  assert.equal(args.agreement.effectiveDateAgreement, 3);
  assert.equal(args.agreement.declaredAmountAgreement, 3);
  assert.equal(args.eventType, ON_CHAIN_EVENT_TYPE.Form8K_Material);
  assert.equal(args.facts.declaredAmount, 80000n);
  assert.equal(args.facts.currency, "USD");
});

test("mapPipelineResultToPostArgs: 2-of-3 agreement on declaredAmount crosses the >=2 consensus threshold", () => {
  const attempts = [
    ok(1, bondedFields({ declaredAmounts: [{ label: "dividend per share", value: 0.08, unit: "USD" }] })),
    ok(2, bondedFields({ declaredAmounts: [{ label: "dividend per share", value: 0.08, unit: "USD" }] })),
    ok(3, bondedFields({ declaredAmounts: [{ label: "dividend per share", value: 0.09, unit: "USD" }] })),
  ];
  const args = mapPipelineResultToPostArgs(buildResult(attempts), { network: "testnet" });

  assert.equal(args.agreement.declaredAmountAgreement, 2);
  assert.equal(args.facts.declaredAmount, 80000n);
});

test("mapPipelineResultToPostArgs: <3 successful parses caps agreement, and full disagreement (no >=2 consensus) zeroes declaredAmount", () => {
  const attempts = [
    ok(1, bondedFields({ declaredAmounts: [{ label: "aggregate value", value: 1, unit: "USD" }] })),
    ok(2, bondedFields({ declaredAmounts: [{ label: "aggregate value", value: 2, unit: "USD" }] })),
    fail(3),
  ];
  const args = mapPipelineResultToPostArgs(buildResult(attempts), { network: "testnet" });

  // Neither declaredAmount value reaches 2-of-3 consensus (only 2 attempts succeeded, and
  // they disagree) -> declaredAmount forced to 0, currency "", agreement 0 (not 1).
  assert.equal(args.facts.declaredAmount, 0n);
  assert.equal(args.facts.currency, "");
  assert.equal(args.agreement.declaredAmountAgreement, 0);
  // eventType and affectedToken still agree across the 2 successful attempts, but agreement
  // count reflects "how many of the 3 total attempts", capped by successfulParseCount.
  assert.equal(args.agreement.eventTypeAgreement, 2);
});

test("mapPipelineResultToPostArgs: extraData JSON round-trips and its sha256 is deterministic", () => {
  const attempts = [ok(1, bondedFields()), ok(2, bondedFields()), ok(3, bondedFields())];
  const args = mapPipelineResultToPostArgs(buildResult(attempts), { network: "testnet" });

  assert.ok(args.extraData.uri.startsWith("data:application/json;base64,"));
  const b64 = args.extraData.uri.slice("data:application/json;base64,".length);
  const decoded = Buffer.from(b64, "base64").toString("utf8");
  const rehash = `0x${createHash("sha256").update(decoded, "utf8").digest("hex")}`;
  assert.equal(rehash, args.extraData.hash);

  const parsed = JSON.parse(decoded);
  assert.equal(parsed.schemaVersion, "afterhours-extradata-1");
  assert.equal(parsed.accessionNumber, FILING.accessionNumber);
  assert.equal(parsed.parses.length, 3);
});

test("mapPipelineResultToPostArgs: sourceContentHash is 0x-prefixed and matches result.contentHash", () => {
  const attempts = [ok(1, bondedFields()), ok(2, bondedFields()), ok(3, bondedFields())];
  const result = buildResult(attempts);
  const args = mapPipelineResultToPostArgs(result, { network: "testnet" });
  assert.equal(args.sourceContentHash, `0x${result.contentHash}`);
});
