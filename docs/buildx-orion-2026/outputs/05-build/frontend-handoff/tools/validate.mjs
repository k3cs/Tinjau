#!/usr/bin/env node
/**
 * Validates every JSON artifact in `frontend-handoff/` against its published schema.
 *
 *   node docs/buildx-orion-2026/outputs/05-build/frontend-handoff/tools/validate.mjs
 *
 * Exits 0 when every artifact validates, non-zero otherwise. Zero npm dependencies, so it runs
 * anywhere Node runs and cannot silently drift with a package upgrade.
 *
 * THREE GUARDS KEEP THIS FROM BEING SELF-SERVING:
 *
 *  1. Every published schema is scanned for keywords this validator does not implement. An
 *     unimplemented keyword is a FAILURE, not a silent skip — otherwise a constraint could be
 *     written into a schema, ignored here, and reported as passing.
 *  2. A mutation suite feeds deliberately-broken documents through and asserts each is REJECTED.
 *     A validator that accepts everything would make every other assertion meaningless.
 *  3. Cross-schema `$ref`s are resolved against the actual published files, so
 *     `scenario-*.json.record` is checked against the real `risk-record.schema.json` rather
 *     than against a copy of it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const handoffDir = join(here, "..");

// ---------------------------------------------------------------------------
// The Draft 2020-12 subset this validator implements
// ---------------------------------------------------------------------------

const IMPLEMENTED = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "title",
  "description",
  "type",
  "enum",
  "const",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "uniqueItems",
  "minItems",
  "minLength",
  "minimum",
  "maximum",
  "pattern",
  "format",
  "oneOf",
  "anyOf",
  "not",
  "if",
  "then",
  "else",
]);

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Collects every keyword used anywhere in a schema, so an unimplemented one cannot hide. */
function collectKeywords(node, out = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) collectKeywords(item, out);
    return out;
  }
  if (node === null || typeof node !== "object") return out;
  for (const [key, value] of Object.entries(node)) {
    out.add(key);
    // Under these, the keys are names rather than keywords.
    if (key === "properties" || key === "$defs") {
      for (const sub of Object.values(value)) collectKeywords(sub, out);
    } else {
      collectKeywords(value, out);
    }
  }
  return out;
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value;
}

