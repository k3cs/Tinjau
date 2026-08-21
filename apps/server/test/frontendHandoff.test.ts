/**
 * The frontend handoff directory (tracker §0.23) is checked here so `pnpm test` fails if it
 * drifts — a handoff artifact that silently stops matching its schema is worse than one that
 * was never written, because the frontend owner is building against it.
 *
 * The actual validation lives in `frontend-handoff/tools/validate.mjs`, which is a standalone,
 * zero-dependency script a reviewer can run without this repo's toolchain. This suite SPAWNS
 * that script rather than reimplementing it: two copies of a validator would drift, and the
 * copy that matters is the one a stranger can run.
 *
 * What that script does, in one place so this file does not have to duplicate it:
 *   - validates every JSON artifact against its published schema, resolving cross-file $refs
 *     against the real schema files (so `.record` is checked against risk-record.schema.json);
 *   - fails if any schema uses a keyword its validator does not implement, so a constraint
 *     cannot be written and then silently ignored;
 *   - feeds deliberately-broken documents through and asserts each is REJECTED;
 *   - asserts every §0.23 artifact is present;
 *   - asserts a set of load-bearing FACTS still hold.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const handoffDir = join(
  here,
  "..",
  "..",
  "..",
  "docs",
  "buildx-orion-2026",
  "outputs",
  "05-build",
  "frontend-handoff",
);
const validator = join(handoffDir, "tools", "validate.mjs");

const readJson = (name: string): any => JSON.parse(readFileSync(join(handoffDir, name), "utf8"));

test("the frontend-handoff validator passes", () => {
  const run = spawnSync(process.execPath, [validator], { encoding: "utf8" });
  if (run.status !== 0) {
    throw new Error(
      `validate.mjs exited ${run.status}\n--- stdout ---\n${run.stdout}\n--- stderr ---\n${run.stderr}`,
    );
  }
  assert.match(run.stdout, /all frontend-handoff artifacts validate/);
});

test("the validator is not vacuous: it reports both schema checks and mutation rejections", () => {
  const run = spawnSync(process.execPath, [validator], { encoding: "utf8" });
  const mutationLines = run.stdout.split("\n").filter((l) => l.startsWith("ok    mutation rejected"));
  // A validator that accepted everything would report zero rejections and still exit 0 on the
  // artifacts themselves. Requiring a floor here means the guard cannot be quietly removed.
  assert.ok(
    mutationLines.length >= 15,
    `expected at least 15 rejected mutations, got ${mutationLines.length}`,
  );
  const factLines = run.stdout.split("\n").filter((l) => l.startsWith("ok    fact holds"));
  assert.ok(factLines.length >= 6, `expected at least 6 fact checks, got ${factLines.length}`);
});

test("every §0.23 artifact exists", () => {
  const required = [
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
  for (const name of required) {
    assert.ok(present.has(name), `§0.23 artifact missing: ${name}`);
  }
});

test("no handoff artifact claims a PROTECT that a canonical replay produced", () => {
  const rumour = readJson("scenario-rumor-watch.json");
  const protect = readJson("scenario-confirmed-protect.json");

  assert.equal(rumour.record.state, "WATCH");
  assert.equal(rumour.provenance.outcomeOrigin, "CANONICAL_REPLAY");

  // The one PROTECT in the handoff. Its origin, its market leg, and the canonical outcome it
  // differs from must all be present and consistent — this is the misrepresentation that would
  // do the most damage if it ever slipped through.
  assert.equal(protect.record.state, "PROTECT");
  assert.equal(protect.provenance.outcomeOrigin, "CONSTRUCTED_MARKET_INPUTS");
  assert.equal(protect.provenance.marketLeg, "CONSTRUCTED");
  assert.equal(protect.criticalCaveat.canonicalReplayState, "WATCH");
  assert.equal(protect.criticalCaveat.canonicalReplayConfirmation, "NOT_CONFIRMED");
});

test("the loss-avoided claim gate is closed and is governed by the pre-registered metric", () => {
  const comparison = readJson("three-policy-comparison.json");
  assert.equal(comparison.claimEligibility.field, "canClaimLossAvoided");
  assert.equal(comparison.claimEligibility.value, false);
  assert.equal(comparison.claimEligibility.metricBasis, "PRE_REGISTERED");

  // AMD-002 is post-hoc. If it could open the gate, the pre-registration would be decorative.
  const amd002 = comparison.method.metricBases.find((b: any) => b.id === "AMD_002_CONSISTENT");
  assert.equal(amd002.preRegistered, false);
  assert.equal(amd002.governsClaimGate, false);
});

test("the benchmark publishes both bases and admits it cannot rank the policies on markout", () => {
  const comparison = readJson("three-policy-comparison.json");
  const bases = new Set(comparison.comparisonCells.map((c: any) => c.metricBasis));
  assert.deepEqual([...bases].sort(), ["AMD_002_CONSISTENT", "PRE_REGISTERED"]);

  // Every comparable cell flips sign between the bases. If that ever stopped being true the
  // interpretation below would be wrong, so it is measured rather than quoted.
  const comparable = comparison.comparisonCells.filter(
    (c: any) => c.vsVolatilityOnly !== "NOT_COMPARABLE",
  );
  const pre = comparable.filter((c: any) => c.metricBasis === "PRE_REGISTERED");
  const post = comparable.filter((c: any) => c.metricBasis === "AMD_002_CONSISTENT");
  assert.equal(pre.length, 27);
  assert.equal(post.length, 27);
  assert.ok(pre.every((c: any) => c.vsVolatilityOnly === "TINJAU_BEATS"));
  assert.ok(post.every((c: any) => c.vsVolatilityOnly === "TINJAU_LOSES"));

  // And Tinjau ties STATIC everywhere, which is why the gate is closed.
  assert.ok(comparable.every((c: any) => c.vsStatic === "TINJAU_TIES"));
});

test("the defensible behavioural claim is present and is about restraint, not protection", () => {
  const comparison = readJson("three-policy-comparison.json");
  assert.match(comparison.interpretation.defensibleClaim, /declined to act/i);
  assert.match(comparison.interpretation.headline, /cannot determine which policy did better/i);
  assert.ok(
    comparison.interpretation.prohibited.some((p: string) => /reduces LP loss/i.test(p)),
    "the prohibited list must name the loss-reduction claim explicitly",
  );
});

test("deployed addresses carry the T7.2 authoritative label and the stale-read warning", () => {
  const addresses = readJson("deployed-addresses.json");
  assert.equal(addresses.status, "T7_2_AUTHORITATIVE");
  assert.equal(addresses.network.chainId, 1952);
  assert.equal(addresses.network.isTestnet, true);
  assert.match(addresses.network.rpcWarning, /stale reads/i);
  assert.match(addresses.network.rpcWarning, /AssessmentPosted/);

  // Both stacks, every contract with a real bytecode measurement.
  assert.equal(addresses.stacks.length, 2);
  for (const stack of addresses.stacks) {
    for (const c of stack.contracts) {
      assert.equal(c.hasBytecode, true, `${c.role} must have bytecode`);
      assert.ok(c.codeSize > 0, `${c.role} must carry a measured codeSize`);
    }
  }
});

test("api-contract.md and known-limitations.md both carry the stale-read guidance", () => {
  // The single most important operational fact in the handoff. It must reach a consumer from
  // both the contract they read to integrate and the limitations they read before writing copy.
  for (const file of ["api-contract.md", "known-limitations.md"]) {
    const text = readFileSync(join(handoffDir, file), "utf8");
    assert.match(text, /stale reads/i, `${file} must warn about stale RPC reads`);
    assert.match(text, /AssessmentPosted/, `${file} must name the event to follow instead`);
    assert.match(
      text,
      /can read `?NORMAL`? while a `?PROTECT`? is live/i,
      `${file} must state the concrete consequence`,
    );
  }
});

test("known-limitations.md records the frontend reason-code blocker without fixing it", () => {
  const text = readFileSync(join(handoffDir, "known-limitations.md"), "utf8");
  for (const code of ["INSUFFICIENT_SAMPLE", "PERSISTENCE_UNOBSERVED", "UNKNOWN_COMPANY"]) {
    assert.match(text, new RegExp(code), `known-limitations.md must name ${code}`);
  }
  assert.match(text, /model\.ts/);
});

test("the published reason-code enum still contains the three codes the frontend is missing", () => {
  // If one of these were ever removed from the schema, the "frontend is stale" finding would
  // silently become false and the blocker note would be misleading.
  const schema = readJson("risk-record.schema.json");
  const codes: string[] = schema.$defs.reasonCode.enum;
  for (const code of ["INSUFFICIENT_SAMPLE", "PERSISTENCE_UNOBSERVED", "UNKNOWN_COMPANY"]) {
    assert.ok(codes.includes(code), `risk-record.schema.json lost ${code}`);
  }
  // And scenario A really does emit one of them, which is what makes the blocker concrete.
  const rumour = readJson("scenario-rumor-watch.json");
  assert.ok(rumour.record.reasonCodes.includes("INSUFFICIENT_SAMPLE"));
});
