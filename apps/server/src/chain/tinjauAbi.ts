/**
 * ABI fragments for the Tinjau enforcement stack (tasks T4.2–T4.5).
 *
 * Hand-written rather than imported from Foundry's `out/` on purpose: `out/` is gitignored and
 * rebuilt by whichever `forge build` ran last, so a harness that read it would depend on build
 * state that is not in the repository. `test/tinjauAbi.test.ts` parses the Solidity sources and
 * checks every fragment below against them, so the transcription is verified, not trusted —
 * the same discipline `decision/eip712.ts` uses for the typed-data definition, and for the same
 * reason: a fragment that merely looks right produces a decode failure with no explanation.
 */

export const TINJAU_RISK_REGISTRY_ABI = [
  {
    type: "function",
    name: "postAssessment",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "a",
        type: "tuple",
        components: [
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
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "currentRecord",
    stateMutability: "view",
    inputs: [
      { name: "asset", type: "address" },
      { name: "poolId", type: "bytes32" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "asset", type: "address" },
          { name: "poolId", type: "bytes32" },
          { name: "state", type: "uint8" },
          { name: "confidence", type: "uint8" },
          { name: "dataMode", type: "uint8" },
          { name: "confirmation", type: "uint8" },
          { name: "reasonBits", type: "uint32" },
          { name: "assessedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "protectStartedAt", type: "uint64" },
          { name: "evidenceCommitment", type: "bytes32" },
          { name: "policyVersion", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "effectiveState",
    stateMutability: "view",
    inputs: [
      { name: "asset", type: "address" },
      { name: "poolId", type: "bytes32" },
    ],
    outputs: [
      { name: "state", type: "uint8" },
      { name: "fee", type: "uint24" },
      { name: "endsAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "historyLength",
    stateMutability: "view",
    inputs: [
      { name: "asset", type: "address" },
      { name: "poolId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "envelope",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "baseFee", type: "uint24" },
      { name: "maxFee", type: "uint24" },
      { name: "widenDuration", type: "uint32" },
      { name: "decayDuration", type: "uint32" },
      { name: "maxProtectDuration", type: "uint32" },
      { name: "cooldown", type: "uint32" },
    ],
  },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "assessor", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "guardian", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  {
    type: "function",
    name: "supportedAsset",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "lastProtectEndedAt",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "key",
    stateMutability: "pure",
    inputs: [
      { name: "asset", type: "address" },
      { name: "poolId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "bool" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setAssetSupported",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "supported", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "AssessmentPosted",
    inputs: [
      { name: "key", type: "bytes32", indexed: true },
      { name: "asset", type: "address", indexed: true },
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "state", type: "uint8", indexed: false },
      { name: "reasonBits", type: "uint32", indexed: false },
      { name: "assessedAt", type: "uint64", indexed: false },
      { name: "expiresAt", type: "uint64", indexed: false },
      { name: "evidenceCommitment", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProtectionEnded",
    inputs: [
      { name: "key", type: "bytes32", indexed: true },
      { name: "endedAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PausedSet",
    inputs: [
      { name: "paused", type: "bool", indexed: false },
      { name: "by", type: "address", indexed: true },
    ],
  },
  // Errors, so a revert decodes to a name instead of a hex blob. §0.23 forbids asking anyone
  // to decode ad hoc contract output, and a failed action is exactly the case where the reason
  // matters most.
  { type: "error", name: "NotGuardian", inputs: [] },
  { type: "error", name: "BadSignature", inputs: [] },
  { type: "error", name: "NonceAlreadyUsed", inputs: [{ name: "nonce", type: "uint256" }] },
  {
    type: "error",
    name: "DeadlinePassed",
    inputs: [
      { name: "deadline", type: "uint256" },
      { name: "nowTimestamp", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "AssessmentExpired",
    inputs: [
      { name: "expiresAt", type: "uint64" },
      { name: "nowTimestamp", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "AssessmentFromFuture",
    inputs: [
      { name: "assessedAt", type: "uint64" },
      { name: "nowTimestamp", type: "uint256" },
    ],
  },
  { type: "error", name: "UnsupportedAsset", inputs: [{ name: "asset", type: "address" }] },
  {
    type: "error",
    name: "ExpiryNotAfterAssessment",
    inputs: [
      { name: "assessedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
    ],
  },
  { type: "error", name: "ProtectionPaused", inputs: [] },
  {
    type: "error",
    name: "CooldownActive",
    inputs: [
      { name: "lastEndedAt", type: "uint64" },
      { name: "cooldown", type: "uint32" },
    ],
  },
  {
    type: "error",
    name: "ProtectRequiresConfirmation",
    inputs: [{ name: "status", type: "uint8" }],
  },
  {
    type: "error",
    name: "StaleAssessment",
    inputs: [
      { name: "incomingAssessedAt", type: "uint64" },
      { name: "currentAssessedAt", type: "uint64" },
    ],
  },
  { type: "error", name: "ZeroEvidenceCommitment", inputs: [] },

  // Errors declared in the `TinjauRiskTypes` and `TinjauRiskPolicy` LIBRARIES, not in the
  // registry contract. A library's custom error reverts with its own selector, so omitting
  // these left the whole schema-validation family decoding as an unnamed revert — which is the
  // family a malformed or newer-schema assessment lands in, and exactly the one whose name a
  // reader needs. Found by the probe self-check in `tinjauVerifyDeployment`.
  { type: "error", name: "UnknownReasonBits", inputs: [{ name: "bits", type: "uint32" }] },
  { type: "error", name: "InvalidRiskState", inputs: [{ name: "value", type: "uint8" }] },
  { type: "error", name: "InvalidSourceClass", inputs: [{ name: "value", type: "uint8" }] },
  { type: "error", name: "InvalidDataMode", inputs: [{ name: "value", type: "uint8" }] },
  { type: "error", name: "InvalidConfirmationStatus", inputs: [{ name: "value", type: "uint8" }] },
  { type: "error", name: "InvalidConfidenceBand", inputs: [{ name: "value", type: "uint8" }] },
  { type: "error", name: "EmptyEvidenceCommitment", inputs: [] },
  {
    type: "error",
    name: "EnvelopeInverted",
    inputs: [
      { name: "baseFee", type: "uint24" },
      { name: "maxFee", type: "uint24" },
    ],
  },
  {
    type: "error",
    name: "MaxDurationBelowDecayWindow",
    inputs: [
      { name: "maxProtectDuration", type: "uint32" },
      { name: "widenPlusDecay", type: "uint32" },
    ],
  },
] as const;

const POOL_KEY_COMPONENTS = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

export const TINJAU_FEE_HOOK_ABI = [
  {
    type: "function",
    name: "previewFee",
    stateMutability: "view",
    inputs: [{ name: "key", type: "tuple", components: POOL_KEY_COMPONENTS }],
    outputs: [{ name: "fee", type: "uint24" }],
  },
  {
    type: "function",
    name: "feeDetail",
    stateMutability: "view",
    inputs: [{ name: "key", type: "tuple", components: POOL_KEY_COMPONENTS }],
    outputs: [
      { name: "fee", type: "uint24" },
      { name: "reason", type: "uint8" },
      { name: "state", type: "uint8" },
      { name: "protectEndsAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "resolveAsset",
    stateMutability: "view",
    inputs: [{ name: "key", type: "tuple", components: POOL_KEY_COMPONENTS }],
    outputs: [
      { name: "asset", type: "address" },
      { name: "poolId", type: "bytes32" },
      { name: "reason", type: "uint8" },
    ],
  },
  { type: "function", name: "baseFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint24" }] },
  { type: "function", name: "maxFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint24" }] },
  { type: "function", name: "widenDuration", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint32" }] },
  { type: "function", name: "decayDuration", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint32" }] },
  { type: "function", name: "maxProtectDuration", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint32" }] },
  { type: "function", name: "cooldown", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint32" }] },
  { type: "function", name: "registry", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
] as const;

/**
 * `TinjauFeeHook.Degraded`, in declaration order.
 *
 * The contract returns an ordinal. Publishing an ordinal to a frontend would be exactly the
 * "decode ad hoc contract output" §0.23 forbids, so the harness maps it here and
 * `test/tinjauAbi.test.ts` checks the list against the enum in the Solidity source.
 */
export const HOOK_DEGRADED_REASONS = [
  "None",
  "NoRecord",
  "RegistryUnreachable",
  "MalformedRecord",
  "RecordKeyMismatch",
  "PolicyVersionMismatch",
  "UndefinedReasonBits",
  "NoSupportedAsset",
  "AmbiguousAsset",
  "RegistryPaused",
  "NotMarketConfirmed",
  "RumorOnly",
  "LapsedOrExpired",
] as const;

export type HookDegradedReason = (typeof HOOK_DEGRADED_REASONS)[number];

export const POOL_SWAP_TEST_ABI = [
  {
    type: "function",
    name: "swap",
    stateMutability: "payable",
    inputs: [
      { name: "key", type: "tuple", components: POOL_KEY_COMPONENTS },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      {
        name: "testSettings",
        type: "tuple",
        components: [
          { name: "takeClaims", type: "bool" },
          { name: "settleUsingBurn", type: "bool" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
  },
] as const;

/**
 * The only place the fee actually charged is observable.
 *
 * A dynamic-fee override is applied to one swap and never written into `slot0`, so
 * `getSlot0` keeps reporting the pool's stored `lpFee`. Reading `Swap.fee` from PoolManager's
 * own log is the difference between "the hook returned a number" and "the pool charged it".
 */
export const POOL_MANAGER_ABI = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount0", type: "int128", indexed: false },
      { name: "amount1", type: "int128", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "tick", type: "int24", indexed: false },
      { name: "fee", type: "uint24", indexed: false },
    ],
  },
] as const;

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
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** `TinjauRiskTypes.RiskState`, in declaration order. */
export const RISK_STATE_NAMES = ["NORMAL", "WATCH", "PROTECT"] as const;
/** `TinjauRiskTypes.ConfirmationStatus`, in declaration order. */
export const CONFIRMATION_STATUS_NAMES = [
  "UNKNOWN",
  "NOT_CONFIRMED",
  "UNAVAILABLE",
  "STALE",
  "CONFIRMED",
] as const;
/** `TinjauRiskTypes.ConfidenceBand`, in declaration order. */
export const CONFIDENCE_BAND_NAMES = ["UNKNOWN", "LOW", "MEDIUM", "HIGH"] as const;
/** `TinjauRiskTypes.DataMode`, in declaration order. */
export const DATA_MODE_NAMES = ["UNKNOWN", "LIVE", "OBSERVED", "REPLAY", "SIMULATED"] as const;
