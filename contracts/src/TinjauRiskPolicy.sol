// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TinjauRiskTypes} from "./TinjauRiskTypes.sol";

/// @title TinjauRiskPolicy
/// @notice The bounded-action envelope (task T1.3). Pure math, no storage, no external calls,
/// so the single property that matters most — "no input can produce a fee outside the band,
/// or a protection longer than the cap" — is unit- and fuzz-testable against the arithmetic
/// itself rather than through hook plumbing.
///
/// @dev RELATIONSHIP TO `AfterhoursFeePolicy`: that library is the deployed prototype. It maps
/// a filing's event type and parse agreement onto a fee. This one maps the FINAL risk state
/// onto a fee. They answer different questions and both remain in the tree: the old one is
/// still what the deployed hook at 0xbCb4B7…d8080 runs, and rewriting history to pretend
/// otherwise is forbidden by tracker §0.18.
///
/// @dev THE FOUR GUARANTEES, and where each is enforced:
///
///   1. `NORMAL` and `WATCH` always return `baseFee`. Enforced first, before any arithmetic,
///      so no later branch can widen a non-PROTECT state. This is §0.7's "WATCH forbids the
///      aggressive fee" made structural.
///   2. The fee never leaves `[baseFee, maxFee]`. Every return path funnels through `_clamp`.
///   3. Protection never outlives `maxProtectDuration`, nor the record's own `expiresAt`,
///      whichever comes first.
///   4. A proposal can only ever LOWER the fee. `requestedFee` is intersected with the
///      policy's own target via `min`, so an off-chain proposer — an LLM included — can ask
///      for less protection than the policy allows but never more. This is the concrete form
///      of "the LLM cannot select an arbitrary fee".
library TinjauRiskPolicy {
    using TinjauRiskTypes for TinjauRiskTypes.RiskState;

    /// @notice Version of this envelope's rules, ASCII in bytes32.
    /// Must equal `POLICY_VERSION` in `apps/server/src/risk/promotionConfig.ts`.
    bytes32 internal constant POLICY_VERSION = "tinjau.policy/1.0.0";

    /// @notice The immutable bounds an action may never exceed.
    /// @dev Passed in rather than hardcoded so tests can exercise degenerate configurations,
    /// but every consumer is expected to use the deployed values.
    struct Envelope {
        uint24 baseFee; // lower edge, e.g. 500 = 0.05%
        uint24 maxFee; // upper edge, e.g. 20_000 = 2%
        uint32 widenDuration; // seconds held fully widened after protection starts
        uint32 decayDuration; // seconds of linear decay back to baseFee
        uint32 maxProtectDuration; // hard cap on one protection interval
        uint32 cooldown; // minimum gap before protection may re-arm
    }

    error EnvelopeInverted(uint24 baseFee, uint24 maxFee);
    error MaxDurationBelowDecayWindow(uint32 maxProtectDuration, uint32 widenPlusDecay);

    /// @notice Rejects a configuration that could not honour the guarantees above.
    /// @dev A `maxProtectDuration` shorter than `widenDuration + decayDuration` would truncate
    /// the decay curve, so the fee would drop from mid-decay straight to baseline. That is not
    /// unsafe, but it is not the deterministic recovery the product claims, so it is refused
    /// rather than silently tolerated.
    function validateEnvelope(Envelope memory e) internal pure {
        if (e.maxFee < e.baseFee) revert EnvelopeInverted(e.baseFee, e.maxFee);
        uint32 span = e.widenDuration + e.decayDuration;
        if (e.maxProtectDuration < span) revert MaxDurationBelowDecayWindow(e.maxProtectDuration, span);
    }

    /// @notice The target fee a given confidence band may reach, inside the band.
    /// @dev Confidence modulates HOW MUCH protection, never WHETHER protection is allowed —
    /// that decision belongs entirely to the deterministic promotion rules. `Unknown` maps to
    /// `baseFee`, so an unwritten or malformed confidence yields no widening at all.
    function targetFeeForConfidence(TinjauRiskTypes.ConfidenceBand confidence, Envelope memory e)
        internal
        pure
        returns (uint24)
    {
        if (e.maxFee <= e.baseFee) return e.baseFee;
        uint256 span = uint256(e.maxFee) - uint256(e.baseFee);

        uint256 numerator;
        if (confidence == TinjauRiskTypes.ConfidenceBand.High) numerator = 3;
        else if (confidence == TinjauRiskTypes.ConfidenceBand.Medium) numerator = 2;
        else if (confidence == TinjauRiskTypes.ConfidenceBand.Low) numerator = 1;
        else return e.baseFee; // Unknown -> no widening

        // Safe: the result is a weighted average of two uint24 values, so it cannot exceed
        // maxFee and therefore cannot exceed 2**24.
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint24(uint256(e.baseFee) + (span * numerator) / 3);
    }

    /// @notice Deterministic widen-then-decay curve. Returns a value in `[baseFee, targetFee]`.
    /// @dev No LLM, oracle, or caller decides when protection ends. It is a function of
    /// elapsed time alone, which is what makes recovery provable rather than promised.
    function decayedFee(uint24 targetFee, uint24 baseFee, uint256 elapsed, Envelope memory e)
        internal
        pure
        returns (uint24)
    {
        if (targetFee <= baseFee) return baseFee;
        if (elapsed <= e.widenDuration) return targetFee;

        uint256 sinceDecayStart = elapsed - e.widenDuration;
        if (e.decayDuration == 0 || sinceDecayStart >= e.decayDuration) return baseFee;

        uint256 span = uint256(targetFee) - uint256(baseFee);
        uint256 remaining = e.decayDuration - sinceDecayStart;
        // Safe: decayedSpan <= span, so baseFee + decayedSpan <= targetFee <= maxFee < 2**24.
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint24(uint256(baseFee) + (span * remaining) / e.decayDuration);
    }

    /// @notice THE entry point. Computes the effective fee for a record at a point in time.
    ///
    /// @param record The stored risk record.
    /// @param requestedFee What the off-chain proposer asked for. May only lower the result;
    /// pass 0 to mean "no preference, use the policy target".
    /// @param nowTimestamp Current block time.
    /// @param e The envelope.
    /// @return fee Always satisfies `baseFee <= fee <= maxFee`, and equals `baseFee` for every
    /// state except an unexpired `Protect`.
    function effectiveFee(
        TinjauRiskTypes.RiskRecord memory record,
        uint24 requestedFee,
        uint256 nowTimestamp,
        Envelope memory e
    ) internal pure returns (uint24 fee) {
        // Guarantee 1, checked before anything else can widen the fee.
        if (record.state != TinjauRiskTypes.RiskState.Protect) return e.baseFee;

        // Degenerate or inverted envelope: refuse to widen rather than guess.
        if (e.maxFee <= e.baseFee) return e.baseFee;

        // Guarantee 3a: a record past its own expiry authorises nothing. Expiry is the
        // bounded course ENDING, which is different from data merely going missing — the
        // latter must never shorten a live protection, and does not reach this line.
        if (record.expiresAt != 0 && nowTimestamp >= record.expiresAt) return e.baseFee;

        // A Protect with no recorded start is malformed. Fail closed.
        if (record.protectStartedAt == 0) return e.baseFee;
        if (nowTimestamp < record.protectStartedAt) return e.baseFee; // future-dated, refuse

        uint256 elapsed = nowTimestamp - uint256(record.protectStartedAt);

        // Guarantee 3b: the hard duration cap, independent of the decay curve.
        if (elapsed >= e.maxProtectDuration) return e.baseFee;

        uint24 target = targetFeeForConfidence(record.confidence, e);

        // Guarantee 4: the proposal may only lower the fee, never raise it.
        if (requestedFee != 0 && requestedFee < target) target = requestedFee;

        uint24 decayed = decayedFee(target, e.baseFee, elapsed, e);

        // Guarantee 2: every path lands here.
        return _clamp(decayed, e.baseFee, e.maxFee);
    }

    /// @notice Whether a new protection may start, given when the last one ended.
    /// @dev Cooldown is a WRITE-side gate. It deliberately does not appear in `effectiveFee`:
    /// a protection that is already running must finish its bounded course, and applying
    /// cooldown at read time could cut one short.
    function cooldownSatisfied(uint64 lastProtectEndedAt, uint256 nowTimestamp, Envelope memory e)
        internal
        pure
        returns (bool)
    {
        if (lastProtectEndedAt == 0) return true; // never protected before
        if (nowTimestamp < lastProtectEndedAt) return false; // clock skew, fail closed
        return nowTimestamp - uint256(lastProtectEndedAt) >= e.cooldown;
    }

    /// @notice When a protection interval will end, as the earlier of its duration cap and
    /// the record's own expiry.
    function protectionEndsAt(TinjauRiskTypes.RiskRecord memory record, Envelope memory e)
        internal
        pure
        returns (uint64)
    {
        if (record.state != TinjauRiskTypes.RiskState.Protect || record.protectStartedAt == 0) return 0;
        uint256 byDuration = uint256(record.protectStartedAt) + uint256(e.maxProtectDuration);
        uint256 byExpiry = record.expiresAt == 0 ? type(uint256).max : uint256(record.expiresAt);
        uint256 endsAt = byDuration < byExpiry ? byDuration : byExpiry;
        // casting to 'uint64' is safe because the ternary above has already returned for any
        // value exceeding uint64's range
        // forge-lint: disable-next-line(unsafe-typecast)
        return endsAt > type(uint64).max ? type(uint64).max : uint64(endsAt);
    }

    function _clamp(uint24 candidate, uint24 lo, uint24 hi) private pure returns (uint24) {
        if (candidate < lo) return lo;
        if (candidate > hi) return hi;
        return candidate;
    }
}
