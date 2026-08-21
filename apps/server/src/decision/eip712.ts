/**
 * EIP-712 signing for `TinjauRiskRegistry.postAssessment` (task T4.1).
 *
 * Every constant here is transcribed from `contracts/src/TinjauRiskRegistry.sol` and checked
 * against that file by `test/decisionSigning.test.ts`, which parses the Solidity source and
 * compares strings. A typed-data definition that merely "looks right" produces a signature the
 * registry rejects with `BadSignature()` and no further explanation, so the transcription is
 * verified rather than trusted.
 *
 * ---------------------------------------------------------------------------------------
 * KEY HANDLING — read before adding a log line.
 *
 * The assessor key is a hot key that can authorise a fee change on a live pool. This module:
 *   - never reads a key implicitly; every signing call takes one as an argument;
 *   - never logs, prints, serialises, or returns a key or any prefix of one;
 *   - never writes one into a record, a fixture, or a document.
 *
 * `assessorKeyFromEnv` is the ONLY place an environment variable is read, and its error paths
 * report the variable NAME and never the value. Tests use an obviously-fake constant defined in
 * the test file, and touch no network: signing is pure local elliptic-curve arithmetic.
 * ---------------------------------------------------------------------------------------
 */

import { encodeAbiParameters, keccak256, toBytes, concatHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Verbatim copy of `TinjauRiskRegistry.ASSESSMENT_TYPEHASH`'s argument.
 *
 * Field order is load-bearing: EIP-712 hashes the struct members in declaration order, so
 * reordering one line here silently changes the digest.
 */
export const ASSESSMENT_TYPE_STRING =
  "Assessment(address asset,bytes32 poolId,uint8 state,uint8 confidence,uint8 dataMode," +
  "uint8 confirmation,uint32 reasonBits,uint64 assessedAt,uint64 expiresAt," +
  "bytes32 evidenceCommitment,uint24 requestedFee,uint256 nonce,uint256 deadline)";

/** From the constructor: `keccak256("TinjauRiskRegistry")` and `keccak256(bytes("1"))`. */
export const EIP712_DOMAIN_NAME = "TinjauRiskRegistry";
export const EIP712_DOMAIN_VERSION = "1";

export const EIP712_DOMAIN_TYPE_STRING =
  "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";

export const ASSESSMENT_TYPES = {
  Assessment: [
    { name: "asset", type: "address" },
    { name: "poolId", type: "bytes32" },
    { name: "state", type: "uint8" },
    { name: "confidence", type: "uint8" },
    { name: "dataMode", type: "uint8" },
    { name: "confirmation", type: "uint8" },
    { name: "reasonBits", type: "uint32" },
    { name: "assessedAt", type: "uint64" },
    { name: "expiresAt", type: "uint64" },
    { name: "evidenceCommitment", type: "bytes32" },
    { name: "requestedFee", type: "uint24" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/** Rebuilds the type string from `ASSESSMENT_TYPES`, so the two cannot drift apart unnoticed. */
export function assessmentTypeStringFromTypes(): string {
  const members = ASSESSMENT_TYPES.Assessment.map((m) => `${m.type} ${m.name}`).join(",");
  return `Assessment(${members})`;
}

export interface AssessmentDomain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

export function assessmentDomain(
  chainId: number,
  verifyingContract: `0x${string}`,
): AssessmentDomain {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

/**
 * The struct `postAssessment` takes, with the exact widths the ABI declares.
 *
 * Numbers are used where the Solidity type is `uint8`/`uint24`/`uint32` (all comfortably inside
 * `Number.MAX_SAFE_INTEGER`) and `bigint` where it is `uint64`/`uint256`. Timestamps are
 * `bigint` on purpose: a `uint64` seconds value fits in a JS number today, but the ABI boundary
 * is not the place to rely on that.
 */
export interface AssessmentStruct {
  asset: `0x${string}`;
  poolId: `0x${string}`;
  state: number;
  confidence: number;
  dataMode: number;
  confirmation: number;
  reasonBits: number;
  assessedAt: bigint;
  expiresAt: bigint;
  evidenceCommitment: `0x${string}`;
  requestedFee: number;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Mirror of the constructor's `_domainSeparator`.
 *
 * Computed here from first principles — `keccak256(abi.encode(typehash, nameHash, versionHash,
 * chainId, verifyingContract))` — rather than delegating to a library helper, so the test that
 * compares it against the contract's own arithmetic is comparing two independent derivations.
 */
export function domainSeparator(domain: AssessmentDomain): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "address" },
      ],
      [
        keccak256(toBytes(EIP712_DOMAIN_TYPE_STRING)),
        keccak256(toBytes(domain.name)),
        keccak256(toBytes(domain.version)),
        BigInt(domain.chainId),
        domain.verifyingContract,
      ],
    ),
  );
}

/** Mirror of `TinjauRiskRegistry.hashAssessment`'s inner `structHash`. */
export function assessmentStructHash(a: AssessmentStruct): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "bytes32" },
        { type: "uint8" },
        { type: "uint8" },
        { type: "uint8" },
        { type: "uint8" },
        { type: "uint32" },
        { type: "uint64" },
        { type: "uint64" },
        { type: "bytes32" },
        { type: "uint24" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      [
        keccak256(toBytes(ASSESSMENT_TYPE_STRING)),
        a.asset,
        a.poolId,
        a.state,
        a.confidence,
        a.dataMode,
        a.confirmation,
        a.reasonBits,
        a.assessedAt,
        a.expiresAt,
        a.evidenceCommitment,
        a.requestedFee,
        a.nonce,
        a.deadline,
      ],
    ),
  );
}

