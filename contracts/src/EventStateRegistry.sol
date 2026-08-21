// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20Minimal.sol";

/// @title EventStateRegistry
/// @notice AFTERHOURS corporate-events oracle registry for tokenised equities on X Layer.
///
/// @dev Design notes (read before reviewing):
///
/// 1. TRUST MODEL (MVP, intentionally centralized and disclosed):
///    - A single `poster` (aka "signer") key posts event states parsed off-chain from SEC
///      filings (8-K material events, Form 4 insider trades) by a three-way independent
///      parse + diff agent. This contract does not itself validate parse correctness — it
///      only records what was posted, bonds it, and provides a challenge/resolution path.
///    - A single `resolver` key resolves challenges. This is centralization-by-design for
///      the MVP; a decentralized dispute mechanism is explicitly out of scope here.
///
/// 2. BONDED vs UNBONDED FIELDS (important structural separation):
///    - The "bonded" fields are the structured factual fields extracted from the filing:
///      event type, effective date(s), declared amounts, affected token, and the per-field
///      agreement level (how many of the 3 independent parses agreed on each field). These
///      are the fields a challenger can dispute by proving they don't match the source
///      document (identified by `sourceContentHash`), and that dispute puts the bond at risk.
///    - The "severity/direction grade" is UNBONDED editorial/model judgment about how
///      severe or directional an event is. It is NOT provable against the source document
///      the way a factual field is, so it is kept in a structurally separate struct
///      (`SeverityGrade`) and is never covered by the bond or by `challenge()`. Downstream
///      consumers (e.g. the v4 hook) that key off severity must treat it as soft/unbonded
///      input and clamp its influence — see `AfterhoursFeeHook.sol`.
///
/// 3. FIELD ENCODING:
///    - `eventType` is a `uint8` enum-like code (see `EventType`) rather than a free-form
///      string, so the fee hook and other on-chain consumers can branch on it cheaply
///      without string comparison. A human-readable `eventTypeLabel` free-text field is
///      also stored for indexers/UI that want the raw label from the filing (e.g. "8-K Item
///      5.02" or "Form 4 - Disposition"), since SEC filings have long-tail categories that
///      don't all deserve their own enum value in the MVP.
///    - Structured factual fields are modeled as a fixed struct (`FactualFields`) covering
///      the common shape (effective date, declared amount, affected token, currency) plus a
///      `extraDataURI`/`extraDataHash` escape hatch (a pointer + hash to an off-chain JSON
///      blob) for filing-specific fields that don't fit the common shape. This keeps the
///      common case cheap and readable on-chain while remaining extensible without a
///      contract upgrade for every new filing shape encountered.
///    - `nextEventDate` is exposed as its own top-level field (not buried in the extra data
///      blob) because it is explicitly meant to be read cheaply by a separate "forward
///      calendar" feature/contract.
///
/// 4. BOND TOKEN: USD₮0 on X Layer, 6 decimals (NOT 18 — a common ERC-20 assumption bug).
///    All bond amounts in this contract are denominated in the token's native base units
///    (i.e. a `bondAmount` of 1_000_000 == 1.000000 USD₮0), matching 6-decimal convention.
///
/// 5. VISIBILITY: all fields are intentionally public / world-readable (no access control on
///    reads) since both the v4 hook and third-party display frontends need to read this data.
contract EventStateRegistry {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @notice Coarse classification of the corporate event, used by on-chain consumers
    /// (e.g. the fee hook) to branch cheaply. Keep this list append-only across upgrades.
    enum EventType {
        Unknown, // 0 - not yet classified / fallback
        Form8K_Material, // 1 - general 8-K material event
        Form8K_Earnings, // 2 - 8-K earnings release (Item 2.02)
        Form8K_Restatement, // 3 - 8-K non-reliance / restatement (Item 4.02)
        Form8K_ExecutiveChange, // 4 - 8-K officer/director departure or appointment (Item 5.02)
        Form8K_Bankruptcy, // 5 - 8-K bankruptcy/receivership (Item 1.03)
        Form8K_MAndA, // 6 - 8-K acquisition/disposition of assets, merger (Item 2.01/1.01)
        Form8K_Delisting, // 7 - 8-K delisting / failure to satisfy listing rule (Item 3.01)
        Form4_InsiderBuy, // 8 - Form 4 insider acquisition
        Form4_InsiderSell // 9 - Form 4 insider disposition
    }

    /// @notice Per-field agreement level: how many of the 3 independent off-chain parses
    /// agreed on each structured field. 3 = full consensus, 1 = only one parse produced a
    /// value (weakest), 0 = field not populated / not applicable to this event.
    /// @dev Deliberately simple (fixed small struct, not a mapping) for MVP legibility — a
    /// mapping keyed by field name would be more "sophisticated" but harder for a challenger
    /// or reviewer to reason about and gas-cost more to populate for a fixed field set.
    struct FieldAgreement {
        uint8 eventTypeAgreement; // 0-3
        uint8 effectiveDateAgreement; // 0-3
        uint8 declaredAmountAgreement; // 0-3
        uint8 affectedTokenAgreement; // 0-3
        uint8 nextEventDateAgreement; // 0-3
    }

    /// @notice The structured factual fields bonded by this posting. This is the data a
    /// challenger disputes against the source document.
    struct FactualFields {
        uint256 effectiveDate; // unix timestamp the event takes/took effect; 0 if n/a
        int256 declaredAmount; // signed: e.g. dividend cents, shares transacted, $ amount;
        // sign convention documented per eventType off-chain; 0 if n/a
        address affectedToken; // the tokenised equity this filing concerns (redundant with
        // top-level `token` on the EventState for convenience, but
        // kept here too since some events reference a *different*
        // instrument, e.g. a merger counterparty)
        string currency; // ISO 4217 code or symbol for declaredAmount, e.g. "USD"
        string extraDataURI; // optional pointer to an off-chain JSON blob for
        // filing-specific fields that don't fit the fixed shape above
        bytes32 extraDataHash; // SHA-256 of the content at extraDataURI, zero if unused
    }

    /// @notice Severity/direction grade — UNBONDED editorial judgment. Structurally
    /// separate from `FactualFields` / `FieldAgreement` on purpose: this is NOT covered by
    /// the bond and CANNOT be disputed via `challenge()`. Consumers must clamp its
    /// influence (see AfterhoursFeeHook).
    struct SeverityGrade {
        int8 severity; // -100 (max negative / bearish) .. +100 (max positive / bullish),
        // 0 = neutral; unbounded input from off-chain judgment, no on-chain
        // validation of correctness is possible or attempted here
        uint8 confidence; // 0-100, off-chain model's self-reported confidence; also
        // unbonded, informational only
    }

    /// @notice Full state of one posted corporate event.
    struct EventState {
        address token; // the tokenised equity this event primarily concerns
        EventType eventType; // coarse on-chain-branchable classification (BONDED)
        string eventTypeLabel; // human-readable label, e.g. raw filing item number (BONDED)
        FactualFields facts; // structured factual fields (BONDED)
        FieldAgreement agreement; // per-field 3-parse agreement level (BONDED)
        SeverityGrade severity; // severity/direction grade (UNBONDED, see above)
        string sourceUrl; // link to the source filing (e.g. SEC EDGAR URL)
        bytes32 sourceContentHash; // SHA-256 of the source document content
        uint256 timestamp; // block timestamp this event was posted
        uint256 nextEventDate; // forward-calendar hint: next known/expected event date for
        // this token per this filing (0 if the filing announces none),
        // e.g. a scheduled shareholder vote or an announced effective date
        // in the future
        uint256 bondAmount; // USD₮0 bond amount locked for this posting (6 decimals)
        address poster; // who posted it (== `poster` role holder at post time)
        bool challenged; // whether `challenge()` has been called on this event
        bool resolved; // whether a challenge has been resolved
        bool challengerWon; // meaningful only if resolved && challenged
        address challenger; // who filed the challenge, zero address if none
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice USD₮0 bond token on X Layer. 6 decimals — NOT 18. Callers computing bond
    /// amounts in "human" units must multiply by 1e6, not 1e18.
    IERC20 public immutable bondToken;

    /// @notice Authorized poster ("signer") — the only address allowed to call `postEvent`.
    address public poster;

    /// @notice Authorized resolver — the only address allowed to call `resolveChallenge`.
    /// Deliberately distinct from `poster` so the same key cannot post an event and then
    /// also adjudicate a challenge against itself.
    address public resolver;

    /// @notice Contract deployer / admin, able to rotate `poster` and `resolver`. Kept
    /// separate from both operational roles for the same self-dealing reason above. For
    /// this MVP `owner` has no other powers (cannot post, cannot resolve, cannot touch
    /// bonds) — it exists purely for key-rotation hygiene.
    address public owner;

    /// @notice Length of the challenge window in seconds. Constructor parameter, documented
    /// default suggestion: 48 hours (2 days) — long enough to span a weekend/holiday gap
    /// after a filing lands and give a challenger time to actually diff the source document,
    /// short enough that the forward-calendar/fee-hook consumers aren't stuck treating
    /// every event as "possibly still disputable" for an unreasonable length of time.
    uint256 public immutable challengeWindow;

    /// @notice Monotonically increasing event id, starting at 1 (0 is reserved as "no event").
    uint256 public nextEventId = 1;

    mapping(uint256 => EventState) private _events;

    /// @notice Most recently posted eventId for a given token, 0 if none posted yet. Lets
    /// the fee hook do an O(1) lookup of "the latest event for this token" instead of
    /// scanning.
    mapping(address => uint256) public latestEventIdForToken;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event EventPosted(
        uint256 indexed eventId,
        address indexed token,
        bytes32 indexed sourceContentHash,
        EventType eventType,
        uint256 bondAmount,
        address poster
    );

    event Challenged(uint256 indexed eventId, address indexed challenger);

    event ChallengeResolved(
        uint256 indexed eventId, address indexed resolver, bool challengerWon, address bondRecipient
    );

    event PosterUpdated(address indexed oldPoster, address indexed newPoster);
    event ResolverUpdated(address indexed oldResolver, address indexed newResolver);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error NotPoster();
    error NotResolver();
    error ZeroAddress();
    error EventDoesNotExist();
    error ChallengeWindowClosed();
    error AlreadyChallenged();
    error NotChallenged();
    error AlreadyResolved();
    error BondTransferFailed();

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPoster() {
        if (msg.sender != poster) revert NotPoster();
        _;
    }

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @param _bondToken USD₮0 token address on X Layer (6 decimals).
    /// @param _poster Initial authorized poster/signer address.
    /// @param _resolver Initial authorized challenge-resolver address.
    /// @param _challengeWindow Challenge window length in seconds (e.g. 48 hours = 172800).
    constructor(address _bondToken, address _poster, address _resolver, uint256 _challengeWindow) {
        if (_bondToken == address(0) || _poster == address(0) || _resolver == address(0)) {
            revert ZeroAddress();
        }
        bondToken = IERC20(_bondToken);
        poster = _poster;
        resolver = _resolver;
        owner = msg.sender;
        challengeWindow = _challengeWindow;
    }

    // ---------------------------------------------------------------------
    // Admin (key rotation only — no other powers)
    // ---------------------------------------------------------------------

    /// @notice Rotate the authorized poster key. Owner-only.
    function setPoster(address newPoster) external onlyOwner {
        if (newPoster == address(0)) revert ZeroAddress();
        emit PosterUpdated(poster, newPoster);
        poster = newPoster;
    }

    /// @notice Rotate the authorized resolver key. Owner-only.
    function setResolver(address newResolver) external onlyOwner {
        if (newResolver == address(0)) revert ZeroAddress();
        emit ResolverUpdated(resolver, newResolver);
        resolver = newResolver;
    }

    /// @notice Transfer admin ownership. Owner-only.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    // ---------------------------------------------------------------------
    // P1.6 — Posting
    // ---------------------------------------------------------------------

    /// @notice Post a new corporate event state, bonded in USD₮0.
    /// @dev Caller (must be `poster`) must have already called
    /// `IERC20(bondToken).approve(address(this), bondAmount)`. This function pulls the bond
    /// via `transferFrom` — standard ERC-20 approve-then-transferFrom pattern, no permit /
    /// signature-based approval assumed for MVP simplicity.
    /// @param token The tokenised equity this event concerns.
    /// @param eventType Coarse on-chain-branchable classification.
    /// @param eventTypeLabel Human-readable label / raw filing item reference.
    /// @param facts Structured factual fields (bonded, disputable).
    /// @param agreement Per-field 3-parse agreement level (bonded, disputable).
    /// @param severity Severity/direction grade (UNBONDED — not covered by the bond).
    /// @param sourceUrl Link to the source filing.
    /// @param sourceContentHash SHA-256 of the source document content.
    /// @param nextEventDate Forward-calendar hint; 0 if the filing announces none.
    /// @param bondAmount Bond to lock, in USD₮0 base units (6 decimals).
    /// @return eventId The id assigned to this posting.
    function postEvent(
        address token,
        EventType eventType,
        string calldata eventTypeLabel,
        FactualFields calldata facts,
        FieldAgreement calldata agreement,
        SeverityGrade calldata severity,
        string calldata sourceUrl,
        bytes32 sourceContentHash,
        uint256 nextEventDate,
        uint256 bondAmount
    ) external onlyPoster returns (uint256 eventId) {
        if (token == address(0)) revert ZeroAddress();

        eventId = nextEventId++;

        EventState storage e = _events[eventId];
        e.token = token;
        e.eventType = eventType;
        e.eventTypeLabel = eventTypeLabel;
        e.facts = facts;
        e.agreement = agreement;
        e.severity = severity;
        e.sourceUrl = sourceUrl;
        e.sourceContentHash = sourceContentHash;
        e.timestamp = block.timestamp;
        e.nextEventDate = nextEventDate;
        e.bondAmount = bondAmount;
        e.poster = msg.sender;

        latestEventIdForToken[token] = eventId;

        if (bondAmount > 0) {
            bool ok = bondToken.transferFrom(msg.sender, address(this), bondAmount);
            if (!ok) revert BondTransferFailed();
        }

        emit EventPosted(eventId, token, sourceContentHash, eventType, bondAmount, msg.sender);
    }

    // ---------------------------------------------------------------------
    // P1.7 — Challenge / resolution
    // ---------------------------------------------------------------------

    /// @notice Dispute a posted event's BONDED factual fields within the challenge window.
    /// @dev This contract does not itself verify the dispute proof (comparing `facts` /
    /// `agreement` against the document at `sourceContentHash` is off-chain work for the
    /// resolver to check before calling `resolveChallenge`). `challenge()` just records
    /// that a dispute was opened, by whom, and freezes further challenges on this event —
    /// only one open challenge per event is supported in this MVP (first challenger wins the
    /// slot; a more sophisticated multi-challenger queue is out of scope).
    /// @param eventId The event being disputed.
    function challenge(uint256 eventId) external {
        EventState storage e = _events[eventId];
        if (e.poster == address(0)) revert EventDoesNotExist();
        // block.timestamp manipulation tolerance here is a few seconds at most (standard
        // validator drift), immaterial against a challenge window measured in hours/days
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > e.timestamp + challengeWindow) revert ChallengeWindowClosed();
        if (e.challenged) revert AlreadyChallenged();

        e.challenged = true;
        e.challenger = msg.sender;

        emit Challenged(eventId, msg.sender);
    }

    /// @notice Resolve an open challenge. Resolver-only.
    /// @dev If `challengerWins` is true, the full bond is transferred to the challenger. If
    /// false, the full bond is returned to the original poster. Design choice: the bond is
    /// never split or partially slashed in this MVP — it's a binary outcome, matching the
    /// binary nature of "does the posted data match the source document." No fee is taken by
    /// the protocol/resolver on resolution; that can be layered on later without changing
    /// this function's external interface.
    /// @param eventId The event whose challenge is being resolved.
    /// @param challengerWins True if the challenger's dispute is upheld.
    function resolveChallenge(uint256 eventId, bool challengerWins) external onlyResolver {
        EventState storage e = _events[eventId];
        if (e.poster == address(0)) revert EventDoesNotExist();
        if (!e.challenged) revert NotChallenged();
        if (e.resolved) revert AlreadyResolved();

        e.resolved = true;
        e.challengerWon = challengerWins;

        address recipient = challengerWins ? e.challenger : e.poster;

        emit ChallengeResolved(eventId, msg.sender, challengerWins, recipient);

        if (e.bondAmount > 0) {
            bool ok = bondToken.transfer(recipient, e.bondAmount);
            if (!ok) revert BondTransferFailed();
        }
    }

    // ---------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------

    /// @notice Full event state by id.
    function getEvent(uint256 eventId) external view returns (EventState memory) {
        return _events[eventId];
    }

    /// @notice Convenience read: the most recently posted event for a token, in full.
    /// @dev Reverts with EventDoesNotExist if no event has ever been posted for `token`.
    function getLatestEvent(address token) external view returns (EventState memory) {
        uint256 eventId = latestEventIdForToken[token];
        if (eventId == 0) revert EventDoesNotExist();
        return _events[eventId];
    }

    /// @notice Cheap read for consumers (e.g. the fee hook) that only need the bonded
    /// classification fields, not the full struct (avoids copying strings/URIs on-chain).
    /// @return eventType The coarse classification.
    /// @return agreement The per-field agreement levels.
    /// @return severity The (unbonded) severity grade.
    /// @return timestamp When this event was posted.
    /// @return isDisputedUnresolved True if challenged but not yet resolved — consumers may
    /// want to treat an event in this state more cautiously.
    function getEventSummary(uint256 eventId)
        external
        view
        returns (
            EventType eventType,
            FieldAgreement memory agreement,
            SeverityGrade memory severity,
            uint256 timestamp,
            bool isDisputedUnresolved
        )
    {
        EventState storage e = _events[eventId];
        if (e.poster == address(0)) revert EventDoesNotExist();
        return (e.eventType, e.agreement, e.severity, e.timestamp, e.challenged && !e.resolved);
    }

    /// @notice Whether `eventId` is still inside its challenge window.
    function isChallengeWindowOpen(uint256 eventId) public view returns (bool) {
        EventState storage e = _events[eventId];
        if (e.poster == address(0)) revert EventDoesNotExist();
        // forge-lint: disable-next-line(block-timestamp)
        return block.timestamp <= e.timestamp + challengeWindow;
    }
}
