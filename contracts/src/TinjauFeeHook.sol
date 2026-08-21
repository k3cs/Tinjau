// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "v4-core/src/types/PoolOperation.sol";

import {TinjauRiskTypes} from "./TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "./TinjauRiskPolicy.sol";
import {TinjauRiskRegistry} from "./TinjauRiskRegistry.sol";

/// @title TinjauFeeHook
/// @notice The enforcement half of Tinjau. It turns a risk record that already exists in
/// `TinjauRiskRegistry` into a fee that a Uniswap v4 pool actually charges.
///
/// @dev WHAT THIS CONTRACT IS AND IS NOT (tracker §0.6, the two trust domains).
/// This hook is entirely in the DETERMINISTIC domain. It never decides anything. It reads a
/// record, applies `TinjauRiskPolicy`'s pure arithmetic, and returns the result. Every
/// judgement — is this evidence official, did the market corroborate, is this asset the one
/// the claim is about — was made and re-checked before the record was written. If the hook
/// disagrees with the record it does not negotiate: it charges `baseFee`.
///
/// @dev RELATIONSHIP TO `AfterhoursFeeHook`. That contract is deployed at
/// 0xbCb4B7310BA36eA01f2A435A5D64C9b7953d8080 and is genuinely named that (§0.18). It reads
/// `EventStateRegistry` and maps an event TYPE and SEVERITY onto a fee. This one reads
/// `TinjauRiskRegistry` and maps the final `NORMAL/WATCH/PROTECT` STATE onto a fee. They are
/// different mechanisms and both stay in the tree; nothing here renames or replaces the old
/// one. The fee ENVELOPE is inherited from it verbatim (500 / 20 000 / 3 600s / 18 000s),
/// because those numbers are the ones already proven on chain, not because they were chosen
/// here.
///
/// @dev WHY THE ENVELOPE IS READ FROM THE REGISTRY. The hook does not carry its own idea of
/// the fee band. At construction it reads `registry.envelope()` and freezes those six values
/// into immutables. The registry's own envelope is set once in its constructor and has no
/// setter, so the two can never drift. The consequence that matters: **the hook can only ever
/// charge inside the band the registry published**, and there is no code path — owner, admin,
/// guardian, or otherwise — that changes the band afterwards. This contract has no
/// state-changing external function at all.
///
/// @dev THE ONE ADMIN LEVER, AND ITS BOUND. There is no admin function here. The registry's
/// guardian does hold one lever that reaches this hook: `setAssetSupported(asset, false)`
/// makes the hook stop resolving that asset, which forces `baseFee`. That power is
/// deliberately one-directional — the guardian can lower a fee to baseline and can never
/// raise one, because raising requires a record that only a signed, market-confirmed,
/// non-rumour assessment can create. An emergency stop that can only under-protect is a
/// different risk from one that can over-charge, and only the first is acceptable here.
///
/// @dev FAIL-CLOSED READS. Everything below funnels into `_quote`, and every branch of
/// `_quote` that is not a clean, current, confirmed `PROTECT` returns `baseFee`. The registry
/// is read through raw `staticcall` and decoded by hand rather than through the typed ABI,
/// specifically so a malformed record cannot revert the swap: `abi.decode` reverts on an
/// out-of-range enum, and a reverting hook would halt the pool instead of failing closed.
/// A pool that cannot be swapped is a worse outcome than a pool charging its baseline fee.
///
/// @dev EXPIRY IS ENFORCED AT READ TIME. `TinjauRiskPolicy.effectiveFee` compares
/// `block.timestamp` against the record's own `expiresAt` and against
/// `protectStartedAt + maxProtectDuration`. No transaction has to be sent to stand protection
/// down. Deterministic recovery that depended on a keeper showing up would not be
/// deterministic recovery.
contract TinjauFeeHook is IHooks {
    using LPFeeLibrary for uint24;
    using PoolIdLibrary for PoolKey;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotPoolManager();
    error HookNotImplemented();
    error ZeroAddress();
    error InvalidFeeBand();
    error PoolMustUseDynamicFee(uint24 fee);
    error EnvelopeUnreadable();

    // ---------------------------------------------------------------------
    // Degraded-read reason codes
    // ---------------------------------------------------------------------

    /// @notice Why a quote came back at `baseFee`. Exposed by `feeDetail` so an operator, an
    /// indexer, or the frontend can tell "no protection was warranted" apart from "protection
    /// was warranted but something was wrong". Both charge the same fee; they are not the same
    /// finding, and §0.12 requires the record to explain itself.
    enum Degraded {
        None, // 0 - clean read; the fee is whatever the record authorises
        NoRecord, // 1 - this (asset, pool) has never been assessed
        RegistryUnreachable, // 2 - staticcall failed or returned an unexpected shape
        MalformedRecord, // 3 - an enum ordinal or width outside this schema
        RecordKeyMismatch, // 4 - registry returned a record for a different asset/pool
        PolicyVersionMismatch, // 5 - record was written under a different policy version
        UndefinedReasonBits, // 6 - reason bit this schema version does not define
        NoSupportedAsset, // 7 - neither side of the pool is a supported asset
        AmbiguousAsset, // 8 - both sides are supported; refuse rather than guess
        RegistryPaused, // 9 - guardian has paused; see PAUSE SEMANTICS below
        NotMarketConfirmed, // 10 - stored PROTECT without exact `Confirmed`
        RumorOnly, // 11 - stored PROTECT carrying REASON_RUMOR_ONLY
        LapsedOrExpired // 12 - PROTECT past its expiry, duration cap, or fully decayed
    }

    // ---------------------------------------------------------------------
    // Immutable configuration
    // ---------------------------------------------------------------------

    IPoolManager public immutable poolManager;
    TinjauRiskRegistry public immutable registry;

    /// @notice The six envelope values, copied from the registry at construction and frozen.
    uint24 public immutable baseFee;
    uint24 public immutable maxFee;
    uint32 public immutable widenDuration;
    uint32 public immutable decayDuration;
    uint32 public immutable maxProtectDuration;
    uint32 public immutable cooldown;

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    constructor(IPoolManager _poolManager, TinjauRiskRegistry _registry) {
        if (address(_poolManager) == address(0) || address(_registry) == address(0)) {
            revert ZeroAddress();
        }

        poolManager = _poolManager;
        registry = _registry;

        // Read the band from the registry rather than accepting it as a constructor argument.
        // A constructor argument could disagree with the registry, and then "the hook cannot
        // charge more than the registry authorised" would be a comment rather than a fact.
        // `envelope`, `paused` and `supportedAsset` are public state variables, so Solidity
        // does not expose a `.selector` for their generated getters; their signatures are
        // written out. `currentRecord` is a real function and uses `.selector`, so a rename
        // there fails to compile rather than silently reading nothing.
        (bool ok, bytes memory data) = address(_registry).staticcall(abi.encodeWithSignature("envelope()"));
        if (!ok || data.length != 192) revert EnvelopeUnreadable();
        (uint24 b, uint24 m, uint32 w, uint32 d, uint32 cap, uint32 cd) =
            abi.decode(data, (uint24, uint24, uint32, uint32, uint32, uint32));

        if (m <= b || !m.isValid()) revert InvalidFeeBand();

        baseFee = b;
        maxFee = m;
        widenDuration = w;
        decayDuration = d;
        maxProtectDuration = cap;
        cooldown = cd;

        // Re-run the policy's own configuration check. A `maxProtectDuration` shorter than
        // widen+decay would truncate the recovery curve, and this hook is the thing that
        // would then be charging a fee whose decay claim does not hold.
        TinjauRiskPolicy.validateEnvelope(_envelope());

        Hooks.validateHookPermissions(this, getHookPermissions());
    }

    /// @notice `beforeInitialize` and `beforeSwap` only. Every return-delta permission stays
    /// off: this hook changes the fee charged on a swap and never the amounts swapped, the
    /// liquidity, or any donation.
    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ---------------------------------------------------------------------
    // IHooks — beforeInitialize
    // ---------------------------------------------------------------------

    /// @inheritdoc IHooks
    /// @dev A v4 pool only honours a `beforeSwap` fee override if it was initialised with
    /// `DYNAMIC_FEE_FLAG`. On a static-fee pool PoolManager silently ignores the override —
    /// the registry would read `PROTECT` while the pool kept charging its static fee, and the
    /// product's central claim would be false for that pool with nothing to show it. The
    /// historical hook documented this footgun in a comment; here it is refused.
    function beforeInitialize(address, PoolKey calldata key, uint160)
        external
        view
        override
        onlyPoolManager
        returns (bytes4)
    {
        if (!key.fee.isDynamicFee()) revert PoolMustUseDynamicFee(key.fee);
        return IHooks.beforeInitialize.selector;
    }

    // ---------------------------------------------------------------------
    // IHooks — beforeSwap
    // ---------------------------------------------------------------------

    /// @inheritdoc IHooks
    function beforeSwap(address, PoolKey calldata key, SwapParams calldata, bytes calldata)
        external
        view
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        (uint24 fee,,,) = _quote(key);
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice The fee this hook would apply to `key` right now.
    function previewFee(PoolKey calldata key) external view returns (uint24 fee) {
        (fee,,,) = _quote(key);
    }

    /// @notice The full quote: fee, why it is what it is, the state being enforced, and when
    /// the current protection lapses without anyone doing anything.
    function feeDetail(PoolKey calldata key)
        external
        view
        returns (uint24 fee, Degraded reason, TinjauRiskTypes.RiskState state, uint64 protectEndsAt)
    {
        return _quote(key);
    }

    /// @notice Which side of the pool this hook treats as the risk asset, and the pool id it
    /// looks the record up under. Published so an operator can verify the hook is reading the
    /// key they think it is, without decoding calldata.
    function resolveAsset(PoolKey calldata key)
        external
        view
        returns (address asset, bytes32 poolId, Degraded reason)
    {
        (asset, reason) = _resolveAsset(key);
        poolId = PoolId.unwrap(key.toId());
    }

    // ---------------------------------------------------------------------
    // The single quote path
    // ---------------------------------------------------------------------

    function _quote(PoolKey calldata key)
        internal
        view
        returns (uint24 fee, Degraded reason, TinjauRiskTypes.RiskState state, uint64 protectEndsAt)
    {
        state = TinjauRiskTypes.RiskState.Normal;

        (address asset, Degraded assetReason) = _resolveAsset(key);
        if (assetReason != Degraded.None) return (baseFee, assetReason, state, 0);

        bytes32 poolId = PoolId.unwrap(key.toId());

        (bool ok, Degraded loadReason, TinjauRiskTypes.RiskRecord memory record) = _loadRecord(asset, poolId);
        if (!ok) return (baseFee, loadReason, state, 0);

        state = record.state;

        // Guarantee: NORMAL and WATCH charge baseFee, always. Checked here as well as inside
        // `TinjauRiskPolicy.effectiveFee`, because this is the product's central safety claim
        // and one enforcement point is one place to get it wrong.
        if (state != TinjauRiskTypes.RiskState.Protect) return (baseFee, Degraded.None, state, 0);

        // PAUSE SEMANTICS. The registry documents that pause blocks NEW protections and does
        // not cancel a running one, and that stays true: the record is untouched, its history
        // is untouched, and its clock keeps running. What pause does here is suspend the fee
        // ACTION. Because the clock is not paused with it, a pause can only ever shorten the
        // total time a fee is elevated, never extend it. See `t4-2-hook-and-wiring.md` §5 —
        // this is a deliberate reading of §0.7, and it is recorded as a deviation.
        if (_registryPaused()) return (baseFee, Degraded.RegistryPaused, state, 0);

        // Defence in depth. The registry already refuses both of these at write time. They are
        // re-checked at read time because the trust model assumes the writing path may be
        // compromised, and because these two are the invariants whose failure is worst: a fee
        // widened on unconfirmed or rumour-only evidence.
        if (record.confirmation != TinjauRiskTypes.ConfirmationStatus.Confirmed) {
            return (baseFee, Degraded.NotMarketConfirmed, state, 0);
        }
        if (record.reasonBits & TinjauRiskTypes.REASON_RUMOR_ONLY != 0) {
            return (baseFee, Degraded.RumorOnly, state, 0);
        }

        TinjauRiskPolicy.Envelope memory e = _envelope();
        protectEndsAt = TinjauRiskPolicy.protectionEndsAt(record, e);

        // `requestedFee` is passed as 0 — "no preference, use the policy target". The stored
        // `RiskRecord` does not carry the assessor's requested fee (see the finding recorded
        // in `t4-2-hook-and-wiring.md` §6), so the hook has nothing to intersect with and must
        // not invent one.
        fee = TinjauRiskPolicy.effectiveFee(record, 0, block.timestamp, e);

        // Final clamp against this hook's own frozen band. `effectiveFee` already clamps; this
        // repeats it so that no future change to the policy library can widen what this
        // contract is capable of returning.
        if (fee < baseFee) fee = baseFee;
        if (fee > maxFee) fee = maxFee;

        reason = fee == baseFee ? Degraded.LapsedOrExpired : Degraded.None;
    }

    // ---------------------------------------------------------------------
    // Asset resolution
    // ---------------------------------------------------------------------

    /// @dev A risk record is keyed on (asset, pool). One hook instance serves many pools, so
    /// the hook must decide which side of a given pool is the tokenised equity. It asks the
    /// registry, rather than carrying its own list: `supportedAsset` is exactly the vetted set
    /// the registry will accept assessments for, and keeping two lists would let them disagree.
    ///
    /// Both sides supported is refused rather than resolved by a tie-break. In the expected
    /// topology one side is the equity and the other is a quote asset that is never assessed;
    /// if that ever stops being true, picking one silently would attach a record about token A
    /// to a pool the operator believes is protected on token B.
    function _resolveAsset(PoolKey calldata key) internal view returns (address asset, Degraded reason) {
        address token0 = Currency.unwrap(key.currency0);
        address token1 = Currency.unwrap(key.currency1);

        (bool ok0, bool supported0) = _supported(token0);
        if (!ok0) return (address(0), Degraded.RegistryUnreachable);
        (bool ok1, bool supported1) = _supported(token1);
        if (!ok1) return (address(0), Degraded.RegistryUnreachable);

        if (supported0 && supported1) return (address(0), Degraded.AmbiguousAsset);
        if (supported0) return (token0, Degraded.None);
        if (supported1) return (token1, Degraded.None);
        return (address(0), Degraded.NoSupportedAsset);
    }

    function _supported(address token) private view returns (bool ok, bool supported) {
        if (token == address(0)) return (true, false); // native currency is never an equity
        (bool success, bytes memory data) =
            address(registry).staticcall(abi.encodeWithSignature("supportedAsset(address)", token));
        if (!success || data.length != 32) return (false, false);
        return (true, abi.decode(data, (bool)));
    }

    function _registryPaused() private view returns (bool) {
        (bool success, bytes memory data) = address(registry).staticcall(abi.encodeWithSignature("paused()"));
        // Unreadable pause flag is treated as paused. This branch can only lower a fee.
        if (!success || data.length != 32) return true;
        return abi.decode(data, (bool));
    }

    // ---------------------------------------------------------------------
    // Record loading — hand-decoded so a malformed record cannot revert a swap
    // ---------------------------------------------------------------------

    /// @dev `RiskRecord` is a fully static struct, so the ABI return is exactly twelve words
    /// with no offset prefix. Each word is validated for range before it becomes an enum,
    /// because `abi.decode` would revert on an out-of-range ordinal and take the swap with it.
    function _loadRecord(address asset, bytes32 poolId)
        internal
        view
        returns (bool ok, Degraded reason, TinjauRiskTypes.RiskRecord memory record)
    {
        (bool success, bytes memory data) = address(registry).staticcall(
            abi.encodeWithSelector(TinjauRiskRegistry.currentRecord.selector, asset, poolId)
        );
        if (!success || data.length != 384) return (false, Degraded.RegistryUnreachable, record);

        uint256[12] memory w;
        assembly ("memory-safe") {
            let src := add(data, 32)
            for { let i := 0 } lt(i, 12) { i := add(i, 1) } {
                let off := mul(i, 32)
                mstore(add(w, off), mload(add(src, off)))
            }
        }

        // Never assessed. Not a defect — the overwhelmingly common case — so it gets its own
        // code rather than being reported as a malformed read.
        if (w[7] == 0) return (false, Degraded.NoRecord, record);

        // Width checks first: a value wider than its declared type means the returndata was
        // not produced by this schema at all.
        if (w[0] >> 160 != 0) return (false, Degraded.MalformedRecord, record);
        if (w[6] > type(uint32).max) return (false, Degraded.MalformedRecord, record);
        if (w[7] > type(uint64).max || w[8] > type(uint64).max || w[9] > type(uint64).max) {
            return (false, Degraded.MalformedRecord, record);
        }

        // Enum ordinals. Out of range means a schema this contract cannot read.
        if (w[2] > 2 || w[3] > 3 || w[4] > 4 || w[5] > 4) {
            return (false, Degraded.MalformedRecord, record);
        }

        // `DataMode.Unknown` is the one `Unknown` sentinel nothing downstream gates.
        // `ConfidenceBand.Unknown` is handled inside `TinjauRiskPolicy` (it maps to no
        // widening), and `ConfirmationStatus.Unknown` fails the exact-`Confirmed` check
        // below. `dataMode` reaches neither, so it is refused here: the registry never
        // writes it, so a record carrying it provably was not posted through the registry.
        if (w[4] == uint256(uint8(TinjauRiskTypes.DataMode.Unknown))) {
            return (false, Degraded.MalformedRecord, record);
        }

        // The registry must have answered about the key that was asked for.
        if (address(uint160(w[0])) != asset || bytes32(w[1]) != poolId) {
            return (false, Degraded.RecordKeyMismatch, record);
        }

        // A record written under a different policy version commits to a different envelope
        // and a different decay curve. Charging it under this one would misrepresent it.
        if (bytes32(w[11]) != TinjauRiskPolicy.POLICY_VERSION) {
            return (false, Degraded.PolicyVersionMismatch, record);
        }

        // A bit this schema does not define was set by a newer writer. Silently masking it off
        // would make the record read as though whatever it meant had not been said.
        if (uint32(w[6]) & ~TinjauRiskTypes.REASON_ALL_DEFINED != 0) {
            return (false, Degraded.UndefinedReasonBits, record);
        }

        record = TinjauRiskTypes.RiskRecord({
            asset: address(uint160(w[0])),
            poolId: bytes32(w[1]),
            state: TinjauRiskTypes.RiskState(uint8(w[2])),
            confidence: TinjauRiskTypes.ConfidenceBand(uint8(w[3])),
            dataMode: TinjauRiskTypes.DataMode(uint8(w[4])),
            confirmation: TinjauRiskTypes.ConfirmationStatus(uint8(w[5])),
            reasonBits: uint32(w[6]),
            assessedAt: uint64(w[7]),
            expiresAt: uint64(w[8]),
            protectStartedAt: uint64(w[9]),
            evidenceCommitment: bytes32(w[10]),
            policyVersion: bytes32(w[11])
        });
        return (true, Degraded.None, record);
    }

    function _envelope() private view returns (TinjauRiskPolicy.Envelope memory) {
        return TinjauRiskPolicy.Envelope({
            baseFee: baseFee,
            maxFee: maxFee,
            widenDuration: widenDuration,
            decayDuration: decayDuration,
            maxProtectDuration: maxProtectDuration,
            cooldown: cooldown
        });
    }

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    // ---------------------------------------------------------------------
    // IHooks — disabled callbacks. Unreachable given getHookPermissions(), implemented to
    // satisfy the interface, and reverting so that a future permission change cannot silently
    // activate an unimplemented path.
    // ---------------------------------------------------------------------

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        revert HookNotImplemented();
    }

    function beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert HookNotImplemented();
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        revert HookNotImplemented();
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert HookNotImplemented();
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        revert HookNotImplemented();
    }

    function afterSwap(address, PoolKey calldata, SwapParams calldata, BalanceDelta, bytes calldata)
        external
        pure
        override
        returns (bytes4, int128)
    {
        revert HookNotImplemented();
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert HookNotImplemented();
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert HookNotImplemented();
    }
}
