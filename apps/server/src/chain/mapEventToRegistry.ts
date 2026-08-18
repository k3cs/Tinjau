/**
 * Maps a P1.2-P1.5 `PipelineResult` (off-chain poll → strip → 3x parse → diff → grade) to
 * the exact argument shape `EventStateRegistry.postEvent()` expects (task P1.8).
 *
 * Pure function, no I/O, no chain imports — fully unit-testable (see
 * test/mapEventToRegistry.test.ts). `bondAmount` is deliberately NOT produced here; that's
 * a runtime/operational decision made by the caller (src/chain/postEvent.ts), not a fact
 * derivable from the parsed filing.
 *
 * --- Gap 1: array vs scalar fields ---
 * `BondedFilingFields` carries `effectiveDates: string[]` and `declaredAmounts: {label,
 * value, unit}[]` (the model may report several of each), but `FactualFields` on-chain has
 * only ONE `effectiveDate` (uint256 timestamp) and ONE `declaredAmount` (int256, fixed-
 * point). We post the *primary* scalar into those fields via modal-value selection (see
 * `selectModalDate` / `selectModalDeclaredAmount` below) AND commit to the FULL extraction
 * (all 3 parses' full arrays) via `extraDataHash`, with the payload inlined as a
 * self-verifying `data:application/json;base64,...` URI in `extraDataURI` — this project
 * has no external pinning/hosting service, and a data: URI has no dead-link risk.
 *
 * `declaredAmount` fixed-point convention: the model emits floats (e.g. 0.08 USD/share),
 * but `declaredAmount` is `int256`. We scale by `DECLARED_AMOUNT_SCALE` (1_000_000, same
 * 6-decimal convention as USD₮0 elsewhere in this repo) and round to the nearest integer
 * base unit. Sign is preserved exactly as reported by the filing — no synthetic negation.
 * Directional meaning belongs to the separate UNBONDED severity grade; inventing a sign
 * rule here would itself be an undocumented bonded claim the model never made.
 *
 * --- Gap 2: event-type mapping ---
 * See `mapEventType()` below for the full off-chain-EVENT_TYPES x filing.form -> on-chain
 * `EventType` table. Two hard rules enforced by construction:
 *   1. The UNBONDED severity `direction` is NEVER consulted to pick Form4 buy vs sell —
 *      only the BONDED `declaredAmounts[].label` text is used. Using unbonded judgment for
 *      a bonded field would collapse the bonded/unbonded separation P1.5 and the contract
 *      exist to enforce.
 *   2. Nothing is ever force-mapped to `Form8K_Delisting` (7) — the off-chain vocabulary
 *      has no delisting category, so this enum value is currently unreachable from this
 *      mapper. That's a known, intentional gap, not a bug.
 *
 * --- Gap 3: token address ---
 * See `src/chain/tokenAddresses.ts` for the mainnet-label-vs-testnet-pool-address split
 * and why it exists.
 *
 * --- SeverityGrade mapping ---
 * Magnitude: NORMAL -> 20, ELEVATED -> 55, GRAVE -> 90. Sign: negative -> "-", positive ->
 * "+", unclear -> severity forced to 0 regardless of magnitude (an "unclear" direction call
 * should not read as confidently neutral-but-nonzero on-chain).
 * `confidence` (0-100) is DERIVED, not self-reported — the model never produces a
 * confidence number, and `AfterhoursFeePolicy` never reads it (verified: only
 * `severity.severity` is consumed on-chain), but fabricating an unlabeled number would be
 * worse than deriving one transparently. Formula: `round(100 * minCoreAgreement / 3)`,
 * where `minCoreAgreement` is the same "weakest of the 4 core bonded fields" quantity
 * `AfterhoursFeePolicy.concernTier()` uses (eventType, effectiveDate, declaredAmount,
 * affectedToken agreement counts) — reusing that exact definition keeps this confidence
 * number consistent with what the on-chain fee policy itself treats as "how sure are we."
 */

import { createHash } from "node:crypto";
import { resolveTokenAddress } from "./tokenAddresses.js";
import { EVENT_TYPES, type BondedFilingFields } from "../llm/schema.js";
import type { PipelineResult } from "../pipeline.js";
import type { ParseAttemptResult } from "../llm/parseFiling.js";
import type { SeverityGrade } from "../llm/schema.js";

