/**
 * Versioned risk and evidence vocabulary — TypeScript mirror (task T1.1).
 *
 * `contracts/src/TinjauRiskTypes.sol` is the source of truth for every ordinal, reason bit,
 * and version string in this file. `test/riskTypesParity.test.ts` parses that Solidity file
 * and asserts this mirror matches it, so the two cannot drift apart silently. If you change
 * an ordinal here, change it there first.
 *
 * WHAT THIS IS NOT: the old `EventType`/`SeverityGrade` model describes what a filing said.
 * These types describe what protection state an asset is in. A severity of -100 is an input,
 * not a `PROTECT`.
 *
 * FAIL-SAFE DECODING: every decoder here rejects unknown input rather than coercing it.
 * A value this schema version does not recognise is an error, never a default — silently
 * mapping an unrecognised state onto `NORMAL` would hide a real disagreement between a
 * newer writer and an older reader.
 */

/** Must equal `TinjauRiskTypes.SCHEMA_VERSION` decoded from bytes32 ASCII. */
export const RISK_SCHEMA_VERSION = "tinjau.risk/1.0.0";

// ---------------------------------------------------------------------------
// Enums — string unions for the API surface, ordinals for the ABI boundary.
//
// The string unions below are exactly tracker §0.24's frontend view model. The `Unknown`
// sentinel is deliberately NOT part of them: it exists only on chain to make uninitialised
// storage legible, and a record carrying it is a record that was never written, so it must
// never reach a view model.
// ---------------------------------------------------------------------------

export type RiskState = "NORMAL" | "WATCH" | "PROTECT";
export type SourceClass = "OFFICIAL" | "NEWS" | "RUMOR";
export type DataMode = "LIVE" | "OBSERVED" | "REPLAY" | "SIMULATED";
export type ConfirmationStatus = "CONFIRMED" | "NOT_CONFIRMED" | "UNAVAILABLE" | "STALE";
export type ConfidenceBand = "LOW" | "MEDIUM" | "HIGH";

/** On-chain ordinals. `RiskState.Normal = 0` so an unwritten record grants no protection. */
export const RISK_STATE_ORDINALS: Readonly<Record<RiskState, number>> = Object.freeze({
  NORMAL: 0,
  WATCH: 1,
  PROTECT: 2,
});

/** `Unknown = 0` so uninitialised storage is never read as the most trusted class. */
export const SOURCE_CLASS_ORDINALS: Readonly<Record<SourceClass, number>> = Object.freeze({
  RUMOR: 1,
  NEWS: 2,
  OFFICIAL: 3,
});

export const DATA_MODE_ORDINALS: Readonly<Record<DataMode, number>> = Object.freeze({
  LIVE: 1,
  OBSERVED: 2,
  REPLAY: 3,
  SIMULATED: 4,
});

/** `CONFIRMED` is the only value that may satisfy a promotion gate, by exact equality. */
export const CONFIRMATION_STATUS_ORDINALS: Readonly<Record<ConfirmationStatus, number>> =
  Object.freeze({
    NOT_CONFIRMED: 1,
    UNAVAILABLE: 2,
    STALE: 3,
    CONFIRMED: 4,
  });

export const CONFIDENCE_BAND_ORDINALS: Readonly<Record<ConfidenceBand, number>> = Object.freeze({
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
});

// ---------------------------------------------------------------------------
// Reason codes — the documented ABI mapping required by tracker §0.12.
//
// On chain these are a uint32 bitmask. Here they are stable string codes, because that is
// what §0.24's `reasonCodes: string[]` promises an API consumer. Bit positions are
// permanent: to retire a reason, stop setting it — never reuse the position.
// ---------------------------------------------------------------------------

