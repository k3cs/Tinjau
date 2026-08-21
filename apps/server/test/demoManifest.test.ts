/**
 * T6.5 — the three-scene demo manifest cannot drift away from the evidence it describes.
 *
 * The manifest is a *derived* artifact: `demo/tinjau-demo.mjs manifest` reads the published
 * scenario, benchmark and address artifacts and writes them out. That makes drift the only real
 * failure mode — someone edits an upstream artifact, the committed manifest keeps asserting the
 * old fact, and the demo presents a number the evidence no longer supports. `check` re-derives
 * and diffs byte-for-byte, so this suite runs it rather than re-implementing it.
 *
 * The second half pins the §0.14 truths the demo is most likely to overstate, each one read out
 * of the manifest AND out of the artifact it came from. Checking only the manifest would let a
 * wrong fact pass as long as it was wrong consistently.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const driver = join(repoRoot, "demo", "tinjau-demo.mjs");
const build = join(repoRoot, "docs", "buildx-orion-2026", "outputs", "05-build");
const handoff = join(build, "frontend-handoff");

const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const manifest = readJson(join(build, "t6-5-demo-manifest.json"));

const run = (...args: string[]) =>
  execFileSync(process.execPath, [driver, ...args], { encoding: "utf8", cwd: repoRoot });

test("the committed demo manifest is byte-identical to what the artifacts produce now", () => {
  const out = run("check");
  assert.match(out, /byte-identical/);
});

test("the offline seal is armed: every network primitive throws before scene code runs", () => {
  const out = run("seal-selftest");
  assert.match(out, /all network primitives are sealed/);
  assert.doesNotMatch(out, /ESCAPED/);
});

test("each scene runs offline and names a command that needs no credentials", () => {
  for (const scene of ["scene1", "scene2", "scene3"]) {
    const out = run(scene);
    assert.match(out, /MODE: FIXTURE-ONLY\. Network SEALED/);
    assert.match(out, /\[fixtureOnly\]/);
  }
});

test("every source artifact the manifest pins still hashes to the recorded value", async () => {
  const { createHash } = await import("node:crypto");
  for (const src of manifest.sourceArtifacts) {
    const actual = createHash("sha256")
      .update(readFileSync(join(repoRoot, src.path)))
      .digest("hex");
    assert.equal(actual, src.sha256, `${src.path} changed without regenerating the manifest`);
  }
});

test("scene 1 is a canonical replay and its aggressive fee stays unauthorised", () => {
  const scene = manifest.scenes.find((s: { scene: number }) => s.scene === 1);
  const artifact = readJson(join(handoff, "scenario-rumor-watch.json"));

  assert.equal(scene.facts.state, "WATCH");
  assert.equal(artifact.record.state, "WATCH");
  assert.equal(scene.facts.actionAuthorized, false);
  assert.equal(artifact.record.action.authorized, false);
  // The pool charged base fee. This is the fact the whole negative control rests on.
  assert.equal(scene.facts.feeChargedByThePool, scene.facts.baseFee);
  assert.equal(scene.provenance.outcomeOrigin, "CANONICAL_REPLAY");
});

test("scene 2 carries the constructed label and the canonical WATCH beside its PROTECT", () => {
  const scene = manifest.scenes.find((s: { scene: number }) => s.scene === 2);
  const artifact = readJson(join(handoff, "scenario-confirmed-protect.json"));

  assert.equal(scene.facts.state, "PROTECT");
  assert.equal(scene.provenance.marketLeg, "CONSTRUCTED");
  // Without this, the scene reads as a replayed PROTECT — the single most misleading thing this
  // project could publish.
  assert.equal(scene.constructed.canonicalReplayState, "WATCH");
  assert.equal(artifact.criticalCaveat.canonicalReplayState, "WATCH");
  assert.match(scene.requiredTruth, /NOT A REPLAY/i);
  // Only market-leg reason codes differ from the canonical run.
  const diff = scene.constructed.reasonCodeDiffVsCanonical;
  for (const code of [...diff.onlyInCanonical, ...diff.onlyInConstructed]) {
    assert.match(code, /^(ANTI_WICK_FAILED|MARKET_NOT_CONFIRMED|MARKET_CONFIRMED)$/);
  }
});

test("scene 3 declares no winner and keeps the loss-reduction claim closed", () => {
  const scene = manifest.scenes.find((s: { scene: number }) => s.scene === 3);
  const benchmark = readJson(join(build, "three-policy-benchmark.json"));

  assert.equal(scene.facts.claimGate.value, false);
  assert.equal(benchmark.claimGate.value, false);
  // The Proof of Protection record reaches the same gate by a different route. If the two ever
  // disagree, one of them is wrong and the demo must not present either until that is settled.
  assert.equal(scene.facts.claimGate.proofOfProtectionAgrees, true);
  assert.equal(
    readJson(join(build, "proof-of-protection.json")).claimGate.canClaimLossAvoided,
    false,
  );

  // The sign flip is the reason no winner may be declared. If either side of it ever stops being
  // unanimous, the presentation has to change, so this fails rather than silently narrowing.
  assert.deepEqual(scene.facts.signFlip.preRegistered, { TINJAU_BEATS: 27 });
  assert.deepEqual(scene.facts.signFlip.amd002Consistent, { TINJAU_LOSES: 27 });
  assert.deepEqual(scene.facts.signFlip.vsStaticBothBases.preRegistered, { TINJAU_TIES: 27 });

  // The defensible claim is behavioural and comes from the neutral control.
  for (const row of scene.facts.theDefensibleClaim.volatilityOnly) {
    assert.equal(row.falsePositive, "FALSE_POSITIVE");
  }
  for (const row of scene.facts.theDefensibleClaim.tinjau) {
    assert.equal(row.falsePositive, "TRUE_NEGATIVE");
  }
});

test("no scene may claim a first, dual confirmation, or reduced LP loss", () => {
  // The prohibitions and the §0.14 truths are ALLOWED to name these phrases — that is their job,
  // and a blanket string search would forbid the manifest from stating what must not be claimed.
  // What may never carry them is the part a presentation reads as fact: the scene titles and the
  // per-scene `facts` block.
  const assertive = JSON.stringify(
    manifest.scenes.map((s: { title: string; facts: unknown }) => ({
      title: s.title,
      facts: s.facts,
    })),
  );
  for (const phrase of [
    "dual OKX/X Layer confirmation",
    "reduces LP loss",
    "first AI dynamic-fee hook",
    "first on-chain risk registry",
    "production-ready",
  ]) {
    assert.ok(!assertive.includes(phrase), `"${phrase}" leaked into a scene's asserted facts`);
  }
  // And the prohibitions must actually still be there.
  for (const phrase of ["dual OKX/X Layer confirmation", "Tinjau reduces LP loss"]) {
    assert.ok(
      manifest.claimBoundary.forbidden.includes(phrase),
      `"${phrase}" is no longer listed as forbidden`,
    );
  }
  assert.match(manifest.claimBoundary.permitted, /^No complete public product/);
});
