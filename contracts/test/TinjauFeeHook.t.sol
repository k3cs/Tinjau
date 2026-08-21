// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Deployers} from "v4-core/test/utils/Deployers.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";

import {TinjauFeeHook} from "../src/TinjauFeeHook.sol";
import {TinjauRiskTypes} from "../src/TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "../src/TinjauRiskPolicy.sol";
import {TinjauRiskRegistry} from "../src/TinjauRiskRegistry.sol";
import {MockTinjauRiskRegistry} from "./mocks/MockTinjauRiskRegistry.sol";

/// @notice Enforcement coverage for `TinjauFeeHook` (the wiring T4.2 depends on).
///
/// @dev TWO HOOKS, TWO PURPOSES, AND WHY BOTH ARE NEEDED.
///
/// `realHook` sits on a real `TinjauRiskRegistry`, a real `PoolManager`, and a real
/// dynamic-fee pool. It is the only thing here that can answer "did a swap actually get
/// charged this fee", because a unit test of a fee function is not evidence that a pool
/// charged it. The fee is read back out of PoolManager's own `Swap` event, not out of the
/// hook.
///
/// `mockHook` sits on a registry that can lie. This is not a shortcut around the real
/// registry — it is the point. The real registry refuses to store a rumour-driven `PROTECT`,
/// an out-of-range enum, or an undefined reason bit, so it physically cannot produce the
/// inputs the hook's fail-closed branches exist to survive. The hook's trust model assumes the
/// writing path may be compromised (tracker §0.6); testing it only against a registry that
/// behaves would leave every one of those branches unexercised.
///
/// @dev The pool used here is BUILDER-CONTROLLED test liquidity. It proves the mechanism; it
/// is not evidence about any real market.
contract TinjauFeeHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;

    // Inherited verbatim from the deployed historical hook (tracker §0.11). Not chosen here.
    uint24 constant BASE_FEE = 500; // 0.05%
    uint24 constant MAX_FEE = 20_000; // 2%
    uint32 constant WIDEN_DURATION = 3600;
    uint32 constant DECAY_DURATION = 18_000;
    uint32 constant MAX_PROTECT_DURATION = 21_600;
    uint32 constant COOLDOWN = 3600;

    TinjauRiskRegistry internal realRegistry;
    TinjauFeeHook internal realHook;

    MockTinjauRiskRegistry internal mockRegistry;
    TinjauFeeHook internal mockHook;
    PoolKey internal mockKey;
    bytes32 internal mockPoolId;
    address internal mockAsset = address(0xA55E7);
    address internal mockQuote = address(0xB0B0);

    uint256 internal assessorKey = 0xA55E5;
    address internal assessor;
    address internal guardian = address(0x6A17D);

    address internal equityToken; // the currency1 side of the real pool
    bytes32 internal realPoolId;
    uint256 internal nonceCounter;

    function setUp() public {
        assessor = vm.addr(assessorKey);
        TinjauRiskPolicy.Envelope memory env = _env();

        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();
        equityToken = Currency.unwrap(currency1);

        // --- the mock leg: a registry that can misbehave, and no pool at all --------------
        mockRegistry = new MockTinjauRiskRegistry(env);
        mockHook = _deployHook(TinjauRiskRegistry(address(mockRegistry)));
        mockRegistry.setSupported(mockAsset, true);
        mockKey = PoolKey({
            currency0: Currency.wrap(mockAsset < mockQuote ? mockAsset : mockQuote),
            currency1: Currency.wrap(mockAsset < mockQuote ? mockQuote : mockAsset),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(address(mockHook))
        });
        mockPoolId = PoolId.unwrap(mockKey.toId());

        // --- the real leg: real registry, real PoolManager, real dynamic-fee pool ---------
        realRegistry = new TinjauRiskRegistry(assessor, guardian, env);
        realHook = _deployHook(realRegistry);

        vm.prank(guardian);
        realRegistry.setAssetSupported(equityToken, true);

        (key,) =
            initPool(currency0, currency1, IHooks(address(realHook)), LPFeeLibrary.DYNAMIC_FEE_FLAG, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(key, LIQUIDITY_PARAMS, ZERO_BYTES);
        realPoolId = PoolId.unwrap(key.toId());

        vm.warp(1_000_000);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    function _env() internal pure returns (TinjauRiskPolicy.Envelope memory) {
        return TinjauRiskPolicy.Envelope({
            baseFee: BASE_FEE,
            maxFee: MAX_FEE,
            widenDuration: WIDEN_DURATION,
            decayDuration: DECAY_DURATION,
            maxProtectDuration: MAX_PROTECT_DURATION,
            cooldown: COOLDOWN
        });
    }

    /// @dev v4 encodes a hook's enabled permissions in the low 14 bits of its address, and
    /// `TinjauFeeHook`'s constructor validates that itself. So a plain `new` at a random
    /// address always reverts, here and in production. The salt is mined so the deployed
    /// address matches the `beforeInitialize | beforeSwap` mask exactly.
    function _deployHook(TinjauRiskRegistry reg) internal returns (TinjauFeeHook) {
        uint160 flags = Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG;
        bytes memory creationCode = abi.encodePacked(type(TinjauFeeHook).creationCode, abi.encode(manager, reg));
        bytes32 initCodeHash = keccak256(creationCode);
        for (uint256 i = 0; i < 200_000; i++) {
            bytes32 candidateSalt = bytes32(i);
            if (uint160(vm.computeCreate2Address(candidateSalt, initCodeHash, address(this))) & Hooks.ALL_HOOK_MASK
                    == flags) {
                return new TinjauFeeHook{salt: candidateSalt}(manager, reg);
            }
        }
        revert("no salt found in search range");
    }

    function _record(
        TinjauRiskTypes.RiskState state,
        TinjauRiskTypes.ConfidenceBand conf,
        TinjauRiskTypes.ConfirmationStatus cs,
        uint32 bits,
        uint64 assessedAt,
        uint64 expiresAt,
        uint64 protectStartedAt
    ) internal view returns (TinjauRiskTypes.RiskRecord memory) {
        return TinjauRiskTypes.RiskRecord({
            asset: mockAsset,
            poolId: mockPoolId,
            state: state,
            confidence: conf,
            dataMode: TinjauRiskTypes.DataMode.Replay,
            confirmation: cs,
            reasonBits: bits,
            assessedAt: assessedAt,
            expiresAt: expiresAt,
            protectStartedAt: protectStartedAt,
            evidenceCommitment: keccak256("evidence"),
            policyVersion: TinjauRiskPolicy.POLICY_VERSION
        });
    }

    /// @dev A clean, currently-active, high-confidence PROTECT starting now.
    function _activeProtect() internal {
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING | TinjauRiskTypes.REASON_MARKET_CONFIRMED,
                uint64(block.timestamp),
                uint64(block.timestamp + 100_000),
                uint64(block.timestamp)
            )
        );
    }

    function _mockFee() internal view returns (uint24) {
        return mockHook.previewFee(mockKey);
    }

    function _mockReason() internal view returns (TinjauFeeHook.Degraded r) {
        (, r,,) = mockHook.feeDetail(mockKey);
    }

    /// @dev The twelve ABI words of a valid active-PROTECT record, ready to be corrupted one
    /// word at a time.
    function _validWords() internal view returns (uint256[12] memory w) {
        w[0] = uint256(uint160(mockAsset));
        w[1] = uint256(mockPoolId);
        w[2] = uint256(uint8(TinjauRiskTypes.RiskState.Protect));
        w[3] = uint256(uint8(TinjauRiskTypes.ConfidenceBand.High));
        w[4] = uint256(uint8(TinjauRiskTypes.DataMode.Replay));
        w[5] = uint256(uint8(TinjauRiskTypes.ConfirmationStatus.Confirmed));
        w[6] = uint256(TinjauRiskTypes.REASON_OFFICIAL_FILING);
        w[7] = block.timestamp;
        w[8] = block.timestamp + 100_000;
        w[9] = block.timestamp;
        w[10] = uint256(keccak256("evidence"));
        w[11] = uint256(TinjauRiskPolicy.POLICY_VERSION);
    }

    function _setRawWords(uint256[12] memory w) internal {
        mockRegistry.setRaw(
            abi.encodePacked(w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9], w[10], w[11])
        );
    }

    // --- real-registry posting ---------------------------------------------------------

    function _assessment(TinjauRiskTypes.RiskState state, uint256 ts)
        internal
        returns (TinjauRiskRegistry.Assessment memory a)
    {
        a.asset = equityToken;
        a.poolId = realPoolId;
        a.state = state;
        a.confidence = TinjauRiskTypes.ConfidenceBand.High;
        a.dataMode = TinjauRiskTypes.DataMode.Replay;
        a.confirmation = TinjauRiskTypes.ConfirmationStatus.Confirmed;
        a.reasonBits = TinjauRiskTypes.REASON_OFFICIAL_FILING | TinjauRiskTypes.REASON_MARKET_CONFIRMED;
        a.assessedAt = uint64(ts);
        a.expiresAt = uint64(ts + 100_000);
        a.evidenceCommitment = keccak256("evidence");
        a.requestedFee = 0;
        a.nonce = ++nonceCounter;
        a.deadline = ts + 600;
    }

    function _post(TinjauRiskRegistry.Assessment memory a) internal {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(assessorKey, realRegistry.hashAssessment(a));
        realRegistry.postAssessment(a, abi.encodePacked(r, s, v));
    }

    /// @dev A dynamic-fee override applies to one swap and is never persisted into slot0, so
    /// `StateLibrary.getSlot0` would keep reporting the pool's stored lpFee. The fee ACTUALLY
    /// charged is only observable in PoolManager's own `Swap` event. Reading it from there is
    /// the difference between "the hook returned a number" and "the pool charged it".
    function _swapAndReadFee() internal returns (uint24 appliedFee) {
        vm.recordLogs();
        swap(key, true, -100, ZERO_BYTES);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 swapTopic = keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == swapTopic) {
                bytes memory data = logs[i].data;
                uint256 feeWordOffset = data.length - 32; // fee is the last of six words
                uint256 feeWord;
                assembly {
                    feeWord := mload(add(add(data, 32), feeWordOffset))
                }
                // casting to 'uint24' is safe: PoolManager only emits a fee already capped at
                // LPFeeLibrary.MAX_LP_FEE
                // forge-lint: disable-next-line(unsafe-typecast)
                return uint24(feeWord);
            }
        }
        revert("Swap event not found");
    }

    // =======================================================================
    // PROPERTY 1 — NORMAL and WATCH charge exactly baseFee, always
    // =======================================================================

    /// @notice The product's central safety claim: a `WATCH` never invokes the aggressive fee
    /// path. Fuzzed over confidence, confirmation, every defined reason bit, the whole
    /// timeline, and the clock — the state is the only thing held down.
    function testFuzz_normalAndWatchAlwaysChargeExactlyBaseFee(
        bool isWatch,
        uint8 rawConf,
        uint8 rawConfirm,
        uint32 rawBits,
        uint64 rawAssessedAt,
        uint64 rawLifetime,
        uint64 rawStartedAt,
        uint64 rawNow
    ) public {
        uint256 nowTs = bound(rawNow, 1, 1 << 40);
        vm.warp(nowTs);

        uint64 assessedAt = uint64(bound(rawAssessedAt, 1, 1 << 40));
        mockRegistry.setRecord(
            _record(
                isWatch ? TinjauRiskTypes.RiskState.Watch : TinjauRiskTypes.RiskState.Normal,
                TinjauRiskTypes.ConfidenceBand(bound(rawConf, 0, 3)),
                TinjauRiskTypes.ConfirmationStatus(bound(rawConfirm, 0, 4)),
                rawBits & TinjauRiskTypes.REASON_ALL_DEFINED,
                assessedAt,
                uint64(bound(rawLifetime, 1, 1 << 41)),
                uint64(bound(rawStartedAt, 0, 1 << 40))
            )
        );

        assertEq(_mockFee(), BASE_FEE, "NORMAL/WATCH must charge exactly baseFee");

        // The reason matters as much as the fee. `None` means "no protection was warranted";
        // `LapsedOrExpired` would mean "protection was warranted and then ran out". A WATCH
        // must produce the first. Without this line the hook's own non-PROTECT short-circuit
        // is unobservable — `TinjauRiskPolicy.effectiveFee` returns baseFee for a WATCH too,
        // so the fee alone cannot tell the two enforcement layers apart. Verified by mutation:
        // weakening the hook's guard to `state == Normal` leaves the fee assertion green and
        // fails this one.
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.None), "WATCH must not read as lapsed protection");
    }

    /// @notice The same claim through a real pool: a stored `WATCH` and a real swap.
    function test_e2e_watchIsChargedBaseFeeByTheActualPool() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Watch, block.timestamp));
        assertEq(_swapAndReadFee(), BASE_FEE);
    }

    // =======================================================================
    // PROPERTY 2 — the charged fee never leaves [baseFee, maxFee]
    // =======================================================================

    function testFuzz_feeNeverLeavesTheBand(
        uint8 rawState,
        uint8 rawConf,
        uint8 rawConfirm,
        uint32 rawBits,
        uint64 rawAssessedAt,
        uint64 rawExpiresAt,
        uint64 rawStartedAt,
        uint64 rawNow
    ) public {
        vm.warp(bound(rawNow, 1, 1 << 40));
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState(bound(rawState, 0, 2)),
                TinjauRiskTypes.ConfidenceBand(bound(rawConf, 0, 3)),
                TinjauRiskTypes.ConfirmationStatus(bound(rawConfirm, 0, 4)),
                rawBits & TinjauRiskTypes.REASON_ALL_DEFINED,
                uint64(bound(rawAssessedAt, 1, 1 << 41)),
                uint64(bound(rawExpiresAt, 0, 1 << 41)),
                uint64(bound(rawStartedAt, 0, 1 << 41))
            )
        );

        uint24 fee = _mockFee();
        assertGe(fee, BASE_FEE, "fee below the band floor");
        assertLe(fee, MAX_FEE, "fee above the band ceiling");
    }

    /// @notice The band is not the hook's own opinion. A registry deployed with a narrower
    /// ceiling produces a hook that cannot exceed it — proving the hook cannot widen a fee the
    /// registry did not authorise.
    function test_hookCannotWidenBeyondTheEnvelopeTheRegistryPublished() public {
        TinjauRiskPolicy.Envelope memory narrow = _env();
        narrow.maxFee = 3_000; // 0.3%
        MockTinjauRiskRegistry narrowRegistry = new MockTinjauRiskRegistry(narrow);
        TinjauFeeHook narrowHook = _deployHook(TinjauRiskRegistry(address(narrowRegistry)));

        assertEq(narrowHook.maxFee(), 3_000, "hook must inherit the registry's ceiling");
        assertEq(narrowHook.baseFee(), BASE_FEE);

        narrowRegistry.setSupported(mockAsset, true);
        PoolKey memory k = mockKey;
        k.hooks = IHooks(address(narrowHook));
        narrowRegistry.setRecord(
            TinjauRiskTypes.RiskRecord({
                asset: mockAsset,
                poolId: PoolId.unwrap(k.toId()),
                state: TinjauRiskTypes.RiskState.Protect,
                confidence: TinjauRiskTypes.ConfidenceBand.High,
                dataMode: TinjauRiskTypes.DataMode.Replay,
                confirmation: TinjauRiskTypes.ConfirmationStatus.Confirmed,
                reasonBits: TinjauRiskTypes.REASON_OFFICIAL_FILING,
                assessedAt: uint64(block.timestamp),
                expiresAt: uint64(block.timestamp + 100_000),
                protectStartedAt: uint64(block.timestamp),
                evidenceCommitment: keccak256("evidence"),
                policyVersion: TinjauRiskPolicy.POLICY_VERSION
            })
        );

        assertEq(narrowHook.previewFee(k), 3_000, "the widest possible fee is the registry's own ceiling");
    }

    function test_hookEnvelopeMatchesTheRegistryExactly() public view {
        (uint24 b, uint24 m, uint32 w, uint32 d, uint32 cap, uint32 cd) = realRegistry.envelope();
        assertEq(realHook.baseFee(), b);
        assertEq(realHook.maxFee(), m);
        assertEq(realHook.widenDuration(), w);
        assertEq(realHook.decayDuration(), d);
        assertEq(realHook.maxProtectDuration(), cap);
        assertEq(realHook.cooldown(), cd);
    }

    // =======================================================================
    // PROPERTY 3 — protection never outlives min(maxProtectDuration, expiresAt)
    // =======================================================================

    function testFuzz_protectionNeverOutlivesTheEarlierOfCapAndExpiry(
        uint64 rawStartedAt,
        uint32 rawLifetime,
        uint32 rawOvershoot
    ) public {
        uint64 startedAt = uint64(bound(rawStartedAt, 1, 1 << 40));
        uint64 expiresAt = startedAt + uint64(bound(rawLifetime, 1, 500_000));

        uint64 byCap = startedAt + MAX_PROTECT_DURATION;
        uint64 endsAt = byCap < expiresAt ? byCap : expiresAt;

        vm.warp(uint256(endsAt) + bound(rawOvershoot, 0, 1_000_000));

        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING,
                startedAt,
                expiresAt,
                startedAt
            )
        );

        assertEq(_mockFee(), BASE_FEE, "protection outlived min(cap, expiry)");
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.LapsedOrExpired));
    }

    /// @notice Expiry is enforced when the fee is READ. Nobody sends a transaction to stand
    /// protection down; the clock alone does it. This is what makes recovery deterministic
    /// rather than dependent on a keeper appearing.
    function test_expiredProtectRecoversWithNoTransactionAtAll() public {
        uint64 startedAt = uint64(block.timestamp);
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING,
                startedAt,
                startedAt + 600, // expires well before the decay curve would finish
                startedAt
            )
        );
        assertEq(_mockFee(), MAX_FEE, "should start fully widened");

        vm.warp(uint256(startedAt) + 600);
        // Nothing was written between these two lines. Only time passed.
        assertEq(_mockFee(), BASE_FEE, "an expired record must charge baseFee at read time");

        // And the record is still there, unchanged — expiry does not erase evidence.
        (,, TinjauRiskTypes.RiskState state,) = mockHook.feeDetail(mockKey);
        assertEq(uint8(state), uint8(TinjauRiskTypes.RiskState.Protect));
    }

    // =======================================================================
    // PROPERTY 4 — decay is monotonic and reaches baseFee inside the window
    // =======================================================================

    function testFuzz_decayIsMonotonic(uint32 rawEarly, uint32 rawLate) public {
        uint64 startedAt = uint64(block.timestamp);
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING,
                startedAt,
                startedAt + 500_000,
                startedAt
            )
        );

        uint256 early = bound(rawEarly, 0, MAX_PROTECT_DURATION + 5_000);
        uint256 late = bound(rawLate, early, MAX_PROTECT_DURATION + 5_000);

        vm.warp(uint256(startedAt) + early);
        uint24 feeEarly = _mockFee();
        vm.warp(uint256(startedAt) + late);
        uint24 feeLate = _mockFee();

        assertGe(feeEarly, feeLate, "the fee curve must never rise as time passes");
    }

    /// @notice The curve itself, at the four points that matter. The last-second value is the
    /// one that proves DECAY brings the fee home rather than the duration cap truncating it:
    /// at t = 21 599 the decay term alone has already reached baseFee + 1.
    function test_decayReachesBaseFeeWithinTheConfiguredWindow() public {
        uint64 startedAt = uint64(block.timestamp);
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING,
                startedAt,
                startedAt + 500_000,
                startedAt
            )
        );

        assertEq(_mockFee(), MAX_FEE, "t=0 fully widened");

        vm.warp(uint256(startedAt) + WIDEN_DURATION);
        assertEq(_mockFee(), MAX_FEE, "still fully widened at the end of the widen window");

        vm.warp(uint256(startedAt) + WIDEN_DURATION + DECAY_DURATION / 2);
        uint24 mid = _mockFee();
        assertGt(mid, BASE_FEE);
        assertLt(mid, MAX_FEE);
        assertEq(mid, BASE_FEE + (MAX_FEE - BASE_FEE) / 2, "linear halfway point");

        vm.warp(uint256(startedAt) + WIDEN_DURATION + DECAY_DURATION - 1);
        assertEq(_mockFee(), BASE_FEE + 1, "decay alone has brought the fee to one tick above base");

        vm.warp(uint256(startedAt) + WIDEN_DURATION + DECAY_DURATION);
        assertEq(_mockFee(), BASE_FEE, "fully recovered inside the configured window");
    }

    /// @notice Confidence modulates HOW MUCH, never WHETHER. All three bands stay in band and
    /// order correctly, and `Unknown` widens nothing.
    function test_confidenceBandsOrderCorrectlyAndUnknownWidensNothing() public {
        uint64 startedAt = uint64(block.timestamp);
        uint24[4] memory fees;
        for (uint8 c = 0; c < 4; c++) {
            mockRegistry.setRecord(
                _record(
                    TinjauRiskTypes.RiskState.Protect,
                    TinjauRiskTypes.ConfidenceBand(c),
                    TinjauRiskTypes.ConfirmationStatus.Confirmed,
                    TinjauRiskTypes.REASON_OFFICIAL_FILING,
                    startedAt,
                    startedAt + 500_000,
                    startedAt
                )
            );
            fees[c] = _mockFee();
        }
        assertEq(fees[0], BASE_FEE, "Unknown confidence must widen nothing");
        assertGt(fees[1], BASE_FEE);
        assertGt(fees[2], fees[1]);
        assertGt(fees[3], fees[2]);
        assertEq(fees[3], MAX_FEE);
    }

    // =======================================================================
    // PROPERTY 5 — every degraded path falls back to baseFee
    // =======================================================================

    function test_degraded_noRecordAtAll() public view {
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.NoRecord));
    }

    function test_degraded_registryReverts() public {
        _activeProtect();
        assertEq(_mockFee(), MAX_FEE);
        mockRegistry.setMode(1);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.RegistryUnreachable));
    }

    function test_degraded_registryReturnsWrongShape() public {
        _activeProtect();
        mockRegistry.setRaw(new bytes(32));
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.RegistryUnreachable));
    }

    /// @notice The failure the size assertion above exists to prevent, demonstrated.
    /// @dev A record with ONE extra word — what adding a thirteenth field to `RiskRecord` would
    /// produce — makes the hook fail closed to `baseFee` on an otherwise perfectly valid active
    /// PROTECT. Safe, but silent: nothing reverts, nothing warns, and every other test in this
    /// file still passes. That is why the coupling is asserted rather than commented.
    function test_degraded_oneExtraRecordFieldSilentlyDisablesProtection() public {
        _activeProtect();
        assertEq(_mockFee(), MAX_FEE, "precondition: protection is active and widening the fee");

        uint256[12] memory w = _validWords();
        mockRegistry.setRaw(
            abi.encodePacked(
                w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9], w[10], w[11],
                uint256(0) // a thirteenth field
            )
        );

        assertEq(_mockFee(), BASE_FEE, "protection is silently gone");
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.RegistryUnreachable));
    }

    function test_degraded_registryIsPaused() public {
        _activeProtect();
        assertEq(_mockFee(), MAX_FEE);
        mockRegistry.setPaused(true);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.RegistryPaused));
    }

    function test_degraded_unsupportedAsset() public {
        _activeProtect();
        mockRegistry.setSupported(mockAsset, false);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.NoSupportedAsset));
    }

    /// @dev Both sides supported is refused rather than tie-broken: silently picking one would
    /// attach a record about token A to a pool the operator believes is protected on token B.
    function test_degraded_bothSidesSupportedIsRefusedNotGuessed() public {
        _activeProtect();
        mockRegistry.setSupported(mockQuote, true);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.AmbiguousAsset));
    }

    function test_degraded_protectWithoutExactConfirmation() public {
        // Every status other than `Confirmed` must fail closed, including the two that mean
        // "we could not look" rather than "we looked and saw nothing".
        for (uint8 c = 0; c < 4; c++) {
            mockRegistry.setRecord(
                _record(
                    TinjauRiskTypes.RiskState.Protect,
                    TinjauRiskTypes.ConfidenceBand.High,
                    TinjauRiskTypes.ConfirmationStatus(c),
                    TinjauRiskTypes.REASON_OFFICIAL_FILING,
                    uint64(block.timestamp),
                    uint64(block.timestamp + 100_000),
                    uint64(block.timestamp)
                )
            );
            assertEq(_mockFee(), BASE_FEE, "only exact Confirmed may widen");
            assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.NotMarketConfirmed));
        }
    }

    /// @notice A `PROTECT` carrying the rumour bit is refused at READ time even though the real
    /// registry would already have refused it at write time. The trust model assumes the
    /// writing path can be compromised, so the enforcement layer re-checks the one invariant
    /// whose failure is worst.
    function test_degraded_storedProtectCarryingTheRumorBitIsRefusedAtReadTime() public {
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_RUMOR_ONLY | TinjauRiskTypes.REASON_MARKET_CONFIRMED,
                uint64(block.timestamp),
                uint64(block.timestamp + 100_000),
                uint64(block.timestamp)
            )
        );
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.RumorOnly));
    }

    function testFuzz_rumorBitAlwaysBlocksTheAggressiveFee(uint32 otherBits, uint8 rawConf, uint32 elapsed) public {
        uint64 startedAt = uint64(block.timestamp);
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand(bound(rawConf, 1, 3)),
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                (otherBits & TinjauRiskTypes.REASON_ALL_DEFINED) | TinjauRiskTypes.REASON_RUMOR_ONLY,
                startedAt,
                startedAt + 500_000,
                startedAt
            )
        );
        vm.warp(uint256(startedAt) + bound(elapsed, 0, MAX_PROTECT_DURATION));
        assertEq(_mockFee(), BASE_FEE);
    }

    function test_degraded_malformedRecord_outOfRangeStateEnum() public {
        uint256[12] memory w = _validWords();
        w[2] = 3; // RiskState has three members; 3 is not one of them
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.MalformedRecord));
    }

    function test_degraded_malformedRecord_outOfRangeConfidenceEnum() public {
        uint256[12] memory w = _validWords();
        w[3] = 9;
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.MalformedRecord));
    }

    function test_degraded_malformedRecord_outOfRangeConfirmationEnum() public {
        uint256[12] memory w = _validWords();
        w[5] = 200;
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.MalformedRecord));
    }

    /// @notice The four `Unknown` sentinels, each proven to fail closed at the layer that
    /// owns it: `dataMode` at load, `confirmation` at the exact-Confirmed gate, `confidence`
    /// inside the policy's widening math. (`SourceClass` is not a field of `RiskRecord`.)
    function test_degraded_unknownDataModeSentinel() public {
        uint256[12] memory w = _validWords();
        w[4] = uint256(uint8(TinjauRiskTypes.DataMode.Unknown));
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.MalformedRecord));
    }

    function test_degraded_malformedRecord_overwideTimestamp() public {
        uint256[12] memory w = _validWords();
        w[8] = type(uint256).max; // expiresAt wider than uint64
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.MalformedRecord));
    }

    function test_degraded_undefinedReasonBits() public {
        uint256[12] memory w = _validWords();
        // The lowest bit position this schema does not define, derived rather than hardcoded:
        // `TinjauRiskTypes` is orchestrator-owned and gains reason bits over time, and a
        // hardcoded position would silently stop testing anything the day it was defined.
        uint32 undefinedMask = ~TinjauRiskTypes.REASON_ALL_DEFINED;
        uint32 lowestUndefinedBit = undefinedMask & (~undefinedMask + 1);
        assertTrue(lowestUndefinedBit != 0, "schema defines every bit; this test needs a new mechanism");
        w[6] = uint256(TinjauRiskTypes.REASON_OFFICIAL_FILING | lowestUndefinedBit);
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.UndefinedReasonBits));
    }

    function test_degraded_recordForADifferentKey() public {
        uint256[12] memory w = _validWords();
        w[1] = uint256(keccak256("some other pool"));
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.RecordKeyMismatch));
    }

    function test_degraded_recordWrittenUnderADifferentPolicyVersion() public {
        uint256[12] memory w = _validWords();
        w[11] = uint256(bytes32("tinjau.policy/2.0.0"));
        _setRawWords(w);
        assertEq(_mockFee(), BASE_FEE);
        assertEq(uint8(_mockReason()), uint8(TinjauFeeHook.Degraded.PolicyVersionMismatch));
    }

    function test_degraded_protectWithNoRecordedStart() public {
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING,
                uint64(block.timestamp),
                uint64(block.timestamp + 100_000),
                0 // malformed: PROTECT with no start
            )
        );
        assertEq(_mockFee(), BASE_FEE);
    }

    function test_degraded_futureDatedProtectStart() public {
        mockRegistry.setRecord(
            _record(
                TinjauRiskTypes.RiskState.Protect,
                TinjauRiskTypes.ConfidenceBand.High,
                TinjauRiskTypes.ConfirmationStatus.Confirmed,
                TinjauRiskTypes.REASON_OFFICIAL_FILING,
                uint64(block.timestamp),
                uint64(block.timestamp + 100_000),
                uint64(block.timestamp + 5_000)
            )
        );
        assertEq(_mockFee(), BASE_FEE);
    }

    // =======================================================================
    // PROPERTY 6 — end to end through a real PoolManager and a real swap
    // =======================================================================

    function test_e2e_noRecord_realSwapChargesBaseFee() public {
        assertEq(_swapAndReadFee(), BASE_FEE);
    }

    function test_e2e_normal_realSwapChargesBaseFee() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Normal, block.timestamp));
        assertEq(_swapAndReadFee(), BASE_FEE);
    }

    function test_e2e_protect_realSwapChargesTheWidenedFee() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Protect, block.timestamp));
        (TinjauRiskTypes.RiskState state, uint24 registryFee,) =
            realRegistry.effectiveState(equityToken, realPoolId);
        assertEq(uint8(state), uint8(TinjauRiskTypes.RiskState.Protect));

        uint24 applied = _swapAndReadFee();
        assertEq(applied, MAX_FEE, "a high-confidence PROTECT charges the band ceiling");
        assertEq(applied, registryFee, "the pool and the registry must agree on the fee");
    }

    /// @notice The full recovery, through the real pool: widened, mid-decay, then home — with
    /// no transaction sent to end it. Only `vm.warp`.
    function test_e2e_protectDecaysBackToBaseFeeWithNoInterventionTransaction() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Protect, block.timestamp));
        uint256 startedAt = block.timestamp;

        assertEq(_swapAndReadFee(), MAX_FEE, "widened");

        vm.warp(startedAt + WIDEN_DURATION + DECAY_DURATION / 2);
        uint24 mid = _swapAndReadFee();
        assertGt(mid, BASE_FEE);
        assertLt(mid, MAX_FEE);
        // The exact halfway value, pinned so the curve is evidence rather than a range check.
        assertEq(mid, 10_250, "halfway down the decay ramp: 500 + (20000-500)/2");

        vm.warp(startedAt + WIDEN_DURATION + DECAY_DURATION);
        assertEq(_swapAndReadFee(), BASE_FEE, "recovered to baseline with no transaction to end it");
    }

    function test_e2e_previewMatchesTheFeeActuallyCharged() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Protect, block.timestamp));
        vm.warp(block.timestamp + WIDEN_DURATION + 3_000);
        uint24 previewed = realHook.previewFee(key);
        assertEq(previewed, _swapAndReadFee(), "preview must equal what the pool charges");
    }

    /// @notice The guardian's one lever, and its bound: it can force a running protection down
    /// to baseline, and it has no path at all to raise a fee.
    function test_e2e_guardianCanStandProtectionDownButNeverRaiseAFee() public {
        _post(_assessment(TinjauRiskTypes.RiskState.Protect, block.timestamp));
        assertEq(_swapAndReadFee(), MAX_FEE);

        vm.prank(guardian);
        realRegistry.setPaused(true);
        assertEq(_swapAndReadFee(), BASE_FEE, "pause suspends the fee action");

        vm.prank(guardian);
        realRegistry.setPaused(false);
        vm.prank(guardian);
        realRegistry.setAssetSupported(equityToken, false);
        assertEq(_swapAndReadFee(), BASE_FEE, "de-supporting the asset also forces baseline");

        // There is no guardian call that produces a fee above what a signed, confirmed,
        // non-rumour record already authorises — the widened fee only returns when the asset
        // is supported again AND the record still stands.
        vm.prank(guardian);
        realRegistry.setAssetSupported(equityToken, true);
        assertEq(_swapAndReadFee(), MAX_FEE);
    }

    // =======================================================================
    // Wiring and access control
    // =======================================================================

    /// @notice `TinjauFeeHook._loadRecord` hand-decodes exactly twelve ABI words and refuses any
    /// other returndata length. That coupling is deliberate — `abi.decode` reverts on an
    /// out-of-range enum and a reverting hook halts the pool — but it means that ADDING A
    /// FIELD TO `RiskRecord` WOULD SILENTLY DISABLE ALL PROTECTION: every read would return
    /// `RegistryUnreachable`, every quote would be `baseFee`, and every existing test would
    /// still pass because failing closed is what they assert.
    ///
    /// A silent, test-passing disablement of the entire safety mechanism is the worst failure
    /// mode in this system, so it gets its own assertion rather than a comment. `RiskRecord` is
    /// orchestrator-owned and frozen; this test does not constrain it, it only guarantees that
    /// changing it cannot go unnoticed.
    function test_riskRecordEncodesToTheTwelveWordsTheHookDecodes() public pure {
        TinjauRiskTypes.RiskRecord memory r;
        assertEq(
            abi.encode(r).length,
            384,
            "RiskRecord no longer encodes to 12 words. TinjauFeeHook._loadRecord decodes exactly "
            "384 bytes and will now fail closed to baseFee on EVERY read, disabling all "
            "protection silently. Update _loadRecord's length check, its word indices, and this "
            "assertion together."
        );
    }

    /// @notice The companion property: the hook really is reading a 384-byte answer from a real
    /// registry, so the constant above is not merely self-consistent.
    function test_registryReturnsExactlyTheLengthTheHookExpects() public view {
        (bool ok, bytes memory data) = address(realRegistry).staticcall(
            abi.encodeWithSelector(TinjauRiskRegistry.currentRecord.selector, equityToken, realPoolId)
        );
        assertTrue(ok, "currentRecord staticcall failed");
        assertEq(data.length, 384, "the registry's answer no longer matches the hook's decoder");
    }

    function test_hookPermissions_onlyBeforeInitializeAndBeforeSwap() public view {
        Hooks.Permissions memory p = realHook.getHookPermissions();
        assertTrue(p.beforeInitialize);
        assertTrue(p.beforeSwap);
        assertFalse(p.afterInitialize);
        assertFalse(p.afterSwap);
        assertFalse(p.beforeSwapReturnDelta);
        assertFalse(p.afterSwapReturnDelta);
        assertFalse(p.beforeAddLiquidity);
        assertFalse(p.afterAddLiquidity);
        assertFalse(p.beforeRemoveLiquidity);
        assertFalse(p.afterRemoveLiquidity);
        assertFalse(p.beforeDonate);
        assertFalse(p.afterDonate);
    }

    function test_directCallByNonPoolManagerReverts() public {
        vm.expectRevert(TinjauFeeHook.NotPoolManager.selector);
        realHook.beforeSwap(
            address(this), key, SwapParams({zeroForOne: true, amountSpecified: -100, sqrtPriceLimitX96: 0}), ZERO_BYTES
        );
    }

    /// @notice A static-fee pool would silently ignore the hook's override: the registry would
    /// read PROTECT while the pool kept charging its static fee, with nothing to reveal the
    /// mismatch. The hook refuses to be attached to one.
    function test_staticFeePoolCannotBeInitialisedWithThisHook() public {
        PoolKey memory staticKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(realHook))
        });

        // v4 wraps a reverting hook call, so the assertion is on the inner reason rather than
        // on the outer selector: a bare `expectRevert()` here would also pass if the pool had
        // failed to initialise for some entirely unrelated reason.
        try manager.initialize(staticKey, SQRT_PRICE_1_1) returns (int24) {
            revert("a static-fee pool must not initialise with this hook");
        } catch (bytes memory err) {
            assertTrue(
                _containsSelector(err, TinjauFeeHook.PoolMustUseDynamicFee.selector),
                "must fail for the dynamic-fee reason specifically"
            );
        }
    }

    function _containsSelector(bytes memory blob, bytes4 sel) internal pure returns (bool) {
        if (blob.length < 4) return false;
        for (uint256 i = 0; i + 4 <= blob.length; i++) {
            if (blob[i] == sel[0] && blob[i + 1] == sel[1] && blob[i + 2] == sel[2] && blob[i + 3] == sel[3]) {
                return true;
            }
        }
        return false;
    }

    function test_resolveAssetPublishesWhatTheHookIsReading() public view {
        (address asset, bytes32 poolId, TinjauFeeHook.Degraded reason) = realHook.resolveAsset(key);
        assertEq(asset, equityToken);
        assertEq(poolId, realPoolId);
        assertEq(uint8(reason), uint8(TinjauFeeHook.Degraded.None));
    }

    function test_constructorRejectsZeroAddresses() public {
        vm.expectRevert(TinjauFeeHook.ZeroAddress.selector);
        new TinjauFeeHook(manager, TinjauRiskRegistry(address(0)));

        vm.expectRevert(TinjauFeeHook.ZeroAddress.selector);
        new TinjauFeeHook(IPoolManager(address(0)), realRegistry);
    }

    function test_constructorRejectsARegistryItCannotReadAnEnvelopeFrom() public {
        vm.expectRevert(TinjauFeeHook.EnvelopeUnreadable.selector);
        new TinjauFeeHook(manager, TinjauRiskRegistry(address(0xDEAD)));
    }
}