/** The full EIP-712 digest: `keccak256("\x19\x01" || domainSeparator || structHash)`. */
export function assessmentDigest(
  domain: AssessmentDomain,
  a: AssessmentStruct,
): `0x${string}` {
  return keccak256(concatHex(["0x1901", domainSeparator(domain), assessmentStructHash(a)]));
}

/**
 * Signs an assessment with the assessor key.
 *
 * Pure local computation — no RPC, no network, no clock. The returned signature is the 65-byte
 * `r || s || v` form `_recoverSigner` reads with `calldataload`.
 *
 * viem produces canonical low-`s` signatures, which the registry requires: it rejects the
 * malleable high half of the curve so one authorisation cannot be reshaped into a second
 * distinct-looking one.
 */
export async function signAssessment(
  domain: AssessmentDomain,
  assessment: AssessmentStruct,
  privateKey: `0x${string}`,
): Promise<`0x${string}`> {
  const account = privateKeyToAccount(privateKey);
  return account.signTypedData({
    domain,
    types: ASSESSMENT_TYPES as unknown as Record<string, { name: string; type: string }[]>,
    primaryType: "Assessment",
    message: assessment as unknown as Record<string, unknown>,
  });
}

/** The address a key signs as, without signing anything. Never logs or returns the key. */
export function assessorAddress(privateKey: `0x${string}`): `0x${string}` {
  return privateKeyToAccount(privateKey).address;
}

export class AssessorKeyMissingError extends Error {
  constructor(variableName: string) {
    // The variable NAME only. Never the value, never a prefix, never a length.
    super(
      `${variableName} is not set. The assessor signing key comes from the environment and is ` +
        `never stored in this repository. Set it in the deployment environment only.`,
    );
    this.name = "AssessorKeyMissingError";
  }
}

export const ASSESSOR_KEY_ENV_VAR = "TINJAU_ASSESSOR_PRIVATE_KEY";

/**
 * Reads the assessor key from the environment.
 *
 * The ONLY implicit key source in this codebase, and it is deliberately not called by
 * `decide()` — building an assessment never needs a key, so an unsigned decision path cannot
 * accidentally require production credentials. Callers that actually post pass the result to
 * `signAssessment` explicitly.
 */
export function assessorKeyFromEnv(env: NodeJS.ProcessEnv = process.env): `0x${string}` {
  const raw = env[ASSESSOR_KEY_ENV_VAR];
  if (!raw || raw.trim().length === 0) throw new AssessorKeyMissingError(ASSESSOR_KEY_ENV_VAR);
  const key = raw.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    // Shape complaint without echoing the value.
    throw new AssessorKeyMissingError(
      `${ASSESSOR_KEY_ENV_VAR} (present but not a 0x-prefixed 32-byte hex string)`,
    );
  }
  return key as `0x${string}`;
}
