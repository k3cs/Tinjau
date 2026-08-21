/**
 * Orchestrator output vs the PUBLISHED frontend contract (task T4.1).
 *
 * The acceptance requirement is that the emitted assessment validates against
 * `docs/buildx-orion-2026/outputs/05-build/frontend-handoff/risk-record.schema.json` — the file
 * the frontend owner actually builds against — and that this is demonstrated rather than
 * asserted in prose.
 *
 * WHY A VALIDATOR IS WRITTEN HERE. The server has no JSON-Schema library (`pnpm ls` shows no
 * ajv anywhere in the workspace) and adding a dependency for one test is not worth the supply
 * chain. The validator below implements the SUBSET of Draft 2020-12 that the published schema
 * actually uses, and a set of self-tests at the bottom prove it REJECTS the mutations it is
 * supposed to reject. A validator that accepts everything would make every other assertion in
 * this file meaningless, so it is tested before it is trusted.
 *
 * Keywords implemented: `type`, `properties`, `required`, `additionalProperties`, `enum`,
 * `const`, `$ref` (to `#/$defs/*` only), `pattern`, `items`, `uniqueItems`, `minLength`,
 * `minimum`, and `format: date-time`. Anything else in the schema would be silently ignored, so
 * a test asserts that the published schema uses no other keyword.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScenario } from "../src/decision/scenarioRunner.js";
import { blockToUnixSeconds } from "../src/market/poolTelemetry.js";
import type { RiskRecordView } from "../src/decision/viewModel.js";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(
  here,
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
const SCHEMA = JSON.parse(readFileSync(schemaPath, "utf8"));

const scenariosDir = join(here, "..", "scenarios");
const fixturesDir = join(here, "..", "src", "market", "fixtures");
const readScenario = (file: string) => JSON.parse(readFileSync(join(scenariosDir, file), "utf8"));
const readSwaps = (id: string) =>
  JSON.parse(readFileSync(join(fixturesDir, `pool-scenario-${id}-swaps.json`), "utf8"));

const SCENARIOS = [
  { id: "a", file: "scenario-a-rumor-watch.json" },
  { id: "b", file: "scenario-b-confirmed-protect.json" },
  { id: "c", file: "scenario-c-two-origins-hard-case.json" },
  { id: "d", file: "scenario-d-neutral-normal.json" },
] as const;

// ---------------------------------------------------------------------------
// A minimal JSON-Schema validator
// ---------------------------------------------------------------------------

type Schema = Record<string, unknown>;

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const SUPPORTED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$defs",
  "$ref",
  "title",
  "description",
  "type",
  "properties",
  "required",
  "additionalProperties",
  "enum",
  "const",
  "pattern",
  "items",
  "uniqueItems",
  "minLength",
  "minimum",
  "format",
]);

function resolveRef(ref: string): Schema {
  const match = /^#\/\$defs\/(.+)$/.exec(ref);
  if (!match) throw new Error(`unsupported $ref: ${ref}`);
  const target = (SCHEMA.$defs as Record<string, Schema>)[match[1]];
  if (!target) throw new Error(`unknown $ref target: ${ref}`);
  return target;
}

function typeMatches(value: unknown, type: string): boolean {
  switch (type) {
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      throw new Error(`unsupported type: ${type}`);
  }
}

/** Returns a list of error strings. Empty means valid. */
function validate(value: unknown, schema: Schema, path = "$"): string[] {
  if (typeof schema.$ref === "string") return validate(value, resolveRef(schema.$ref), path);

  const errors: string[] = [];

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value as never)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(value, t as string))) {
      errors.push(`${path}: expected type ${types.join("|")}, got ${value === null ? "null" : typeof value}`);
      return errors; // further checks would be noise
    }
  }

  if (typeof value === "string") {
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: "${value}" does not match ${schema.pattern}`);
    }
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.format === "date-time" && !DATE_TIME.test(value)) {
      errors.push(`${path}: "${value}" is not an RFC 3339 date-time`);
    }
  }

  if (typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) {
    errors.push(`${path}: below minimum ${schema.minimum}`);
  }

  if (Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validate(item, schema.items as Schema, `${path}[${i}]`)));
    }
    if (schema.uniqueItems === true) {
      const seen = value.map((v) => JSON.stringify(v));
      if (new Set(seen).size !== seen.length) errors.push(`${path}: contains duplicate items`);
    }
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const properties = (schema.properties as Record<string, Schema> | undefined) ?? {};

    for (const key of (schema.required as string[] | undefined) ?? []) {
      if (!(key in object)) errors.push(`${path}.${key}: required property is missing`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(object)) {
        if (!(key in properties)) errors.push(`${path}.${key}: additional property is not allowed`);
      }
    }
    for (const [key, sub] of Object.entries(properties)) {
      if (key in object) errors.push(...validate(object[key], sub, `${path}.${key}`));
    }
  }

  return errors;
}

function collectKeywords(schema: unknown, into: Set<string>): void {
  if (Array.isArray(schema)) {
    for (const item of schema) collectKeywords(item, into);
    return;
  }
  if (typeof schema !== "object" || schema === null) return;
  for (const [key, sub] of Object.entries(schema)) {
    into.add(key);
    // `properties` and `$defs` keys are names, not keywords, so only their values are walked.
    if (key === "properties" || key === "$defs") {
      for (const child of Object.values(sub as Record<string, unknown>)) collectKeywords(child, into);
    } else if (key !== "required" && key !== "enum") {
      collectKeywords(sub, into);
    }
  }
}

// ---------------------------------------------------------------------------
// The validator is tested before it is trusted
// ---------------------------------------------------------------------------

test("the schema in use is the 1.0.1 revision with a nullable observedAt", () => {
  // Pins the revision this suite was written against. `schemaVersion` deliberately stays
  // `tinjau.risk/1.0.0`: no on-chain vocabulary changed — no enum, ordinal or reason bit moved
  // — and `observedAt` never goes on chain, so bumping it would break parity with the Solidity
  // constant for a field the contract does not carry.
  assert.equal(SCHEMA.$id, "https://tinjau.xyz/schemas/risk-record/1.0.1.json");
  assert.equal(SCHEMA.properties.schemaVersion.const, "tinjau.risk/1.0.0");
  assert.deepEqual(SCHEMA.$defs.marketConfirmationView.properties.observedAt.type, [
    "string",
    "null",
  ]);
  assert.ok(
    SCHEMA.$defs.marketConfirmationView.required.includes("observedAt"),
    "nullable, but still required — an omitted field and an explicit null are different facts",
  );
});

test("the published schema uses only keywords this validator implements", () => {
  // Without this, an unimplemented keyword would be silently ignored and every "valid" verdict
  // below would be weaker than it looks.
  const found = new Set<string>();
  collectKeywords(SCHEMA, found);
  const propertyNames = new Set([
    ...Object.keys((SCHEMA.properties as Record<string, unknown>) ?? {}),
    ...Object.keys((SCHEMA.$defs as Record<string, unknown>) ?? {}),
  ]);

  const unsupported = [...found].filter(
    (k) => !SUPPORTED_KEYWORDS.has(k) && !propertyNames.has(k),
  );
  assert.deepEqual(unsupported, [], `unimplemented schema keywords: ${unsupported.join(", ")}`);
});

test("the validator rejects the mutations it is supposed to reject", () => {
  const scenario = readScenario("scenario-a-rumor-watch.json");
  const record = runScenario(scenario, readSwaps("a")).record;
  assert.deepEqual(validate(record, SCHEMA), [], "the unmutated record must be valid first");

  const mutations: [string, (r: RiskRecordView) => unknown][] = [
    ["unknown top-level key", (r) => ({ ...r, surpriseField: 1 })],
    ["missing required key", (r) => { const { state, ...rest } = r; return rest; }],
    ["bad state enum", (r) => ({ ...r, state: "PANIC" })],
    ["bad schemaVersion const", (r) => ({ ...r, schemaVersion: "tinjau.risk/9.9.9" })],
    ["non-address assetAddress", (r) => ({ ...r, assetAddress: "0xnope" })],
    ["non-bytes32 commitment", (r) => ({ ...r, evidenceCommitment: "0xabc" })],
    ["non-date assessedAt", (r) => ({ ...r, assessedAt: "yesterday" })],
    ["duplicate reason codes", (r) => ({ ...r, reasonCodes: [r.reasonCodes[0], r.reasonCodes[0]] })],
    ["unknown reason code", (r) => ({ ...r, reasonCodes: ["NOT_A_REAL_CODE"] })],
    ["empty humanExplanation", (r) => ({ ...r, humanExplanation: "" })],
    ["negative maximumDurationSec", (r) => ({ ...r, action: { ...r.action, maximumDurationSec: -1 } })],
    ["non-integer maximumDurationSec", (r) => ({ ...r, action: { ...r.action, maximumDurationSec: 1.5 } })],
    ["unknown key inside action", (r) => ({ ...r, action: { ...r.action, extra: true } })],
    ["unknown key inside a claim", (r) => ({ ...r, evidence: [{ ...r.evidence[0], extra: 1 }] })],
    ["bad relation enum", (r) => ({ ...r, evidence: [{ ...r.evidence[0], relation: "SIDEWAYS" }] })],
    [
      "unknown key inside marketConfirmation",
      (r) => ({ ...r, marketConfirmation: { ...r.marketConfirmation, extra: 1 } }),
    ],
    [
      "bad confirmation status",
      (r) => ({ ...r, marketConfirmation: { ...r.marketConfirmation, status: "MAYBE" } }),
    ],
    // `observedAt` became nullable in schema 1.0.1. Nullable is not "anything goes": a number
    // and a non-date string must both still be rejected.
    [
      "numeric observedAt",
      (r) => ({ ...r, marketConfirmation: { ...r.marketConfirmation, observedAt: 1786000000 } }),
    ],
    [
      "non-date observedAt",
      (r) => ({ ...r, marketConfirmation: { ...r.marketConfirmation, observedAt: "recently" } }),
    ],
    [
      "missing observedAt entirely",
      (r) => {
        const { observedAt, ...rest } = r.marketConfirmation;
        return { ...r, marketConfirmation: rest };
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const errors = validate(mutate(record), SCHEMA);
    assert.ok(errors.length > 0, `the validator accepted an invalid record: ${label}`);
  }
});

// ---------------------------------------------------------------------------
// The actual acceptance check
// ---------------------------------------------------------------------------

test("every frozen scenario's record validates against the published schema", () => {
  for (const s of SCENARIOS) {
    const decision = runScenario(readScenario(s.file), readSwaps(s.id));
    const errors = validate(decision.record, SCHEMA);
    assert.deepEqual(errors, [], `scenario ${s.id.toUpperCase()}: ${errors.join("; ")}`);
  }
});

test("a PROTECT record validates too — the authorised branch is covered, not only refusals", () => {
  // All four frozen scenarios refuse, so schema conformance of the PROTECT shape (a non-null
  // `requestedFee`, `authorized: true`, `status: "PENDING"`) would otherwise be untested.
  const scenario = readScenario("scenario-b-confirmed-protect.json");
  const swaps = readSwaps("b");
  const windowEnd = blockToUnixSeconds(swaps.toBlock);

  const decision = runScenario(scenario, swaps, {
    // A CONSTRUCTED case, not an observed one. The route into PROTECT is §0.7's invariant 6: a
    // protection that is ALREADY running continues on its original expiry even though B's own
    // market leg is NOT_CONFIRMED. Nothing here claims B confirmed; it exercises the shape of
    // an authorised record so the PROTECT branch is schema-checked too.
    current: { state: "PROTECT", protectStartedAt: windowEnd - 600 },
  });

  assert.equal(decision.record.state, "PROTECT", "the continuing-protection branch");
  assert.equal(decision.record.action.authorized, true);
  assert.notEqual(decision.record.action.requestedFee, null);
  assert.deepEqual(validate(decision.record, SCHEMA), []);
});

test("the record round-trips through JSON without losing schema validity", () => {
  // The frontend receives JSON, not a JS object. `undefined` fields, bigints, or Date instances
  // would survive an in-memory check and break serialisation.
  for (const s of SCENARIOS) {
    const record = runScenario(readScenario(s.file), readSwaps(s.id)).record;
    const roundTripped = JSON.parse(JSON.stringify(record));
    assert.deepEqual(roundTripped, record, `scenario ${s.id} record is not JSON-clean`);
    assert.deepEqual(validate(roundTripped, SCHEMA), []);
  }
});