export const REASON_BITS = Object.freeze({
  // Why promotion was capped or refused (bits 0-7)
  RUMOR_ONLY: 1 << 0,
  SINGLE_SOURCE: 1 << 1,
  DUPLICATE_SYNDICATION: 1 << 2,
  CONTRADICTED: 1 << 3,
  STALE_EVIDENCE: 1 << 4,
  NO_OFFICIAL_CONFIRMATION: 1 << 5,
  UNSUPPORTED_ASSET: 1 << 6,
  AMBIGUOUS_ENTITY: 1 << 7,
  // Three different refusals, and the difference matters to whoever debugs one:
  // AMBIGUOUS_ENTITY = "which of this company's tokens?", UNSUPPORTED_ASSET = "this token has
  // no verified pool", UNKNOWN_COMPANY = "never heard of this company". Collapsing them sends
  // an operator looking for a pool that was never the problem. (Bit 20; see the Solidity note.)
  UNKNOWN_COMPANY: 1 << 20,

  // Market-confirmation outcomes (bits 8-15)
  MARKET_CONFIRMED: 1 << 8,
  MARKET_NOT_CONFIRMED: 1 << 9,
  MARKET_DATA_STALE: 1 << 10,
  MARKET_DATA_UNAVAILABLE: 1 << 11,
  ANTI_WICK_FAILED: 1 << 12,
  THIN_EXIT_DEPTH: 1 << 13,
  REFERENCE_MARKET_CLOSED: 1 << 14,
  // Distinct from MARKET_DATA_UNAVAILABLE ("could not look"): this is "we looked, there is
  // data, and there is too little of it to conclude anything". A three-trade window and an
  // empty one are different findings. (Bit 21.)
  INSUFFICIENT_SAMPLE: 1 << 21,
  // Distinct from ANTI_WICK_FAILED, which is a positive finding: we watched the hold interval
  // and the move retraced, so it was a spike. This is "the hold interval was unreachable or too
  // sparse to judge", so persistence was never observed either way. Emitting ANTI_WICK_FAILED
  // here would assert a retracement nobody saw. (Bit 22.)
  PERSISTENCE_UNOBSERVED: 1 << 22,

  // What authorised promotion, and what disqualified the event itself (bits 16-23)
  OFFICIAL_FILING: 1 << 16,
  TWO_INDEPENDENT_SOURCES: 1 << 17,
  BONDED_EVIDENCE_PASSED: 1 << 18,
  // Official does not mean material. A routine insider Form 4 is a real SEC filing that
  // reports no corporate action; promoting on one would raise LP fees for nothing.
  NON_MATERIAL_EVENT: 1 << 19,

  // Lifecycle (bits 24-31)
  EXPIRED: 1 << 24,
  DECAYED_TO_BASELINE: 1 << 25,
  COOLDOWN_ACTIVE: 1 << 26,
  PAUSED: 1 << 27,
  ACTION_FAILED: 1 << 28,
} as const);

export type ReasonCode = keyof typeof REASON_BITS;

/** Union of every defined bit. Anything outside this is from a newer schema. */
export const REASON_ALL_DEFINED: number = Object.values(REASON_BITS).reduce((a, b) => a | b, 0);

// ---------------------------------------------------------------------------
// Fail-safe decoders
// ---------------------------------------------------------------------------

/** Thrown whenever input cannot be decoded. Never swallowed into a default. */
export class RiskSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RiskSchemaError";
  }
}

function invert<T extends string>(map: Readonly<Record<T, number>>): Map<number, T> {
  return new Map((Object.entries(map) as [T, number][]).map(([k, v]) => [v, k]));
}

const RISK_STATE_BY_ORDINAL = invert(RISK_STATE_ORDINALS);
const SOURCE_CLASS_BY_ORDINAL = invert(SOURCE_CLASS_ORDINALS);
const DATA_MODE_BY_ORDINAL = invert(DATA_MODE_ORDINALS);
const CONFIRMATION_STATUS_BY_ORDINAL = invert(CONFIRMATION_STATUS_ORDINALS);
const CONFIDENCE_BAND_BY_ORDINAL = invert(CONFIDENCE_BAND_ORDINALS);

function decodeOrdinal<T extends string>(
  byOrdinal: Map<number, T>,
  ordinal: number,
  typeName: string,
): T {
  const decoded = byOrdinal.get(ordinal);
  if (decoded === undefined) {
    // Ordinal 0 is the on-chain `Unknown` sentinel for every enum except RiskState. Say so
    // explicitly, because "never written" is a far more useful diagnosis than "bad value".
    const hint =
      ordinal === 0
        ? " — ordinal 0 is the Unknown sentinel, which means this record was never written"
        : "";
    throw new RiskSchemaError(`Unknown ${typeName} ordinal ${ordinal}${hint}`);
  }
  return decoded;
}

