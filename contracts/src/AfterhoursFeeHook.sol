// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "v4-core/src/types/PoolOperation.sol";

import {EventStateRegistry} from "./EventStateRegistry.sol";
import {AfterhoursFeePolicy} from "./AfterhoursFeePolicy.sol";

/// @title AfterhoursFeeHook
/// @notice AFTERHOURS Uniswap v4 `beforeSwap` hook (task P4.1). Widens the swap fee on a
/// pool whose token has a recent corporate-events registry entry, within a hard-coded band
/// that the registry's unbonded severity grade can never escape.
///
/// @dev SCOPE / DESIGN NOTES:
///
/// - This hook implements ONLY `beforeSwap` (permission flags: all false except
///   `beforeSwap`). `beforeSwapReturnDelta` is disabled — this hook never changes swap
///   amounts, it only overrides the pool's LP fee for the swap. All other IHooks callbacks
///   are implemented to satisfy the interface but simply revert (`HookNotImplemented`)
///   since PoolManager will never invoke them given the disabled permission flags.
///
/// - The pool this hook is attached to MUST be initialized with `LPFeeLibrary.DYNAMIC_FEE_FLAG`
///   as its `fee` in `PoolKey` — v4 only honors a beforeSwap fee override on dynamic-fee
///   pools (see `LPFeeLibrary.OVERRIDE_FEE_FLAG` docs). A static-fee pool using this hook
///   would have the override silently ignored by PoolManager.
///
/// - All actual fee math (the "how much" and the hard-band-clamp guarantee) lives in the
///   pure `AfterhoursFeePolicy` library so it can be unit-tested in isolation from
///   PoolManager/hook plumbing. This contract's job is just: (1) figure out which token in
///   the pool the registry data concerns, (2) pull the cheap bonded+severity summary from
///   the registry, (3) call the policy library, (4) return the result with the override
///   flag set.
///
/// - TOKEN RESOLUTION: a single hook instance can be reused across many pools (this is the
///   standard v4 hook pattern — one hook contract, many PoolKeys). For a given swap, this
///   hook checks the registry's `latestEventIdForToken` for both `currency0` and
///   `currency1` of the pool and uses whichever has a (more recent) posted event. In the
///   expected AFTERHOURS topology one side of the pool is the tokenised equity and the
///   other is a stable/quote asset that never has registry entries, so this resolves
///   unambiguously in practice; if by some construction both sides have events, the more
///   recently posted one wins (documented choice, not expected to occur in practice).
contract AfterhoursFeeHook is IHooks {
    using LPFeeLibrary for uint24;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotPoolManager();
    error HookNotImplemented();
    error ZeroAddress();
    error InvalidFeeBand();

    // ---------------------------------------------------------------------
    // Immutable configuration
    // ---------------------------------------------------------------------

    /// @notice The v4 PoolManager this hook is authorized to be called by.
    IPoolManager public immutable poolManager;

    /// @notice The AFTERHOURS corporate-events registry this hook reads from.
    EventStateRegistry public immutable registry;

    /// @notice Lower edge of the hard-coded fee band, in hundredths of a bip (uint24, same
    /// convention as Uniswap v4's LPFeeLibrary; e.g. 500 = 0.05%). This is also the fee used
    /// whenever there is no relevant registry event.
    uint24 public immutable baseFee;

    /// @notice Upper edge of the hard-coded fee band (e.g. 20_000 = 2%). No combination of
    /// bonded fields, time decay, or unbonded severity can push the returned fee above this
    /// — see `AfterhoursFeePolicy.computeFee` and its clamp, and
    /// `test/AfterhoursFeePolicy.t.sol` / `test/AfterhoursFeeHook.t.sol` for the tests that
    /// specifically try to break this with adversarial severity input.
    uint24 public immutable maxFee;

    /// @notice Seconds after an event posts during which the fee stays at its full
    /// concern-tier target (before beginning to decay back toward `baseFee`).
    uint256 public immutable widenDuration;

    /// @notice Seconds over which the fee linearly decays from its widened target back to
    /// `baseFee`, starting once `widenDuration` has elapsed since the event posted.
    uint256 public immutable decayDuration;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event FeeApplied(
        bytes32 indexed poolIdHint,
        address indexed relevantToken,
        uint256 eventId,
        uint24 appliedFee,
        int8 severity
    );

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @param _poolManager The v4 PoolManager.
    /// @param _registry The AFTERHOURS EventStateRegistry.
    /// @param _baseFee Lower band edge, e.g. 500 (0.05%).
    /// @param _maxFee Upper band edge, e.g. 20_000 (2%). Must be > _baseFee and <=
    /// LPFeeLibrary.MAX_LP_FEE (1_000_000 / 100%).
    /// @param _widenDuration Seconds fully widened after an event posts, e.g. 1 hours.
    /// @param _decayDuration Seconds to decay back to baseFee after that, e.g. 5 hours.
    constructor(
        IPoolManager _poolManager,
        EventStateRegistry _registry,
        uint24 _baseFee,
        uint24 _maxFee,
        uint256 _widenDuration,
        uint256 _decayDuration
    ) {
        if (address(_poolManager) == address(0) || address(_registry) == address(0)) {
            revert ZeroAddress();
        }
        if (_maxFee <= _baseFee || !_maxFee.isValid()) revert InvalidFeeBand();

        poolManager = _poolManager;
        registry = _registry;
        baseFee = _baseFee;
        maxFee = _maxFee;
        widenDuration = _widenDuration;
        decayDuration = _decayDuration;

        Hooks.validateHookPermissions(this, getHookPermissions());
    }

    /// @notice Only `beforeSwap` is enabled. Everything else — including both
    /// `beforeSwapReturnDelta`/`afterSwapReturnDelta` — stays off: this hook changes the fee
    /// only, never swap amounts, liquidity behavior, or donations.
    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
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
    // IHooks — beforeSwap (the only implemented callback)
    // ---------------------------------------------------------------------

    /// @inheritdoc IHooks
    /// @dev Returns an overridden LP fee with `LPFeeLibrary.OVERRIDE_FEE_FLAG` set, per the
    /// v4 dynamic-fee-pool convention. Pool MUST be initialized with the dynamic fee flag or
    /// this override is silently ignored by PoolManager (see contract-level docs).
    function beforeSwap(address, PoolKey calldata key, SwapParams calldata, bytes calldata)
        external
        view
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        uint24 fee = _resolveFee(key);
        uint24 overriddenFee = fee | LPFeeLibrary.OVERRIDE_FEE_FLAG;
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, overriddenFee);
    }

    /// @notice View-only helper exposing the fee this hook would apply to `key` right now,
    /// without needing to go through PoolManager. Useful for off-chain quoting/UI and for
    /// tests that want to assert on the policy output directly.
    function previewFee(PoolKey calldata key) external view returns (uint24) {
        return _resolveFee(key);
    }

    function _resolveFee(PoolKey calldata key) internal view returns (uint24) {
        (bool hasEvent, uint256 eventId, address relevantToken) = _resolveRelevantEvent(key);

        if (!hasEvent) return baseFee;

        (
            EventStateRegistry.EventType eventType,
            EventStateRegistry.FieldAgreement memory agreement,
            EventStateRegistry.SeverityGrade memory severity,
            uint256 timestamp,
            bool isDisputedUnresolved
        ) = registry.getEventSummary(eventId);

        // relevantToken/eventId only used above for lookup; silence unused-var warnings in
        // case future changes stop referencing them directly in this function body.
        relevantToken;

        return AfterhoursFeePolicy.computeFee(
            eventType,
            agreement,
            severity,
            isDisputedUnresolved,
            timestamp,
            true,
            block.timestamp,
            baseFee,
            maxFee,
            widenDuration,
            decayDuration
        );
    }

    /// @dev Checks both pool currencies against the registry and picks whichever has the
    /// more recently posted event (see contract-level "TOKEN RESOLUTION" docs).
    function _resolveRelevantEvent(PoolKey calldata key)
        internal
        view
        returns (bool hasEvent, uint256 eventId, address relevantToken)
    {
        address token0 = Currency.unwrap(key.currency0);
        address token1 = Currency.unwrap(key.currency1);

        uint256 id0 = token0 == address(0) ? 0 : registry.latestEventIdForToken(token0);
        uint256 id1 = token1 == address(0) ? 0 : registry.latestEventIdForToken(token1);

        if (id0 == 0 && id1 == 0) {
            return (false, 0, address(0));
        }
        if (id0 == 0) return (true, id1, token1);
        if (id1 == 0) return (true, id0, token0);

        // Both sides have events (edge case) — prefer the more recently posted one.
        EventStateRegistry.EventState memory e0 = registry.getEvent(id0);
        EventStateRegistry.EventState memory e1 = registry.getEvent(id1);
        if (e0.timestamp >= e1.timestamp) return (true, id0, token0);
        return (true, id1, token1);
    }

    // ---------------------------------------------------------------------
    // IHooks — all other callbacks: unreachable given getHookPermissions() above, but
    // implemented to satisfy the interface. Each reverts if somehow invoked.
    // ---------------------------------------------------------------------

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        revert HookNotImplemented();
    }

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