/** Fixed-point scale for `FactualFields.declaredAmount` — matches USD₮0's 6 decimals. */
export const DECLARED_AMOUNT_SCALE = 1_000_000;

/** Guard on the inlined `data:` URI payload size — see `buildExtraData()`. */
export const EXTRA_DATA_MAX_BYTES = 4096;

// ---------------------------------------------------------------------
// On-chain EventType enum mirror (contracts/src/EventStateRegistry.sol)
// ---------------------------------------------------------------------

export const ON_CHAIN_EVENT_TYPE = {
  Unknown: 0,
  Form8K_Material: 1,
  Form8K_Earnings: 2,
  Form8K_Restatement: 3,
  Form8K_ExecutiveChange: 4,
  Form8K_Bankruptcy: 5,
  Form8K_MAndA: 6,
  Form8K_Delisting: 7, // intentionally unreachable from this mapper — see module doc.
  Form4_InsiderBuy: 8,
  Form4_InsiderSell: 9,
} as const;

const SELL_KEYWORDS = /dispos|sold|sale|sell/i;
// "acqui" (not "acquir") so this also matches "Acquisition" (Form 4's own vocabulary),
// not just "acquire"/"acquiring"/"acquired".
const BUY_KEYWORDS = /acqui|purchas|bought|buy/i;

/**
 * Off-chain `EVENT_TYPES` (+ `filing.form` disambiguator for `insider_transaction`) -> the
 * on-chain `EventType` uint8. `declaredAmountLabels` is the union of every
 * `declaredAmounts[].label` seen across the successful parses — used ONLY to disambiguate
 * `insider_transaction` (a BONDED signal), never the unbonded severity direction.
 */
export function mapEventType(offChainEventType: string, form: string, declaredAmountLabels: string[]): number {
  if (offChainEventType === "insider_transaction") {
    if (form !== "4") {
      // insider_transaction reported via an 8-K (rare, but possible) — treat as a general
      // material event rather than guessing buy/sell from a form that isn't a Form 4.
      return ON_CHAIN_EVENT_TYPE.Form8K_Material;
    }
    const joined = declaredAmountLabels.join(" | ");
    if (SELL_KEYWORDS.test(joined)) return ON_CHAIN_EVENT_TYPE.Form4_InsiderSell;
    if (BUY_KEYWORDS.test(joined)) return ON_CHAIN_EVENT_TYPE.Form4_InsiderBuy;
    return ON_CHAIN_EVENT_TYPE.Unknown;
  }

  switch (offChainEventType) {
    case "bankruptcy_or_restructuring":
      return ON_CHAIN_EVENT_TYPE.Form8K_Bankruptcy;
    case "restatement":
      return ON_CHAIN_EVENT_TYPE.Form8K_Restatement;
    case "acquisition_or_divestiture":
      return ON_CHAIN_EVENT_TYPE.Form8K_MAndA;
    case "executive_change":
      return ON_CHAIN_EVENT_TYPE.Form8K_ExecutiveChange;
    case "earnings_announcement":
      return ON_CHAIN_EVENT_TYPE.Form8K_Earnings;
    case "material_agreement":
    case "dividend_declaration":
    case "dividend_payment":
    case "stock_split":
    case "capital_raise":
      return ON_CHAIN_EVENT_TYPE.Form8K_Material;
    case "other":
      return ON_CHAIN_EVENT_TYPE.Unknown;
    default:
      return ON_CHAIN_EVENT_TYPE.Unknown;
  }
}

// ---------------------------------------------------------------------
// Modal-value selection + agreement counting
// ---------------------------------------------------------------------

interface ModalResult<T> {
  /** The winning value, or undefined if no attempt produced anything. */
  value: T | undefined;
  /** How many of the (up to) 3 total attempts agree on `value` (0-3). */
  agreement: number;
}

function successfulAttempts(attempts: ParseAttemptResult[]): Extract<ParseAttemptResult, { status: "ok" }>[] {
  return attempts.filter((a): a is Extract<ParseAttemptResult, { status: "ok" }> => a.status === "ok");
}

