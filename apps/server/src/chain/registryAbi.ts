/**
 * Hand-written `as const` ABI mirror of `contracts/src/EventStateRegistry.sol`
 * (deployed at `0x713f45f44e74616898FB366E11881196221933aA` on X Layer Testnet, chain
 * 1952 — see `contracts/broadcast/DeployTestnetRegistry.s.sol/1952/run-latest.json`).
 *
 * Only the functions/events this codebase actually calls are included:
 * `postEvent`, `getEvent`, `getLatestEvent`, `getEventSummary`, `poster`, `bondToken`,
 * `nextEventId`, `latestEventIdForToken`, and the `EventPosted` event.
 *
 * Hand-written (not generated from a forge build artifact under `contracts/out/`) so
 * that `as const` gives viem compile-time struct field types/order — a forge JSON ABI
 * import loses that unless re-asserted `as const` anyway, and hand-writing keeps this
 * module free of a build-artifact dependency on the contracts package.
 *
 * If `EventStateRegistry.sol` changes, update this file to match.
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
    name: "postEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "eventType", type: "uint8" },
      { name: "eventTypeLabel", type: "string" },
      { name: "facts", type: "tuple", components: factualFieldsComponents },
      { name: "agreement", type: "tuple", components: fieldAgreementComponents },
      { name: "severity", type: "tuple", components: severityGradeComponents },
      { name: "sourceUrl", type: "string" },
      { name: "sourceContentHash", type: "bytes32" },
      { name: "nextEventDate", type: "uint256" },
      { name: "bondAmount", type: "uint256" },
    ],
    outputs: [{ name: "eventId", type: "uint256" }],
  },
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
    name: "getEventSummary",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [
      { name: "eventType", type: "uint8" },
      { name: "agreement", type: "tuple", components: fieldAgreementComponents },
      { name: "severity", type: "tuple", components: severityGradeComponents },
      { name: "timestamp", type: "uint256" },
      { name: "isDisputedUnresolved", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "poster",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "bondToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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

/** Minimal ERC-20 ABI — only what the bond-token mint/approve/read flow needs. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
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
] as const;
