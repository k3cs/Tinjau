import {
  ACTION_STATUSES,
  CONFIDENCE_BANDS,
  CONFIRMATION_STATUSES,
  DATA_MODES,
  EVIDENCE_RELATIONS,
  REASON_CODES,
  RISK_SCHEMA_VERSION,
  RISK_STATES,
  SOURCE_CLASSES,
  type EvidenceClaimView,
  type MarketConfirmationView,
  type RiskActionView,
  type RiskRecordView,
} from "./model";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const NUMERIC = /^-?\d+(?:\.\d+)?$/;

export class RiskRecordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RiskRecordValidationError";
  }
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RiskRecordValidationError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], path: string) {
  const expectedSet = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedSet.has(key)) throw new RiskRecordValidationError(`${path}.${key} is not supported`);
  }
  for (const key of expected) {
    if (!(key in value)) throw new RiskRecordValidationError(`${path}.${key} is required`);
  }
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new RiskRecordValidationError(`${path} must be a non-empty string`);
  }
  return value;
}

function nullableStringAt(value: unknown, path: string): string | null {
  if (value === null) return null;
  return stringAt(value, path);
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new RiskRecordValidationError(`${path} must be boolean`);
  return value;
}

function enumAt<const T extends readonly string[]>(value: unknown, values: T, path: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new RiskRecordValidationError(`${path} has unknown value ${String(value)}`);
  }
  return value as T[number];
}

function dateAt(value: unknown, path: string): string {
  const date = stringAt(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new RiskRecordValidationError(`${path} must be a UTC date-time`);
  }
  return date;
}

function nullableDateAt(value: unknown, path: string): string | null {
  return value === null ? null : dateAt(value, path);
}

function addressAt(value: unknown, path: string): string {
  const address = stringAt(value, path);
  if (!ADDRESS.test(address)) throw new RiskRecordValidationError(`${path} must be an EVM address`);
  return address;
}

function bytes32At(value: unknown, path: string): string {
  const hash = stringAt(value, path);
  if (!BYTES32.test(hash)) throw new RiskRecordValidationError(`${path} must be bytes32`);
  return hash;
}

function numericAt(value: unknown, path: string): string {
  const numeric = stringAt(value, path);
  if (!NUMERIC.test(numeric)) throw new RiskRecordValidationError(`${path} must be a numeric string`);
  return numeric;
}

function nullableNumericAt(value: unknown, path: string): string | null {
  return value === null ? null : numericAt(value, path);
}

function urlAt(value: unknown, path: string): string | null {
  if (value === null) return null;
  const url = stringAt(value, path);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
  } catch {
    throw new RiskRecordValidationError(`${path} must be an HTTP(S) URL or null`);
  }
  return url;
}

function reasonCodesAt(value: unknown, path: string) {
  if (!Array.isArray(value)) throw new RiskRecordValidationError(`${path} must be an array`);
  const codes = value.map((item, index) => enumAt(item, REASON_CODES, `${path}[${index}]`));
  if (new Set(codes).size !== codes.length) {
    throw new RiskRecordValidationError(`${path} must not contain duplicates`);
  }
  return codes;
}

function evidenceAt(value: unknown, index: number): EvidenceClaimView {
  const path = `record.evidence[${index}]`;
  const raw = objectAt(value, path);
  exactKeys(
    raw,
    [
      "claimId",
      "sourceClass",
      "dataMode",
      "sourceUrl",
      "sourceId",
      "publisherOrAuthor",
      "publishedAt",
      "company",
      "tokenSymbol",
      "tokenAddress",
      "eventType",
      "claimTextOrPointer",
      "independenceGroup",
      "relation",
      "officialConfirmation",
      "expiresAt",
    ],
    path,
  );
  const dataMode = enumAt(raw.dataMode, DATA_MODES, `${path}.dataMode`);
  const sourceUrl = urlAt(raw.sourceUrl, `${path}.sourceUrl`);
  if (dataMode === "SIMULATED" && sourceUrl !== null) {
    throw new RiskRecordValidationError(`${path}.sourceUrl must be null for SIMULATED evidence`);
  }
  return {
    claimId: stringAt(raw.claimId, `${path}.claimId`),
    sourceClass: enumAt(raw.sourceClass, SOURCE_CLASSES, `${path}.sourceClass`),
    dataMode,
    sourceUrl,
    sourceId: stringAt(raw.sourceId, `${path}.sourceId`),
    publisherOrAuthor:
      raw.publisherOrAuthor === null
        ? null
        : stringAt(raw.publisherOrAuthor, `${path}.publisherOrAuthor`),
    publishedAt: dateAt(raw.publishedAt, `${path}.publishedAt`),
    company: stringAt(raw.company, `${path}.company`),
    tokenSymbol: stringAt(raw.tokenSymbol, `${path}.tokenSymbol`),
    tokenAddress: addressAt(raw.tokenAddress, `${path}.tokenAddress`),
    eventType: stringAt(raw.eventType, `${path}.eventType`),
    claimTextOrPointer: stringAt(raw.claimTextOrPointer, `${path}.claimTextOrPointer`),
    independenceGroup: stringAt(raw.independenceGroup, `${path}.independenceGroup`),
    relation: enumAt(raw.relation, EVIDENCE_RELATIONS, `${path}.relation`),
    officialConfirmation: booleanAt(raw.officialConfirmation, `${path}.officialConfirmation`),
    expiresAt: nullableDateAt(raw.expiresAt, `${path}.expiresAt`),
  };
}