/** Modal selection over a scalar field present on every successful attempt's data. */
function selectModalScalar<T>(attempts: ParseAttemptResult[], pick: (data: BondedFilingFields) => T): ModalResult<T> {
  const counts = new Map<string, { value: T; count: number }>();
  for (const a of successfulAttempts(attempts)) {
    const value = pick(a.data);
    const key = JSON.stringify(value);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return { value: best?.value, agreement: best?.count ?? 0 };
}

/**
 * Modal selection for a per-attempt DERIVED single value out of a per-attempt array field
 * (e.g. "the earliest effectiveDate this attempt reported"). `derive` maps one attempt's
 * raw array to zero-or-one candidate values; attempts that derive nothing don't vote.
 * Ties are broken by whichever candidate value is lexically/numerically smallest via
 * `tieBreak`, so the result is deterministic regardless of Map iteration order.
 */
function selectModalDerived<T>(
  attempts: ParseAttemptResult[],
  derive: (data: BondedFilingFields) => T | undefined,
  tieBreak: (a: T, b: T) => number,
): ModalResult<T> {
  const counts = new Map<string, { value: T; count: number }>();
  for (const a of successfulAttempts(attempts)) {
    const value = derive(a.data);
    if (value === undefined) continue;
    const key = JSON.stringify(value);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count || (entry.count === best.count && tieBreak(entry.value, best.value) < 0)) {
      best = entry;
    }
  }
  return { value: best?.value, agreement: best?.count ?? 0 };
}

/** Earliest ISO date (YYYY-MM-DD) in a (possibly empty) list, or undefined. */
function earliestDate(dates: string[]): string | undefined {
  if (dates.length === 0) return undefined;
  return [...dates].sort()[0];
}

/** Parses "YYYY-MM-DD" as a UTC-midnight unix timestamp (seconds). Throws on malformed input. */
export function isoDateToUnixSeconds(isoDate: string): bigint {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`isoDateToUnixSeconds: expected "YYYY-MM-DD", got "${isoDate}"`);
  }
  const ms = Date.parse(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(ms)) {
    throw new Error(`isoDateToUnixSeconds: unparseable date "${isoDate}"`);
  }
  return BigInt(Math.floor(ms / 1000));
}

/**
 * Scales a declared-amount float to `declaredAmount`'s fixed-point base units (int256).
 * Rounds to nearest base unit; sign preserved. Rejects non-finite input (NaN/Infinity) —
 * silently coercing those to 0 would fabricate a value the model never reported.
 */
export function scaleDeclaredAmount(value: number, scale: number = DECLARED_AMOUNT_SCALE): bigint {
  if (!Number.isFinite(value)) {
    throw new Error(`scaleDeclaredAmount: non-finite value ${value}`);
  }
  return BigInt(Math.round(value * scale));
}

// ---------------------------------------------------------------------
// SeverityGrade mapping
// ---------------------------------------------------------------------

export interface MappedSeverity {
  severity: number; // int8, -100..100 by construction of this mapper (clamped downstream by the policy anyway)
  confidence: number; // uint8, 0-100, derived
}

const SEVERITY_MAGNITUDE: Record<SeverityGrade["severity"], number> = {
  NORMAL: 20,
  ELEVATED: 55,
  GRAVE: 90,
};

export function mapSeverity(grade: SeverityGrade, minCoreAgreement: number): MappedSeverity {
  const magnitude = SEVERITY_MAGNITUDE[grade.severity];
  let severity: number;
  if (grade.direction === "unclear") {
    severity = 0;
  } else if (grade.direction === "positive") {
    severity = magnitude;
  } else {
    severity = -magnitude;
  }
  const confidence = Math.round((100 * minCoreAgreement) / 3);
  return { severity, confidence };
}

// ---------------------------------------------------------------------
// extraData JSON builder
// ---------------------------------------------------------------------

/** Recursively sorts object keys so the serialized JSON (and its hash) is reproducible. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) sorted[key] = sortKeysDeep(obj[key]);
    return sorted;
  }
  return value;
}

/** Stable JSON.stringify: sorted keys at every level, 2-space indent. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2);
}

export interface ExtraDataPayload {
  schemaVersion: "afterhours-extradata-1";
  accessionNumber: string;
  form: string;
  ticker: string;
  tokenSymbol: string;
  acceptanceDateTime: string;
  declaredAmountScale: number;
  parses: Array<
    | {
        attempt: number;
        status: "ok";
        eventType: string;
        affectedToken: string;
        effectiveDates: string[];
        declaredAmounts: BondedFilingFields["declaredAmounts"];
        futureAnnouncedDates: BondedFilingFields["futureAnnouncedDates"];
      }
    | { attempt: number; status: "error"; error: string }
  >;
  posted: {
    effectiveDate: string | null;
    declaredAmount: { value: number | null; unit: string | null; label: string | null };
    nextEventDate: string | null;
  };
  agreementReport: {
    fields: unknown;
    successfulParseCount: number;
    readyToPost: boolean;
    flagReasons: string[];
  };
  unbondedGrade: {
    severity: SeverityGrade["severity"];
    direction: SeverityGrade["direction"];
    rationale: string;
  };
}

export interface BuiltExtraData {
  json: ExtraDataPayload;
  /** `""` if the payload exceeded EXTRA_DATA_MAX_BYTES (see module doc). */
  uri: string;
  /** sha256 of the raw (unencoded) JSON string — always set, even if `uri` was suppressed. */
  hash: `0x${string}`;
  truncated: boolean;
}

