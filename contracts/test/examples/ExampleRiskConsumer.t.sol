// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TinjauRiskTypes} from "../../src/TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "../../src/TinjauRiskPolicy.sol";
import {TinjauRiskRegistry} from "../../src/TinjauRiskRegistry.sol";
import {ExampleRiskConsumer, ITinjauRiskRegistry} from "../../src/examples/ExampleRiskConsumer.sol";

/// @notice A registry that answers the read path but is free to lie about it.
///
/// @dev The real `TinjauRiskRegistry` refuses to store an undefined reason bit, which is
/// precisely why it cannot be used to prove the consumer refuses one. The consumer's whole
/// premise is that a NEWER writer — one this code was not compiled against — may publish
/// something it does not understand. Only a registry that can produce such a record can test
/// that premise, so this one exists. It is a test fixture and is deployed nowhere.
contract LyingRegistry is ITinjauRiskRegistry {
    TinjauRiskTypes.RiskRecord private _record;
    bytes32 private _schema = TinjauRiskTypes.SCHEMA_VERSION;

    function setRecord(TinjauRiskTypes.RiskRecord memory r) external {
        _record = r;
    }

    function setSchemaVersion(bytes32 v) external {
        _schema = v;
    }

    function currentRecord(address, bytes32) external view returns (TinjauRiskTypes.RiskRecord memory) {
        return _record;
    }

    function effectiveState(address, bytes32)
        external
        view
        returns (TinjauRiskTypes.RiskState state, uint24 fee, uint64 endsAt)
    {
        // Deliberately unconditional: if the consumer ever reaches here on a record it could
        // not decode, this benign-looking answer is what it would have acted on.
        return (_record.state, 500, _record.expiresAt);
    }

    function schemaVersion() external view returns (bytes32) {
        return _schema;
    }
}

