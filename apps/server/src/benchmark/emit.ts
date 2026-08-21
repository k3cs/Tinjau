/**
 * Writes the three-policy benchmark artifact to disk (task T5.3).
 *
 *   npx tsx src/benchmark/emit.ts
 *
 * Output: `docs/buildx-orion-2026/outputs/05-build/three-policy-benchmark.json`.
 *
 * NOT `frontend-handoff/`, which stays orchestrator-owned until it is validated and published.
 *
 * Deterministic: re-running overwrites the file with byte-identical content, so a diff after a
 * rerun is empty unless something real changed. That is what makes the committed artifact
 * evidence rather than a snapshot of one lucky run.
 *
 * The per-swap detail is omitted from the file and only from the file. Scenario B alone carries
 * 4,145 swaps × 7 policy rows, which would make the artifact tens of megabytes and unreviewable in
 * a diff. Every figure derived from those rows — the totals, the full distribution, the tail
 * concentration, the two most extreme swaps — is retained, along with the column descriptor, and
 * `runBenchmark()` returns the per-swap rows in process for anyone who needs them.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runBenchmark, type BenchmarkArtifact } from "./index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ARTIFACT_DIR = join(HERE, "..", "..", "..", "..", "docs", "buildx-orion-2026", "outputs", "05-build");
export const ARTIFACT_PATH = join(ARTIFACT_DIR, "three-policy-benchmark.json");

/** The artifact as written to disk: identical to `runBenchmark()` minus the per-swap rows. */
export function artifactForDisk(artifact: BenchmarkArtifact): unknown {
  return {
    ...artifact,
    rows: artifact.rows.map((row) => {
      if (row.economics === null) return row;
      const { perSwap, ...economics } = row.economics;
      return {
        ...row,
        economics: {
          ...economics,
          perSwapOmittedFromFile: {
            swapRows: perSwap.length,
            reason:
              "Per-swap rows are omitted from the committed file only, to keep it reviewable in a " +
              "diff. Every derived figure above — totals, distribution, tail concentration, the " +
              "two most extreme swaps — is computed from them and retained, and `perSwapColumns` " +
              "documents their shape. `runBenchmark()` returns them in process.",
          },
        },
      };
    }),
  };
}

export function emit(): string {
  const json = `${JSON.stringify(artifactForDisk(runBenchmark()), null, 2)}\n`;
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(ARTIFACT_PATH, json, "utf8");
  return ARTIFACT_PATH;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = emit();
  process.stdout.write(`wrote ${path}\n`);
}