function sha256Hex(input: string): `0x${string}` {
  return `0x${createHash("sha256").update(input, "utf8").digest("hex")}`;
}

// ---------------------------------------------------------------------
// Main mapping entrypoint
// ---------------------------------------------------------------------

export interface PostEventFacts {
  effectiveDate: bigint;
  declaredAmount: bigint;
  affectedToken: `0x${string}`;
  currency: string;
  extraDataURI: string;
  extraDataHash: `0x${string}`;
}

export interface PostEventAgreement {
  eventTypeAgreement: number;
  effectiveDateAgreement: number;
  declaredAmountAgreement: number;
  affectedTokenAgreement: number;
  nextEventDateAgreement: number;
}

export interface PostEventSeverity {
  severity: number;
  confidence: number;
}

/** Everything `EventStateRegistry.postEvent()` needs, EXCEPT `bondAmount` (a runtime/operational decision, not a fact). */
export interface PostEventArgs {
  token: `0x${string}`;
  eventType: number;
  eventTypeLabel: string;
  facts: PostEventFacts;
  agreement: PostEventAgreement;
  severity: PostEventSeverity;
  sourceUrl: string;
  sourceContentHash: `0x${string}`;
  nextEventDate: bigint;
  /** Not part of the on-chain call — surfaced for callers/tests that want to inspect what was posted/omitted. */
  extraData: BuiltExtraData;
}

