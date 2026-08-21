// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TinjauRiskTypes} from "../src/TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "../src/TinjauRiskPolicy.sol";
import {TinjauRiskRegistry} from "../src/TinjauRiskRegistry.sol";

/// @notice Enforcement coverage for the risk registry (task T1.5).
///
/// The mandatory property is `testFuzz_rumorOnlyEvidenceCanNeverReachProtect`. Everything
/// else here is a boundary: nonce, signature, deadline, expiry, supported asset, pause,
/// cooldown, and the no-ratcheting rule for a continuing protection.
///
/// The trust model these tests encode: the off-chain assessor may be compromised. So it is
/// not enough that the TypeScript engine refuses to emit a rumour-driven PROTECT — the
/// contract must refuse to accept one even when correctly signed by the real assessor key.
contract TinjauRiskRegistryTest is Test {
    TinjauRiskRegistry internal registry;

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
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// @dev Timestamps are taken as an explicit parameter rather than read from
    /// `block.timestamp` inside this helper. Under `via_ir` the optimiser is free to hoist a
    /// `block.timestamp` read across a `vm.warp` cheatcode — it has no way to know the
    /// cheatcode mutates block context — which silently produced assessments stamped with a
    /// pre-warp time. Passing the time in removes the ambiguity entirely.
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

    function _assessment(TinjauRiskTypes.RiskState state, uint256 nonce)
        internal
        view
        returns (TinjauRiskRegistry.Assessment memory)
    {
        return _assessmentAt(state, nonce, block.timestamp);
    }

    function _sign(TinjauRiskRegistry.Assessment memory a, uint256 pk)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, registry.hashAssessment(a));
        return abi.encodePacked(r, s, v);
    }

    function _post(TinjauRiskRegistry.Assessment memory a) internal {
        registry.postAssessment(a, _sign(a, assessorKey));
    }

    // -----------------------------------------------------------------------
    // THE MANDATORY PROPERTY — rumour-only can never reach the aggressive path
    // -----------------------------------------------------------------------

    /// @dev Fuzzed across confidence, data mode, timing and every other reason bit. The only
    /// fixed facts are that the state requested is PROTECT, the signature is genuine, and
    /// `REASON_RUMOR_ONLY` is set. If any combination gets through, the invariant is broken.
    function testFuzz_rumorOnlyEvidenceCanNeverReachProtect(
        uint8 rawConfidence,
        uint8 rawDataMode,
        uint32 otherReasonBits,
        uint64 lifetime,
        uint256 nonce
    ) public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Protect, nonce);
        a.confidence = TinjauRiskTypes.ConfidenceBand(bound(rawConfidence, 1, 3));
        a.dataMode = TinjauRiskTypes.DataMode(bound(rawDataMode, 1, 4));
        a.expiresAt = uint64(block.timestamp + bound(lifetime, 1, 100_000));

        // Any other defined reasons may accompany it; the rumour bit is what must block.
        a.reasonBits =
            (otherReasonBits & TinjauRiskTypes.REASON_ALL_DEFINED) | TinjauRiskTypes.REASON_RUMOR_ONLY;

        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert();
        registry.postAssessment(a, sig_);

        // And nothing was recorded: the state stays at the safe default.
        TinjauRiskTypes.RiskRecord memory rec = registry.currentRecord(asset, poolId);
        assertTrue(rec.state == TinjauRiskTypes.RiskState.Normal);
        assertEq(rec.assessedAt, 0, "a rejected assessment must leave no record at all");
    }

    /// @dev The complement: rumour evidence may still raise a WATCH. Containment means
    /// "cannot authorise an action", not "cannot be recorded" — losing the record would hide
    /// the reason monitoring was raised.
    function test_rumorEvidenceMayStillRaiseWatch() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        a.reasonBits = TinjauRiskTypes.REASON_RUMOR_ONLY;
        _post(a);

        TinjauRiskTypes.RiskRecord memory rec = registry.currentRecord(asset, poolId);
        assertTrue(rec.state == TinjauRiskTypes.RiskState.Watch);
        assertEq(rec.reasonBits & TinjauRiskTypes.REASON_RUMOR_ONLY, TinjauRiskTypes.REASON_RUMOR_ONLY);

        // And crucially, WATCH buys no fee change.
        (, uint24 fee,) = registry.effectiveState(asset, poolId);
        assertEq(fee, 500);
    }

    // -----------------------------------------------------------------------
    // Market confirmation is re-checked on chain, not taken on trust
    // -----------------------------------------------------------------------

    function testFuzz_protectRequiresExactConfirmation(uint8 rawStatus) public {
        uint8 status = uint8(bound(rawStatus, 1, 3)); // NotConfirmed, Unavailable, Stale
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Protect, 1);
        a.confirmation = TinjauRiskTypes.ConfirmationStatus(status);

        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert(
            abi.encodeWithSelector(
                TinjauRiskRegistry.ProtectRequiresConfirmation.selector, a.confirmation
            )
        );
        registry.postAssessment(a, sig_);
    }

    // -----------------------------------------------------------------------
    // Signature and replay
    // -----------------------------------------------------------------------

    function test_wrongSignerIsRejected() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Protect, 1);
        bytes memory sig_ = _sign(a, 0xBAD);
        vm.expectRevert(TinjauRiskRegistry.BadSignature.selector);
        registry.postAssessment(a, sig_);
    }

    function test_tamperedFieldInvalidatesTheSignature() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        bytes memory sig = _sign(a, assessorKey);

        a.state = TinjauRiskTypes.RiskState.Protect; // relay tries to upgrade the state
        vm.expectRevert(TinjauRiskRegistry.BadSignature.selector);
        registry.postAssessment(a, sig);
    }

    function test_malformedSignatureLengthIsRejected() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        vm.expectRevert(TinjauRiskRegistry.BadSignature.selector);
        registry.postAssessment(a, hex"1234");
    }

    function test_nonceCannotBeReplayed() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 7);
        _post(a);

        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert(abi.encodeWithSelector(TinjauRiskRegistry.NonceAlreadyUsed.selector, uint256(7)));
        registry.postAssessment(a, sig_);
    }

    function test_expiredDeadlineIsRejected() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        vm.warp(a.deadline + 1);
        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert();
        registry.postAssessment(a, sig_);
    }

    function test_alreadyExpiredAssessmentIsRejected() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        a.expiresAt = uint64(block.timestamp); // expires the moment it lands
        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert();
        registry.postAssessment(a, sig_);
    }

    function test_anOlderAssessmentCannotOverwriteANewerOne() public {
        TinjauRiskRegistry.Assessment memory newer = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        _post(newer);

        TinjauRiskRegistry.Assessment memory older = _assessment(TinjauRiskTypes.RiskState.Normal, 2);
        older.assessedAt = newer.assessedAt - 10; // arrived late, assessed earlier
        bytes memory sig_ = _sign(older, assessorKey);
        vm.expectRevert(
            abi.encodeWithSelector(
                TinjauRiskRegistry.StaleAssessment.selector, older.assessedAt, newer.assessedAt
            )
        );
        registry.postAssessment(older, sig_);
    }

    // -----------------------------------------------------------------------
    // Supported asset and evidence commitment
    // -----------------------------------------------------------------------

    function test_unsupportedAssetIsRejected() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        a.asset = address(0xDEAD);
        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert(
            abi.encodeWithSelector(TinjauRiskRegistry.UnsupportedAsset.selector, address(0xDEAD))
        );
        registry.postAssessment(a, sig_);
    }

    function test_recordMustCommitToItsEvidence() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        a.evidenceCommitment = bytes32(0);
        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert(TinjauRiskRegistry.ZeroEvidenceCommitment.selector);
        registry.postAssessment(a, sig_);
    }

    function test_undefinedReasonBitsAreRejected() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        a.reasonBits = uint32(1 << 31); // no reason occupies bit 31
        bytes memory sig_ = _sign(a, assessorKey);
        vm.expectRevert();
        registry.postAssessment(a, sig_);
    }

    // -----------------------------------------------------------------------
    // Pause — blocks new protections, preserves everything else
    // -----------------------------------------------------------------------

    function test_pauseBlocksNewProtectionButNotWatchOrHistory() public {
        TinjauRiskRegistry.Assessment memory watch = _assessment(TinjauRiskTypes.RiskState.Watch, 1);
        _post(watch);

        vm.prank(guardian);
        registry.setPaused(true);

        TinjauRiskRegistry.Assessment memory protect = _assessment(TinjauRiskTypes.RiskState.Protect, 2);
        bytes memory sig_ = _sign(protect, assessorKey);
        vm.expectRevert(TinjauRiskRegistry.ProtectionPaused.selector);
        registry.postAssessment(protect, sig_);

        // Monitoring still works while paused — pause is not a mute button.
        TinjauRiskRegistry.Assessment memory watch2 = _assessment(TinjauRiskTypes.RiskState.Watch, 3);
        _post(watch2);

        // And no history was destroyed.
        assertEq(registry.historyLength(asset, poolId), 2);
    }

    function test_pauseDoesNotCancelAProtectionAlreadyRunning() public {
        TinjauRiskRegistry.Assessment memory protect = _assessment(TinjauRiskTypes.RiskState.Protect, 1);
        _post(protect);

        vm.prank(guardian);
        registry.setPaused(true);

        // §0.7: an active bounded policy runs its original course. Pausing stops NEW actions;
        // it does not reach back and cancel one in flight.
        vm.warp(block.timestamp + 100);
        (TinjauRiskTypes.RiskState state, uint24 fee,) = registry.effectiveState(asset, poolId);
        assertTrue(state == TinjauRiskTypes.RiskState.Protect);
        assertEq(fee, 20_000);
    }

    function test_onlyGuardianMayPauseOrRotate() public {
        vm.expectRevert(TinjauRiskRegistry.NotGuardian.selector);
        registry.setPaused(true);

        vm.expectRevert(TinjauRiskRegistry.NotGuardian.selector);
        registry.rotateAssessor(address(0xB0B));
    }

    // -----------------------------------------------------------------------
    // Cooldown and the no-ratcheting rule
    // -----------------------------------------------------------------------

    function test_cooldownBlocksImmediateReArming() public {
        uint256 t0 = 1_000_000;
        _post(_assessmentAt(TinjauRiskTypes.RiskState.Protect, 1, t0));

        // Stand the protection down.
        uint256 t1 = t0 + 100;
        vm.warp(t1);
        _post(_assessmentAt(TinjauRiskTypes.RiskState.Normal, 2, t1));

        // Immediately trying again is refused.
        TinjauRiskRegistry.Assessment memory retry = _assessmentAt(TinjauRiskTypes.RiskState.Protect, 3, t1);
        bytes memory sig_ = _sign(retry, assessorKey);
        vm.expectRevert(abi.encodeWithSelector(TinjauRiskRegistry.CooldownActive.selector, uint64(t1), uint32(3600)));
        registry.postAssessment(retry, sig_);

        // After the cooldown it is allowed.
        uint256 t2 = t1 + 3600;
        vm.warp(t2);
        _post(_assessmentAt(TinjauRiskTypes.RiskState.Protect, 4, t2));
        assertTrue(registry.currentRecord(asset, poolId).state == TinjauRiskTypes.RiskState.Protect);
    }

    /// @dev The rule that keeps a bounded action bounded. Refreshing an ongoing protection
    /// must not move its start forward, or an assessor posting every minute could hold the
    /// fee at the ceiling forever while every individual write looked legitimate.
    function test_refreshingAProtectionCannotRatchetItsDurationForward() public {
        uint256 t = 1_000_000;
        _post(_assessmentAt(TinjauRiskTypes.RiskState.Protect, 1, t));
        uint64 originalStart = registry.currentRecord(asset, poolId).protectStartedAt;

        for (uint256 i = 2; i < 8; i++) {
            t += 1000;
            vm.warp(t);
            _post(_assessmentAt(TinjauRiskTypes.RiskState.Protect, i, t));
            assertEq(
                registry.currentRecord(asset, poolId).protectStartedAt,
                originalStart,
                "a refresh moved the protection start forward"
            );
        }

        // Past the cap it is baseline, however many refreshes were posted.
        vm.warp(uint256(originalStart) + 21_600);
        (, uint24 fee,) = registry.effectiveState(asset, poolId);
        assertEq(fee, 500, "refreshes extended protection beyond the duration cap");
    }

    // -----------------------------------------------------------------------
    // Readability by a third party
    // -----------------------------------------------------------------------

    function test_aThirdPartyCanReadEverythingItNeedsWithoutTheDashboard() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Protect, 1);
        _post(a);

        TinjauRiskTypes.RiskRecord memory rec = registry.currentRecord(asset, poolId);
        assertEq(rec.asset, asset);
        assertEq(rec.poolId, poolId);
        assertTrue(rec.state == TinjauRiskTypes.RiskState.Protect);
        assertEq(rec.reasonBits, a.reasonBits);
        assertEq(rec.evidenceCommitment, a.evidenceCommitment);
        assertTrue(rec.confidence == TinjauRiskTypes.ConfidenceBand.High);
        assertEq(rec.expiresAt, a.expiresAt);
        assertEq(rec.policyVersion, TinjauRiskPolicy.POLICY_VERSION);
        assertEq(registry.schemaVersion(), TinjauRiskTypes.SCHEMA_VERSION);
    }

    function test_historyIsAppendOnlyAndSurvivesRecovery() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Watch, 1));
        vm.warp(block.timestamp + 10);
        _post(_assessment(TinjauRiskTypes.RiskState.Protect, 2));
        vm.warp(block.timestamp + 10);
        _post(_assessment(TinjauRiskTypes.RiskState.Normal, 3));

        assertEq(registry.historyLength(asset, poolId), 3);
        assertTrue(registry.historyAt(asset, poolId, 0).state == TinjauRiskTypes.RiskState.Watch);
        assertTrue(registry.historyAt(asset, poolId, 1).state == TinjauRiskTypes.RiskState.Protect);
        assertTrue(registry.historyAt(asset, poolId, 2).state == TinjauRiskTypes.RiskState.Normal);
    }

    function test_anUnassessedAssetReadsAsNormalWithNoTimestamp() public view {
        TinjauRiskTypes.RiskRecord memory rec = registry.currentRecord(address(0xFFFF), poolId);
        assertTrue(rec.state == TinjauRiskTypes.RiskState.Normal, "the default must be the safe state");
        assertEq(rec.assessedAt, 0, "assessedAt == 0 is how 'never written' is distinguished");
    }

    function test_effectiveStateLapsesOnceExpiryPasses() public {
        TinjauRiskRegistry.Assessment memory a = _assessment(TinjauRiskTypes.RiskState.Protect, 1);
        a.expiresAt = uint64(block.timestamp + 500);
        _post(a);

        (TinjauRiskTypes.RiskState before,,) = registry.effectiveState(asset, poolId);
        assertTrue(before == TinjauRiskTypes.RiskState.Protect);

        vm.warp(block.timestamp + 500);
        (TinjauRiskTypes.RiskState lapsed, uint24 fee,) = registry.effectiveState(asset, poolId);
        assertTrue(lapsed == TinjauRiskTypes.RiskState.Normal);
        assertEq(fee, 500);

        // The stored record is untouched — a read never rewrites history.
        assertTrue(registry.currentRecord(asset, poolId).state == TinjauRiskTypes.RiskState.Protect);
    }
}