export const decodeRiskState = (o: number): RiskState =>
  decodeOrdinal(RISK_STATE_BY_ORDINAL, o, "RiskState");
export const decodeSourceClass = (o: number): SourceClass =>
  decodeOrdinal(SOURCE_CLASS_BY_ORDINAL, o, "SourceClass");
export const decodeDataMode = (o: number): DataMode =>
  decodeOrdinal(DATA_MODE_BY_ORDINAL, o, "DataMode");
export const decodeConfirmationStatus = (o: number): ConfirmationStatus =>
  decodeOrdinal(CONFIRMATION_STATUS_BY_ORDINAL, o, "ConfirmationStatus");
export const decodeConfidenceBand = (o: number): ConfidenceBand =>
  decodeOrdinal(CONFIDENCE_BAND_BY_ORDINAL, o, "ConfidenceBand");

/**
 * Decodes a reason bitmask into stable string codes.
 *
 * Refuses any bit this version does not define. A newer writer might set a bit meaning
 * "evidence was retracted"; silently dropping it would make the record read as though the
 * retraction never happened.
 */
export function decodeReasonCodes(bits: number): ReasonCode[] {
  if (!Number.isInteger(bits) || bits < 0 || bits > 0xffffffff) {
    throw new RiskSchemaError(`Reason bitmask must be a uint32, received ${bits}`);
  }
  const undefinedBits = bits & ~REASON_ALL_DEFINED;
  if (undefinedBits !== 0) {
    throw new RiskSchemaError(
      `Reason bitmask contains bits this schema (${RISK_SCHEMA_VERSION}) does not define: ` +
        `0x${(undefinedBits >>> 0).toString(16)}`,
    );
  }
  return (Object.keys(REASON_BITS) as ReasonCode[]).filter((code) => (bits & REASON_BITS[code]) !== 0);
}

/** Encodes stable string codes back into the on-chain bitmask. */
export function encodeReasonCodes(codes: readonly ReasonCode[]): number {
  let bits = 0;
  for (const code of codes) {
    const bit = REASON_BITS[code];
    if (bit === undefined) throw new RiskSchemaError(`Unknown reason code "${code}"`);
    bits |= bit;
  }
  return bits >>> 0;
}

// ---------------------------------------------------------------------------
// The promotion predicate — mirror of `TinjauRiskTypes.mayReachProtect`
// ---------------------------------------------------------------------------

export interface ProtectEligibilityInput {
  /** Most trusted source class present in the evidence set. */
  highestClass: SourceClass;
  /** Count of genuinely independent origins, with syndications already collapsed to one. */
  independentSources: number;
  confirmation: ConfirmationStatus;
  /** Only meaningful when `highestClass` is `OFFICIAL`. */
  officialEvidencePassed: boolean;
}

/**
 * The single authoritative predicate for "may this evidence reach PROTECT?".
 *
 * Kept byte-for-byte equivalent to the Solidity version and cross-checked by
 * `test/riskPromotionParity.test.ts`. Every caller that authorises a fee change must funnel
 * through this rather than re-deriving the rule, so there is exactly one place to audit.
 */
export function mayReachProtect(input: ProtectEligibilityInput): boolean {
  const { highestClass, independentSources, confirmation, officialEvidencePassed } = input;

  // Invariant 1: rumour-only can never reach PROTECT. Checked first, unconditionally, and
  // deliberately before any market argument can be considered.
  if (highestClass === "RUMOR") return false;

  if (highestClass === "NEWS") {
    // Invariant 2: only exact CONFIRMED counts. STALE/UNAVAILABLE/NOT_CONFIRMED fail closed.
    if (confirmation !== "CONFIRMED") return false;
    // Invariant 3: one news origin is never enough, however many outlets reprinted it.
    return independentSources >= 2;
  }

  if (highestClass === "OFFICIAL") {
    if (!officialEvidencePassed) return false;
    return confirmation === "CONFIRMED";
  }

  return false;
}

/** Machine-readable form of the §0.7 invariant "rumour-only stays at or below WATCH". */
export function isRumorOnly(highestClass: SourceClass): boolean {
  return highestClass === "RUMOR";
}
