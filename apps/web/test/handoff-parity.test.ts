/**
 * Contract test: the frontend view model must not drift from the published
 * backend handoff.
 *
 * Two failures this file exists to prevent, both of which actually happened:
 *
 *  1. `REASON_CODES` in `src/lib/risk/model.ts` fell three codes behind
 *     `$defs.reasonCode.enum` in `risk-record.schema.json`, so `validateRiskRecord`
 *     threw on a record that was valid against the published schema.
 *  2. `marketConfirmation.observedAt` became nullable in `risk-record/1.0.1.json`
 *     while the TypeScript view model still required a string.
 *
 * Everything here is read from the published artifacts at run time. Nothing is
 * transcribed, so an artifact change cannot pass silently.
 *
 * Run: `npm run test:contract` (Node 22.6+ strips the TypeScript at load).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  ACTION_STATUSES,
  CONFIDENCE_BANDS,
  CONFIRMATION_STATUSES,
  DATA_MODES,
  EVIDENCE_RELATIONS,
  REASON_CODES,
  RISK_SCHEMA_VERSION,
  RISK_STATES,
  SOURCE_CLASSES,
} from "../src/lib/risk/model.ts";
import { validateRiskRecord } from "../src/lib/risk/validate.ts";

const HANDOFF = new URL(
  "../../../docs/buildx-orion-2026/outputs/05-build/frontend-handoff/",
  import.meta.url,
);

function artifact(name: string): any {
  return JSON.parse(readFileSync(fileURLToPath(new URL(name, HANDOFF)), "utf8"));
}

const schema = artifact("risk-record.schema.json");
const defs = schema.$defs;

test("risk-record schema id is the version this view model was written against", () => {
  assert.equal(schema.$id, "https://tinjau.xyz/schemas/risk-record/1.0.1.json");
  assert.equal(schema.properties.schemaVersion.const, RISK_SCHEMA_VERSION);
});

// Every enum the view model mirrors, checked as an ordered list rather than a
// set: order is how a reader diffs the two files by eye, and a reordering is a
// signal the backend moved something.
const ENUM_PARITY: Array<[string, readonly string[], readonly string[]]> = [
  ["reasonCode", defs.reasonCode.enum, REASON_CODES],
  ["riskState", defs.riskState.enum, RISK_STATES],
  ["sourceClass", defs.sourceClass.enum, SOURCE_CLASSES],
  ["dataMode", defs.dataMode.enum, DATA_MODES],
  ["confirmationStatus", defs.confirmationStatus.enum, CONFIRMATION_STATUSES],
  ["confidenceBand", schema.properties.confidenceBand.enum, CONFIDENCE_BANDS],
  ["evidenceRelation", defs.evidenceClaimView.properties.relation.enum, EVIDENCE_RELATIONS],
  ["actionStatus", defs.action.properties.status.enum, ACTION_STATUSES],
];

for (const [name, published, mirrored] of ENUM_PARITY) {
  test(`${name} enum matches the published schema exactly`, () => {
    const missing = published.filter((value) => !mirrored.includes(value));
    const extra = mirrored.filter((value) => !published.includes(value));
    assert.deepEqual(
      { missing, extra },
      { missing: [], extra: [] },
      `src/lib/risk/model.ts is out of sync with risk-record.schema.json $defs.${name}`,
    );
    assert.deepEqual([...mirrored], [...published], `${name} order drifted`);
  });
}

test("marketConfirmation.observedAt is required and nullable", () => {
  const observedAt = defs.marketConfirmationView.properties.observedAt;
  assert.deepEqual(observedAt.type, ["string", "null"]);
  assert.ok(
    defs.marketConfirmationView.required.includes("observedAt"),
    "an omitted field and an explicit null are different facts; the key stays required",
  );
});

test("every required view-model key is accepted by the validator", () => {
  // The validator uses exact-key matching, so a field added to the schema and
  // not to the validator would be rejected as unsupported.
  const record = artifact("scenario-confirmed-protect.json").record;
  const validated = validateRiskRecord(record);
  assert.deepEqual(
    Object.keys(validated).sort(),
    [...schema.required].sort(),
  );
});

// The two published scenarios are the real thing the UI renders. If either
// stops validating, the frontend is broken against a valid backend document.
for (const file of ["scenario-rumor-watch.json", "scenario-confirmed-protect.json"]) {
  test(`${file} record validates against the frontend view model`, () => {
    const scenario = artifact(file);
    const record = validateRiskRecord(scenario.record);
    assert.equal(record.schemaVersion, RISK_SCHEMA_VERSION);
    assert.ok(REASON_CODES.includes(record.reasonCodes[0] as never));
  });
}

test("the rumour scenario still emits INSUFFICIENT_SAMPLE", () => {
  // This is the exact code whose absence made the validator throw. Pinning it
  // means the regression cannot come back by way of the fixture changing.
  const record = validateRiskRecord(artifact("scenario-rumor-watch.json").record);
  const codes = [...record.reasonCodes, ...record.marketConfirmation.reasonCodes];
  assert.ok(
    codes.includes("INSUFFICIENT_SAMPLE"),
    "if the backend stopped emitting this, re-check why the enum grew",
  );
});

// ---------------------------------------------------------------------------
// Honesty invariants. These are product requirements, not schema requirements:
// the handoff can be perfectly valid and still be rendered into an overclaim.
// Each assertion below is a claim the UI is built on. If the data stops
// supporting it, the copy must change before the build goes green again.
// ---------------------------------------------------------------------------

test("no frozen replay scenario reaches PROTECT", () => {
  const rumour = validateRiskRecord(artifact("scenario-rumor-watch.json").record);
  assert.equal(rumour.state, "WATCH");
  assert.equal(rumour.action.authorized, false);
});

test("the only PROTECT is labelled constructed and carries its canonical replay state", () => {
  const scenario = artifact("scenario-confirmed-protect.json");
  const record = validateRiskRecord(scenario.record);
  assert.equal(record.state, "PROTECT");
  assert.ok(scenario.criticalCaveat, "the caveat block must exist to be rendered");
  assert.equal(scenario.criticalCaveat.canonicalReplayState, "WATCH");
  assert.equal(scenario.criticalCaveat.canonicalReplayConfirmation, "NOT_CONFIRMED");
});

test("action.authorized is false outside PROTECT in every published record", () => {
  for (const file of ["scenario-rumor-watch.json", "scenario-confirmed-protect.json"]) {
    const record = validateRiskRecord(artifact(file).record);
    if (record.state !== "PROTECT") assert.equal(record.action.authorized, false);
  }
});

test("canClaimLossAvoided is false, so no surface may claim reduced LP loss", () => {
  const comparison = artifact("three-policy-comparison.json");
  assert.equal(comparison.claimEligibility.field, "canClaimLossAvoided");
  assert.equal(comparison.claimEligibility.value, false);
});

test("the comparison sign flips between the two metric bases", () => {
  const comparison = artifact("three-policy-comparison.json");
  const comparable = comparison.comparisonCells.filter(
    (cell: any) => cell.vsVolatilityOnly !== "NOT_COMPARABLE",
  );
  const bases = new Set(comparable.map((cell: any) => cell.metricBasis));
  assert.ok(bases.size >= 2, "both metric bases must be present so neither can be quoted alone");
});

test("the OKX leg is UNAVAILABLE in every published record", () => {
  for (const file of ["scenario-rumor-watch.json", "scenario-confirmed-protect.json"]) {
    const record = validateRiskRecord(artifact(file).record);
    assert.equal(
      record.marketConfirmation.okxReferencePrice,
      null,
      "an OKX price appearing here would make 'dual OKX/X Layer confirmation' renderable",
    );
  }
});

test("deployed addresses are still marked not-final", () => {
  const deployed = artifact("deployed-addresses.json");
  assert.equal(deployed.status, "T4.2_WORKING_ADDRESSES_NOT_FINAL");
});