function confirmationAt(value: unknown): MarketConfirmationView {
  const path = "record.marketConfirmation";
  const raw = objectAt(value, path);
  exactKeys(
    raw,
    [
      "status",
      "observedAt",
      "blockNumber",
      "fresh",
      "antiWickSatisfied",
      "okxReferencePrice",
      "xLayerPoolPrice",
      "basisBps",
      "drawdownBps",
      "tradeVelocity",
      "executableExitDepth",
      "reasonCodes",
    ],
    path,
  );
  return {
    status: enumAt(raw.status, CONFIRMATION_STATUSES, `${path}.status`),
    // Required but nullable since risk-record/1.0.1. An omitted key and an
    // explicit null are different facts, so `exactKeys` above still demands it.
    observedAt: nullableDateAt(raw.observedAt, `${path}.observedAt`),
    blockNumber: nullableStringAt(raw.blockNumber, `${path}.blockNumber`),
    fresh: booleanAt(raw.fresh, `${path}.fresh`),
    antiWickSatisfied: booleanAt(raw.antiWickSatisfied, `${path}.antiWickSatisfied`),
    okxReferencePrice: nullableNumericAt(raw.okxReferencePrice, `${path}.okxReferencePrice`),
    xLayerPoolPrice: nullableNumericAt(raw.xLayerPoolPrice, `${path}.xLayerPoolPrice`),
    basisBps: nullableNumericAt(raw.basisBps, `${path}.basisBps`),
    drawdownBps: nullableNumericAt(raw.drawdownBps, `${path}.drawdownBps`),
    tradeVelocity: nullableNumericAt(raw.tradeVelocity, `${path}.tradeVelocity`),
    executableExitDepth: nullableNumericAt(raw.executableExitDepth, `${path}.executableExitDepth`),
    reasonCodes: reasonCodesAt(raw.reasonCodes, `${path}.reasonCodes`),
  };
}

function actionAt(value: unknown, state: RiskRecordView["state"]): RiskActionView {
  const path = "record.action";
  const raw = objectAt(value, path);
  exactKeys(
    raw,
    [
      "authorized",
      "status",
      "baseFee",
      "maxFee",
      "requestedFee",
      "appliedFee",
      "maximumDurationSec",
      "txHash",
      "failureReason",
    ],
    path,
  );
  const authorized = booleanAt(raw.authorized, `${path}.authorized`);
  const status = enumAt(raw.status, ACTION_STATUSES, `${path}.status`);
  const failureReason = nullableStringAt(raw.failureReason, `${path}.failureReason`);
  if (state !== "PROTECT" && authorized) {
    throw new RiskRecordValidationError(`${path}.authorized must be false outside PROTECT`);
  }
  if (status === "FAILED" && failureReason === null) {
    throw new RiskRecordValidationError(`${path}.failureReason is required when status is FAILED`);
  }
  if (typeof raw.maximumDurationSec !== "number" || !Number.isInteger(raw.maximumDurationSec) || raw.maximumDurationSec < 0) {
    throw new RiskRecordValidationError(`${path}.maximumDurationSec must be a non-negative integer`);
  }
  const txHash = raw.txHash === null ? null : bytes32At(raw.txHash, `${path}.txHash`);
  return {
    authorized,
    status,
    baseFee: numericAt(raw.baseFee, `${path}.baseFee`),
    maxFee: numericAt(raw.maxFee, `${path}.maxFee`),
    requestedFee: nullableNumericAt(raw.requestedFee, `${path}.requestedFee`),
    appliedFee: nullableNumericAt(raw.appliedFee, `${path}.appliedFee`),
    maximumDurationSec: raw.maximumDurationSec,
    txHash,
    failureReason,
  };
}

export function validateRiskRecord(input: unknown): RiskRecordView {
  const raw = objectAt(input, "record");
  exactKeys(
    raw,
    [
      "schemaVersion",
      "assessmentId",
      "assetAddress",
      "tokenSymbol",
      "poolIdOrAddress",
      "state",
      "reasonCodes",
      "humanExplanation",
      "evidenceCommitment",
      "confidenceBand",
      "assessedAt",
      "expiresAt",
      "policyVersion",
      "dataMode",
      "evidence",
      "marketConfirmation",
      "action",
    ],
    "record",
  );
  if (raw.schemaVersion !== RISK_SCHEMA_VERSION) {
    throw new RiskRecordValidationError(`record.schemaVersion must equal ${RISK_SCHEMA_VERSION}`);
  }
  const state = enumAt(raw.state, RISK_STATES, "record.state");
  if (!Array.isArray(raw.evidence)) throw new RiskRecordValidationError("record.evidence must be an array");
  return {
    schemaVersion: RISK_SCHEMA_VERSION,
    assessmentId: stringAt(raw.assessmentId, "record.assessmentId"),
    assetAddress: addressAt(raw.assetAddress, "record.assetAddress"),
    tokenSymbol: stringAt(raw.tokenSymbol, "record.tokenSymbol"),
    poolIdOrAddress: stringAt(raw.poolIdOrAddress, "record.poolIdOrAddress"),
    state,
    reasonCodes: reasonCodesAt(raw.reasonCodes, "record.reasonCodes"),
    humanExplanation: stringAt(raw.humanExplanation, "record.humanExplanation"),
    evidenceCommitment: bytes32At(raw.evidenceCommitment, "record.evidenceCommitment"),
    confidenceBand: enumAt(raw.confidenceBand, CONFIDENCE_BANDS, "record.confidenceBand"),
    assessedAt: dateAt(raw.assessedAt, "record.assessedAt"),
    expiresAt: dateAt(raw.expiresAt, "record.expiresAt"),
    policyVersion: stringAt(raw.policyVersion, "record.policyVersion"),
    dataMode: enumAt(raw.dataMode, DATA_MODES, "record.dataMode"),
    evidence: raw.evidence.map(evidenceAt),
    marketConfirmation: confirmationAt(raw.marketConfirmation),
    action: actionAt(raw.action, state),
  };
}
