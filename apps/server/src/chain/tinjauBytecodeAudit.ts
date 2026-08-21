/**
 * Compares deployed runtime bytecode against the current source build.
 *
 * ---------------------------------------------------------------------------------------
 * WHY A NAIVE DIFF IS USELESS HERE. Two things legitimately differ between a Foundry artifact
 * and the code at an address, without either being stale:
 *
 *   - IMMUTABLES. `TinjauFeeHook` bakes its PoolManager, registry and six envelope values into
 *     the runtime code; `TinjauRiskRegistry` bakes its EIP-712 domain separator. The artifact
 *     carries zeroes at those offsets. Foundry publishes `immutableReferences`, so they can be
 *     masked in BOTH sides rather than guessed at.
 *   - METADATA. Solidity appends a CBOR blob whose hash covers the source text, so any edit —
 *     a comment included — changes the tail. Masking it separately keeps "built from different
 *     source" distinct from "behaves differently", which are not the same finding.
 *
 * What is left after masking is the executable body. If that differs, the deployed contract is
 * genuinely not this source.
 * ---------------------------------------------------------------------------------------
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface BytecodeComparison {
  name: string;
  address: `0x${string}`;
  deployedSize: number;
  localSize: number;
  sizesMatch: boolean;
  /** Bytes differing outside immutables and metadata. Zero means the body is identical. */
  bodyDifferences: number;
  metadataDiffers: boolean;
  immutableSlots: number;
  verdict: "IDENTICAL" | "METADATA_ONLY" | "STALE";
}

/** Length of the CBOR metadata blob, read from the two-byte big-endian suffix. */
function metadataLength(hex: string): number {
  const bytes = hex.length / 2;
  if (bytes < 2) return 0;
  const declared = parseInt(hex.slice(-4), 16);
  const total = declared + 2;
  return total > 0 && total < bytes ? total : 0;
}

export function compareBytecode(
  name: string,
  address: `0x${string}`,
  deployedHex: string,
  artifactPath: string,
): BytecodeComparison {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const localHex: string = artifact.deployedBytecode.object.replace(/^0x/, "");
  const onChainHex = deployedHex.replace(/^0x/, "");

  const immutableRefs = (artifact.deployedBytecode.immutableReferences ?? {}) as Record<
    string,
    { start: number; length: number }[]
  >;

  const masked = new Set<number>();
  let immutableSlots = 0;
  for (const refs of Object.values(immutableRefs)) {
    for (const ref of refs) {
      immutableSlots++;
      for (let i = ref.start; i < ref.start + ref.length; i++) masked.add(i);
    }
  }

  const localBytes = Buffer.from(localHex, "hex");
  const chainBytes = Buffer.from(onChainHex, "hex");

  const metaLen = metadataLength(localHex);
  const bodyEnd = localBytes.length - metaLen;

  let bodyDifferences = 0;
  const limit = Math.min(localBytes.length, chainBytes.length);
  for (let i = 0; i < Math.min(bodyEnd, limit); i++) {
    if (masked.has(i)) continue;
    if (localBytes[i] !== chainBytes[i]) bodyDifferences++;
  }

  let metadataDiffers = false;
  if (metaLen > 0 && localBytes.length === chainBytes.length) {
    metadataDiffers = !localBytes.subarray(bodyEnd).equals(chainBytes.subarray(bodyEnd));
  }

  const sizesMatch = localBytes.length === chainBytes.length;
  const verdict: BytecodeComparison["verdict"] =
    !sizesMatch || bodyDifferences > 0 ? "STALE" : metadataDiffers ? "METADATA_ONLY" : "IDENTICAL";

  return {
    name,
    address,
    deployedSize: chainBytes.length,
    localSize: localBytes.length,
    sizesMatch,
    bodyDifferences,
    metadataDiffers,
    immutableSlots,
    verdict,
  };
}

export const CONTRACTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "contracts");

export const ARTIFACTS = {
  TinjauRiskRegistry: join(CONTRACTS_DIR, "out", "TinjauRiskRegistry.sol", "TinjauRiskRegistry.json"),
  TinjauFeeHook: join(CONTRACTS_DIR, "out", "TinjauFeeHook.sol", "TinjauFeeHook.json"),
};
