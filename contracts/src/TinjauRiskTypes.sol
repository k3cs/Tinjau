// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title TinjauRiskTypes
/// @notice Canonical, versioned type vocabulary for Tinjau's final risk model (task T1.1).
///
/// This library is the SINGLE SOURCE OF TRUTH for every enum ordinal, reason-code bit, and
/// version string that crosses a trust boundary. The TypeScript mirror in
/// `apps/server/src/risk/types.ts` is checked against this file byte-for-byte by
/// `apps/server/test/riskTypesParity.test.ts`, so the two cannot drift silently.
///
/// @dev THIS IS NOT THE OLD MODEL. `EventStateRegistry.EventType` and `SeverityGrade`
/// describe *what a filing said*. The types here describe *what protection state an asset is
/// in*. A severity of -100 is not a `Protect`; it is one input among several that the
/// deterministic promotion rules may or may not act on. Do not map one onto the other.
///
/// @dev ZERO-VALUE DISCIPLINE (read before adding an enum):
///
/// Solidity storage reads of never-written slots return 0. Every enum below is therefore
/// ordered so that 0 is the *safest* value, not the most convenient one:
///
///   - `RiskState.Normal = 0`   -> an unwritten record grants no protection and authorises
///                                 no fee change. The dangerous value (`Protect`) is never
///                                 the default.
///   - `SourceClass.Unknown = 0` -> an unwritten claim is NOT official. If `Official` were 0,
///                                 uninitialised storage would read as the most trusted
///                                 class, which is exactly backwards.
///   - `ConfirmationStatus.Unknown = 0` -> absence of data never reads as confirmation.
///   - `ConfidenceBand.Unknown = 0` -> absence never reads as high confidence.
///
/// The `Unknown` sentinels exist to make uninitialised storage legible. They are NOT
/// writable: `validate*` reverts on them, so any record that actually exists carries a real
/// value. Consumers may therefore treat `Unknown` as "this record was never written".
///
/// @dev COMPARISON DISCIPLINE: never gate a privileged action on an ordering comparison
/// (`>=`) over these enums. Ordering is for human legibility only. Authorisation must use
/// exact equality, so that inserting a future enum member cannot silently widen a gate.
library TinjauRiskTypes {
    // ---------------------------------------------------------------------
    // Version
    // ---------------------------------------------------------------------

    /// @notice Version of THIS type vocabulary, as ASCII packed into bytes32.
    /// Decodes to "tinjau.risk/1.0.0". Bump on any change to an enum ordinal, a reason bit,
    /// or a struct field. Never reuse a version for a changed layout — the version is what
    /// lets an off-chain consumer know which decoder to apply.
    bytes32 internal constant SCHEMA_VERSION = "tinjau.risk/1.0.0";

    // ---------------------------------------------------------------------
    // Enums
    // ---------------------------------------------------------------------

    /// @notice The product's final risk state. One per (asset, pool).
    /// @dev Append-only. Never reorder: ordinals are committed in published records.
    enum RiskState {
        Normal, // 0 - no material unresolved evidence; baseline fee only
        Watch, // 1 - monitoring raised; aggressive fee NOT authorised
        Protect // 2 - bounded, time-limited fee action authorised
    }

    /// @notice Provenance class of one piece of evidence.
    /// @dev Ordered least-to-most trusted for legibility only. See COMPARISON DISCIPLINE.
    enum SourceClass {
        Unknown, // 0 - never written; uninitialised storage
        Rumor, // 1 - social/unattributed. Can never authorise the aggressive path.
        News, // 2 - identifiable publisher. One alone cannot authorise it either.
        Official // 3 - issuer/regulator filing, subject to the bonded-evidence path
    }

    /// @notice Whether a value was observed live, replayed from history, or fabricated.
    /// @dev `Simulated` exists so a test fixture can never be presented as observed data.
    enum DataMode {
        Unknown, // 0 - never written
        Live, // 1 - observed in real time
        Observed, // 2 - observed, not necessarily real time
        Replay, // 3 - historical data replayed from an immutable fixture
        Simulated // 4 - fabricated for testing. Not evidence of anything real.
    }

    /// @notice Result of the independent market-confirmation check.
    /// @dev Only `Confirmed` may satisfy a promotion gate, and only by exact equality.
    /// `Unavailable` and `Stale` are deliberately distinct from `NotConfirmed`: "we could not
    /// look" and "we looked and saw nothing" are different findings and are reported as such.
    enum ConfirmationStatus {
        Unknown, // 0 - never written
        NotConfirmed, // 1 - checked; the market did not corroborate
        Unavailable, // 2 - could not check (no data, RPC failure, pool untraded)
        Stale, // 3 - data existed but was older than the freshness bound
        Confirmed // 4 - checked and corroborated within the freshness bound
    }

    /// @notice Coarse confidence attached to an assessment.
    enum ConfidenceBand {
        Unknown, // 0 - never written
        Low, // 1
        Medium, // 2
        High // 3
    }

    // ---------------------------------------------------------------------
    // Reason codes
    // ---------------------------------------------------------------------

    /// @notice Reason codes are a bitmask, not a string array: storing strings per record
    /// would cost more gas than the record itself and would not be machine-comparable.
    /// Each bit below is permanent. To retire a reason, stop setting its bit — never reuse
    /// the position for a different meaning, or historical records become unreadable.
    ///
    /// The off-chain mirror maps each bit to the stable string code an API consumer sees
    /// (tracker §0.24 `reasonCodes: string[]`). That mapping is the documented ABI contract
    /// required by §0.12.
    uint32 internal constant REASON_NONE = 0;

    // -- Why promotion was capped or refused (bits 0-7) --
    uint32 internal constant REASON_RUMOR_ONLY = 1 << 0; // rumour-only evidence; hard cap at Watch
    uint32 internal constant REASON_SINGLE_SOURCE = 1 << 1; // only one independent origin
    uint32 internal constant REASON_DUPLICATE_SYNDICATION = 1 << 2; // several outlets, one origin
    uint32 internal constant REASON_CONTRADICTED = 1 << 3; // sources conflict on a material field
    uint32 internal constant REASON_STALE_EVIDENCE = 1 << 4; // evidence outside its recency window
    uint32 internal constant REASON_NO_OFFICIAL_CONFIRMATION = 1 << 5;
    uint32 internal constant REASON_UNSUPPORTED_ASSET = 1 << 6; // asset/pool not in the supported set
    uint32 internal constant REASON_AMBIGUOUS_ENTITY = 1 << 7; // company/token mapping unresolved
    /// @dev Distinct from the two above, and the distinction matters to whoever debugs a
    /// refusal: `AMBIGUOUS_ENTITY` means "we know this company, but which of its tokens?",
    /// `UNSUPPORTED_ASSET` means "we know this token, but it has no verified pool", and this
    /// one means "we have never heard of this company at all". Collapsing them would send an
    /// operator looking for a pool that was never the problem.
    uint32 internal constant REASON_UNKNOWN_COMPANY = 1 << 20;

    // -- Market-confirmation outcomes (bits 8-15) --
    uint32 internal constant REASON_MARKET_CONFIRMED = 1 << 8;
    uint32 internal constant REASON_MARKET_NOT_CONFIRMED = 1 << 9;
    uint32 internal constant REASON_MARKET_DATA_STALE = 1 << 10;
    uint32 internal constant REASON_MARKET_DATA_UNAVAILABLE = 1 << 11;
    uint32 internal constant REASON_ANTI_WICK_FAILED = 1 << 12; // move was a single short-lived spike
    uint32 internal constant REASON_THIN_EXIT_DEPTH = 1 << 13;
    uint32 internal constant REASON_REFERENCE_MARKET_CLOSED = 1 << 14;
    /// @dev Distinct from `MARKET_DATA_UNAVAILABLE`. That one means "we could not look"; this
    /// one means "we looked, there is data, and there is not enough of it to conclude
    /// anything". A window with three trades is not the same finding as a window with none,
    /// and a reader deciding whether to trust a refusal needs to know which it was.
    uint32 internal constant REASON_INSUFFICIENT_SAMPLE = 1 << 21;
    /// @dev Distinct from `ANTI_WICK_FAILED`. That one is a positive finding: we watched the
    /// hold interval and the move retraced, so it was a spike. This one means the hold interval
    /// was unreachable or too sparse to judge, so persistence was never observed either way.
    /// Emitting `ANTI_WICK_FAILED` for this case would assert a retracement nobody saw, and a
    /// reader deciding whether to wait for more data needs the difference.
    uint32 internal constant REASON_PERSISTENCE_UNOBSERVED = 1 << 22;

    // -- What authorised promotion, and what disqualified the event itself (bits 16-23) --
    uint32 internal constant REASON_OFFICIAL_FILING = 1 << 16;
    uint32 internal constant REASON_TWO_INDEPENDENT_SOURCES = 1 << 17;
    uint32 internal constant REASON_BONDED_EVIDENCE_PASSED = 1 << 18;
    /// @dev Official does not mean material. A Section 16 insider Form 4 is a real SEC filing
    /// that reports no corporate action affecting obligations, solvency, or listing status.
    /// Promoting on one would raise LP fees for nothing, so materiality is gated separately
    /// from provenance.
    uint32 internal constant REASON_NON_MATERIAL_EVENT = 1 << 19;

    // -- Lifecycle (bits 24-31) --
    uint32 internal constant REASON_EXPIRED = 1 << 24;
    uint32 internal constant REASON_DECAYED_TO_BASELINE = 1 << 25;
    uint32 internal constant REASON_COOLDOWN_ACTIVE = 1 << 26;
    uint32 internal constant REASON_PAUSED = 1 << 27;
    uint32 internal constant REASON_ACTION_FAILED = 1 << 28;

    /// @notice Every bit position that currently has a defined meaning. A record carrying a
    /// bit outside this mask was written by a newer schema than this code understands, and
    /// `validateReasonBits` refuses it rather than silently ignoring the unknown reason.
    uint32 internal constant REASON_ALL_DEFINED = REASON_RUMOR_ONLY | REASON_SINGLE_SOURCE
        | REASON_DUPLICATE_SYNDICATION | REASON_CONTRADICTED | REASON_STALE_EVIDENCE
        | REASON_NO_OFFICIAL_CONFIRMATION | REASON_UNSUPPORTED_ASSET | REASON_AMBIGUOUS_ENTITY
        | REASON_MARKET_CONFIRMED | REASON_MARKET_NOT_CONFIRMED | REASON_MARKET_DATA_STALE
        | REASON_MARKET_DATA_UNAVAILABLE | REASON_ANTI_WICK_FAILED | REASON_THIN_EXIT_DEPTH
        | REASON_REFERENCE_MARKET_CLOSED | REASON_OFFICIAL_FILING | REASON_TWO_INDEPENDENT_SOURCES
        | REASON_BONDED_EVIDENCE_PASSED | REASON_NON_MATERIAL_EVENT | REASON_UNKNOWN_COMPANY | REASON_INSUFFICIENT_SAMPLE
        | REASON_PERSISTENCE_UNOBSERVED
        | REASON_EXPIRED | REASON_DECAYED_TO_BASELINE | REASON_COOLDOWN_ACTIVE | REASON_PAUSED
        | REASON_ACTION_FAILED;

    // ---------------------------------------------------------------------
    // The record
    // ---------------------------------------------------------------------

    /// @notice The compact, reusable risk record a third party can read without trusting
    /// Tinjau's dashboard (tracker §0.12).
    ///
    /// @dev Field order is packing-conscious: the four enums and the two uint64 timestamps
    /// share slots. Do not reorder without re-checking storage layout AND bumping
    /// `SCHEMA_VERSION` — published records commit to this layout.
    ///
    /// @dev `reasonBits` is the compact form of what §0.24 exposes as `reasonCodes: string[]`.
    /// The bit-to-string mapping is the documented ABI contract; see the reason constants
    /// above and `apps/server/src/risk/types.ts`.
    struct RiskRecord {
        address asset; // the tokenised equity this record concerns
        bytes32 poolId; // the pool the record applies to
        RiskState state;
        ConfidenceBand confidence;
        DataMode dataMode;
        ConfirmationStatus confirmation;
        uint32 reasonBits; // compact reason set; see REASON_* above
        uint64 assessedAt; // when the assessment was made
        uint64 expiresAt; // when it lapses; protection never outlives this
        uint64 protectStartedAt; // start of the current PROTECT interval, 0 if none
        bytes32 evidenceCommitment; // hash binding this record to its evidence graph
        bytes32 policyVersion; // ASCII, e.g. "tinjau.policy/1.0.0"
    }

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error InvalidRiskState(uint8 value);
    error InvalidSourceClass(uint8 value);
    error InvalidDataMode(uint8 value);
    error InvalidConfirmationStatus(uint8 value);
    error InvalidConfidenceBand(uint8 value);
    error UnknownReasonBits(uint32 bits);
    error EmptyEvidenceCommitment();
    error ExpiryNotAfterAssessment(uint64 assessedAt, uint64 expiresAt);

    // ---------------------------------------------------------------------
    // Validation — every one of these reverts rather than coercing
    // ---------------------------------------------------------------------

    /// @dev `Unknown` sentinels are rejected here. That is the whole point: they may be READ
    /// out of uninitialised storage, but they may never be WRITTEN, so a stored record that
    /// carries one is provably a record that was never posted.

    function validateSourceClass(SourceClass v) internal pure {
        if (v == SourceClass.Unknown) revert InvalidSourceClass(uint8(v));
    }

    function validateDataMode(DataMode v) internal pure {
        if (v == DataMode.Unknown) revert InvalidDataMode(uint8(v));
    }

    function validateConfirmationStatus(ConfirmationStatus v) internal pure {
        if (v == ConfirmationStatus.Unknown) revert InvalidConfirmationStatus(uint8(v));
    }

    function validateConfidenceBand(ConfidenceBand v) internal pure {
        if (v == ConfidenceBand.Unknown) revert InvalidConfidenceBand(uint8(v));
    }

    /// @notice Refuses any bit this schema version does not define.
    /// @dev Failing closed matters here. If a newer poster sets a bit meaning "evidence was
    /// retracted" and this contract silently ignored it, the record would read as though the
    /// retraction never happened.
    function validateReasonBits(uint32 bits) internal pure {
        if (bits & ~REASON_ALL_DEFINED != 0) revert UnknownReasonBits(bits);
    }

    /// @notice True when the evidence is structurally incapable of authorising the aggressive
    /// path, no matter what the market data says.
    /// @dev This is the machine-readable form of the §0.7 invariant "rumour-only evidence
    /// always remains at or below Watch". It is deliberately a property of the evidence
    /// alone — no market argument can switch it off.
    function isRumorOnly(SourceClass highestClass) internal pure returns (bool) {
        return highestClass == SourceClass.Rumor;
    }

    /// @notice The single authoritative predicate for "may this evidence reach Protect?".
    /// @dev Every caller that authorises a fee change must funnel through this rather than
    /// re-deriving the rule, so there is exactly one place to audit.
    ///
    /// @param highestClass The most trusted source class present in the evidence set.
    /// @param independentSources Count of genuinely independent origins. Syndicated copies of
    /// one origin must already have been collapsed to one by the caller.
    /// @param confirmation Result of the independent market check.
    /// @param officialEvidencePassed Whether the bonded/parse-agreement path passed, which is
    /// only meaningful when `highestClass` is `Official`.
    function mayReachProtect(
        SourceClass highestClass,
        uint8 independentSources,
        ConfirmationStatus confirmation,
        bool officialEvidencePassed
    ) internal pure returns (bool) {
        // Invariant 1: rumour-only can never reach Protect. Checked first and unconditionally.
        if (highestClass == SourceClass.Rumor) return false;
        if (highestClass == SourceClass.Unknown) return false;

        // Invariant 2: market confirmation is required for every non-official promotion, and
        // only exact `Confirmed` counts. Stale/Unavailable/NotConfirmed all fail closed.
        if (highestClass == SourceClass.News) {
            if (confirmation != ConfirmationStatus.Confirmed) return false;
            // Invariant 3: one news source alone is never enough, however many outlets
            // reprinted it.
            return independentSources >= 2;
        }

        // Official path: the bonded-evidence requirements must have passed, and the market
        // must still corroborate. An official filing is a strong reason to look, not a
        // licence to act without looking.
        if (highestClass == SourceClass.Official) {
            if (!officialEvidencePassed) return false;
            return confirmation == ConfirmationStatus.Confirmed;
        }

        return false; // unreachable today; fails closed if a class is added later
    }
}