export function mapPipelineResultToPostArgs(
  result: PipelineResult,
  opts: { network: "testnet" | "mainnet" },
): PostEventArgs {
  const { filing, attempts, agreement: agreementReport, severityGrade, contentHash } = result;

  // --- eventType ---
  const allDeclaredAmountLabels = successfulAttempts(attempts).flatMap((a) => a.data.declaredAmounts.map((d) => d.label));
  const modalEventType = selectModalScalar(attempts, (d) => d.eventType);
  const offChainEventType = modalEventType.value ?? "other";
  const eventType = mapEventType(offChainEventType, filing.form, allDeclaredAmountLabels);
  const eventTypeLabel = `${filing.form} — ${offChainEventType}`;

  // --- affectedToken (bonded, mirrors top-level `token`) ---
  const modalAffectedToken = selectModalScalar(attempts, (d) => d.affectedToken);
  const token = resolveTokenAddress(filing.tokenSymbol, opts.network);

  // --- effectiveDate: modal-select each attempt's earliest reported date ---
  const modalEffectiveDate = selectModalDerived(
    attempts,
    (d) => earliestDate(d.effectiveDates),
    (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  );
  const effectiveDate = modalEffectiveDate.value !== undefined ? isoDateToUnixSeconds(modalEffectiveDate.value) : 0n;

  // --- declaredAmount: modal-select each attempt's first declared amount; require >=2-of-3 consensus ---
  const modalDeclaredAmount = selectModalDerived(
    attempts,
    (d) => (d.declaredAmounts.length > 0 ? d.declaredAmounts[0] : undefined),
    (a, b) => a.value - b.value,
  );
  const declaredAmountHasConsensus = modalDeclaredAmount.agreement >= 2;
  const declaredAmount = declaredAmountHasConsensus && modalDeclaredAmount.value
    ? scaleDeclaredAmount(modalDeclaredAmount.value.value)
    : 0n;
  const currency = declaredAmountHasConsensus && modalDeclaredAmount.value ? (modalDeclaredAmount.value.unit ?? "") : "";
  const declaredAmountAgreement = declaredAmountHasConsensus ? modalDeclaredAmount.agreement : 0;

  // --- nextEventDate: modal-select each attempt's earliest futureAnnouncedDates entry ---
  const modalNextEventDate = selectModalDerived(
    attempts,
    (d) => earliestDate(d.futureAnnouncedDates.map((f) => f.date)),
    (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  );
  const nextEventDate = modalNextEventDate.value !== undefined ? isoDateToUnixSeconds(modalNextEventDate.value) : 0n;

  // --- severity (unbonded) ---
  const minCoreAgreement = Math.min(
    modalEventType.agreement,
    modalEffectiveDate.agreement,
    declaredAmountAgreement,
    modalAffectedToken.agreement,
  );
  const mappedSeverity = mapSeverity(severityGrade.grade, minCoreAgreement);

  // --- extraData ---
  const extraData = buildExtraData({
    filing,
    attempts,
    agreementReport,
    severityGrade: severityGrade.grade,
    posted: {
      effectiveDate: modalEffectiveDate.value ?? null,
      declaredAmount: {
        value: declaredAmountHasConsensus ? modalDeclaredAmount.value!.value : null,
        unit: declaredAmountHasConsensus ? (modalDeclaredAmount.value!.unit ?? null) : null,
        label: declaredAmountHasConsensus ? modalDeclaredAmount.value!.label : null,
      },
      nextEventDate: modalNextEventDate.value ?? null,
    },
  });

  return {
    token,
    eventType,
    eventTypeLabel,
    facts: {
      effectiveDate,
      declaredAmount,
      affectedToken: token,
      currency,
      extraDataURI: extraData.uri,
      extraDataHash: extraData.hash,
    },
    agreement: {
      eventTypeAgreement: modalEventType.agreement,
      effectiveDateAgreement: modalEffectiveDate.agreement,
      declaredAmountAgreement,
      affectedTokenAgreement: modalAffectedToken.agreement,
      nextEventDateAgreement: modalNextEventDate.agreement,
    },
    severity: mappedSeverity,
    sourceUrl: filing.documentUrl,
    sourceContentHash: `0x${contentHash}`,
    nextEventDate,
    extraData,
  };
}

function buildExtraData(args: {
  filing: PipelineResult["filing"];
  attempts: ParseAttemptResult[];
  agreementReport: PipelineResult["agreement"];
  severityGrade: SeverityGrade;
  posted: ExtraDataPayload["posted"];
}): BuiltExtraData {
  const { filing, attempts, agreementReport, severityGrade, posted } = args;

  const parses: ExtraDataPayload["parses"] = attempts.map((a) =>
    a.status === "ok"
      ? {
          attempt: a.attempt,
          status: "ok" as const,
          eventType: a.data.eventType,
          affectedToken: a.data.affectedToken,
          effectiveDates: a.data.effectiveDates,
          declaredAmounts: a.data.declaredAmounts,
          futureAnnouncedDates: a.data.futureAnnouncedDates,
        }
      : { attempt: a.attempt, status: "error" as const, error: a.error },
  );

  const json: ExtraDataPayload = {
    schemaVersion: "afterhours-extradata-1",
    accessionNumber: filing.accessionNumber,
    form: filing.form,
    ticker: filing.ticker,
    tokenSymbol: filing.tokenSymbol,
    acceptanceDateTime: filing.acceptanceDateTime,
    declaredAmountScale: DECLARED_AMOUNT_SCALE,
    parses,
    posted,
    agreementReport: {
      fields: agreementReport.fields,
      successfulParseCount: agreementReport.successfulParseCount,
      readyToPost: agreementReport.readyToPost,
      flagReasons: agreementReport.flagReasons,
    },
    unbondedGrade: {
      severity: severityGrade.severity,
      direction: severityGrade.direction,
      rationale: severityGrade.rationale,
    },
  };

  const content = stableStringify(json);
  const hash = sha256Hex(content);
  const byteLength = Buffer.byteLength(content, "utf8");

  if (byteLength > EXTRA_DATA_MAX_BYTES) {
    console.warn(
      `[mapEventToRegistry] extraData JSON is ${byteLength} bytes, exceeding EXTRA_DATA_MAX_BYTES=${EXTRA_DATA_MAX_BYTES} ` +
        `— falling back to extraDataURI="" while KEEPING extraDataHash set to the full content's hash. ` +
        `The hashed content is NOT truncated; it is simply not inlined on-chain.`,
    );
    return { json, uri: "", hash, truncated: true };
  }

  const uri = `data:application/json;base64,${Buffer.from(content, "utf8").toString("base64")}`;
  return { json, uri, hash, truncated: false };
}
