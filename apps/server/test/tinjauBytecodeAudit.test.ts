/**
 * Controls for the deployed-vs-source bytecode comparator.
 *
 * The comparator's job is to answer one load-bearing question at T7.2: is the code at a
 * published address actually this source? A comparator that returns `IDENTICAL` because it
 * cannot see differences is worse than no comparator at all, so its ability to FAIL is tested
 * here before its verdicts are believed.
 *
 * Three properties, in the order they matter:
 *   1. it detects a single flipped byte;
 *   2. it detects wholly different code;
 *   3. it does NOT flag differences that live in immutable slots, which legitimately differ
 *      between two deployments of one source.
 *
 * All offline: the artifact is read from `contracts/out`, and the "deployed" side is
 * constructed here.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { ARTIFACTS, compareBytecode } from "../src/chain/tinjauBytecodeAudit.js";

const HAVE_ARTIFACTS = existsSync(ARTIFACTS.TinjauRiskRegistry) && existsSync(ARTIFACTS.TinjauFeeHook);
const ADDRESS = `0x${"11".repeat(20)}` as const;

/**
 * WHY THE SKIP ANNOUNCES ITSELF.
 *
 * The suite below skips when `contracts/out` is absent, which is the honest thing to do: with no
 * artifact there is nothing to compare against. But a silent skip makes a published test count
 * look inflated. `contracts/out` is rebuildable output and is not committed, so on a fresh clone
 * these five tests vanish — and node's summary reports `skipped 0`, because a skipped `describe`
 * is never registered at all. A reader who runs the server tests before `forge build` sees 589
 * where the docs say 594, with nothing on screen to explain the difference.
 *
 * So the omission gets a name. This notice is registered ONLY when the artifacts are missing:
 * adding a test to the passing path would push the full run to 595 and break the 594 the docs
 * publish. It always passes — a missing rebuildable artifact is an omission, not a failure.
 */
if (!HAVE_ARTIFACTS) {
  test("bytecode comparator needs contracts/out: run `forge build` first, or this run reports 589 of 594 tests", () => {
    console.log(
      [
        "",
        "  SKIPPED: the 5 bytecode-comparator tests did not run.",
        "  They read contracts/out/*.json, which is rebuildable output and therefore not committed.",
        "  This run therefore shows 590 tests (589 real ones, plus this notice) instead of the full 594.",
        "  Fix: cd contracts && forge build   — then re-run `npm test` here to see 594.",
        "  Nothing is broken: this is a missing input, not a failing assertion.",
        "",
      ].join("\n"),
    );
  });
}

describe("bytecode comparator", { skip: !HAVE_ARTIFACTS && "run `forge build` first" }, () => {
  const registryArtifact = HAVE_ARTIFACTS
    ? JSON.parse(readFileSync(ARTIFACTS.TinjauRiskRegistry, "utf8"))
    : null;

  test("identical input is reported identical", () => {
    const code: string = registryArtifact.deployedBytecode.object;
    const result = compareBytecode("registry", ADDRESS, code, ARTIFACTS.TinjauRiskRegistry);
    assert.equal(result.verdict, "IDENTICAL");
    assert.equal(result.bodyDifferences, 0);
  });

  test("a single flipped byte in the executable body is caught", () => {
    const code: string = registryArtifact.deployedBytecode.object;
    // Flip a nibble well inside the body, past the constructor-adjacent prologue and far from
    // the trailing metadata.
    const at = 200;
    const flipped = code.slice(0, at) + (code[at] === "a" ? "b" : "a") + code.slice(at + 1);
    assert.notEqual(flipped, code, "the control must actually change something");

    const result = compareBytecode("registry", ADDRESS, flipped, ARTIFACTS.TinjauRiskRegistry);
    assert.equal(result.verdict, "STALE", "one byte must be enough to fail verification");
    assert.ok(result.bodyDifferences > 0);
  });

  test("wholly different code is caught", () => {
    const hookCode: string = JSON.parse(
      readFileSync(ARTIFACTS.TinjauFeeHook, "utf8"),
    ).deployedBytecode.object;
    const result = compareBytecode("mismatch", ADDRESS, hookCode, ARTIFACTS.TinjauRiskRegistry);
    assert.equal(result.verdict, "STALE");
  });

  test("differences confined to immutable slots are NOT flagged", () => {
    // Two deployments of one source differ exactly here: the hook bakes in its PoolManager,
    // its registry, and six envelope values. Flagging those would make every verification fail
    // and the tool would be discarded, so the masking has to be shown to work.
    const artifact = JSON.parse(readFileSync(ARTIFACTS.TinjauFeeHook, "utf8"));
    const code: string = artifact.deployedBytecode.object;
    const refs = Object.values(
      artifact.deployedBytecode.immutableReferences as Record<string, { start: number; length: number }[]>,
    ).flat();
    assert.ok(refs.length > 0, "the hook must have immutables for this control to mean anything");

    const bytes = Buffer.from(code.replace(/^0x/, ""), "hex");
    for (const ref of refs) {
      for (let i = ref.start; i < ref.start + ref.length; i++) bytes[i] = bytes[i] ^ 0xff;
    }
    const mutated = `0x${bytes.toString("hex")}`;
    assert.notEqual(mutated, code);

    const result = compareBytecode("hook", ADDRESS, mutated, ARTIFACTS.TinjauFeeHook);
    assert.equal(result.bodyDifferences, 0, "immutable slots must be masked, not compared");
    assert.equal(result.verdict, "IDENTICAL");
  });

  test("a truncated deployment is caught by size", () => {
    const code: string = registryArtifact.deployedBytecode.object;
    const result = compareBytecode("short", ADDRESS, code.slice(0, code.length - 20), ARTIFACTS.TinjauRiskRegistry);
    assert.equal(result.sizesMatch, false);
    assert.equal(result.verdict, "STALE");
  });
});
