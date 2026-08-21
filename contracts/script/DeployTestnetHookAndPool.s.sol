// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";
import {PoolModifyLiquidityTest} from "v4-core/src/test/PoolModifyLiquidityTest.sol";

import {AfterhoursFeeHook} from "../src/AfterhoursFeeHook.sol";
import {EventStateRegistry} from "../src/EventStateRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Task P4.2 — deploy the AfterhoursFeeHook + a mock-wNVDAx/mock-USDG dynamic-fee pool
/// on X Layer Testnet (chain 1952), against the builder-owned PoolManager from P0.5 and the
/// registry from P1.8. This is what a judge actually swaps on in the demo (spec §5.3) — no
/// real capital involved, only testnet OKB for gas.
///
/// Requires P0.5 and P1.8 to already be deployed. Set these env vars before running:
///   POOL_MANAGER, REGISTRY, MOCK_WNVDAX, MOCK_USDG (all addresses from prior deployments)
///
/// Run:
///   forge script script/DeployTestnetHookAndPool.s.sol:DeployTestnetHookAndPool \
///     --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $POSTER_PRIVATE_KEY
contract DeployTestnetHookAndPool is Script {
    uint24 constant BASE_FEE = 500; // 0.05%, matches AfterhoursFeeHookTest.t.sol
    uint24 constant MAX_FEE = 20_000; // 2%
    uint256 constant WIDEN_DURATION = 1 hours;
    uint256 constant DECAY_DURATION = 5 hours;
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // sqrt(1) in Q64.96

    /// @dev Seed liquidity amount, testnet-mock tokens only — no real value.
    int256 constant SEED_LIQUIDITY_DELTA = 1_000_000e18;

    // Note: CREATE2_FACTORY is inherited from forge-std's Script/Base.sol — the canonical
    // deterministic deployment proxy present on essentially every EVM chain including
    // OP-Stack ones. An EOA-originated broadcast tx cannot itself execute the CREATE2 opcode
    // (only contract bytecode can), so Foundry routes a salted `new Contract{salt: ...}()`
    // through this factory when broadcasting — the salt must be mined against THIS address,
    // not the broadcasting EOA's own address, or `Hooks.validateHookPermissions` will revert
    // on the real deployment. Matches the address Uniswap's own `v4-periphery` HookMiner uses
    // for the same reason.

    function run() external {
        IPoolManager poolManager = IPoolManager(vm.envAddress("POOL_MANAGER"));
        EventStateRegistry registry = EventStateRegistry(vm.envAddress("REGISTRY"));
        address mockWNVDAx = vm.envAddress("MOCK_WNVDAX");
        address mockUSDG = vm.envAddress("MOCK_USDG");

        // v4 requires currency0 < currency1 by address.
        (address token0, address token1) =
            mockWNVDAx < mockUSDG ? (mockWNVDAx, mockUSDG) : (mockUSDG, mockWNVDAx);

        bytes memory creationCode = abi.encodePacked(
            type(AfterhoursFeeHook).creationCode,
            abi.encode(poolManager, registry, BASE_FEE, MAX_FEE, WIDEN_DURATION, DECAY_DURATION)
        );
        bytes32 salt = _mineHookAddress(Hooks.BEFORE_SWAP_FLAG, creationCode, CREATE2_FACTORY);

        vm.startBroadcast();
        address deployer = msg.sender;

        AfterhoursFeeHook hook = new AfterhoursFeeHook{salt: salt}(
            poolManager, registry, BASE_FEE, MAX_FEE, WIDEN_DURATION, DECAY_DURATION
        );
        console2.log("AfterhoursFeeHook deployed at:", address(hook));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        poolManager.initialize(key, SQRT_PRICE_1_1);
        console2.log("Pool initialized. token0:", token0, "token1:", token1);

        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(poolManager);
        console2.log("PoolModifyLiquidityTest router deployed at:", address(liquidityRouter));

        // casting to 'uint256' is safe: SEED_LIQUIDITY_DELTA is a positive compile-time constant
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 mintAmount = uint256(SEED_LIQUIDITY_DELTA) * 2;
        MockERC20(token0).mint(deployer, mintAmount);
        MockERC20(token1).mint(deployer, mintAmount);
        MockERC20(token0).approve(address(liquidityRouter), type(uint256).max);
        MockERC20(token1).approve(address(liquidityRouter), type(uint256).max);

        liquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -120,
                tickUpper: 120,
                liquidityDelta: SEED_LIQUIDITY_DELTA,
                salt: bytes32(0)
            }),
            bytes("")
        );
        console2.log("Seed liquidity added.");

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Record these in task-tracker.md P4.2 evidence line:");
        console2.log("HOOK=", address(hook));
        console2.log("LIQUIDITY_ROUTER=", address(liquidityRouter));
        console2.log("(swap via a PoolSwapTest router deployed the same way, or any v4-compatible client)");
    }

    /// @dev Mirrors AfterhoursFeeHookTest.t.sol's _mineHookAddress, but for a real deployer
    /// address (not `address(this)` as in the test) and via `vm.computeCreate2Address`, which
    /// is available in scripts too (both run through forge's EVM/cheatcode VM).
    function _mineHookAddress(uint160 desiredFlags, bytes memory creationCode, address deployer)
        internal
        pure
        returns (bytes32 salt)
    {
        bytes32 initCodeHash = keccak256(creationCode);
        for (uint256 i = 0; i < 200_000; i++) {
            bytes32 candidateSalt = bytes32(i);
            address candidate = vm.computeCreate2Address(candidateSalt, initCodeHash, deployer);
            if (uint160(candidate) & Hooks.ALL_HOOK_MASK == desiredFlags) {
                return candidateSalt;
            }
        }
        revert("no salt found in search range");
    }
}
