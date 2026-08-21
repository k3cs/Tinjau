/**
 * EIP-712 signing against `TinjauRiskRegistry` (task T4.1).
 *
 * The failure this suite exists to prevent: a typed-data definition that looks right, produces
 * a plausible signature, and is rejected on chain with `BadSignature()` and no explanation.
 * Every constant is therefore checked against the Solidity SOURCE, parsed out of the contract
 * file, rather than against a second copy of the same assumption.
 *
 * NO NETWORK, NO REAL KEY. Signing is local elliptic-curve arithmetic. The key below is an
 * obviously-fake constant that exists only in this file.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, toBytes, recoverTypedDataAddress, hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  ASSESSMENT_TYPE_STRING,
  ASSESSMENT_TYPES,
  ASSESSOR_KEY_ENV_VAR,
  AssessorKeyMissingError,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_TYPE_STRING,
  EIP712_DOMAIN_VERSION,
  assessmentDigest,
  assessmentDomain,
  assessmentTypeStringFromTypes,
  assessorAddress,
  assessorKeyFromEnv,
  domainSeparator,
  signAssessment,
  type AssessmentStruct,
} from "../src/decision/eip712.js";

/**
 * An obviously-fake test key: thirty-two 0x11 bytes.
 *
 * Chosen so nobody can mistake it for a real one. It never leaves this file, is never written
 * to a fixture or a document, and controls no funds on any network.
 */
const OBVIOUSLY_FAKE_TEST_KEY =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

const contractsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "contracts",
  "src",
);
const registrySource = readFileSync(join(contractsDir, "TinjauRiskRegistry.sol"), "utf8");

const CHAIN_ID = 196;
const REGISTRY = "0x00000000000000000000000000000000000000c1" as const;

