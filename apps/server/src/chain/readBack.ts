/**
 * Reads a posted event back from the live registry and diffs it, field-by-field, against
 * what was intended to be posted (task P1.8 read-back verification).
 *
 * Deliberately re-decodes `extraDataURI`'s base64 payload and re-hashes it to confirm
 * `extraDataHash` matches independently of whatever computed it at post time — this is the
 * one check that would catch a bug in the hash computation itself, not just in the ABI
 * encoding of an already-wrong value.
 */

import { createHash } from "node:crypto";
import { getPublicClient, getRegistryAddress, withRpcRetry } from "./client.js";
import { EVENT_STATE_REGISTRY_ABI } from "./registryAbi.js";
import type { PostEventArgs } from "./mapEventToRegistry.js";

export interface FieldCheck {
  field: string;
  expected: unknown;
  actual: unknown;
  pass: boolean;
}

export interface ReadBackResult {
  eventId: bigint;
  checks: FieldCheck[];
  allPass: boolean;
}

function eq(a: unknown, b: unknown): boolean {
  if (typeof a === "bigint" || typeof b === "bigint") {
    return BigInt(a as bigint | number).toString() === BigInt(b as bigint | number).toString();
  }
  if (typeof a === "string" && typeof b === "string") {
    // Hex strings (addresses, bytes32 hashes) compare case-insensitively; everything else
    // (labels, currency codes, URLs) compares exactly — a case mismatch there is real.
    const bothHex = a.startsWith("0x") && b.startsWith("0x");
    return bothHex ? a.toLowerCase() === b.toLowerCase() : a === b;
  }
  return a === b;
}

function check(field: string, expected: unknown, actual: unknown): FieldCheck {
  return { field, expected, actual, pass: eq(expected, actual) };
}

/**
 * Verifies a posted event by reading it back two ways (`getEvent(eventId)` and
 * `getLatestEvent(token)`) and diffing every bonded field against `expected`, plus
 * independently re-verifying `extraDataHash` against the base64-decoded `extraDataURI`.
 */
export async function readEventBack(eventId: bigint, expected: PostEventArgs): Promise<ReadBackResult> {
  const publicClient = getPublicClient();
  const registryAddress = getRegistryAddress();

  const event = await withRpcRetry(() =>
    publicClient.readContract({
      address: registryAddress,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "getEvent",
      args: [eventId],
    }),
  );

  const latest = await withRpcRetry(() =>
    publicClient.readContract({
      address: registryAddress,
      abi: EVENT_STATE_REGISTRY_ABI,
      functionName: "getLatestEvent",
      args: [expected.token],
    }),
  );

  const checks: FieldCheck[] = [
    check("token", expected.token, event.token),
    check("eventType", expected.eventType, event.eventType),
    check("eventTypeLabel", expected.eventTypeLabel, event.eventTypeLabel),
    check("facts.effectiveDate", expected.facts.effectiveDate, event.facts.effectiveDate),
    check("facts.declaredAmount", expected.facts.declaredAmount, event.facts.declaredAmount),
    check("facts.affectedToken", expected.facts.affectedToken, event.facts.affectedToken),
    check("facts.currency", expected.facts.currency, event.facts.currency),
    check("facts.extraDataURI", expected.facts.extraDataURI, event.facts.extraDataURI),
    check("facts.extraDataHash", expected.facts.extraDataHash, event.facts.extraDataHash),
    check("agreement.eventTypeAgreement", expected.agreement.eventTypeAgreement, event.agreement.eventTypeAgreement),
    check(
      "agreement.effectiveDateAgreement",
      expected.agreement.effectiveDateAgreement,
      event.agreement.effectiveDateAgreement,
    ),
    check(
      "agreement.declaredAmountAgreement",
      expected.agreement.declaredAmountAgreement,
      event.agreement.declaredAmountAgreement,
    ),
    check(
      "agreement.affectedTokenAgreement",
      expected.agreement.affectedTokenAgreement,
      event.agreement.affectedTokenAgreement,
    ),
    check(
      "agreement.nextEventDateAgreement",
      expected.agreement.nextEventDateAgreement,
      event.agreement.nextEventDateAgreement,
    ),
    check("severity.severity", expected.severity.severity, event.severity.severity),
    check("severity.confidence", expected.severity.confidence, event.severity.confidence),
    check("sourceUrl", expected.sourceUrl, event.sourceUrl),
    check("sourceContentHash", expected.sourceContentHash, event.sourceContentHash),
    check("nextEventDate", expected.nextEventDate, event.nextEventDate),
    // getLatestEvent(token) should return the SAME event we just posted for this token —
    // compared via sourceContentHash + timestamp since EventState has no direct eventId field.
    check("getLatestEvent(token).sourceContentHash matches getEvent(eventId)", event.sourceContentHash, latest.sourceContentHash),
    check("getLatestEvent(token).timestamp matches getEvent(eventId)", event.timestamp, latest.timestamp),
  ];

  // Independent re-verification: base64-decode extraDataURI (if non-empty) and re-hash.
  if (event.facts.extraDataURI && event.facts.extraDataURI.length > 0) {
    const prefix = "data:application/json;base64,";
    if (event.facts.extraDataURI.startsWith(prefix)) {
      const b64 = event.facts.extraDataURI.slice(prefix.length);
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const rehash = `0x${createHash("sha256").update(decoded, "utf8").digest("hex")}`;
      checks.push(check("extraDataHash re-verified from on-chain extraDataURI", event.facts.extraDataHash, rehash));
    } else {
      checks.push({
        field: "extraDataURI format",
        expected: prefix,
        actual: event.facts.extraDataURI.slice(0, prefix.length),
        pass: false,
      });
    }
  }

  const allPass = checks.every((c) => c.pass);
  return { eventId, checks, allPass };
}
