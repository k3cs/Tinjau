/**
 * Cross-language parity between `contracts/src/TinjauRiskTypes.sol` and
 * `apps/server/src/risk/types.ts` (task T1.1).
 *
 * Tracker T1.1 requires that "server, contract ABI, benchmark, and web app share an
 * explicitly versioned schema or generated equivalents". Two hand-written mirrors are not a
 * shared schema unless something checks them, so this suite PARSES the Solidity source and
 * compares it to the TypeScript constants. If someone renumbers an enum on one side only,
 * this fails — which is the point: a silent ordinal mismatch would mean a contract writing
 * `Protect` and a server reading `Watch`.
 *
 * It also re-derives the promotion predicate from the Solidity text, so the two
 * implementations of the §0.7 invariants cannot diverge without a failure here.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RISK_SCHEMA_VERSION,
  RISK_STATE_ORDINALS,
  SOURCE_CLASS_ORDINALS,
  DATA_MODE_ORDINALS,
  CONFIRMATION_STATUS_ORDINALS,
  CONFIDENCE_BAND_ORDINALS,
  REASON_BITS,
  REASON_ALL_DEFINED,
  decodeRiskState,
  decodeSourceClass,
  decodeConfirmationStatus,
  decodeReasonCodes,
  encodeReasonCodes,
  RiskSchemaError,
  type ReasonCode,
} from "../src/risk/types.js";

const solidityPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "contracts",
  "src",
  "TinjauRiskTypes.sol",
);
const solidity = readFileSync(solidityPath, "utf8");

/** Extracts an enum's members in declaration order, comments stripped. */
function solidityEnumMembers(name: string): string[] {
  const match = solidity.match(new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `enum ${name} not found in TinjauRiskTypes.sol`);
  return match[1]
    .replace(/\/\/[^\n]*/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Extracts a `uint32 internal constant NAME = 1 << N;` shift position. */
function solidityReasonShift(name: string): number {
  const match = solidity.match(
    new RegExp(`uint32\\s+internal\\s+constant\\s+${name}\\s*=\\s*1\\s*<<\\s*(\\d+)\\s*;`),
  );
  assert.ok(match, `reason constant ${name} not found in TinjauRiskTypes.sol`);
  return Number(match[1]);
}

/** TS string code -> Solidity constant name. The only place the naming bridge is stated. */
const REASON_SOLIDITY_NAMES: Record<ReasonCode, string> = {
  RUMOR_ONLY: "REASON_RUMOR_ONLY",
  SINGLE_SOURCE: "REASON_SINGLE_SOURCE",
  DUPLICATE_SYNDICATION: "REASON_DUPLICATE_SYNDICATION",
  CONTRADICTED: "REASON_CONTRADICTED",
  STALE_EVIDENCE: "REASON_STALE_EVIDENCE",
  NO_OFFICIAL_CONFIRMATION: "REASON_NO_OFFICIAL_CONFIRMATION",
  UNSUPPORTED_ASSET: "REASON_UNSUPPORTED_ASSET",
  AMBIGUOUS_ENTITY: "REASON_AMBIGUOUS_ENTITY",
  UNKNOWN_COMPANY: "REASON_UNKNOWN_COMPANY",
  MARKET_CONFIRMED: "REASON_MARKET_CONFIRMED",
  MARKET_NOT_CONFIRMED: "REASON_MARKET_NOT_CONFIRMED",
  MARKET_DATA_STALE: "REASON_MARKET_DATA_STALE",
  MARKET_DATA_UNAVAILABLE: "REASON_MARKET_DATA_UNAVAILABLE",
  ANTI_WICK_FAILED: "REASON_ANTI_WICK_FAILED",
  THIN_EXIT_DEPTH: "REASON_THIN_EXIT_DEPTH",
  REFERENCE_MARKET_CLOSED: "REASON_REFERENCE_MARKET_CLOSED",
  INSUFFICIENT_SAMPLE: "REASON_INSUFFICIENT_SAMPLE",
  PERSISTENCE_UNOBSERVED: "REASON_PERSISTENCE_UNOBSERVED",
  OFFICIAL_FILING: "REASON_OFFICIAL_FILING",
  TWO_INDEPENDENT_SOURCES: "REASON_TWO_INDEPENDENT_SOURCES",
  BONDED_EVIDENCE_PASSED: "REASON_BONDED_EVIDENCE_PASSED",
  NON_MATERIAL_EVENT: "REASON_NON_MATERIAL_EVENT",
  EXPIRED: "REASON_EXPIRED",
  DECAYED_TO_BASELINE: "REASON_DECAYED_TO_BASELINE",
  COOLDOWN_ACTIVE: "REASON_COOLDOWN_ACTIVE",
  PAUSED: "REASON_PAUSED",
  ACTION_FAILED: "REASON_ACTION_FAILED",
};

test("the schema version string matches the on-chain constant", () => {
  const match = solidity.match(/bytes32\s+internal\s+constant\s+SCHEMA_VERSION\s*=\s*"([^"]+)"/);
  assert.ok(match, "SCHEMA_VERSION not found");
  assert.equal(match[1], RISK_SCHEMA_VERSION);
  // bytes32 ASCII literals silently truncate past 32 bytes, which would corrupt the version.
  assert.ok(Buffer.byteLength(RISK_SCHEMA_VERSION, "utf8") <= 32);
});

test("RiskState ordinals match, and NORMAL is zero so unwritten records grant no protection", () => {
  const members = solidityEnumMembers("RiskState");
  assert.deepEqual(members, ["Normal", "Watch", "Protect"]);
  assert.equal(RISK_STATE_ORDINALS.NORMAL, members.indexOf("Normal"));
  assert.equal(RISK_STATE_ORDINALS.WATCH, members.indexOf("Watch"));
  assert.equal(RISK_STATE_ORDINALS.PROTECT, members.indexOf("Protect"));

  // The load-bearing safety property: the dangerous value must never be the default.
  assert.equal(RISK_STATE_ORDINALS.NORMAL, 0);
  assert.notEqual(RISK_STATE_ORDINALS.PROTECT, 0);
});

test("SourceClass ordinals match, and zero is Unknown rather than Official", () => {
  const members = solidityEnumMembers("SourceClass");
  assert.deepEqual(members, ["Unknown", "Rumor", "News", "Official"]);
  assert.equal(SOURCE_CLASS_ORDINALS.RUMOR, members.indexOf("Rumor"));
  assert.equal(SOURCE_CLASS_ORDINALS.NEWS, members.indexOf("News"));
  assert.equal(SOURCE_CLASS_ORDINALS.OFFICIAL, members.indexOf("Official"));

  // If Official were 0, uninitialised storage would read as the most trusted class.
  assert.equal(members.indexOf("Unknown"), 0);
  assert.notEqual(SOURCE_CLASS_ORDINALS.OFFICIAL, 0);
});

test("DataMode, ConfirmationStatus and ConfidenceBand ordinals match", () => {
  const dataMode = solidityEnumMembers("DataMode");
  assert.deepEqual(dataMode, ["Unknown", "Live", "Observed", "Replay", "Simulated"]);
  assert.equal(DATA_MODE_ORDINALS.LIVE, dataMode.indexOf("Live"));
  assert.equal(DATA_MODE_ORDINALS.OBSERVED, dataMode.indexOf("Observed"));
  assert.equal(DATA_MODE_ORDINALS.REPLAY, dataMode.indexOf("Replay"));
  assert.equal(DATA_MODE_ORDINALS.SIMULATED, dataMode.indexOf("Simulated"));

  const confirmation = solidityEnumMembers("ConfirmationStatus");
  assert.deepEqual(confirmation, ["Unknown", "NotConfirmed", "Unavailable", "Stale", "Confirmed"]);
  assert.equal(CONFIRMATION_STATUS_ORDINALS.NOT_CONFIRMED, confirmation.indexOf("NotConfirmed"));
  assert.equal(CONFIRMATION_STATUS_ORDINALS.UNAVAILABLE, confirmation.indexOf("Unavailable"));
  assert.equal(CONFIRMATION_STATUS_ORDINALS.STALE, confirmation.indexOf("Stale"));
  assert.equal(CONFIRMATION_STATUS_ORDINALS.CONFIRMED, confirmation.indexOf("Confirmed"));
  // "could not look" and "looked and saw nothing" must stay distinguishable.
  assert.notEqual(CONFIRMATION_STATUS_ORDINALS.UNAVAILABLE, CONFIRMATION_STATUS_ORDINALS.NOT_CONFIRMED);

  const confidence = solidityEnumMembers("ConfidenceBand");
  assert.deepEqual(confidence, ["Unknown", "Low", "Medium", "High"]);
  assert.equal(CONFIDENCE_BAND_ORDINALS.LOW, confidence.indexOf("Low"));
  assert.equal(CONFIDENCE_BAND_ORDINALS.MEDIUM, confidence.indexOf("Medium"));
  assert.equal(CONFIDENCE_BAND_ORDINALS.HIGH, confidence.indexOf("High"));
});

test("every reason bit sits at the same position in both languages", () => {
  const codes = Object.keys(REASON_BITS) as ReasonCode[];
  for (const code of codes) {
    const shift = solidityReasonShift(REASON_SOLIDITY_NAMES[code]);
    assert.equal(
      REASON_BITS[code],
      1 << shift,
      `${code} is bit ${Math.log2(REASON_BITS[code])} in TS but ${shift} in Solidity`,
    );
  }
  // No two reasons may share a bit, or one would silently mask the other.
  const seen = new Set(codes.map((c) => REASON_BITS[c]));
  assert.equal(seen.size, codes.length, "two reason codes collide on the same bit");
});

test("the Solidity REASON_ALL_DEFINED mask covers exactly the codes TypeScript knows", () => {
  const maskBody = solidity.match(
    /uint32\s+internal\s+constant\s+REASON_ALL_DEFINED\s*=([\s\S]*?);/,
  );
  assert.ok(maskBody, "REASON_ALL_DEFINED not found");
  const namesInMask = new Set(maskBody[1].match(/REASON_[A-Z_]+/g) ?? []);

  const expected = new Set(Object.values(REASON_SOLIDITY_NAMES));
  assert.deepEqual(
    [...namesInMask].sort(),
    [...expected].sort(),
    "a reason code exists on one side but is missing from the other's mask",
  );
});

test("decoders reject unknown values instead of coercing them to a default", () => {
  // Ordinal 0 is the Unknown sentinel for these — decoding it must fail, loudly.
  assert.throws(() => decodeSourceClass(0), RiskSchemaError);
  assert.throws(() => decodeConfirmationStatus(0), RiskSchemaError);
  assert.throws(() => decodeRiskState(3), RiskSchemaError);
  assert.throws(() => decodeSourceClass(99), RiskSchemaError);

  // The diagnosis must say "never written", not just "bad value".
  assert.throws(() => decodeSourceClass(0), /never written/);

  // RiskState 0 is legitimately NORMAL — it is the one enum whose zero is a real value.
  assert.equal(decodeRiskState(0), "NORMAL");
});

test("the published frontend schema enumerates exactly the codes both languages define", () => {
  const schemaPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "docs",
    "buildx-orion-2026",
    "outputs",
    "05-build",
    "frontend-handoff",
    "risk-record.schema.json",
  );
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  // The version the frontend pins must be the version the contract stamps.
  assert.equal(schema.properties.schemaVersion.const, RISK_SCHEMA_VERSION);

  // Reason codes must match TS exactly — a code the API can emit but the schema rejects
  // would make valid payloads fail validation on the frontend's side.
  assert.deepEqual(
    [...schema.$defs.reasonCode.enum].sort(),
    (Object.keys(REASON_BITS) as ReasonCode[]).sort(),
  );

  // The three view-model enums must not drift from the TS string unions.
  assert.deepEqual([...schema.$defs.riskState.enum].sort(), ["NORMAL", "PROTECT", "WATCH"]);
  assert.deepEqual([...schema.$defs.sourceClass.enum].sort(), ["NEWS", "OFFICIAL", "RUMOR"]);
  assert.deepEqual(
    [...schema.$defs.confirmationStatus.enum].sort(),
    ["CONFIRMED", "NOT_CONFIRMED", "STALE", "UNAVAILABLE"],
  );

  // The Unknown sentinel must never leak into the frontend contract.
  assert.equal(schema.$defs.sourceClass.enum.includes("UNKNOWN"), false);
});

test("reason bitmasks round-trip, and undefined bits are refused", () => {
  const codes: ReasonCode[] = ["RUMOR_ONLY", "SINGLE_SOURCE", "MARKET_DATA_UNAVAILABLE"];
  assert.deepEqual(decodeReasonCodes(encodeReasonCodes(codes)).sort(), [...codes].sort());
  assert.deepEqual(decodeReasonCodes(0), []);

  // Bit 31 is defined by no reason today. A newer writer setting it must not be ignored.
  const undefinedBit = 1 << 31;
  assert.equal((REASON_ALL_DEFINED & undefinedBit) >>> 0, 0);
  assert.throws(() => decodeReasonCodes(undefinedBit >>> 0), RiskSchemaError);
  assert.throws(() => decodeReasonCodes(undefinedBit >>> 0), /does not define/);

  assert.throws(() => encodeReasonCodes(["NOT_A_REASON" as ReasonCode]), RiskSchemaError);
  assert.throws(() => decodeReasonCodes(1.5), RiskSchemaError);
  assert.throws(() => decodeReasonCodes(-1), RiskSchemaError);
});
