// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EventStateRegistry} from "./EventStateRegistry.sol";

/// @title AfterhoursFeePolicy
/// @notice Pure fee-calculation logic for the AFTERHOURS Uniswap v4 hook (task P4.1).
/// Deliberately factored out of the hook contract into a pure library so the single most
/// important property of this system — "severity can never push the fee outside the
/// hard-coded band" — can be unit-tested directly against the math, independent of
/// PoolManager/hook plumbing.
///
/// @dev DESIGN SUMMARY (read this before reading the code):
///
/// Fee units follow Uniswap v4's `LPFeeLibrary` convention: a `uint24` in hundredths of a
/// bip, capped at 1_000_000 (100%). E.g. 500 = 0.05%, 20_000 = 2%.
///
/// The policy is deliberately two-layered, matching the task's requirement that the
/// severity grade may only modulate *within* a band whose edges are set by BONDED fields:
///
///   1. BONDED LAYER (hard-controls the band position): `eventType` and the per-field
///      `agreement` level (both bonded, disputable fields on the registry) determine a
///      "concern tier" (0..3) via `concernTier()`. Higher tier = more severe/less certain
///      event = fee target moves further toward `maxFee`. This tier, plus how much time has
///      elapsed since the event was posted, determines a `widenedFee` anchor via
///      `timeDecayedFee()` — this anchor is ALREADY guaranteed to sit in [baseFee, maxFee]
///      by construction (see proof in `concernTier`/`targetFeeForTier` docs below).
///
///   2. UNBONDED LAYER (severity, modulates only WITHIN the band): `computeFee()` takes the
///      bonded-layer anchor and lets the registry's unbonded `severity.severity` (an int8,
///      off-chain judgment, NOT provable against the source document) nudge the fee up or
///      down by at most `SEVERITY_INFLUENCE_BPS` of the total band width. Critically, the
///      nudge is computed in signed 256-bit arithmetic and then the FINAL result is clamped
///      into `[baseFee, maxFee]` with `_clamp()` before ever being cast back to `uint24`.
///      This means even a maximally adversarial `severity` value (the full `int8` range,
///      -128..127, not just the "documented" -100..100 range) cannot push the returned fee
///      outside the band — see `AfterhoursFeeHookTest.t.sol` /
///      `AfterhoursFeePolicy.t.sol::testFuzz_computeFee_neverEscapesBand` for the property
///      test that exercises exactly this.
library AfterhoursFeePolicy {
    /// @notice Max fraction of the total band width (maxFee - baseFee) that the unbonded
    /// severity grade may swing the fee by, expressed in basis points of the band width.
    /// 2000 = 20%. This is intentionally modest: severity is unbonded judgment and should
    /// nudge, not dominate, a fee level that bonded fields already set.
    uint256 internal constant SEVERITY_INFLUENCE_BPS = 2000;

    /// @notice Denominator matching the "documented" severity range in
    /// `EventStateRegistry.SeverityGrade` (-100..+100). Values outside this range (the
    /// `int8` type technically allows -128..127) are intentionally NOT re-clamped before use
    /// here — letting them overshoot pre-clamp is exactly what proves the final `_clamp()`
    /// step in `computeFee()` is doing real work, rather than the input already being tame.
    int256 internal constant SEVERITY_RANGE = 100;

    /// @notice How many discrete concern tiers `concernTier()` can return (0..3 inclusive).
    uint8 internal constant MAX_TIER = 3;

    // ---------------------------------------------------------------------
    // Layer 1 (bonded): event type + agreement -> concern tier -> time-decayed anchor fee
    // ---------------------------------------------------------------------

    /// @notice Classifies the BONDED fields of an event into a coarse 0..3 "concern tier".
    /// Higher tier means the fee anchor sits further toward `maxFee`.
    /// @dev Classification is intentionally simple/explainable for the MVP:
    ///   - Tier 3: filings that historically precede the most severe repricing (bankruptcy,
    ///     delisting risk, restatement of previously issued financials).
    ///   - Tier 2: M&A activity and executive/leadership changes — meaningful but less
    ///     acutely destabilizing than tier 3 on average.
    ///   - Tier 1: routine material events, earnings releases, and insider Form 4 trades.
    ///   - Tier 0: unknown/unclassified events — treated as lowest concern rather than
    ///     highest, since an unrecognized event type should not automatically justify the
    ///     widest fee; the poster/challenge mechanism is the right lever for miscategorized
    ///     events, not the fee hook.
    /// Independently of the base classification, if ANY of the core bonded fields
    /// (eventType, effectiveDate, declaredAmount, affectedToken) has an agreement level
    /// below 2-of-3 parses, the tier is bumped up by one (capped at `MAX_TIER`) — weak
    /// consensus on the facts is itself a reason for caution, so it widens (never narrows)
    /// the fee. A currently-open, unresolved challenge does the same: the bonded data is
    /// actively disputed, so treat it as less certain until resolved.
    function concernTier(
        EventStateRegistry.EventType eventType,
        EventStateRegistry.FieldAgreement memory agreement,
        bool isDisputedUnresolved
    ) internal pure returns (uint8 tier) {
        if (
            eventType == EventStateRegistry.EventType.Form8K_Bankruptcy
                || eventType == EventStateRegistry.EventType.Form8K_Delisting
                || eventType == EventStateRegistry.EventType.Form8K_Restatement
        ) {
            tier = 3;
        } else if (
            eventType == EventStateRegistry.EventType.Form8K_MAndA
                || eventType == EventStateRegistry.EventType.Form8K_ExecutiveChange
        ) {
            tier = 2;
        } else if (
            eventType == EventStateRegistry.EventType.Form8K_Material
                || eventType == EventStateRegistry.EventType.Form8K_Earnings
                || eventType == EventStateRegistry.EventType.Form4_InsiderBuy
                || eventType == EventStateRegistry.EventType.Form4_InsiderSell
        ) {
            tier = 1;
        } else {
            tier = 0;
        }

        uint8 minCoreAgreement = _min4(
            agreement.eventTypeAgreement,
            agreement.effectiveDateAgreement,
            agreement.declaredAmountAgreement,
            agreement.affectedTokenAgreement
        );

        bool weakConsensus = minCoreAgreement < 2;

        if ((weakConsensus || isDisputedUnresolved) && tier < MAX_TIER) {
            tier += 1;
        }
    }

    /// @notice Maps a concern tier to a target fee, linearly interpolated between `baseFee`
    /// and `maxFee`. Always within `[baseFee, maxFee]` by construction since `tier` is
    /// bounded to `[0, MAX_TIER]` by `concernTier()`.
    function targetFeeForTier(uint8 tier, uint24 baseFee, uint24 maxFee) internal pure returns (uint24) {
        if (tier > MAX_TIER) tier = MAX_TIER; // defensive; concernTier() never exceeds this
        if (maxFee <= baseFee) return baseFee; // degenerate config guard, band width 0
        uint256 span = uint256(maxFee) - uint256(baseFee);
        uint256 target = uint256(baseFee) + (span * tier) / MAX_TIER;
        // casting to 'uint24' is safe because target is a weighted average of baseFee and
        // maxFee (both uint24), so target <= maxFee < 2**24
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint24(target);
    }

    /// @notice Rate-limits how quickly the widened fee (from `targetFeeForTier`) decays back
    /// to `baseFee` after an event posts.
    /// @dev Fee stays at the full target for `widenDuration` seconds after `eventTimestamp`,
    /// then decays linearly back to `baseFee` over the following `decayDuration` seconds,
    /// then sits at `baseFee` indefinitely. Returns a value always within
    /// `[baseFee, targetFee]` (and therefore within `[baseFee, maxFee]`), so this function
    /// alone cannot escape the band either.
    /// @param eventTimestamp When the underlying event was posted (0 = no event; caller
    /// should treat that case as "always baseFee" rather than calling this).
    /// @param nowTimestamp The current block timestamp.
    function timeDecayedFee(
        uint24 targetFee,
        uint24 baseFee,
        uint256 eventTimestamp,
        uint256 nowTimestamp,
        uint256 widenDuration,
        uint256 decayDuration
    ) internal pure returns (uint24) {
        if (nowTimestamp <= eventTimestamp) return targetFee; // same-block post, fully widened
        uint256 elapsed = nowTimestamp - eventTimestamp;

        if (elapsed <= widenDuration) return targetFee;

        uint256 sinceDecayStart = elapsed - widenDuration;
        if (sinceDecayStart >= decayDuration || decayDuration == 0) return baseFee;

        // Linear decay: remainingFraction = (decayDuration - sinceDecayStart) / decayDuration
        uint256 span = uint256(targetFee) - uint256(baseFee); // targetFee >= baseFee always
        uint256 remaining = decayDuration - sinceDecayStart;
        uint256 decayedSpan = (span * remaining) / decayDuration;
        // casting to 'uint24' is safe because decayedSpan <= span = targetFee - baseFee, so
        // baseFee + decayedSpan <= targetFee <= maxFee < 2**24
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint24(uint256(baseFee) + decayedSpan);
    }

    // ---------------------------------------------------------------------
    // Layer 2 (unbonded): severity nudges within the band, then hard-clamped
    // ---------------------------------------------------------------------

    /// @notice The single entry point a hook should call: computes the full policy fee for
    /// an event, guaranteeing the result is always within `[baseFee, maxFee]` regardless of
    /// how extreme `severity` is.
    /// @param eventType Bonded classification field.
    /// @param agreement Bonded per-field agreement levels.
    /// @param severity UNBONDED severity/direction grade (may modulate within band only).
    /// @param isDisputedUnresolved Whether the event is currently under an open challenge.
    /// @param eventTimestamp When the event was posted; pass 0 (with hasEvent=false) if there
    /// is no event for this token at all.
    /// @param hasEvent Whether an event exists at all; if false, always returns `baseFee`.
    /// @param nowTimestamp Current block timestamp.
    /// @param baseFee Lower edge of the hard-coded band (e.g. 500 = 0.05%).
    /// @param maxFee Upper edge of the hard-coded band (e.g. 20_000 = 2%).
    /// @param widenDuration Seconds the fee stays fully widened after an event posts.
    /// @param decayDuration Seconds over which the fee linearly decays back to `baseFee`
    /// after `widenDuration` elapses.
    /// @return fee Always satisfies `baseFee <= fee <= maxFee`.
    function computeFee(
        EventStateRegistry.EventType eventType,
        EventStateRegistry.FieldAgreement memory agreement,
        EventStateRegistry.SeverityGrade memory severity,
        bool isDisputedUnresolved,
        uint256 eventTimestamp,
        bool hasEvent,
        uint256 nowTimestamp,
        uint24 baseFee,
        uint24 maxFee,
        uint256 widenDuration,
        uint256 decayDuration
    ) internal pure returns (uint24 fee) {
        if (!hasEvent || maxFee <= baseFee) return baseFee;

        uint8 tier = concernTier(eventType, agreement, isDisputedUnresolved);
        uint24 target = targetFeeForTier(tier, baseFee, maxFee);
        uint24 anchor = timeDecayedFee(target, baseFee, eventTimestamp, nowTimestamp, widenDuration, decayDuration);

        // Unbonded severity nudge, computed in signed arithmetic so it can push either
        // direction; deliberately NOT pre-clamped to the "documented" -100..100 range so
        // that an adversarial int8 extreme (-128 or 127) is exactly what exercises the
        // final _clamp() below.
        int256 bandWidth = int256(uint256(maxFee)) - int256(uint256(baseFee));
        // casting to 'int256' is safe: SEVERITY_INFLUENCE_BPS is a small compile-time
        // constant (2000), far below int256's range
        // forge-lint: disable-next-line(unsafe-typecast)
        int256 swing = (int256(severity.severity) * bandWidth * int256(SEVERITY_INFLUENCE_BPS))
            / (SEVERITY_RANGE * 10_000);

        int256 candidate = int256(uint256(anchor)) + swing;
        fee = _clamp(candidate, baseFee, maxFee);
    }

    /// @dev Clamps a signed candidate fee into `[lo, hi]` and casts down to uint24. This is
    /// the load-bearing safety function for the "never escapes the band" guarantee — every
    /// path in `computeFee()` funnels through here before returning.
    function _clamp(int256 candidate, uint24 lo, uint24 hi) internal pure returns (uint24) {
        if (candidate <= int256(uint256(lo))) return lo;
        if (candidate >= int256(uint256(hi))) return hi;
        // casting is safe: the two branches above have already returned for any candidate
        // outside (lo, hi), and lo/hi are both uint24, so candidate fits uint24 here
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint24(uint256(candidate));
    }

    function _min4(uint8 a, uint8 b, uint8 c, uint8 d) internal pure returns (uint8 m) {
        m = a;
        if (b < m) m = b;
        if (c < m) m = c;
        if (d < m) m = d;
    }
}
