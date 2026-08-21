/**
 * Role keys for a testnet deployment of the Tinjau enforcement stack.
 *
 * ---------------------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES, AND ITS LIMIT.
 *
 * The registry separates three roles: the ASSESSOR signs assessments, the POSTER pays gas to
 * relay them, and the GUARDIAN pauses and vets assets. That separation is the point — it is
 * what makes "gas payment and authority are separated" a property rather than a sentence.
 *
 * This environment has two funded testnet wallets and no assessor key. Collapsing every role
 * onto one wallet would deploy a stack that cannot demonstrate the separation at all.
 *
 * The assessor needs NO GAS: it only signs EIP-712 messages off chain, and the poster relays
 * them. So its key can be derived deterministically from a credential that already exists,
 * rather than being a new secret somebody has to store. The derivation is domain-separated and
 * reproducible, so any later run against the same deployment recovers the same signer.
 *
 * WHAT THIS IS NOT. A derived key shares the fate of the key it came from. That is acceptable
 * for a zero-value testnet whose wallets are already in one trust domain, and it is NOT
 * acceptable for production: a real assessor key must be generated independently and held
 * separately from the wallet that pays gas, precisely so that compromising the hot relayer does
 * not hand over signing authority. Recorded as a limitation, not softened as a design.
 *
 * No key is printed, returned in a describe/manifest surface, or written to a file.
 * ---------------------------------------------------------------------------------------
 */

import { keccak256, concatHex, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** Bumping this rotates every derived role key. Deployments pin the version they were made at. */
export const ROLE_KEY_DERIVATION_VERSION = "tinjau.rolekey/1.0.0";

export type TinjauRole = "assessor";

/**
 * Derives a role key from a base key.
 *
 * `keccak256(baseKey || version || role)`. Domain-separated on both the version and the role, so
 * the assessor key cannot collide with a future role's, and so a version bump rotates all of
 * them at once.
 */
export function deriveRoleKey(baseKey: `0x${string}`, role: TinjauRole): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{64}$/.test(baseKey)) {
    // Shape complaint only. Never echo the value or its length.
    throw new Error("base key must be a 0x-prefixed 32-byte hex string");
  }
  return keccak256(concatHex([baseKey, stringToHex(`${ROLE_KEY_DERIVATION_VERSION}:${role}`)]));
}

/**
 * The address a derived role key signs as.
 *
 * This is the only value that may leave this module — it is what goes into the registry's
 * constructor and into the deployment manifest.
 */
export function deriveRoleAddress(baseKey: `0x${string}`, role: TinjauRole): `0x${string}` {
  return privateKeyToAccount(deriveRoleKey(baseKey, role)).address;
}
