// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TinjauRiskTypes} from "../src/TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "../src/TinjauRiskPolicy.sol";

/// @notice Property and fuzz coverage for the bounded-action envelope (task T1.5).
///
/// The library is pure, so these tests exercise the arithmetic directly rather than through
/// hook plumbing. That matters: the guarantees are about the math, and testing them through
/// a pool would only prove that one call path happens to be safe.
contract TinjauRiskPolicyTest is Test {
    TinjauRiskPolicy.Envelope internal env;

    function setUp() public {
        // The values actually deployed on the historical hook, so the tests bind the
        // envelope the product really runs rather than a convenient one.
        env = TinjauRiskPolicy.Envelope({
            baseFee: 500,
            maxFee: 20_000,
            widenDuration: 3600,
            decayDuration: 18_000,
            maxProtectDuration: 21_600,
            cooldown: 3600
        });
    }

    function _record(
        TinjauRiskTypes.RiskState state,
        TinjauRiskTypes.ConfidenceBand confidence,
        uint64 protectStartedAt,
        uint64 expiresAt
    ) internal pure returns (TinjauRiskTypes.RiskRecord memory r) {
        r.asset = address(0xA11CE);
        r.poolId = bytes32(uint256(1));
        r.state = state;
        r.confidence = confidence;
        r.dataMode = TinjauRiskTypes.DataMode.Replay;
        r.confirmation = TinjauRiskTypes.ConfirmationStatus.Confirmed;
        r.assessedAt = protectStartedAt;
        r.expiresAt = expiresAt;
        r.protectStartedAt = protectStartedAt;
        r.evidenceCommitment = bytes32(uint256(0xE1));
        r.policyVersion = TinjauRiskPolicy.POLICY_VERSION;
    }

    // -----------------------------------------------------------------------
    // Guarantee 1 — non-PROTECT states can never widen the fee
    // -----------------------------------------------------------------------

    /// @dev This is §0.7's "WATCH must not invoke the aggressive fee" as a property. It is
    /// fuzzed over confidence, requested fee and time precisely because a future refactor is
    /// most likely to break it by adding a branch that reads confidence before checking state.
    function testFuzz_nonProtectStatesAlwaysReturnBaseFee(
        uint8 rawState,
        uint8 rawConfidence,
        uint24 requestedFee,
        uint64 startedAt,
        uint256 nowTs
    ) public view {
        TinjauRiskTypes.RiskState state =
            TinjauRiskTypes.RiskState(bound(rawState, 0, 1)); // Normal or Watch only
        TinjauRiskTypes.ConfidenceBand confidence =
            TinjauRiskTypes.ConfidenceBand(bound(rawConfidence, 0, 3));

        TinjauRiskTypes.RiskRecord memory r = _record(state, confidence, startedAt, type(uint64).max);
        uint24 fee = TinjauRiskPolicy.effectiveFee(r, requestedFee, nowTs, env);

        assertEq(fee, env.baseFee, "a non-PROTECT state widened the fee");
    }

    // -----------------------------------------------------------------------
    // Guarantee 2 — the band is inescapable
    // -----------------------------------------------------------------------

    function testFuzz_effectiveFeeNeverEscapesBand(
        uint8 rawState,
        uint8 rawConfidence,
        uint24 requestedFee,
        uint64 startedAt,
        uint64 expiresAt,
        uint256 nowTs
    ) public view {
        TinjauRiskTypes.RiskState state = TinjauRiskTypes.RiskState(bound(rawState, 0, 2));
        TinjauRiskTypes.ConfidenceBand confidence =
            TinjauRiskTypes.ConfidenceBand(bound(rawConfidence, 0, 3));

        TinjauRiskTypes.RiskRecord memory r = _record(state, confidence, startedAt, expiresAt);
        uint24 fee = TinjauRiskPolicy.effectiveFee(r, requestedFee, nowTs, env);

        assertGe(fee, env.baseFee, "fee fell below the floor");
        assertLe(fee, env.maxFee, "fee escaped the ceiling");
    }

    // -----------------------------------------------------------------------
    // Guarantee 4 — a proposal may only lower the fee
    // -----------------------------------------------------------------------

    /// @dev The concrete form of "the LLM cannot select an arbitrary fee". Whatever the
    /// off-chain proposer asks for, the result can never exceed what the policy would have
    /// chosen on its own.
    function testFuzz_requestCanOnlyLowerNeverRaise(
        uint8 rawConfidence,
        uint24 requestedFee,
        uint32 elapsed
    ) public view {
        TinjauRiskTypes.ConfidenceBand confidence =
            TinjauRiskTypes.ConfidenceBand(bound(rawConfidence, 1, 3));
        uint64 startedAt = 1_000_000;
        uint256 nowTs = uint256(startedAt) + bound(elapsed, 0, env.maxProtectDuration);

        TinjauRiskTypes.RiskRecord memory r =
            _record(TinjauRiskTypes.RiskState.Protect, confidence, startedAt, type(uint64).max);

        uint24 unconstrained = TinjauRiskPolicy.effectiveFee(r, 0, nowTs, env);
        uint24 withRequest = TinjauRiskPolicy.effectiveFee(r, requestedFee, nowTs, env);

        assertLe(withRequest, unconstrained, "a request raised the fee above the policy target");
    }

    // -----------------------------------------------------------------------
    // Guarantee 3 — protection is time-bounded and recovers deterministically
    // -----------------------------------------------------------------------

    function test_feeHoldsThenDecaysThenReturnsToBaseline() public view {
        uint64 startedAt = 1_000_000;
        TinjauRiskTypes.RiskRecord memory r = _record(
            TinjauRiskTypes.RiskState.Protect,
            TinjauRiskTypes.ConfidenceBand.High,
            startedAt,
            type(uint64).max
        );

        uint24 atStart = TinjauRiskPolicy.effectiveFee(r, 0, startedAt, env);
        uint24 atWidenEnd = TinjauRiskPolicy.effectiveFee(r, 0, startedAt + env.widenDuration, env);
        uint24 midDecay =
            TinjauRiskPolicy.effectiveFee(r, 0, startedAt + env.widenDuration + env.decayDuration / 2, env);
        uint24 atCap = TinjauRiskPolicy.effectiveFee(r, 0, startedAt + env.maxProtectDuration, env);

        assertEq(atStart, env.maxFee, "HIGH confidence should reach the ceiling");
        assertEq(atWidenEnd, env.maxFee, "the fee must hold flat through the widen window");
        assertLt(midDecay, atWidenEnd, "the fee must be decaying");
        assertGt(midDecay, env.baseFee, "mid-decay should not already be at baseline");
        assertEq(atCap, env.baseFee, "protection must be fully recovered by the duration cap");
    }

    /// @dev No caller, oracle or model decides when protection stops. Past the cap it is
    /// baseline for every possible later timestamp.
    function testFuzz_protectionNeverOutlivesTheDurationCap(uint32 extra, uint8 rawConfidence) public view {
        uint64 startedAt = 1_000_000;
        TinjauRiskTypes.ConfidenceBand confidence =
            TinjauRiskTypes.ConfidenceBand(bound(rawConfidence, 0, 3));
        uint256 nowTs = uint256(startedAt) + env.maxProtectDuration + bound(extra, 0, type(uint32).max);

        TinjauRiskTypes.RiskRecord memory r =
            _record(TinjauRiskTypes.RiskState.Protect, confidence, startedAt, type(uint64).max);

        assertEq(TinjauRiskPolicy.effectiveFee(r, 0, nowTs, env), env.baseFee);
    }

    function test_expiryEndsProtectionEvenInsideTheDurationCap() public view {
        uint64 startedAt = 1_000_000;
        uint64 expiresAt = startedAt + 600; // well inside widenDuration
        TinjauRiskTypes.RiskRecord memory r = _record(
            TinjauRiskTypes.RiskState.Protect, TinjauRiskTypes.ConfidenceBand.High, startedAt, expiresAt
        );

        assertEq(TinjauRiskPolicy.effectiveFee(r, 0, expiresAt - 1, env), env.maxFee);
        assertEq(TinjauRiskPolicy.effectiveFee(r, 0, expiresAt, env), env.baseFee, "expiry must end it");
    }

    function test_malformedProtectRecordsFailClosed() public view {
        // A Protect with no recorded start cannot be time-bounded, so it authorises nothing.
        TinjauRiskTypes.RiskRecord memory noStart = _record(
            TinjauRiskTypes.RiskState.Protect, TinjauRiskTypes.ConfidenceBand.High, 0, type(uint64).max
        );
        assertEq(TinjauRiskPolicy.effectiveFee(noStart, 0, 1_000_000, env), env.baseFee);

        // A future-dated start must not widen either.
        TinjauRiskTypes.RiskRecord memory future = _record(
            TinjauRiskTypes.RiskState.Protect,
            TinjauRiskTypes.ConfidenceBand.High,
            2_000_000,
            type(uint64).max
        );
        assertEq(TinjauRiskPolicy.effectiveFee(future, 0, 1_000_000, env), env.baseFee);

        // Unknown confidence yields no widening rather than a guess.
        TinjauRiskTypes.RiskRecord memory unknown = _record(
            TinjauRiskTypes.RiskState.Protect,
            TinjauRiskTypes.ConfidenceBand.Unknown,
            1_000_000,
            type(uint64).max
        );
        assertEq(TinjauRiskPolicy.effectiveFee(unknown, 0, 1_000_100, env), env.baseFee);
    }

    // -----------------------------------------------------------------------
    // Confidence ordering and cooldown
    // -----------------------------------------------------------------------

    function test_higherConfidenceNeverYieldsLowerProtection() public view {
        uint64 startedAt = 1_000_000;
        uint24 low = TinjauRiskPolicy.effectiveFee(
            _record(TinjauRiskTypes.RiskState.Protect, TinjauRiskTypes.ConfidenceBand.Low, startedAt, type(uint64).max),
            0,
            startedAt,
            env
        );
        uint24 medium = TinjauRiskPolicy.effectiveFee(
            _record(
                TinjauRiskTypes.RiskState.Protect, TinjauRiskTypes.ConfidenceBand.Medium, startedAt, type(uint64).max
            ),
            0,
            startedAt,
            env
        );
        uint24 high = TinjauRiskPolicy.effectiveFee(
            _record(
                TinjauRiskTypes.RiskState.Protect, TinjauRiskTypes.ConfidenceBand.High, startedAt, type(uint64).max
            ),
            0,
            startedAt,
            env
        );

        assertLe(low, medium);
        assertLe(medium, high);
        assertLe(high, env.maxFee);
    }

    function test_cooldownGate() public view {
        assertTrue(TinjauRiskPolicy.cooldownSatisfied(0, 1_000_000, env), "never protected before");
        assertFalse(TinjauRiskPolicy.cooldownSatisfied(1_000_000, 1_000_000 + env.cooldown - 1, env));
        assertTrue(TinjauRiskPolicy.cooldownSatisfied(1_000_000, 1_000_000 + env.cooldown, env));
        // Clock skew fails closed rather than granting a free re-arm.
        assertFalse(TinjauRiskPolicy.cooldownSatisfied(1_000_000, 999_999, env));
    }

    // -----------------------------------------------------------------------
    // Envelope validation
    // -----------------------------------------------------------------------

    function test_envelopeValidationRejectsUnhonourableConfigurations() public {
        TinjauRiskPolicy.Envelope memory inverted = env;
        inverted.maxFee = 100; // below baseFee
        vm.expectRevert(
            abi.encodeWithSelector(TinjauRiskPolicy.EnvelopeInverted.selector, uint24(500), uint24(100))
        );
        this.callValidate(inverted);

        // A cap shorter than widen+decay would truncate the recovery curve, so the
        // "deterministic decay" claim would not hold.
        TinjauRiskPolicy.Envelope memory truncated = env;
        truncated.maxProtectDuration = 1000;
        vm.expectRevert(
            abi.encodeWithSelector(
                TinjauRiskPolicy.MaxDurationBelowDecayWindow.selector, uint32(1000), uint32(21_600)
            )
        );
        this.callValidate(truncated);
    }

    /// @dev External wrapper so `vm.expectRevert` can observe a library revert.
    function callValidate(TinjauRiskPolicy.Envelope memory e) external pure {
        TinjauRiskPolicy.validateEnvelope(e);
    }
}
