/**
 * Hand-written `as const` ABI mirror of `EventStateRegistry.sol`, copied from
 * `apps/server/src/chain/registryAbi.ts` (kept in sync manually — see that file's own
 * header comment for why it's hand-written rather than generated). Only the read
 * functions this frontend calls are included: `getEvent`, `getLatestEvent`,
 * `nextEventId`, `latestEventIdForToken`.
 */

const factualFieldsComponents = [
  { name: "effectiveDate", type: "uint256" },
  { name: "declaredAmount", type: "int256" },
  { name: "affectedToken", type: "address" },
  { name: "currency", type: "string" },
  { name: "extraDataURI", type: "string" },
  { name: "extraDataHash", type: "bytes32" },
] as const;

const fieldAgreementComponents = [
  { name: "eventTypeAgreement", type: "uint8" },
  { name: "effectiveDateAgreement", type: "uint8" },
  { name: "declaredAmountAgreement", type: "uint8" },
  { name: "affectedTokenAgreement", type: "uint8" },
  { name: "nextEventDateAgreement", type: "uint8" },
] as const;

const severityGradeComponents = [
  { name: "severity", type: "int8" },
  { name: "confidence", type: "uint8" },
] as const;

const eventStateComponents = [
  { name: "token", type: "address" },
  { name: "eventType", type: "uint8" },
  { name: "eventTypeLabel", type: "string" },
  { name: "facts", type: "tuple", components: factualFieldsComponents },
  { name: "agreement", type: "tuple", components: fieldAgreementComponents },
  { name: "severity", type: "tuple", components: severityGradeComponents },
  { name: "sourceUrl", type: "string" },
  { name: "sourceContentHash", type: "bytes32" },
  { name: "timestamp", type: "uint256" },
  { name: "nextEventDate", type: "uint256" },
  { name: "bondAmount", type: "uint256" },
  { name: "poster", type: "address" },
  { name: "challenged", type: "bool" },
  { name: "resolved", type: "bool" },
  { name: "challengerWon", type: "bool" },
  { name: "challenger", type: "address" },
] as const;

export const EVENT_STATE_REGISTRY_ABI = [
  {
    type: "function",
    name: "getEvent",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple", components: eventStateComponents }],
  },
  {
    type: "function",
    name: "getLatestEvent",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "tuple", components: eventStateComponents }],
  },
  {
    type: "function",
    name: "nextEventId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "latestEventIdForToken",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "EventPosted",
    inputs: [
      { name: "eventId", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "sourceContentHash", type: "bytes32", indexed: true },
      { name: "eventType", type: "uint8", indexed: false },
      { name: "bondAmount", type: "uint256", indexed: false },
      { name: "poster", type: "address", indexed: false },
    ],
  },
] as const;

/** Minimal ERC-20 ABI — only the reads a balance/holdings lookup needs. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export type EventState = {
  token: `0x${string}`;
  eventType: number;
  eventTypeLabel: string;
  facts: {
    effectiveDate: bigint;
    declaredAmount: bigint;
    affectedToken: `0x${string}`;
    currency: string;
    extraDataURI: string;
    extraDataHash: `0x${string}`;
  };
  agreement: {
    eventTypeAgreement: number;
    effectiveDateAgreement: number;
    declaredAmountAgreement: number;
    affectedTokenAgreement: number;
    nextEventDateAgreement: number;
  };
  severity: { severity: number; confidence: number };
  sourceUrl: string;
  sourceContentHash: `0x${string}`;
  timestamp: bigint;
  nextEventDate: bigint;
  bondAmount: bigint;
  poster: `0x${string}`;
  challenged: boolean;
  resolved: boolean;
  challengerWon: boolean;
  challenger: `0x${string}`;
};
