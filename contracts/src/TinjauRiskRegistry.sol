// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TinjauRiskTypes} from "./TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "./TinjauRiskPolicy.sol";

/// @title TinjauRiskRegistry
/// @notice The reusable X Layer risk record (task T1.4). Any contract or application can read
/// an asset's current risk state here without trusting Tinjau's dashboard, its API, or its
/// frontend — which is the whole point of §0.12.
///
/// @dev WHY A NEW CONTRACT RATHER THAN A MIGRATION OF `EventStateRegistry`:
///
/// The deployed registry records CORPORATE EVENTS — what a filing said, bonded and
/// challengeable. This one records RISK STATE — what protection an asset is under. They are
/// different nouns with different lifecycles: an event is permanent history, a risk state
/// expires. Overloading one contract with both would have forced the bonded-challenge
/// semantics onto records that have nothing to bond, and would have destroyed the existing
/// events' history in a storage-layout migration. The old registry keeps running and keeps
/// its history; this one references its evidence by commitment hash.
///
/// @dev TRUST MODEL. The assessor is an off-chain process that may use AI. This contract
/// assumes it is compromised and constrains it accordingly:
///   - it can only write states the deterministic rules could have produced, because the
///     rumour/independence/confirmation gate is re-checked here on chain;
///   - it cannot replay an old assessment (nonce), or post a stale one (deadline);
///   - it cannot re-arm protection during cooldown;
///   - it cannot delete or rewrite history;
///   - a guardian can pause NEW protections without erasing anything.
///
/// @dev WHAT PAUSE DOES NOT DO. Pausing blocks new protective actions. It does NOT delete
/// evidence, does not rewrite past records, and does not cancel a protection already running
/// — §0.7 requires that an active bounded policy runs its course.
contract TinjauRiskRegistry {
    using TinjauRiskPolicy for TinjauRiskPolicy.Envelope;

    // ---------------------------------------------------------------------
    // Roles and configuration
    // ---------------------------------------------------------------------

    /// @notice Signs assessments. Expected to be a hot key held by the off-chain assessor.
    address public assessor;
    /// @notice May pause new protections and rotate the assessor. Expected to be colder.
    address public guardian;

    TinjauRiskPolicy.Envelope public envelope;

    bool public paused;

    /// @notice Assets this registry will accept assessments for. An unsupported asset is
    /// rejected outright rather than recorded with a warning — a record for an asset nobody
    /// vetted is worse than no record.
    mapping(address => bool) public supportedAsset;

    // ---------------------------------------------------------------------
    // Records
    // ---------------------------------------------------------------------

    /// @notice Current record per (asset, pool).
    mapping(bytes32 => TinjauRiskTypes.RiskRecord) private _current;
    /// @notice Append-only history. Never pruned: §0.7 requires that pause and recovery do
    /// not delete evidence, and a consumer auditing a past decision needs the record as it
    /// stood then, not as it stands now.
    mapping(bytes32 => TinjauRiskTypes.RiskRecord[]) private _history;
    /// @notice When the last PROTECT for a key ended, for cooldown.
    mapping(bytes32 => uint64) public lastProtectEndedAt;

    /// @notice Consumed assessment nonces, per key. Replay protection.
    mapping(bytes32 => mapping(uint256 => bool)) public nonceUsed;

    // ---------------------------------------------------------------------
    // EIP-712
    // ---------------------------------------------------------------------

    bytes32 private constant ASSESSMENT_TYPEHASH = keccak256(
        "Assessment(address asset,bytes32 poolId,uint8 state,uint8 confidence,uint8 dataMode,uint8 confirmation,uint32 reasonBits,uint64 assessedAt,uint64 expiresAt,bytes32 evidenceCommitment,uint24 requestedFee,uint256 nonce,uint256 deadline)"
    );
    bytes32 private immutable _domainSeparator;

    struct Assessment {
        address asset;
        bytes32 poolId;
        TinjauRiskTypes.RiskState state;
        TinjauRiskTypes.ConfidenceBand confidence;
        TinjauRiskTypes.DataMode dataMode;
        TinjauRiskTypes.ConfirmationStatus confirmation;
        uint32 reasonBits;
        uint64 assessedAt;
        uint64 expiresAt;
        bytes32 evidenceCommitment;
        uint24 requestedFee;
        uint256 nonce;
        uint256 deadline;
    }

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event AssessmentPosted(
        bytes32 indexed key,
        address indexed asset,
        bytes32 indexed poolId,
        TinjauRiskTypes.RiskState state,
        uint32 reasonBits,
        uint64 assessedAt,
        uint64 expiresAt,
        bytes32 evidenceCommitment
    );
    event ProtectionEnded(bytes32 indexed key, uint64 endedAt);
    event PausedSet(bool paused, address indexed by);
    event AssessorRotated(address indexed from, address indexed to);
    event AssetSupportSet(address indexed asset, bool supported);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotGuardian();
    error BadSignature();
    error NonceAlreadyUsed(uint256 nonce);
    error DeadlinePassed(uint256 deadline, uint256 nowTimestamp);
    error AssessmentExpired(uint64 expiresAt, uint256 nowTimestamp);
    error AssessmentFromFuture(uint64 assessedAt, uint256 nowTimestamp);
    error UnsupportedAsset(address asset);
    error ExpiryNotAfterAssessment(uint64 assessedAt, uint64 expiresAt);
    error ProtectionPaused();
    error CooldownActive(uint64 lastEndedAt, uint32 cooldown);
    error ProtectRequiresConfirmation(TinjauRiskTypes.ConfirmationStatus status);
    error StaleAssessment(uint64 incomingAssessedAt, uint64 currentAssessedAt);
    error ZeroEvidenceCommitment();

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    constructor(address _assessor, address _guardian, TinjauRiskPolicy.Envelope memory _envelope) {
        TinjauRiskPolicy.validateEnvelope(_envelope);
        assessor = _assessor;
        guardian = _guardian;
        envelope = _envelope;
        _domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("TinjauRiskRegistry"),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    // ---------------------------------------------------------------------
    // Guardian controls
    // ---------------------------------------------------------------------

    function setPaused(bool value) external onlyGuardian {
        paused = value;
        emit PausedSet(value, msg.sender);
    }

    function rotateAssessor(address newAssessor) external onlyGuardian {
        emit AssessorRotated(assessor, newAssessor);
        assessor = newAssessor;
    }

    function setAssetSupported(address asset, bool supported) external onlyGuardian {
        supportedAsset[asset] = supported;
        emit AssetSupportSet(asset, supported);
    }

    // ---------------------------------------------------------------------
    // Writing
    // ---------------------------------------------------------------------

    function key(address asset, bytes32 poolId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(asset, poolId));
    }

    /// @notice Posts a signed assessment. Anyone may relay it; only the assessor's signature
    /// makes it valid, so gas payment and authority are separated.
    ///
    /// @dev Ordering of the checks below is deliberate: cheap structural validation first,
    /// then signature, then the state-machine gates. The expensive ecrecover does not run for
    /// a request that was malformed anyway.
    function postAssessment(Assessment calldata a, bytes calldata signature) external {
        // --- structural validity -------------------------------------------------------
        if (!supportedAsset[a.asset]) revert UnsupportedAsset(a.asset);
        if (block.timestamp > a.deadline) revert DeadlinePassed(a.deadline, block.timestamp);
        if (a.expiresAt <= a.assessedAt) revert ExpiryNotAfterAssessment(a.assessedAt, a.expiresAt);
        if (block.timestamp >= a.expiresAt) revert AssessmentExpired(a.expiresAt, block.timestamp);
        if (a.assessedAt > block.timestamp) revert AssessmentFromFuture(a.assessedAt, block.timestamp);
        if (a.evidenceCommitment == bytes32(0)) revert ZeroEvidenceCommitment();

        TinjauRiskTypes.validateConfidenceBand(a.confidence);
        TinjauRiskTypes.validateDataMode(a.dataMode);
        TinjauRiskTypes.validateConfirmationStatus(a.confirmation);
        TinjauRiskTypes.validateReasonBits(a.reasonBits);

        bytes32 k = key(a.asset, a.poolId);

        // --- replay protection ---------------------------------------------------------
        if (nonceUsed[k][a.nonce]) revert NonceAlreadyUsed(a.nonce);

        // A newer record may not be overwritten by an older one arriving late.
        TinjauRiskTypes.RiskRecord storage cur = _current[k];
        if (cur.assessedAt != 0 && a.assessedAt < cur.assessedAt) {
            revert StaleAssessment(a.assessedAt, cur.assessedAt);
        }

        // --- authenticity ---------------------------------------------------------------
        if (_recoverSigner(a, signature) != assessor) revert BadSignature();

        // --- state-machine gates, re-checked on chain ------------------------------------
        if (a.state == TinjauRiskTypes.RiskState.Protect) {
            // Pause blocks NEW protections only. An already-running one is untouched.
            if (paused) revert ProtectionPaused();

            // The contract does not take the assessor's word that the market corroborated.
            // Only exact `Confirmed` passes; Stale, Unavailable and NotConfirmed all fail.
            if (a.confirmation != TinjauRiskTypes.ConfirmationStatus.Confirmed) {
                revert ProtectRequiresConfirmation(a.confirmation);
            }

            // Rumour-only evidence can never reach here. The off-chain engine enforces this
            // too; it is re-checked on chain because the whole trust model assumes the
            // off-chain engine may be compromised.
            if (a.reasonBits & TinjauRiskTypes.REASON_RUMOR_ONLY != 0) {
                revert ProtectRequiresConfirmation(a.confirmation);
            }

            if (!TinjauRiskPolicy.cooldownSatisfied(lastProtectEndedAt[k], block.timestamp, envelope)) {
                revert CooldownActive(lastProtectEndedAt[k], envelope.cooldown);
            }
        }

        nonceUsed[k][a.nonce] = true;

        // --- close out a protection that is being stood down -----------------------------
        bool wasProtecting = cur.state == TinjauRiskTypes.RiskState.Protect;
        if (wasProtecting && a.state != TinjauRiskTypes.RiskState.Protect) {
            lastProtectEndedAt[k] = uint64(block.timestamp);
            emit ProtectionEnded(k, uint64(block.timestamp));
        }

        // A continuing protection keeps its ORIGINAL start, so a stream of refreshed
        // assessments cannot ratchet the duration cap forward indefinitely. This is the
        // difference between a bounded action and a permanent one.
        uint64 protectStartedAt;
        if (a.state == TinjauRiskTypes.RiskState.Protect) {
            protectStartedAt = wasProtecting && cur.protectStartedAt != 0
                ? cur.protectStartedAt
                : uint64(block.timestamp);
        }

        TinjauRiskTypes.RiskRecord memory record = TinjauRiskTypes.RiskRecord({
            asset: a.asset,
            poolId: a.poolId,
            state: a.state,
            confidence: a.confidence,
            dataMode: a.dataMode,
            confirmation: a.confirmation,
            reasonBits: a.reasonBits,
            assessedAt: a.assessedAt,
            expiresAt: a.expiresAt,
            protectStartedAt: protectStartedAt,
            evidenceCommitment: a.evidenceCommitment,
            policyVersion: TinjauRiskPolicy.POLICY_VERSION
        });

        _current[k] = record;
        _history[k].push(record);

        emit AssessmentPosted(
            k, a.asset, a.poolId, a.state, a.reasonBits, a.assessedAt, a.expiresAt, a.evidenceCommitment
        );
    }

    // ---------------------------------------------------------------------
    // Reading — everything a third party needs, with no dashboard involved
    // ---------------------------------------------------------------------

    /// @notice The stored record, exactly as written.
    /// @dev An asset that was never assessed returns a zero-valued struct, which decodes to
    /// `RiskState.Normal` / `SourceClass.Unknown`. That is intentional: see the zero-value
    /// discipline note in `TinjauRiskTypes`. `assessedAt == 0` distinguishes "never written"
    /// from "assessed as Normal".
    function currentRecord(address asset, bytes32 poolId)
        external
        view
        returns (TinjauRiskTypes.RiskRecord memory)
    {
        return _current[key(asset, poolId)];
    }

    /// @notice The effective state right now, with expiry applied.
    /// @dev A consumer that reads `currentRecord` alone would see a `Protect` that has already
    /// lapsed. This applies the time rules so the common case is hard to get wrong.
    function effectiveState(address asset, bytes32 poolId)
        external
        view
        returns (TinjauRiskTypes.RiskState state, uint24 fee, uint64 endsAt)
    {
        TinjauRiskTypes.RiskRecord memory r = _current[key(asset, poolId)];
        fee = TinjauRiskPolicy.effectiveFee(r, 0, block.timestamp, envelope);
        endsAt = TinjauRiskPolicy.protectionEndsAt(r, envelope);

        state = r.state;
        if (state == TinjauRiskTypes.RiskState.Protect && endsAt != 0 && block.timestamp >= endsAt) {
            // Lapsed by time. The stored record is untouched — history is not rewritten by a
            // read — but the state a consumer should act on is Normal.
            state = TinjauRiskTypes.RiskState.Normal;
        }
        if (r.expiresAt != 0 && block.timestamp >= r.expiresAt) {
            state = TinjauRiskTypes.RiskState.Normal;
        }
    }

    function historyLength(address asset, bytes32 poolId) external view returns (uint256) {
        return _history[key(asset, poolId)].length;
    }

    function historyAt(address asset, bytes32 poolId, uint256 index)
        external
        view
        returns (TinjauRiskTypes.RiskRecord memory)
    {
        return _history[key(asset, poolId)][index];
    }

    function schemaVersion() external pure returns (bytes32) {
        return TinjauRiskTypes.SCHEMA_VERSION;
    }

    function policyVersion() external pure returns (bytes32) {
        return TinjauRiskPolicy.POLICY_VERSION;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator;
    }

    // ---------------------------------------------------------------------
    // Signature recovery
    // ---------------------------------------------------------------------

    function hashAssessment(Assessment calldata a) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ASSESSMENT_TYPEHASH,
                a.asset,
                a.poolId,
                uint8(a.state),
                uint8(a.confidence),
                uint8(a.dataMode),
                uint8(a.confirmation),
                a.reasonBits,
                a.assessedAt,
                a.expiresAt,
                a.evidenceCommitment,
                a.requestedFee,
                a.nonce,
                a.deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
    }

    function _recoverSigner(Assessment calldata a, bytes calldata signature) private view returns (address) {
        if (signature.length != 65) revert BadSignature();
        bytes32 digest = hashAssessment(a);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        // Reject the malleable high-s half of the curve, so one authorisation cannot be
        // reshaped into a second distinct-looking signature.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert BadSignature();
        }
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }
}