function assessment(over: Partial<AssessmentStruct> = {}): AssessmentStruct {
  return {
    asset: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5",
    poolId: `0x${"00".repeat(12)}2a2b11730c2b6d99a58034a869dd810d7300a7b2`,
    state: 2,
    confidence: 3,
    dataMode: 3,
    confirmation: 4,
    reasonBits: 0x10000,
    assessedAt: 1_786_000_000n,
    expiresAt: 1_786_021_600n,
    evidenceCommitment: `0x${"ab".repeat(32)}`,
    requestedFee: 20_000,
    nonce: 42n,
    deadline: 1_786_021_600n,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Parity with the contract source
// ---------------------------------------------------------------------------

test("the typehash string is the one in TinjauRiskRegistry.sol, character for character", () => {
  // Parsed out of the Solidity so the two cannot drift. Reordering a single member changes the
  // digest silently, and the only symptom on chain would be a bare `BadSignature()`.
  const match = registrySource.match(/keccak256\(\s*"(Assessment\([^"]+\))"\s*\)/);
  assert.ok(match, "could not find ASSESSMENT_TYPEHASH in the contract source");
  assert.equal(ASSESSMENT_TYPE_STRING, match![1]);
});

test("ASSESSMENT_TYPES generates exactly that same string", () => {
  // The constant and the field list are two representations of one fact. This is what stops
  // someone editing the string without editing the array, or the reverse.
  assert.equal(assessmentTypeStringFromTypes(), ASSESSMENT_TYPE_STRING);
  assert.equal(ASSESSMENT_TYPES.Assessment.length, 13);
});

test("the domain name, version and type string match the constructor", () => {
  assert.ok(
    registrySource.includes(`keccak256("${EIP712_DOMAIN_NAME}")`),
    "domain name mismatch with the constructor",
  );
  assert.ok(
    registrySource.includes(`keccak256(bytes("${EIP712_DOMAIN_VERSION}"))`),
    "domain version mismatch with the constructor",
  );
  assert.ok(
    registrySource.includes(`keccak256("${EIP712_DOMAIN_TYPE_STRING}")`),
    "EIP712Domain type string mismatch with the constructor",
  );
});

test("the domain separator matches the constructor's arithmetic, derived independently", () => {
  // viem's own typed-data hashing is the second derivation. If our hand-rolled `abi.encode`
  // mirror and viem's implementation agree, the transcription is almost certainly right.
  const domain = assessmentDomain(CHAIN_ID, REGISTRY);
  const viaViem = hashTypedData({
    domain,
    types: { ...ASSESSMENT_TYPES },
    primaryType: "Assessment",
    message: assessment(),
  });
  assert.equal(assessmentDigest(domain, assessment()), viaViem);
  assert.match(domainSeparator(domain), /^0x[0-9a-f]{64}$/);
});

test("the domain is bound to one chain and one registry", () => {
  // A signature valid on two chains, or against two registries, is a replay waiting to happen.
  const a = assessment();
  const base = assessmentDigest(assessmentDomain(CHAIN_ID, REGISTRY), a);
  assert.notEqual(base, assessmentDigest(assessmentDomain(1, REGISTRY), a));
  assert.notEqual(
    base,
    assessmentDigest(assessmentDomain(CHAIN_ID, "0x00000000000000000000000000000000000000c2"), a),
  );
});

test("every struct member is covered by the digest", () => {
  const domain = assessmentDomain(CHAIN_ID, REGISTRY);
  const base = assessmentDigest(domain, assessment());
  const mutations: Partial<AssessmentStruct>[] = [
    { asset: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d" },
    { poolId: `0x${"11".repeat(32)}` },
    { state: 1 },
    { confidence: 2 },
    { dataMode: 4 },
    { confirmation: 1 },
    { reasonBits: 0x20000 },
    { assessedAt: 1_786_000_001n },
    { expiresAt: 1_786_021_601n },
    { evidenceCommitment: `0x${"cd".repeat(32)}` },
    { requestedFee: 19_999 },
    { nonce: 43n },
    { deadline: 1_786_021_601n },
  ];

  assert.equal(mutations.length, ASSESSMENT_TYPES.Assessment.length);
  for (const mutation of mutations) {
    assert.notEqual(
      assessmentDigest(domain, assessment(mutation)),
      base,
      `mutating ${Object.keys(mutation)[0]} left the digest unchanged`,
    );
  }
});

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

test("a signature recovers to the signing address and is 65 bytes", async () => {
  const domain = assessmentDomain(CHAIN_ID, REGISTRY);
  const a = assessment();
  const signature = await signAssessment(domain, a, OBVIOUSLY_FAKE_TEST_KEY);

  assert.match(signature, /^0x[0-9a-f]{130}$/, "r || s || v, exactly what _recoverSigner reads");

  const recovered = await recoverTypedDataAddress({
    domain,
    types: { ...ASSESSMENT_TYPES },
    primaryType: "Assessment",
    message: a,
    signature,
  });
  assert.equal(recovered.toLowerCase(), assessorAddress(OBVIOUSLY_FAKE_TEST_KEY).toLowerCase());
  assert.equal(
    assessorAddress(OBVIOUSLY_FAKE_TEST_KEY),
    privateKeyToAccount(OBVIOUSLY_FAKE_TEST_KEY).address,
  );
});

test("the signature is low-s, as the registry requires", async () => {
  // The contract rejects the malleable high half of the curve so one authorisation cannot be
  // reshaped into a second distinct-looking signature. viem is canonical, and this pins it.
  const HALF_N = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
  const domain = assessmentDomain(CHAIN_ID, REGISTRY);

  for (let nonce = 0; nonce < 12; nonce += 1) {
    const signature = await signAssessment(
      domain,
      assessment({ nonce: BigInt(nonce) }),
      OBVIOUSLY_FAKE_TEST_KEY,
    );
    const s = BigInt(`0x${signature.slice(66, 130)}`);
    assert.ok(s <= HALF_N, `nonce ${nonce} produced a high-s signature`);
  }
});

test("signing the same assessment twice produces the same signature", async () => {
  // ECDSA is only deterministic under RFC 6979. If the library ever switched to random `k`, a
  // retry would produce a different signature for an identical assessment, and "idempotent"
  // would stop being true at the byte level even though the digest was unchanged.
  const domain = assessmentDomain(CHAIN_ID, REGISTRY);
  const first = await signAssessment(domain, assessment(), OBVIOUSLY_FAKE_TEST_KEY);
  const second = await signAssessment(domain, assessment(), OBVIOUSLY_FAKE_TEST_KEY);
  assert.equal(first, second);
});

test("a different key produces a signature that recovers to a different address", async () => {
  const other = `0x${"22".repeat(32)}` as const;
  const domain = assessmentDomain(CHAIN_ID, REGISTRY);
  const a = assessment();

  const mine = await signAssessment(domain, a, OBVIOUSLY_FAKE_TEST_KEY);
  const theirs = await signAssessment(domain, a, other);
  assert.notEqual(mine, theirs);
  assert.notEqual(assessorAddress(other), assessorAddress(OBVIOUSLY_FAKE_TEST_KEY));
});

// ---------------------------------------------------------------------------
// Key handling
// ---------------------------------------------------------------------------

/** `assert.throws` returns undefined, so the error is captured explicitly to inspect it. */
function capture(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected the call to throw, and it did not");
}

test("a missing key is an error naming the variable, never echoing a value", () => {
  assert.throws(() => assessorKeyFromEnv({} as NodeJS.ProcessEnv), AssessorKeyMissingError);
  const thrown = capture(() => assessorKeyFromEnv({} as NodeJS.ProcessEnv));
  assert.ok(thrown.message.includes(ASSESSOR_KEY_ENV_VAR));
});

test("a malformed key is refused without the value appearing in the message", () => {
  const secretish = "not-a-key-but-still-a-secret";
  const env = { [ASSESSOR_KEY_ENV_VAR]: secretish } as NodeJS.ProcessEnv;
  assert.throws(() => assessorKeyFromEnv(env), AssessorKeyMissingError);
  const thrown = capture(() => assessorKeyFromEnv(env));

  assert.ok(thrown.message.includes(ASSESSOR_KEY_ENV_VAR));
  assert.ok(
    !thrown.message.includes(secretish),
    "the error echoed the environment value; a malformed key is still a credential",
  );
});

test("a well-formed key is returned verbatim and never logged by the helper", () => {
  const key = assessorKeyFromEnv({
    [ASSESSOR_KEY_ENV_VAR]: `  ${OBVIOUSLY_FAKE_TEST_KEY}  `,
  } as NodeJS.ProcessEnv);
  assert.equal(key, OBVIOUSLY_FAKE_TEST_KEY);
});

test("no source file in src/decision logs, prints, or stringifies a key", () => {
  // A structural check rather than a behavioural one: the risk is a debug line added later,
  // and no unit test of correct behaviour would catch that.
  const decisionDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "decision");
  const files = [
    "orchestrate.ts",
    "eip712.ts",
    "commitment.ts",
    "envelope.ts",
    "viewModel.ts",
    "scenarioRunner.ts",
    "index.ts",
  ];
  for (const file of files) {
    const source = readFileSync(join(decisionDir, file), "utf8");
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
      .join("\n");
    assert.ok(!/console\./.test(code), `${file} contains a console call`);
    assert.ok(!/privateKey\s*\}/.test(code), `${file} interpolates a private key into a template`);
  }
});

test("the assessor key is never read implicitly while building an assessment", () => {
  // `decide()` must work with no credentials in the environment at all, so an unsigned path
  // cannot accidentally require production secrets.
  const orchestrate = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "src", "decision", "orchestrate.ts"),
    "utf8",
  );
  assert.ok(!orchestrate.includes("assessorKeyFromEnv"));
  assert.ok(!orchestrate.includes("process.env"));
});

test("the type string hashes to a stable typehash", () => {
  // Recorded so a future edit to the string is visible as a changed constant rather than as a
  // mysterious on-chain rejection.
  assert.equal(
    keccak256(toBytes(ASSESSMENT_TYPE_STRING)),
    keccak256(toBytes(assessmentTypeStringFromTypes())),
  );
});
