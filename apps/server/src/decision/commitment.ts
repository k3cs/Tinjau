/**
 * The evidence commitment (task T4.1).
 *
 * Tracker §0.12 requires the on-chain record to carry an "evidence commitment" a third party
 * can check. A commitment nobody can recompute is decoration, so this file defines the
 * preimage BYTE-EXACTLY and commits only to fields the published record itself carries.
 *
 * ===========================================================================================
 * PREIMAGE DEFINITION — `tinjau.evidence-commitment/1.0.0`
 * ===========================================================================================
 *
 * `evidenceCommitment = keccak256(utf8Bytes(preimage))`, where `preimage` is the concatenation
 * of a four-line header and one line per evidence claim:
 *
 *   HEADER (four lines, each terminated by LF = 0x0A):
 *     line 1: the literal string `tinjau.evidence-commitment/1.0.0`
 *     line 2: `assetAddress`, lowercased, `0x`-prefixed
 *     line 3: `poolIdOrAddress`, lowercased
 *     line 4: the number of claims, in base-10 ASCII, no padding, no separators
 *
 *   THEN, one RECORD per claim, in ascending order of `claimId` compared as UTF-8 BYTES
 *   (not as UTF-16 code units, and not with any locale collation). Each record is the
 *   following sixteen fields joined by US = 0x1F, terminated by LF = 0x0A. The field order is
 *   exactly §0.24's declaration order for `EvidenceClaimView`:
 *
 *      1 claimId              9 tokenSymbol
 *      2 sourceClass         10 tokenAddress   (lowercased)
 *      3 dataMode            11 eventType
 *      4 sourceUrl           12 claimTextOrPointer
 *      5 sourceId            13 independenceGroup
 *      6 publisherOrAuthor   14 relation
 *      7 publishedAt         15 officialConfirmation  (`true` / `false`)
 *      8 company             16 expiresAt
 *
 *   ENCODING RULES:
 *     - `null` is encoded as the EMPTY STRING. (`sourceUrl`, `publisherOrAuthor`, `expiresAt`
 *       are the only nullable fields.)
 *     - booleans are the lowercase ASCII words `true` and `false`.
 *     - addresses are lowercased; every other string is committed verbatim, including case.
 *     - timestamps are committed exactly as they appear in the published record.
 *
 *   REJECTIONS (this function throws rather than producing a hash):
 *     - any field value containing US (0x1F) or LF (0x0A). Without this the encoding would not
 *       be injective and two different evidence sets could share a commitment — which is the
 *       one property a commitment has to have.
 *     - a duplicated `claimId`, for the same reason: the sort would be ambiguous.
 *
 * A third party recomputes this from the published `RiskRecordView` JSON alone. No access to
 * this repository, this code, or any internal identifier is required.
 * ===========================================================================================
 *
 * WHAT THE COMMITMENT DOES NOT DO. It commits to the evidence the record PUBLISHED. It is not
 * proof the evidence is true, that the source said what the pointer claims, or that nothing was
 * omitted. `sourceContentSha256` on the frozen fixtures is the byte-level check on individual
 * OFFICIAL documents; this is the set-level check that the record was not edited afterwards.
 */

import { keccak256, toBytes } from "viem";
import type { EvidenceClaimView } from "./viewModel.js";

export const EVIDENCE_COMMITMENT_VERSION = "tinjau.evidence-commitment/1.0.0";

const FIELD_SEPARATOR = "\u001f"; // US, 0x1F
const RECORD_SEPARATOR = "\n"; // LF, 0x0A

export class EvidenceCommitmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceCommitmentError";
  }
}

function field(value: string | null, claimId: string, name: string): string {
  const text = value ?? "";
  if (text.includes(FIELD_SEPARATOR) || text.includes(RECORD_SEPARATOR)) {
    throw new EvidenceCommitmentError(
      `claim "${claimId}" field "${name}" contains a separator byte (0x1F or 0x0A); the ` +
        `commitment encoding would not be injective, so the value is refused rather than escaped`,
    );
  }
  return text;
}

/** Ascending order by UTF-8 bytes of `claimId`. Locale collation is deliberately not used. */
function byClaimIdUtf8(a: EvidenceClaimView, b: EvidenceClaimView): number {
  return Buffer.compare(Buffer.from(a.claimId, "utf8"), Buffer.from(b.claimId, "utf8"));
}

/** The exact string that gets hashed. Exposed so a test and a doc can show it verbatim. */
export function evidenceCommitmentPreimage(
  assetAddress: string,
  poolIdOrAddress: string,
  claims: readonly EvidenceClaimView[],
): string {
  const seen = new Set<string>();
  for (const claim of claims) {
    if (seen.has(claim.claimId)) {
      throw new EvidenceCommitmentError(
        `duplicate claimId "${claim.claimId}"; the record order would be ambiguous`,
      );
    }
    seen.add(claim.claimId);
  }

  const header = [
    EVIDENCE_COMMITMENT_VERSION,
    assetAddress.toLowerCase(),
    poolIdOrAddress.toLowerCase(),
    String(claims.length),
  ].join(RECORD_SEPARATOR);

  const records = [...claims].sort(byClaimIdUtf8).map((c) =>
    [
      field(c.claimId, c.claimId, "claimId"),
      field(c.sourceClass, c.claimId, "sourceClass"),
      field(c.dataMode, c.claimId, "dataMode"),
      field(c.sourceUrl, c.claimId, "sourceUrl"),
      field(c.sourceId, c.claimId, "sourceId"),
      field(c.publisherOrAuthor, c.claimId, "publisherOrAuthor"),
      field(c.publishedAt, c.claimId, "publishedAt"),
      field(c.company, c.claimId, "company"),
      field(c.tokenSymbol, c.claimId, "tokenSymbol"),
      field(c.tokenAddress.toLowerCase(), c.claimId, "tokenAddress"),
      field(c.eventType, c.claimId, "eventType"),
      field(c.claimTextOrPointer, c.claimId, "claimTextOrPointer"),
      field(c.independenceGroup, c.claimId, "independenceGroup"),
      field(c.relation, c.claimId, "relation"),
      c.officialConfirmation ? "true" : "false",
      field(c.expiresAt, c.claimId, "expiresAt"),
    ].join(FIELD_SEPARATOR),
  );

  // Header line 4 is terminated by the LF that opens the record block; every record is
  // terminated by its own LF, including the last. An empty set is therefore header + LF, which
  // still hashes to a non-zero value — the registry rejects a zero commitment outright.
  return `${header}${RECORD_SEPARATOR}${records.map((r) => r + RECORD_SEPARATOR).join("")}`;
}

export function evidenceCommitment(
  assetAddress: string,
  poolIdOrAddress: string,
  claims: readonly EvidenceClaimView[],
): `0x${string}` {
  return keccak256(toBytes(evidenceCommitmentPreimage(assetAddress, poolIdOrAddress, claims)));
}
