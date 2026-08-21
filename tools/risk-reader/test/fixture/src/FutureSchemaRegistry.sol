// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title FutureSchemaRegistry
/// @notice A test-only stand-in that is ABI-compatible with `TinjauRiskRegistry`'s READ surface
/// and returns whatever the test tells it to.
///
/// @dev WHY THIS EXISTS. The reference consumer must refuse two things it can never be shown by
/// the real `TinjauRiskRegistry` at schema `tinjau.risk/1.0.0`:
///
///   1. a record carrying a reason bit the reader does not define — the real registry's
///      `validateReasonBits` rejects such a write, so no honest deployment of v1.0.0 can store
///      one;
///   2. a registry reporting a newer `schemaVersion()` — v1.0.0 reports v1.0.0 by construction.
///
/// Both are exactly the situations a FUTURE schema version creates, and both are where a naive
/// consumer silently drops a fact. Testing them offline against the decoder alone would prove
/// only that a function works; deploying this and reading it over real `eth_call` proves the
/// consumer refuses bytes that actually came off a chain.
///
/// @dev This contract imports nothing. It is not a mock of Tinjau's logic and must never be
/// mistaken for the registry: it enforces no rule, validates no input, and stores no history.
contract FutureSchemaRegistry {
    struct RiskRecord {
        address asset;
        bytes32 poolId;
        uint8 state;
        uint8 confidence;
        uint8 dataMode;
        uint8 confirmation;
        uint32 reasonBits;
        uint64 assessedAt;
        uint64 expiresAt;
        uint64 protectStartedAt;
        bytes32 evidenceCommitment;
        bytes32 policyVersion;
    }

    bytes32 private immutable _schemaVersion;
    uint32 private immutable _reasonBits;

    constructor(bytes32 schemaVersion_, uint32 reasonBits_) {
        _schemaVersion = schemaVersion_;
        _reasonBits = reasonBits_;
    }

    function schemaVersion() external view returns (bytes32) {
        return _schemaVersion;
    }

    function policyVersion() external pure returns (bytes32) {
        return "tinjau.policy/9.9.9";
    }

    function paused() external pure returns (bool) {
        return false;
    }

    function assessor() external pure returns (address) {
        return address(uint160(0xA55E5501));
    }

    function guardian() external pure returns (address) {
        return address(uint160(0x6A6D1A11));
    }

    function envelope() external pure returns (uint24, uint24, uint32, uint32, uint32, uint32) {
        return (500, 20_000, 3_600, 18_000, 86_400, 3_600);
    }

    function supportedAsset(address) external pure returns (bool) {
        return true;
    }

    function key(address asset, bytes32 poolId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(asset, poolId));
    }

    function historyLength(address, bytes32) external pure returns (uint256) {
        return 1;
    }

    function lastProtectEndedAt(bytes32) external pure returns (uint64) {
        return 0;
    }

    function currentRecord(address asset, bytes32 poolId) external view returns (RiskRecord memory) {
        return RiskRecord({
            asset: asset,
            poolId: poolId,
            state: 1, // WATCH
            confidence: 2, // MEDIUM
            dataMode: 4, // SIMULATED — this is a fixture and says so on chain
            confirmation: 1, // NOT_CONFIRMED
            reasonBits: _reasonBits,
            assessedAt: uint64(block.timestamp - 60),
            expiresAt: uint64(block.timestamp + 3_600),
            protectStartedAt: 0,
            evidenceCommitment: keccak256("FutureSchemaRegistry fixture - not real evidence"),
            policyVersion: "tinjau.policy/9.9.9"
        });
    }

    function effectiveState(address, bytes32) external pure returns (uint8, uint24, uint64) {
        return (1, 500, 0);
    }
}
