// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TinjauRiskTypes} from "../TinjauRiskTypes.sol";

/// @notice The minimum surface of `TinjauRiskRegistry` a read-only consumer needs.
///
/// @dev Declared here rather than importing the registry contract so that a third party can
/// copy TWO files — this one and `TinjauRiskTypes.sol` — into their own repository and
/// compile. Importing `TinjauRiskRegistry.sol` would drag in `TinjauRiskPolicy`, the EIP-712
/// machinery, and every write function this consumer must never call.
///
/// The write functions are deliberately absent. A consumer that cannot name `postAssessment`
/// cannot accidentally call it, and a reviewer can confirm that by reading this interface
/// instead of auditing the whole contract.
interface ITinjauRiskRegistry {
    /// @notice The stored record, exactly as written. Expiry is NOT applied.
    function currentRecord(address asset, bytes32 poolId)
        external
        view
        returns (TinjauRiskTypes.RiskRecord memory);

    /// @notice The state to act on right now, with expiry and the duration cap applied.
    function effectiveState(address asset, bytes32 poolId)
        external
        view
        returns (TinjauRiskTypes.RiskState state, uint24 fee, uint64 endsAt);

    /// @notice The type-vocabulary version the registry writes records in, ASCII in bytes32.
    function schemaVersion() external view returns (bytes32);
}

/// @title ExampleRiskConsumer
/// @notice A worked example of another contract reading the Tinjau risk record correctly.
/// It is the smallest thing that still demonstrates the two ways a consumer gets this wrong.
///
/// @dev MISTAKE 1 — READING THE STORED STATE. `currentRecord().state` can still say `Protect`
/// long after the record's `expiresAt` has passed, because a read never rewrites history: the
/// record stands as it was written and nobody pays gas to retire it. `effectiveState()`
/// applies expiry and the envelope's duration cap at read time. A consumer that gates on
/// `currentRecord().state` therefore applies protection the registry no longer authorises —
/// indefinitely, and with no transaction anywhere to show what went wrong. Everything that
/// makes a decision here reads `effectiveState`; the stored state is exposed only through
/// `storedStateForAuditOnly`, named so that misuse is visible in the caller's diff.
///
/// @dev MISTAKE 2 — MASKING OFF AN UNKNOWN REASON BIT. `reasonBits` is a uint32 whose bit
/// positions are permanent and whose meanings are fixed per schema version. If a future
/// schema adds a bit meaning, say, "the evidence behind this record was retracted", a
/// consumer that ignores bits it does not recognise would read that record as though the
/// retraction never happened. So this contract refuses the record instead: `validateReasonBits`
/// reverts on any bit outside the set THIS COPY of `TinjauRiskTypes` defines. A view that
/// reverts is loud, and loud is the correct failure for "I do not understand this record".
///
/// @dev THIS IS AN EXAMPLE, NOT A LIBRARY. It is unaudited, it is bound to one
/// (asset, poolId) pair for clarity, and it is deployed nowhere. Copy it and adapt it; do not
/// treat its existence as a claim that anyone runs it.
contract ExampleRiskConsumer {
    /// @notice The registry this consumer reads. Immutable: a consumer that can be re-pointed
    /// at a different registry is a consumer whose risk source is whoever holds the admin key.
    ITinjauRiskRegistry public immutable registry;

    /// @notice The (asset, poolId) this consumer watches.
    address public immutable asset;
    bytes32 public immutable poolId;

    /// @notice The schema version this consumer was compiled against.
    /// @dev Fixed at deployment from the imported constant, not read from the registry, so
    /// that an upgraded registry cannot talk this consumer into decoding a layout it was
    /// never written for.
    bytes32 public constant EXPECTED_SCHEMA_VERSION = TinjauRiskTypes.SCHEMA_VERSION;

    /// @notice The registry reports a schema this consumer does not decode.
    error SchemaMismatch(bytes32 expected, bytes32 actual);

    constructor(ITinjauRiskRegistry registry_, address asset_, bytes32 poolId_) {
        // Checked once, at deployment, rather than on every read: an enum ordinal or struct
        // layout is only guaranteed within one schema version, so decoding a foreign schema
        // could produce a confident wrong answer. Failing here costs one deployment; failing
        // silently costs every read after it.
        bytes32 actual = registry_.schemaVersion();
        if (actual != EXPECTED_SCHEMA_VERSION) revert SchemaMismatch(EXPECTED_SCHEMA_VERSION, actual);

        registry = registry_;
        asset = asset_;
        poolId = poolId_;
    }

    // ---------------------------------------------------------------------
    // The answers a consumer actually wants
    // ---------------------------------------------------------------------

    /// @notice The risk state to act on right now.
    /// @dev Reverts if the record carries a reason bit this schema does not define. See
    /// MISTAKE 2 above.
    function currentRiskState() public view returns (TinjauRiskTypes.RiskState) {
        TinjauRiskTypes.validateReasonBits(registry.currentRecord(asset, poolId).reasonBits);
        (TinjauRiskTypes.RiskState state,,) = registry.effectiveState(asset, poolId);
        return state;
    }

    /// @notice Whether a bounded protective action is authorised right now.
    ///
    /// @dev Exact equality against `Protect`, never `>=`. Ordering over these enums exists for
    /// human legibility only; gating on `state >= Watch` would silently widen the moment a
    /// future schema inserts a member, and `Watch` explicitly does NOT authorise the
    /// aggressive path. `Normal` and `Watch` both answer false here.
    function shouldPause() external view returns (bool) {
        return currentRiskState() == TinjauRiskTypes.RiskState.Protect;
    }

    /// @notice The fee the envelope authorises right now, and when the protection interval
    /// ends. `endsAt == 0` means no protection interval is running.
    /// @dev Returned together because they are only meaningful together: a fee above base
    /// with no end time would be an unbounded action, which is the thing this whole design
    /// refuses to produce.
    function currentProtection() external view returns (uint24 fee, uint64 endsAt) {
        TinjauRiskTypes.validateReasonBits(registry.currentRecord(asset, poolId).reasonBits);
        (, fee, endsAt) = registry.effectiveState(asset, poolId);
    }

    /// @notice Whether anyone has ever assessed this (asset, poolId).
    ///
    /// @dev A never-written record reads as all zeroes, and zero decodes to
    /// `RiskState.Normal`. That default is safe — it grants no protection — but "never
    /// assessed" and "assessed and found normal" are different findings, and a UI that
    /// reports the first as the second tells its users a pool was cleared when nobody ever
    /// looked at it. `assessedAt != 0` is the only thing that separates them.
    function hasBeenAssessed() external view returns (bool) {
        return registry.currentRecord(asset, poolId).assessedAt != 0;
    }

    // ---------------------------------------------------------------------
    // Audit surface — deliberately awkward to use by mistake
    // ---------------------------------------------------------------------

    /// @notice The STORED state, which may name a protection that has already lapsed.
    ///
    /// @dev Never gate anything on this. It exists because reconstructing why a past decision
    /// was made needs the record as it was written, not as time has since reinterpreted it.
    /// The name carries the warning into the caller's own source, where a reviewer will see
    /// it, rather than leaving it in a comment nobody reads at the call site.
    function storedStateForAuditOnly() external view returns (TinjauRiskTypes.RiskState) {
        return registry.currentRecord(asset, poolId).state;
    }
}
