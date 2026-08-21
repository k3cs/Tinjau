#!/usr/bin/env node
/**
 * T5.5 — verify the Proof of Protection record.
 *
 * Zero dependencies (no ajv in this repo). Implements the JSON Schema subset the
 * published schema actually uses, then enforces the invariants a schema cannot
 * express on its own:
 *
 *   INV-1  Every metric leaf carries `unit` and `basis`. A bare number cannot say
 *          whether it was measured or re-priced.
 *   INV-2  Every metric leaf inside `observedOnChainProtection` has basis OBSERVED.
 *          A counterfactual number in the observed half is the exact failure this
 *          artifact exists to prevent.
 *   INV-3  The two halves share no top-level key. They are different chains and
 *          different pools; a shared key would invite a reader to net them.
 *   INV-4  The two halves name different chainIds and different poolClasses.
 *   INV-5  `claimGate.canClaimLossAvoided` equals the benchmark artifact's value,
 *          and the benchmark's value is false. This record cannot open a gate the
 *          benchmark closed.
 *   INV-6  Every replayed policy figure equals the corresponding figure in
 *          three-policy-benchmark.json, to the bit. No transcription drift.
 *   INV-7  Every observed fee equals the fee decoded from PoolManager's Swap event
 *          in t4-demo-manifest-xlayer-testnet.json. No transcription drift.
 *   INV-8  A CONSTRUCTED market leg forces a populated `canonicalReplayOfThisEvent`
 *          whose state is not PROTECT.
 *   INV-9  No forbidden claim string appears anywhere in the record (§0.19).
 *   INV-10 No key-shaped secret appears anywhere in the record.
 *
 * Exit 0 = pass. Exit 1 = failure, with every violation listed.
 *
 *   node docs/buildx-orion-2026/outputs/05-build/tools/verify-proof-of-protection.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "..");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const doc = read(join(BUILD, "proof-of-protection.json"));
const schema = read(join(BUILD, "proof-of-protection.schema.json"));
const benchmark = read(join(BUILD, "three-policy-benchmark.json"));
const manifest = read(join(BUILD, "t4-demo-manifest-xlayer-testnet.json"));

const errors = [];
const fail = (path, msg) => errors.push(`${path || "<root>"}: ${msg}`);

// ---------------------------------------------------------------------------
// Minimal JSON Schema validator — the subset the published schema uses.
// ---------------------------------------------------------------------------

const typeOf = (v) =>
  v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;

const typeMatches = (v, t) => {
  const actual = typeOf(v);
  if (t === "number") return actual === "number" || actual === "integer";
  return actual === t;
};

const resolve = (ref) => {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((acc, seg) => acc[seg], schema);
};

function validate(value, node, path) {
  if (!node) return;
  if (node.$ref) return validate(value, resolve(node.$ref), path);

  if (node.const !== undefined && value !== node.const) {
    fail(path, `expected const ${JSON.stringify(node.const)}, got ${JSON.stringify(value)}`);
    return;
  }
  if (node.enum && !node.enum.includes(value)) {
    fail(path, `${JSON.stringify(value)} is not one of ${node.enum.join(", ")}`);
    return;
  }
  if (node.type) {
    const types = Array.isArray(node.type) ? node.type : [node.type];
    if (!types.some((t) => typeMatches(value, t))) {
      fail(path, `expected type ${types.join("|")}, got ${typeOf(value)}`);
      return;
    }
  }
  if (typeof value === "string") {
    if (node.minLength !== undefined && value.length < node.minLength) {
      fail(path, `string shorter than minLength ${node.minLength}`);
    }
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      fail(path, `string does not match ${node.pattern}`);
    }
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) {
      fail(path, `array shorter than minItems ${node.minItems}`);
    }
    if (node.items) value.forEach((v, i) => validate(v, node.items, `${path}[${i}]`));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of node.required || []) {
      if (!(key in value)) fail(path, `missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(value)) {
      const propSchema = node.properties?.[key];
      if (propSchema) validate(sub, propSchema, path ? `${path}.${key}` : key);
      else if (node.additionalProperties === false) {
        fail(path, `unexpected property "${key}"`);
      }
    }
  }
}

validate(doc, schema, "");

// ---------------------------------------------------------------------------
// Invariants a schema cannot express.
// ---------------------------------------------------------------------------

const BASIS = new Set(["OBSERVED", "COUNTERFACTUAL"]);
const isMetric = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && "value" in v && ("unit" in v || "basis" in v);

function walkMetrics(node, path, visit) {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkMetrics(v, `${path}[${i}]`, visit));
    return;
  }
  if (isMetric(node)) {
    visit(node, path);
    return;
  }
  for (const [k, v] of Object.entries(node)) walkMetrics(v, path ? `${path}.${k}` : k, visit);
}

// INV-1
let metricCount = 0;
walkMetrics(doc, "", (m, path) => {
  metricCount += 1;
  if (typeof m.unit !== "string" || m.unit.length === 0) fail(path, "INV-1 metric has no unit");
  if (!BASIS.has(m.basis)) fail(path, `INV-1 metric has no valid basis (got ${JSON.stringify(m.basis)})`);
});
if (metricCount === 0) fail("", "INV-1 found no metric leaves at all — the walker is broken or the record is empty");

// INV-2
let observedMetricCount = 0;
walkMetrics(doc.observedOnChainProtection, "observedOnChainProtection", (m, path) => {
  observedMetricCount += 1;
  if (m.basis !== "OBSERVED") {
    fail(path, `INV-2 the observed half must contain only OBSERVED leaves, found basis ${m.basis}`);
  }
});
if (observedMetricCount === 0) {
  fail("observedOnChainProtection", "INV-2 the observed half contains no metric leaves");
}

// INV-3 — only venue-identity keys may appear in both halves, and INV-4 then
// requires those to DIFFER. Every other key must belong to exactly one half, so
// no figure has a same-named twin a reader could line up and net.
const IDENTITY_KEYS = new Set(["chainId", "poolClass"]);
const observedKeys = new Set(Object.keys(doc.observedOnChainProtection));
const replayKeys = new Set(Object.keys(doc.replayedCounterfactualBaselines));
const shared = [...observedKeys].filter(
  (k) => replayKeys.has(k) && !k.startsWith("_") && !IDENTITY_KEYS.has(k),
);
if (shared.length > 0) {
  fail("", `INV-3 the two halves share non-identity top-level keys: ${shared.join(", ")}. They are different chains and different pools; a same-named figure in both invites a reader to net them.`);
}
for (const k of IDENTITY_KEYS) {
  if (!observedKeys.has(k) || !replayKeys.has(k)) {
    fail("", `INV-3 both halves must state their own "${k}" so the contrast is on the page`);
  }
}

// INV-4 — the identity keys must not agree.
if (doc.observedOnChainProtection.chainId === doc.replayedCounterfactualBaselines.chainId) {
  fail("", "INV-4 both halves claim the same chainId — one is a testnet enforcement run, the other a mainnet replay");
}
if (doc.observedOnChainProtection.poolClass === doc.replayedCounterfactualBaselines.poolClass) {
  fail("", "INV-4 both halves claim the same poolClass");
}

// INV-5
if (benchmark.claimGate.value !== false) {
  fail("", "INV-5 the benchmark's claim gate is no longer false; this record's language must be re-derived before it can be republished");
}
if (doc.claimGate.canClaimLossAvoided !== benchmark.claimGate.value) {
  fail("claimGate.canClaimLossAvoided", "INV-5 does not equal three-policy-benchmark.json claimGate.value");
}
if (doc.claimGate.metricBasis !== "PRE_REGISTERED") {
  fail("claimGate.metricBasis", "INV-5 the gate must read the pre-registered metric only; AMD-002 is post-hoc");
}

// INV-6 — every replayed figure must equal the benchmark row it came from.
const SCENARIO_ID = "B-confirmed-protect";
const bRows = benchmark.rows.filter((r) => r.scenarioId === SCENARIO_ID);
const findRow = (policyId, params) =>
  bRows.find(
    (r) => r.policyId === policyId && Object.entries(params).every(([k, v]) => r.parameters[k] === v),
  );

const checkPolicy = (entry, label) => {
  const row = findRow(entry.policyId, entry.parameters);
  if (!row) {
    fail(label, `INV-6 no benchmark row matches ${entry.policyId} ${JSON.stringify(entry.parameters)}`);
    return;
  }
  const e = row.economics;
  const pairs = [
    ["feeRevenueGrossUsd", e.feeRevenueGrossUsd],
    ["feeRevenueToLpUsd", e.feeRevenueToLpUsd],
    ["markoutM0Usd", e.markoutM0Usd],
    ["markoutPrimaryUsd", e.markoutPrimaryUsd],
    ["adverseSelectionPrimaryUsd", e.adverseSelectionPrimaryUsd],
    ["totalNotionalUsd", e.totalNotionalUsd],
    ["maxFeeReachedPips", row.policyBehaviour.maxFeeReachedPips],
    ["protectionDurationSec", row.policyBehaviour.protectionDurationSec],
  ];
  for (const [key, expected] of pairs) {
    const got = entry[key];
    if (!got) {
      fail(`${label}.${key}`, "INV-6 missing");
      continue;
    }
    if (got.value !== expected.value) {
      fail(`${label}.${key}`, `INV-6 value ${got.value} != benchmark ${expected.value}`);
    }
    if (got.basis !== expected.basis) {
      fail(`${label}.${key}`, `INV-6 basis ${got.basis} != benchmark ${expected.basis}`);
    }
  }
  const amd = entry.markoutPrimaryPostHocAmd002Usd;
  const amdExpected = e.amd002ConsistentBasis.markoutPrimaryConsistentUsd;
  if (!amd || amd.value !== amdExpected.value) {
    fail(`${label}.markoutPrimaryPostHocAmd002Usd`, "INV-6 value does not equal the benchmark's AMD-002 figure");
  }
  if (amd && !/POST-HOC/i.test(amd.note || "")) {
    fail(`${label}.markoutPrimaryPostHocAmd002Usd.note`, "INV-6 AMD-002 figures must be labelled post-hoc at the point of use");
  }
  if (entry.replayInputFingerprint !== row.replayInputFingerprint) {
    fail(`${label}.replayInputFingerprint`, "INV-6 fingerprint drift — the policies no longer share one replay input");
  }
};

const pol = doc.replayedCounterfactualBaselines.policies;
checkPolicy(pol.STATIC, "policies.STATIC");
pol.VOLATILITY_ONLY.forEach((e, i) => checkPolicy(e, `policies.VOLATILITY_ONLY[${i}]`));
pol.TINJAU.forEach((e, i) => checkPolicy(e, `policies.TINJAU[${i}]`));

// All three policies must share one replay input fingerprint.
const fingerprints = new Set([
  pol.STATIC.replayInputFingerprint,
  ...pol.VOLATILITY_ONLY.map((e) => e.replayInputFingerprint),
  ...pol.TINJAU.map((e) => e.replayInputFingerprint),
]);
if (fingerprints.size !== 1) {
  fail("replayedCounterfactualBaselines", `INV-6 the three policies do not share one replay input (${fingerprints.size} distinct fingerprints)`);
}

// Tinjau must tie STATIC on this window — that equality IS the result.
for (const [i, t] of pol.TINJAU.entries()) {
  if (t.markoutPrimaryUsd.value !== pol.STATIC.markoutPrimaryUsd.value) {
    fail(`policies.TINJAU[${i}]`, "INV-6 Tinjau no longer ties STATIC; the published result and every claim built on it must be re-derived");
  }
}

// INV-7 — observed fees must equal the manifest's decoded Swap events.
const sceneB = manifest.scenes.find((s) => s.scene === "B");
const manifestFees = sceneB.swaps.map((s) => s.appliedFee);
const recordFees = doc.observedOnChainProtection.feePathActuallyCharged.map((f) => f.appliedFeePips.value);
if (JSON.stringify(manifestFees) !== JSON.stringify(recordFees)) {
  fail("observedOnChainProtection.feePathActuallyCharged", `INV-7 fee path ${recordFees.join("→")} does not match the manifest's decoded Swap events ${manifestFees.join("→")}`);
}
const manifestHashes = sceneB.swaps.map((s) => s.txHash);
const recordHashes = doc.observedOnChainProtection.feePathActuallyCharged.map((f) => f.txHash);
if (JSON.stringify(manifestHashes) !== JSON.stringify(recordHashes)) {
  fail("observedOnChainProtection.feePathActuallyCharged", "INV-7 transaction hashes do not match the manifest");
}
if (doc.boundedAction.appliedFeePips.value !== manifestFees[0]) {
  fail("boundedAction.appliedFeePips", "INV-7 does not match the manifest's first decoded Swap fee");
}

// INV-8
if (doc.trigger.marketObservations.dataMode === "CONSTRUCTED") {
  const canon = doc.canonicalReplayOfThisEvent;
  if (!canon || !canon.state) {
    fail("canonicalReplayOfThisEvent", "INV-8 a CONSTRUCTED market leg requires the canonical replay result beside it");
  } else if (canon.state === "PROTECT") {
    fail("canonicalReplayOfThisEvent.state", "INV-8 if the canonical replay reached PROTECT, the record would not need to be constructed — re-derive it");
  }
  if (!/CONSTRUCTED/.test(doc.trigger.marketObservations._WARNING || "")) {
    fail("trigger.marketObservations._WARNING", "INV-8 the constructed warning must say CONSTRUCTED");
  }
}

// INV-9 — forbidden claims (§0.19) and forbidden framings.
// Checked per string leaf, not against the whole serialised blob: a negation
// belonging to a neighbouring field (or to a key name such as
// `whatThisDoesNotProve`) must not be able to excuse a claim made elsewhere.
const strings = [];
(function collectStrings(node, path) {
  if (typeof node === "string") {
    strings.push([path, node.toLowerCase()]);
    return;
  }
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectStrings(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) collectStrings(v, path ? `${path}.${k}` : k);
})(doc, "");

const FORBIDDEN = [
  ["first ai dynamic-fee hook", "§0.19"],
  ["first ai-powered dynamic-fee hook", "§0.19"],
  ["first multi-agent corporate-action oracle", "§0.19"],
  ["first multi-agent corporate-actions oracle", "§0.19"],
  ["first on-chain risk registry", "§0.19"],
  ["first cex/dex risk agent", "§0.19"],
  ["first self-protecting pool", "§0.19"],
  ["production-ready", "§1 claim gate"],
  ["protected tvl", "§0.19"],
  ["loss avoided:", "claim gate is closed"],
  ["dual okx/x layer confirmation", "T3.1 — the OKX leg is UNAVAILABLE for all four scenarios"],
  ["dual-leg okx", "T3.1"],
];
// A forbidden phrase is tolerated only inside a string that explicitly disowns it.
const DISOWNS =
  /\b(never|not|no claim|no artifact may|no judge-facing|must not|may not|cannot|forbidden|prohibited|unavailable)\b/;
for (const [path, s] of strings) {
  for (const [phrase, rule] of FORBIDDEN) {
    if (!s.includes(phrase)) continue;
    if (!DISOWNS.test(s)) {
      fail(path, `INV-9 forbidden claim "${phrase}" appears without disowning it in the same sentence (${rule})`);
    }
  }
}

// INV-10 — no credential may enter an artifact.
const raw = JSON.stringify(doc);
for (const m of raw.matchAll(/0x[0-9a-fA-F]{64}/g)) {
  const hash = m[0];
  // 32-byte values are legitimate here (tx hashes, pool ids, commitments). A private
  // key would not appear beside a key-shaped label, so check the surrounding key name.
  const at = raw.indexOf(hash);
  const context = raw.slice(Math.max(0, at - 80), at).toLowerCase();
  if (/(privatekey|private_key|secret|mnemonic|seed|passphrase)/.test(context)) {
    fail("", "INV-10 a key-shaped value appears beside a credential-shaped label");
  }
}
if (/-----begin [a-z ]*private key/i.test(raw)) fail("", "INV-10 PEM private key material found");

// ---------------------------------------------------------------------------

if (errors.length > 0) {
  process.stderr.write(`proof-of-protection.json FAILED — ${errors.length} violation(s)\n\n`);
  for (const e of errors) process.stderr.write(`  ✗ ${e}\n`);
  process.stderr.write("\n");
  process.exit(1);
}

process.stdout.write(
  [
    "proof-of-protection.json OK",
    `  schema            ${schema.$id}`,
    `  metric leaves     ${metricCount} (all carry unit + basis)`,
    `  observed leaves   ${observedMetricCount} (all basis OBSERVED)`,
    `  halves            chain ${doc.observedOnChainProtection.chainId} (${doc.observedOnChainProtection.poolClass}) vs chain ${doc.replayedCounterfactualBaselines.chainId} (${doc.replayedCounterfactualBaselines.poolClass}), no shared key`,
    `  claim gate        canClaimLossAvoided = ${doc.claimGate.canClaimLossAvoided} (matches the benchmark)`,
    `  replay figures    equal three-policy-benchmark.json, TINJAU ties STATIC`,
    `  observed fees     ${recordFees.join(" -> ")} pips, equal to the decoded Swap events`,
    `  canonical replay  ${doc.canonicalReplayOfThisEvent.state} (constructed leg is bounded by it)`,
    "",
  ].join("\n"),
);