/// @notice Proves the example consumer in `src/examples/` reads what the registry actually
/// published, and gets the two things right that a naive consumer gets wrong.
///
/// The point of these tests is not coverage of a contract nobody deploys. It is that the
/// example shipped in `INTEGRATION.md` is a worked example rather than an assertion: if the
/// effective-vs-stored semantic or the undefined-bit refusal ever stopped holding, the
/// document would be wrong and this suite would say so.
contract ExampleRiskConsumerTest is Test {
    TinjauRiskRegistry internal registry;
    ExampleRiskConsumer internal consumer;

    uint256 internal assessorKey = 0xA55E5;
    address internal assessor;
    address internal guardian = address(0x6A17D);
    address internal asset = address(0xA11CE);
    bytes32 internal poolId = bytes32(uint256(0x900D));

    function setUp() public {
        assessor = vm.addr(assessorKey);
        TinjauRiskPolicy.Envelope memory env = TinjauRiskPolicy.Envelope({
            baseFee: 500,
            maxFee: 20_000,
            widenDuration: 3600,
            decayDuration: 18_000,
            maxProtectDuration: 21_600,
            cooldown: 3600
        });
        registry = new TinjauRiskRegistry(assessor, guardian, env);

        vm.prank(guardian);
        registry.setAssetSupported(asset, true);

        vm.warp(1_000_000);
        consumer = new ExampleRiskConsumer(ITinjauRiskRegistry(address(registry)), asset, poolId);
    }

    // -----------------------------------------------------------------------
    // Helpers — same shape as TinjauRiskRegistry.t.sol, and for the same reason.
    // -----------------------------------------------------------------------

    /// @dev The timestamp is a parameter, not a `block.timestamp` read inside the helper.
    /// Under `via_ir` the optimiser may hoist a `block.timestamp` read across a `vm.warp`,
    /// because it has no way to know the cheatcode mutates block context; passing the time in
    /// removes the ambiguity.
    function _assessmentAt(TinjauRiskTypes.RiskState state, uint256 nonce, uint256 ts)
        internal
        view
        returns (TinjauRiskRegistry.Assessment memory a)
    {
        a.asset = asset;
        a.poolId = poolId;
        a.state = state;
        a.confidence = TinjauRiskTypes.ConfidenceBand.High;
        a.dataMode = TinjauRiskTypes.DataMode.Replay;
        a.confirmation = TinjauRiskTypes.ConfirmationStatus.Confirmed;
        a.reasonBits = TinjauRiskTypes.REASON_OFFICIAL_FILING | TinjauRiskTypes.REASON_MARKET_CONFIRMED;
        a.assessedAt = uint64(ts);
        a.expiresAt = uint64(ts + 10_000);
        a.evidenceCommitment = keccak256("evidence");
        a.requestedFee = 0;
        a.nonce = nonce;
        a.deadline = ts + 600;
    }

    function _post(TinjauRiskRegistry.Assessment memory a) internal {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(assessorKey, registry.hashAssessment(a));
        registry.postAssessment(a, abi.encodePacked(r, s, v));
    }

    // -----------------------------------------------------------------------
    // It reads what was published
    // -----------------------------------------------------------------------

    function test_theConsumerReadsTheRecordTheRegistryPublished() public {
        uint256 t0 = 1_000_000;
        TinjauRiskRegistry.Assessment memory a = _assessmentAt(TinjauRiskTypes.RiskState.Protect, 1, t0);
        _post(a);

        assertTrue(consumer.hasBeenAssessed(), "the consumer must see that an assessment exists");
        assertTrue(consumer.currentRiskState() == TinjauRiskTypes.RiskState.Protect);
        assertTrue(consumer.shouldPause(), "a live PROTECT must authorise the action");

        // And the numbers are the registry's own, not a second opinion computed by the
        // consumer. `endsAt` is the earlier of the duration cap and the record's expiry;
        // here expiry (t0 + 10_000) is earlier than the cap (t0 + 21_600).
        (uint24 fee, uint64 endsAt) = consumer.currentProtection();
        (TinjauRiskTypes.RiskState fromRegistry, uint24 registryFee, uint64 registryEndsAt) =
            registry.effectiveState(asset, poolId);
        assertTrue(consumer.currentRiskState() == fromRegistry);
        assertEq(fee, registryFee);
        assertEq(endsAt, registryEndsAt);
        assertEq(fee, 20_000, "HIGH confidence reaches the top of the band");
        assertEq(endsAt, a.expiresAt, "expiry is earlier than the duration cap here");
    }

    // -----------------------------------------------------------------------
    // THE SEMANTIC THAT MATTERS — effective, not stored
    // -----------------------------------------------------------------------

    /// @dev This is the failure the example exists to prevent. Nothing is written when the
    /// protection lapses — no keeper, no transaction, no event — so a consumer polling
    /// `currentRecord` sees PROTECT forever and keeps applying it. The stored record is not
    /// wrong; reading it as an instruction is.
    function test_theConsumerActsOnTheEffectiveStateNotTheStoredOne() public {
        uint256 t0 = 1_000_000;
        _post(_assessmentAt(TinjauRiskTypes.RiskState.Protect, 1, t0));

        vm.warp(t0 + 10_000); // the record's own expiresAt

        // Storage still says PROTECT, and that is correct: a read never rewrites history.
        assertTrue(
            registry.currentRecord(asset, poolId).state == TinjauRiskTypes.RiskState.Protect,
            "history must not be rewritten by the passage of time"
        );
        assertTrue(
            consumer.storedStateForAuditOnly() == TinjauRiskTypes.RiskState.Protect,
            "the audit surface reports storage verbatim"
        );

        // But nothing is authorised any more.
        assertTrue(consumer.currentRiskState() == TinjauRiskTypes.RiskState.Normal);
        assertFalse(consumer.shouldPause(), "a lapsed PROTECT must not still pause anything");
        (uint24 fee,) = consumer.currentProtection();
        assertEq(fee, 500, "the fee is back at base once the record has expired");
    }

    /// @dev The same divergence produced by the duration cap rather than by expiry. Both
    /// paths must land the consumer on NORMAL, or the cap is decorative.
    function test_theDurationCapAlsoEndsProtectionWithNoTransaction() public {
        uint256 t0 = 1_000_000;
        TinjauRiskRegistry.Assessment memory a = _assessmentAt(TinjauRiskTypes.RiskState.Protect, 1, t0);
        a.expiresAt = uint64(t0 + 100_000); // deliberately far beyond the 21_600 s cap
        _post(a);

        vm.warp(t0 + 21_600);

        assertTrue(consumer.storedStateForAuditOnly() == TinjauRiskTypes.RiskState.Protect);
        assertTrue(consumer.currentRiskState() == TinjauRiskTypes.RiskState.Normal);
        assertFalse(consumer.shouldPause());
    }

    // -----------------------------------------------------------------------
    // WATCH is not PROTECT, and exact equality is why
    // -----------------------------------------------------------------------

    /// @dev A consumer that gated on `state >= Watch` would pass this test's first assertion
    /// and fail the product's core invariant. `shouldPause` compares for exact equality, so
    /// monitoring stays monitoring.
    function test_watchIsRecordedButAuthorisesNothing() public {
        uint256 t0 = 1_000_000;
        TinjauRiskRegistry.Assessment memory a = _assessmentAt(TinjauRiskTypes.RiskState.Watch, 1, t0);
        a.reasonBits = TinjauRiskTypes.REASON_RUMOR_ONLY;
        _post(a);

        assertTrue(consumer.hasBeenAssessed());
        assertTrue(consumer.currentRiskState() == TinjauRiskTypes.RiskState.Watch);
        assertFalse(consumer.shouldPause(), "WATCH must never authorise the aggressive path");
        (uint24 fee,) = consumer.currentProtection();
        assertEq(fee, 500);
    }

    // -----------------------------------------------------------------------
    // Never assessed is not the same finding as assessed and cleared
    // -----------------------------------------------------------------------

    function test_anUnassessedPoolIsNotReportedAsCleared() public {
        ExampleRiskConsumer other =
            new ExampleRiskConsumer(ITinjauRiskRegistry(address(registry)), asset, bytes32(uint256(0xBEEF)));

        // The safe default holds: nothing is authorised.
        assertTrue(other.currentRiskState() == TinjauRiskTypes.RiskState.Normal);
        assertFalse(other.shouldPause());

        // And the consumer can still tell the two apart, which a UI needs in order to avoid
        // telling its users a pool was cleared when nobody has ever looked at it.
        assertFalse(other.hasBeenAssessed(), "assessedAt == 0 must not read as 'assessed, normal'");
    }

    // -----------------------------------------------------------------------
    // Undefined bits are refused, not masked off
    // -----------------------------------------------------------------------

    /// @dev Bit 31 has no meaning in `tinjau.risk/1.0.0`. If a newer schema gave it one — the
    /// dangerous case being something like "the evidence behind this record was retracted" —
    /// then dropping it and reporting the rest would make the record read as though that fact
    /// never existed. The consumer reverts instead, and the lying registry's benign NORMAL is
    /// never returned to a caller.
    function test_anUndefinedReasonBitIsRefusedNotMaskedOff() public {
        LyingRegistry lying = new LyingRegistry();
        ExampleRiskConsumer strict =
            new ExampleRiskConsumer(ITinjauRiskRegistry(address(lying)), asset, poolId);

        TinjauRiskTypes.RiskRecord memory r;
        r.asset = asset;
        r.poolId = poolId;
        r.state = TinjauRiskTypes.RiskState.Normal;
        r.assessedAt = uint64(block.timestamp);
        r.expiresAt = uint64(block.timestamp + 1000);
        r.reasonBits = TinjauRiskTypes.REASON_OFFICIAL_FILING | uint32(1 << 31);
        lying.setRecord(r);

        vm.expectRevert(abi.encodeWithSelector(TinjauRiskTypes.UnknownReasonBits.selector, r.reasonBits));
        strict.currentRiskState();

        vm.expectRevert(abi.encodeWithSelector(TinjauRiskTypes.UnknownReasonBits.selector, r.reasonBits));
        strict.shouldPause();

        vm.expectRevert(abi.encodeWithSelector(TinjauRiskTypes.UnknownReasonBits.selector, r.reasonBits));
        strict.currentProtection();

        // Every bit defined in this schema still passes, so the refusal is targeted rather
        // than a blanket distrust of records that carry reasons at all.
        r.reasonBits = TinjauRiskTypes.REASON_ALL_DEFINED;
        lying.setRecord(r);
        assertTrue(strict.currentRiskState() == TinjauRiskTypes.RiskState.Normal);
    }

    // -----------------------------------------------------------------------
    // Schema and ABI drift
    // -----------------------------------------------------------------------

    /// @dev Enum ordinals and struct layout are only guaranteed within one schema version.
    /// Deploying against a registry that reports a different one would let this consumer
    /// decode a foreign layout and return a confident wrong answer, so it refuses to deploy.
    function test_aForeignSchemaVersionIsRefusedAtDeployment() public {
        LyingRegistry lying = new LyingRegistry();
        lying.setSchemaVersion("tinjau.risk/2.0.0");

        vm.expectRevert(
            abi.encodeWithSelector(
                ExampleRiskConsumer.SchemaMismatch.selector,
                TinjauRiskTypes.SCHEMA_VERSION,
                bytes32("tinjau.risk/2.0.0")
            )
        );
        new ExampleRiskConsumer(ITinjauRiskRegistry(address(lying)), asset, poolId);
    }

    /// @dev `ITinjauRiskRegistry` is hand-declared in the example so a third party can copy
    /// two files and compile. Hand-declared means it can drift from the contract it claims to
    /// describe, and a drifted read decodes garbage rather than failing. This pins it: rename
    /// or re-type either side and these selectors stop matching.
    function test_theExampleInterfaceMatchesTheRealRegistry() public pure {
        assertEq(
            ITinjauRiskRegistry.currentRecord.selector,
            TinjauRiskRegistry.currentRecord.selector,
            "currentRecord signature drifted"
        );
        assertEq(
            ITinjauRiskRegistry.effectiveState.selector,
            TinjauRiskRegistry.effectiveState.selector,
            "effectiveState signature drifted"
        );
        assertEq(
            ITinjauRiskRegistry.schemaVersion.selector,
            TinjauRiskRegistry.schemaVersion.selector,
            "schemaVersion signature drifted"
        );
    }
}