function typeMatches(value, expected) {
  const actual = typeOf(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  return actual === expected;
}

class Validator {
  /** @param {Map<string, object>} registry schema documents by `$id` and by bare filename */
  constructor(registry) {
    this.registry = registry;
  }

  resolve(ref, doc) {
    if (ref.startsWith("#")) return { schema: this.pointer(doc, ref.slice(1)), doc };
    const [base, fragment = ""] = ref.split("#");
    const target = this.registry.get(base);
    if (!target) throw new Error(`unresolvable $ref: ${ref}`);
    return { schema: fragment ? this.pointer(target, fragment) : target, doc: target };
  }

  pointer(doc, pointer) {
    let node = doc;
    for (const raw of pointer.split("/").filter(Boolean)) {
      const key = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
      node = node?.[key];
      if (node === undefined) throw new Error(`unresolvable pointer: ${pointer}`);
    }
    return node;
  }

  validate(value, schema, doc, path, errors) {
    if (schema === true) return;
    if (schema === false) {
      errors.push(`${path}: schema is false, nothing validates`);
      return;
    }

    if (schema.$ref) {
      const resolved = this.resolve(schema.$ref, doc);
      this.validate(value, resolved.schema, resolved.doc, path, errors);
      return;
    }

    if (schema.type !== undefined) {
      const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!allowed.some((t) => typeMatches(value, t))) {
        errors.push(`${path}: expected type ${allowed.join("|")}, got ${typeOf(value)}`);
        return;
      }
    }

    if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
      errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
    }

    if (schema.enum !== undefined) {
      const hit = schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value));
      if (!hit) errors.push(`${path}: ${JSON.stringify(value)} is not in the enum`);
    }

    if (typeof value === "string") {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: shorter than minLength ${schema.minLength}`);
      }
      if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
        errors.push(`${path}: does not match ${schema.pattern}`);
      }
      if (schema.format === "date-time" && !DATE_TIME.test(value)) {
        errors.push(`${path}: not an ISO 8601 date-time`);
      }
    }

    if (typeof value === "number") {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: below minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: above maximum ${schema.maximum}`);
      }
    }

    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${path}: fewer than minItems ${schema.minItems}`);
      }
      if (schema.items !== undefined) {
        value.forEach((item, i) => this.validate(item, schema.items, doc, `${path}[${i}]`, errors));
      }
      if (schema.uniqueItems === true) {
        const seen = new Set(value.map((v) => JSON.stringify(v)));
        if (seen.size !== value.length) errors.push(`${path}: items are not unique`);
      }
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const key of schema.required ?? []) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          errors.push(`${path}: missing required property "${key}"`);
        }
      }
      const props = schema.properties ?? {};
      for (const [key, sub] of Object.entries(props)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          this.validate(value[key], sub, doc, `${path}.${key}`, errors);
        }
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.prototype.hasOwnProperty.call(props, key)) {
            errors.push(`${path}: unexpected property "${key}"`);
          }
        }
      } else if (typeof schema.additionalProperties === "object") {
        for (const key of Object.keys(value)) {
          if (!Object.prototype.hasOwnProperty.call(props, key)) {
            this.validate(
              value[key],
              schema.additionalProperties,
              doc,
              `${path}.${key}`,
              errors,
            );
          }
        }
      }
    }

    if (schema.oneOf) {
      const matches = schema.oneOf.filter((s) => this.probe(value, s, doc));
      if (matches.length !== 1) {
        errors.push(`${path}: matched ${matches.length} oneOf branches, expected exactly 1`);
      }
    }

    if (schema.anyOf) {
      if (!schema.anyOf.some((s) => this.probe(value, s, doc))) {
        errors.push(`${path}: matched no anyOf branch`);
      }
    }

    if (schema.not !== undefined && this.probe(value, schema.not, doc)) {
      errors.push(`${path}: matched a "not" schema it must not match`);
    }

    if (schema.if !== undefined) {
      const branch = this.probe(value, schema.if, doc) ? schema.then : schema.else;
      if (branch !== undefined) this.validate(value, branch, doc, path, errors);
    }
  }

  probe(value, schema, doc) {
    const errors = [];
    this.validate(value, schema, doc, "$", errors);
    return errors.length === 0;
  }
}

// ---------------------------------------------------------------------------
// Load the published schemas
// ---------------------------------------------------------------------------

const schemaFiles = readdirSync(handoffDir).filter((f) => f.endsWith(".schema.json"));
const registry = new Map();
const schemas = new Map();
for (const file of schemaFiles) {
  const doc = JSON.parse(readFileSync(join(handoffDir, file), "utf8"));
  schemas.set(file, doc);
  registry.set(file, doc);
  if (doc.$id) registry.set(doc.$id, doc);
}
const validator = new Validator(registry);

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`ok    ${msg}`);

// Guard 1 — no schema may use a keyword this validator ignores.
for (const [file, doc] of schemas) {
  const unknown = [...collectKeywords(doc)].filter((k) => !IMPLEMENTED.has(k));
  if (unknown.length > 0) {
    fail(`${file} uses keywords this validator does not implement: ${unknown.join(", ")}`);
  } else {
    pass(`${file} uses only implemented keywords`);
  }
}

// ---------------------------------------------------------------------------
// Artifact → schema map. Every JSON artifact in the directory must appear here.
// ---------------------------------------------------------------------------

const ARTIFACTS = [
  ["scenario-rumor-watch.json", "scenario-result.schema.json"],
  ["scenario-confirmed-protect.json", "scenario-result.schema.json"],
  ["three-policy-comparison.json", "proof-of-protection.schema.json"],
  ["deployed-addresses.json", "deployed-addresses.schema.json"],
];

const dataFiles = readdirSync(handoffDir).filter(
  (f) => f.endsWith(".json") && !f.endsWith(".schema.json"),
);
for (const file of dataFiles) {
  if (!ARTIFACTS.some(([name]) => name === file)) {
    fail(`${file} is present but is not covered by any schema in this checker`);
  }
}

for (const [file, schemaFile] of ARTIFACTS) {
  const doc = JSON.parse(readFileSync(join(handoffDir, file), "utf8"));
  const schema = schemas.get(schemaFile);
  if (!schema) {
    fail(`${file}: schema ${schemaFile} not found`);
    continue;
  }
  const errors = [];
  validator.validate(doc, schema, schema, "$", errors);
  if (errors.length > 0) {
    fail(`${file} against ${schemaFile}`);
    for (const e of errors.slice(0, 25)) console.error(`        ${e}`);
    if (errors.length > 25) console.error(`        ... ${errors.length - 25} more`);
  } else {
    pass(`${file} validates against ${schemaFile}`);
  }
}

// ---------------------------------------------------------------------------
// Guard 2 — the mutation suite. Each of these MUST be rejected.
// ---------------------------------------------------------------------------

const clone = (v) => JSON.parse(JSON.stringify(v));
const rumour = JSON.parse(readFileSync(join(handoffDir, "scenario-rumor-watch.json"), "utf8"));
const protect = JSON.parse(
  readFileSync(join(handoffDir, "scenario-confirmed-protect.json"), "utf8"),
);
const comparison = JSON.parse(
  readFileSync(join(handoffDir, "three-policy-comparison.json"), "utf8"),
);
const addresses = JSON.parse(readFileSync(join(handoffDir, "deployed-addresses.json"), "utf8"));

const MUTATIONS = [
  [
    "scenario-result.schema.json",
    "an unknown top-level key",
    () => {
      const d = clone(rumour);
      d.extra = true;
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "a missing record",
    () => {
      const d = clone(rumour);
      delete d.record;
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "an unknown reason code in the record",
    () => {
      const d = clone(rumour);
      d.record.reasonCodes.push("MARKET_LOOKED_FINE");
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "a numeric observedAt",
    () => {
      const d = clone(rumour);
      d.record.marketConfirmation.observedAt = 1787284258;
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "an omitted observedAt (an omission is not the same fact as an explicit null)",
    () => {
      const d = clone(rumour);
      delete d.record.marketConfirmation.observedAt;
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "a constructed outcome with the critical caveat stripped",
    () => {
      const d = clone(protect);
      delete d.criticalCaveat;
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "a constructed market leg relabelled as a replay",
    () => {
      const d = clone(protect);
      d.provenance.outcomeOrigin = "CANONICAL_REPLAY";
      d.provenance.marketLeg = "REPLAYED";
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "a critical caveat claiming the canonical replay also protected",
    () => {
      const d = clone(protect);
      d.criticalCaveat.canonicalReplayState = "PROTECT";
      return d;
    },
  ],
  [
    "scenario-result.schema.json",
    "an empty limitations list",
    () => {
      const d = clone(protect);
      d.limitations = [];
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "canClaimLossAvoided flipped to true",
    () => {
      const d = clone(comparison);
      d.claimEligibility.value = true;
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "the claim gate governed by the post-hoc basis",
    () => {
      const d = clone(comparison);
      d.claimEligibility.metricBasis = "AMD_002_CONSISTENT";
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "an unknown policy id",
    () => {
      const d = clone(comparison);
      d.results[0].policyId = "TINJAU_V2";
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "a metric with no observed/counterfactual basis marker",
    () => {
      const d = clone(comparison);
      const row = d.results.find((r) => r.metrics !== null);
      delete row.metrics.markoutPrimaryUsd.basis;
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "an emptied data-limitations list",
    () => {
      const d = clone(comparison);
      d.dataLimitations = [];
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "a missing interpretation block",
    () => {
      const d = clone(comparison);
      delete d.interpretation;
      return d;
    },
  ],
  [
    "proof-of-protection.schema.json",
    "an observedProtectedPoolResult asserting a protected interval exists",
    () => {
      const d = clone(comparison);
      d.observedProtectedPoolResult = { exists: true };
      return d;
    },
  ],
  [
    "deployed-addresses.schema.json",
    "addresses promoted to final",
    () => {
      const d = clone(addresses);
      d.status = "FINAL";
      return d;
    },
  ],
  [
    "deployed-addresses.schema.json",
    "a malformed address",
    () => {
      const d = clone(addresses);
      d.stacks[0].contracts[0].address = "0xdeadbeef";
      return d;
    },
  ],
  [
    "deployed-addresses.schema.json",
    "a contract with no bytecode check",
    () => {
      const d = clone(addresses);
      delete d.stacks[0].contracts[0].codeSize;
      return d;
    },
  ],
  [
    "deployed-addresses.schema.json",
    "a mainnet chain id",
    () => {
      const d = clone(addresses);
      d.network.chainId = 1;
      return d;
    },
  ],
  [
    "deployed-addresses.schema.json",
    "a malformed transaction hash",
    () => {
      const d = clone(addresses);
      d.stacks[0].transactions[0].txHash = "0x123";
      return d;
    },
  ],
];

for (const [schemaFile, label, build] of MUTATIONS) {
  const schema = schemas.get(schemaFile);
  const errors = [];
  validator.validate(build(), schema, schema, "$", errors);
  if (errors.length === 0) {
    fail(`mutation NOT rejected — ${label} (${schemaFile})`);
  } else {
    pass(`mutation rejected — ${label}`);
  }
}

// Converse guard: the unmutated documents must still pass, or "rejected" means nothing.
for (const [file, schemaFile] of ARTIFACTS) {
  const doc = JSON.parse(readFileSync(join(handoffDir, file), "utf8"));
  const errors = [];
  validator.validate(doc, schemas.get(schemaFile), schemas.get(schemaFile), "$", errors);
  if (errors.length > 0) fail(`converse guard: ${file} should still validate unmutated`);
}

// ---------------------------------------------------------------------------
// Guard 3 — §0.23 completeness. All ten required artifacts must be present.
// ---------------------------------------------------------------------------

const REQUIRED_BY_0_23 = [
  "README.md",
  "api-contract.md",
  "risk-record.schema.json",
  "evidence-graph.schema.json",
  "proof-of-protection.schema.json",
  "scenario-rumor-watch.json",
  "scenario-confirmed-protect.json",
  "three-policy-comparison.json",
  "deployed-addresses.json",
  "known-limitations.md",
];
const present = new Set(readdirSync(handoffDir));
for (const name of REQUIRED_BY_0_23) {
  if (present.has(name)) pass(`§0.23 artifact present: ${name}`);
  else fail(`§0.23 artifact MISSING: ${name}`);
}

// ---------------------------------------------------------------------------
// Guard 4 — facts that must not silently stop being true.
// ---------------------------------------------------------------------------

const factChecks = [
  [
    "Tinjau never reaches PROTECT on a canonical replay",
    () =>
      rumour.record.state !== "PROTECT" &&
      protect.criticalCaveat.canonicalReplayState !== "PROTECT" &&
      protect.provenance.outcomeOrigin === "CONSTRUCTED_MARKET_INPUTS",
  ],
  ["canClaimLossAvoided is false", () => comparison.claimEligibility.value === false],
  [
    "the OKX leg is unavailable in both scenario artifacts",
    () =>
      rumour.record.marketConfirmation.okxReferencePrice === null &&
      protect.record.marketConfirmation.okxReferencePrice === null,
  ],
  [
    "no scenario record authorises an action outside PROTECT",
    () =>
      [rumour, protect].every(
        (d) => d.record.action.authorized === (d.record.state === "PROTECT"),
      ),
  ],
  [
    "addresses carry the T7.2 authoritative label",
    () => addresses.status === "T7_2_AUTHORITATIVE",
  ],
  ["everything is on a testnet", () => addresses.network.isTestnet === true],
  [
    "the stale-read warning is present in deployed-addresses.json",
    () => /stale reads/i.test(addresses.network.rpcWarning) && /AssessmentPosted/.test(addresses.network.rpcWarning),
  ],
  [
    "no artifact contains key material",
    () => {
      // Scanned across EVERY file in the directory, not only the JSON, because a leaked key in a
      // markdown file is just as leaked. Bare 64-hex is deliberately NOT flagged: every one in
      // this directory is a sha256 source-content commitment, which is a public fact.
      const blob = readdirSync(handoffDir)
        .filter((f) => f.endsWith(".json") || f.endsWith(".md"))
        .map((f) => readFileSync(join(handoffDir, f), "utf8"))
        .join("\n");
      const forbidden = [
        /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
        /"[A-Za-z_]*(?:privateKey|PRIVATE_KEY|secretKey|SECRET_KEY)"\s*:\s*"0x[0-9a-fA-F]{64}"/,
        /\bmnemonic\b\s*[:=]/i,
        /\bseed\s*phrase\b/i,
      ];
      return !forbidden.some((re) => re.test(blob));
    },
  ],
];

for (const [label, check] of factChecks) {
  if (check()) pass(`fact holds: ${label}`);
  else fail(`FACT BROKEN: ${label}`);
}

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all frontend-handoff artifacts validate");
