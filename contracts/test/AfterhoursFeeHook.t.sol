// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Deployers} from "v4-core/test/utils/Deployers.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";

import {AfterhoursFeeHook} from "../src/AfterhoursFeeHook.sol";
import {EventStateRegistry} from "../src/EventStateRegistry.sol";
import {AfterhoursFeePolicy} from "../src/AfterhoursFeePolicy.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

/// @notice End-to-end pool-simulation tests for AfterhoursFeeHook (task P4.1), using a real
/// v4 PoolManager, a real dynamic-fee pool, and real swaps via PoolSwapTest — not just the
/// isolated fee-math unit tests in AfterhoursFeePolicy.t.sol. This proves the hook is wired
/// correctly to PoolManager's dynamic-fee-override mechanism, not just that the underlying
/// math is correct.
///
/// Hook deployment pattern: v4 requires a hook's address to encode its enabled permission
/// flags in the low bits, and this hook's constructor itself calls
/// `Hooks.validateHookPermissions` (a real safety property we want tested, not bypassed) —
/// so a plain `new AfterhoursFeeHook(...)` at a random address always reverts, both here and
/// in real deployment. We mine a CREATE2 salt (brute-force loop over candidate salts, see
/// `_mineHookAddress`) such that `new AfterhoursFeeHook{salt: salt}(...)` lands on an address
/// whose low 14 bits match exactly the `beforeSwap`-only permission mask this hook declares,
/// mirroring how a real deployment (e.g. via a HookMiner/CREATE2 factory) would work.
contract AfterhoursFeeHookTest is Test, Deployers {
    using StateLibrary for IPoolManager;

    EventStateRegistry registry;
    MockUSDT0 usdt0;
    AfterhoursFeeHook hook;

    address posterKey = makeAddr("poster");
    address resolverKey = makeAddr("resolver");
    address equityToken; // set to Currency.unwrap(currency1) after pool setup

    uint24 constant BASE_FEE = 500; // 0.05%
    uint24 constant MAX_FEE = 20_000; // 2%
    uint256 constant WIDEN_DURATION = 1 hours;
    uint256 constant DECAY_DURATION = 5 hours;

    function setUp() public {
        usdt0 = new MockUSDT0();
        registry = new EventStateRegistry(address(usdt0), posterKey, resolverKey, 48 hours);

        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        // currency1 stands in for the tokenised equity in these tests.
        equityToken = Currency.unwrap(currency1);

        bytes memory creationCode = abi.encodePacked(
            type(AfterhoursFeeHook).creationCode,
            abi.encode(manager, registry, BASE_FEE, MAX_FEE, WIDEN_DURATION, DECAY_DURATION)
        );
        bytes32 salt = _mineHookAddress(Hooks.BEFORE_SWAP_FLAG, creationCode);

        hook = new AfterhoursFeeHook{salt: salt}(
            manager, registry, BASE_FEE, MAX_FEE, WIDEN_DURATION, DECAY_DURATION
        );

        (key,) = initPool(currency0, currency1, IHooks(address(hook)), LPFeeLibrary.DYNAMIC_FEE_FLAG, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(key, LIQUIDITY_PARAMS, ZERO_BYTES);

        usdt0.mint(posterKey, 10_000_000 * 1e6);
        vm.prank(posterKey);
        usdt0.approve(address(registry), type(uint256).max);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /// @notice Brute-force CREATE2 salt miner: finds a salt such that deploying
    /// `creationCode` from this test contract lands on an address whose low 14 bits
    /// (`Hooks.ALL_HOOK_MASK`) equal `desiredFlags` exactly. Minimal, test-only stand-in for
    /// a production HookMiner utility (e.g. from v4-periphery, not depended on here to keep
    /// this project's dependency surface small — see report for this scope note).
    function _mineHookAddress(uint160 desiredFlags, bytes memory creationCode) internal view returns (bytes32 salt) {
        bytes32 initCodeHash = keccak256(creationCode);
        for (uint256 i = 0; i < 200_000; i++) {
            bytes32 candidateSalt = bytes32(i);
            address candidate = vm.computeCreate2Address(candidateSalt, initCodeHash, address(this));
            if (uint160(candidate) & Hooks.ALL_HOOK_MASK == desiredFlags) {
                return candidateSalt;
            }
        }
        revert("no salt found in search range");
    }

    function _fullAgreement() internal pure returns (EventStateRegistry.FieldAgreement memory) {
        return EventStateRegistry.FieldAgreement({
            eventTypeAgreement: 3,
            effectiveDateAgreement: 3,
            declaredAmountAgreement: 3,
            affectedTokenAgreement: 3,
            nextEventDateAgreement: 3
        });
    }

    function _postEvent(EventStateRegistry.EventType eventType, int8 severity) internal returns (uint256) {
        EventStateRegistry.FactualFields memory facts = EventStateRegistry.FactualFields({
            effectiveDate: block.timestamp + 1 days,
            declaredAmount: 0,
            affectedToken: equityToken,
            currency: "USD",
            extraDataURI: "",
            extraDataHash: bytes32(0)
        });

        vm.prank(posterKey);
        return registry.postEvent(
            equityToken,
            eventType,
            "test filing",
            facts,
            _fullAgreement(),
            EventStateRegistry.SeverityGrade({severity: severity, confidence: 90}),
            "https://example.com/filing",
            keccak256("doc"),
            0,
            1_000 * 1e6
        );
    }

    /// @dev A dynamic-fee pool's beforeSwap fee override applies only to that single swap —
    /// it is NOT persisted into the pool's stored slot0 state (StateLibrary.getSlot0 would
    /// keep reporting whatever the pool's stored lpFee is, e.g. 0 for a never-explicitly-set
    /// dynamic-fee pool). The fee actually applied to a swap is only observable via the
    /// PoolManager `Swap` event's `fee` parameter, so we capture logs and decode it —
    /// mirroring the assertion pattern v4-core's own DynamicFees.t.sol uses.
    function _doSwap() internal returns (uint24 appliedFee) {
        vm.recordLogs();
        swap(key, true, -100, ZERO_BYTES);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 swapTopic = keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == swapTopic) {
                // data = amount0, amount1, sqrtPriceX96, liquidity, tick, fee — 6 words,
                // fee is the last word.
                bytes memory data = logs[i].data;
                uint256 feeWordOffset = data.length - 32;
                uint256 feeWord;
                assembly {
                    feeWord := mload(add(add(data, 32), feeWordOffset))
                }
                // casting to 'uint24' is safe: PoolManager only ever stores/emits a fee
                // value that already fits uint24 (LPFeeLibrary caps it at MAX_LP_FEE)
                // forge-lint: disable-next-line(unsafe-typecast)
                return uint24(feeWord);
            }
        }
        revert("Swap event not found");
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_hookPermissions_onlyBeforeSwapEnabled() public view {
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertTrue(perms.beforeSwap);
        assertFalse(perms.afterSwap);
        assertFalse(perms.beforeSwapReturnDelta);
        assertFalse(perms.afterSwapReturnDelta);
        assertFalse(perms.beforeInitialize);
        assertFalse(perms.afterInitialize);
        assertFalse(perms.beforeAddLiquidity);
        assertFalse(perms.afterAddLiquidity);
        assertFalse(perms.beforeRemoveLiquidity);
        assertFalse(perms.afterRemoveLiquidity);
        assertFalse(perms.beforeDonate);
        assertFalse(perms.afterDonate);
    }

    function test_noEvent_swapUsesBaseFee() public {
        uint24 appliedFee = _doSwap();
        assertEq(appliedFee, BASE_FEE);
    }

    function test_severeEvent_swapUsesWidenedFee() public {
        _postEvent(EventStateRegistry.EventType.Form8K_Bankruptcy, 0);
        uint24 appliedFee = _doSwap();
        assertEq(appliedFee, MAX_FEE, "bankruptcy filing with neutral severity should hit max band edge");
    }

    function test_routineEvent_swapUsesModeratelyWidenedFee() public {
        _postEvent(EventStateRegistry.EventType.Form4_InsiderBuy, 0);
        uint24 appliedFee = _doSwap();
        assertGt(appliedFee, BASE_FEE);
        assertLt(appliedFee, MAX_FEE);
    }

    function test_feeDecaysBackToBaseOverTime() public {
        _postEvent(EventStateRegistry.EventType.Form8K_Bankruptcy, 0);

        uint24 feeImmediately = _doSwap();
        assertEq(feeImmediately, MAX_FEE);

        vm.warp(block.timestamp + WIDEN_DURATION + DECAY_DURATION + 1);
        uint24 feeAfterDecay = _doSwap();
        assertEq(feeAfterDecay, BASE_FEE, "fee should fully decay back to base after widen+decay window");
    }

    /// @notice Pool-level counterpart to the unit-level anti-escape test: drive an actual
    /// swap with the most adversarial severity value (type(int8).max) on top of an
    /// already-maxed-out bonded-field configuration, and confirm the ACTUAL fee applied by
    /// PoolManager to a real swap — not just the pure function's return value — never
    /// exceeds maxFee.
    function test_extremeSeverity_appliedFeeNeverExceedsMaxFeeInRealSwap() public {
        _postEvent(EventStateRegistry.EventType.Form8K_Bankruptcy, type(int8).max);
        uint24 appliedFee = _doSwap();
        assertLe(appliedFee, MAX_FEE, "real swap must never apply a fee above the hard-coded band ceiling");
        assertGe(appliedFee, BASE_FEE, "real swap must never apply a fee below the hard-coded band floor");
    }

    function test_extremeNegativeSeverity_appliedFeeNeverBelowBaseFeeInRealSwap() public {
        _postEvent(EventStateRegistry.EventType.Unknown, type(int8).min);
        uint24 appliedFee = _doSwap();
        assertGe(appliedFee, BASE_FEE, "real swap must never apply a fee below the hard-coded band floor");
        assertLe(appliedFee, MAX_FEE);
    }

    function test_previewFee_matchesAppliedFee() public {
        _postEvent(EventStateRegistry.EventType.Form8K_MAndA, 40);
        uint24 previewed = hook.previewFee(key);
        uint24 applied = _doSwap();
        assertEq(previewed, applied);
    }

    function test_disputedEvent_widensFeeFurtherThanUndisputed() public {
        uint256 id1 = _postEvent(EventStateRegistry.EventType.Form4_InsiderSell, 0);
        uint24 feeUndisputed = hook.previewFee(key);

        vm.prank(makeAddr("challenger"));
        registry.challenge(id1);

        uint24 feeDisputed = hook.previewFee(key);
        assertGe(feeDisputed, feeUndisputed, "an open unresolved challenge should never narrow the fee");
    }

    function test_directCallByNonPoolManager_reverts() public {
        vm.expectRevert(AfterhoursFeeHook.NotPoolManager.selector);
        hook.beforeSwap(
            address(this), key, SwapParams({zeroForOne: true, amountSpecified: -100, sqrtPriceLimitX96: 0}), ZERO_BYTES
        );
    }

    function test_constructor_revertsOnInvalidFeeBand() public {
        vm.expectRevert(AfterhoursFeeHook.InvalidFeeBand.selector);
        new AfterhoursFeeHook(manager, registry, MAX_FEE, BASE_FEE, WIDEN_DURATION, DECAY_DURATION); // swapped

        vm.expectRevert(AfterhoursFeeHook.InvalidFeeBand.selector);
        new AfterhoursFeeHook(manager, registry, BASE_FEE, BASE_FEE, WIDEN_DURATION, DECAY_DURATION); // equal
    }
}
