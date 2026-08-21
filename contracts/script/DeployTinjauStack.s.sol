// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";
import {PoolManager} from "v4-core/src/PoolManager.sol";
import {PoolModifyLiquidityTest} from "v4-core/src/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

import {TinjauFeeHook} from "../src/TinjauFeeHook.sol";
import {TinjauRiskRegistry} from "../src/TinjauRiskRegistry.sol";
import {TinjauRiskPolicy} from "../src/TinjauRiskPolicy.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Deploys the whole Tinjau enforcement stack, **deploying only what is missing**.
///
/// @dev ONE SCRIPT, TWO CHAINS, NO CODE DIFFERENCE. The local Anvil path and the X Layer
/// Testnet path are the same script; what differs is which environment variables are already
/// set. On Anvil nothing exists, so it deploys a `PoolManager` and two mock tokens as well. On
/// chain 1952 those already exist from the historical deployment, so `POOL_MANAGER`,
/// `RISK_ASSET`, and `QUOTE_ASSET` are supplied and reused. Authorising the testnet run is
/// therefore setting three variables and adding `--broadcast`, not editing this file.
///
/// @dev THE POOL THIS CREATES IS BUILDER-CONTROLLED TEST LIQUIDITY seeded with freely-mintable
/// mock tokens that have no value. It proves the mechanism. It is not a market, and nothing
/// measured on it is a market result (tracker §0.10).
///
/// @dev DEMO ENVELOPE. `TINJAU_DEMO_ENVELOPE=1` shrinks the widen/decay/cap windows so a full
/// protect-to-recovery cycle can be watched in about a minute. It exists because a chain
/// without `evm_increaseTime` — which X Layer Testnet is — cannot fast-forward six hours, and
/// the alternative would be a demo that silently skips the recovery half of the claim. Any
/// deployment made with it MUST be labelled as using demo timings; the production envelope is
/// the inherited 3 600 / 18 000 / 21 600 (tracker §0.11).
///
/// Environment:
///   ASSESSOR, GUARDIAN                     - required
///   POOL_MANAGER                           - optional; deployed if absent
///   RISK_ASSET, QUOTE_ASSET                - optional; mock ERC-20s deployed if absent
///   TINJAU_REGISTRY                        - optional; deployed if absent
///   SEED_LIQUIDITY                         - optional, default 1e24
///   TINJAU_DEMO_ENVELOPE                   - optional, "1" for short demo timings
///   TINJAU_ALLOWED_CHAIN_IDS               - comma-free single id; default 1952. Anvil sets 31337.
///
/// Local Anvil (this is what has actually been run):
///   anvil --port 8547 &
///   ASSESSOR=... GUARDIAN=... TINJAU_ALLOWED_CHAIN_IDS=31337 \
///   forge script script/DeployTinjauStack.s.sol:DeployTinjauStack \
///     --rpc-url http://127.0.0.1:8547 --broadcast --private-key $LOCAL_KEY
///
/// X Layer Testnet (NOT run; requires separate authorisation):
///   POOL_MANAGER=... RISK_ASSET=... QUOTE_ASSET=... ASSESSOR=... GUARDIAN=... \
///   forge script script/DeployTinjauStack.s.sol:DeployTinjauStack \
///     --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract DeployTinjauStack is Script {
    using PoolIdLibrary for PoolKey;

    // Inherited from the deployed historical hook (tracker §0.11). Not chosen here.
    uint24 constant BASE_FEE = 500; // 0.05%
    uint24 constant MAX_FEE = 20_000; // 2%
    uint32 constant WIDEN_DURATION = 3600;
    uint32 constant DECAY_DURATION = 18_000;
    uint32 constant MAX_PROTECT_DURATION = 21_600;
    uint32 constant COOLDOWN = 3600;

    // Same shape, compressed 60x, for a chain that cannot warp. Ratios are preserved exactly:
    // cap == widen + decay, and cooldown == widen, as in the production envelope.
    uint32 constant DEMO_WIDEN_DURATION = 60;
    uint32 constant DEMO_DECAY_DURATION = 300;
    uint32 constant DEMO_MAX_PROTECT_DURATION = 360;
    uint32 constant DEMO_COOLDOWN = 60;

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // sqrt(1) in Q64.96
    int24 constant TICK_SPACING = 60;
    uint256 constant X_LAYER_TESTNET = 1952;

    function run() external {
        uint256 allowedChainId = vm.envOr("TINJAU_ALLOWED_CHAIN_IDS", X_LAYER_TESTNET);
        require(block.chainid == allowedChainId, "wrong chain: refusing to deploy");

        address assessor = vm.envAddress("ASSESSOR");
        address guardian = vm.envAddress("GUARDIAN");
        require(assessor != address(0) && guardian != address(0), "assessor/guardian required");

        bool demoEnvelope = vm.envOr("TINJAU_DEMO_ENVELOPE", uint256(0)) == 1;
        int256 seedLiquidity = int256(vm.envOr("SEED_LIQUIDITY", uint256(1_000_000e18)));
        require(seedLiquidity > 0, "SEED_LIQUIDITY must be positive");

        address poolManagerAddr = vm.envOr("POOL_MANAGER", address(0));
        address riskAsset = vm.envOr("RISK_ASSET", address(0));
        address quoteAsset = vm.envOr("QUOTE_ASSET", address(0));
        address existingRegistry = vm.envOr("TINJAU_REGISTRY", address(0));

        vm.startBroadcast();
        address deployer = msg.sender;

        // --- 1. PoolManager: reuse or deploy ---------------------------------------------
        IPoolManager poolManager;
        if (poolManagerAddr != address(0)) {
            poolManager = IPoolManager(poolManagerAddr);
            console2.log("Reusing PoolManager at:", poolManagerAddr);
        } else {
            poolManager = IPoolManager(address(new PoolManager(deployer)));
            console2.log("PoolManager deployed at:", address(poolManager));
        }

        // --- 2. tokens: reuse or deploy ---------------------------------------------------
        if (riskAsset == address(0)) {
            riskAsset = address(new MockERC20("Mock wrapped NVDAx", "wNVDAx", 18));
            console2.log("Mock RISK_ASSET deployed at:", riskAsset);
        }
        if (quoteAsset == address(0)) {
            quoteAsset = address(new MockERC20("Mock USDG", "USDG", 18));
            console2.log("Mock QUOTE_ASSET deployed at:", quoteAsset);
        }
        require(riskAsset != quoteAsset, "RISK_ASSET and QUOTE_ASSET must differ");

        // --- 3. registry: reuse or deploy -------------------------------------------------
        TinjauRiskRegistry registry;
        if (existingRegistry != address(0)) {
            registry = TinjauRiskRegistry(existingRegistry);
            console2.log("Reusing TinjauRiskRegistry at:", address(registry));
        } else {
            registry = new TinjauRiskRegistry(assessor, guardian, _envelope(demoEnvelope));
            console2.log("TinjauRiskRegistry deployed at:", address(registry));
        }

        if (deployer == guardian) {
            registry.setAssetSupported(riskAsset, true);
            console2.log("Marked RISK_ASSET supported.");
        } else {
            // Not skipped silently: a hook that cannot resolve its asset charges baseFee
            // forever and would otherwise look like a working deployment.
            console2.log("!! DEPLOYER IS NOT GUARDIAN. Guardian must call:");
            console2.log("   registry.setAssetSupported(RISK_ASSET, true)");
        }

        // --- 4. hook, at a mined address ---------------------------------------------------
        bytes memory creationCode =
            abi.encodePacked(type(TinjauFeeHook).creationCode, abi.encode(poolManager, registry));
        bytes32 salt = _mineHookAddress(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG, creationCode, CREATE2_FACTORY
        );
        TinjauFeeHook hook = new TinjauFeeHook{salt: salt}(poolManager, registry);
        console2.log("TinjauFeeHook deployed at:", address(hook));

        // --- 5. the builder-controlled pool -----------------------------------------------
        (address token0, address token1) =
            riskAsset < quoteAsset ? (riskAsset, quoteAsset) : (quoteAsset, riskAsset);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        poolManager.initialize(key, SQRT_PRICE_1_1);

        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(poolManager);
        PoolSwapTest swapRouter = new PoolSwapTest(poolManager);

        // casting to 'uint256' is safe: seedLiquidity is required positive above
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 mintAmount = uint256(seedLiquidity) * 4;
        MockERC20(token0).mint(deployer, mintAmount);
        MockERC20(token1).mint(deployer, mintAmount);
        MockERC20(token0).approve(address(liquidityRouter), type(uint256).max);
        MockERC20(token1).approve(address(liquidityRouter), type(uint256).max);

        liquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -120,
                tickUpper: 120,
                liquidityDelta: seedLiquidity,
                salt: bytes32(0)
            }),
            bytes("")
        );

        vm.stopBroadcast();

        // --- 6. machine-readable output, so the harness never scrapes prose ----------------
        // Emitted as `KEY=value` lines rather than written to a file: writing would need
        // `fs_permissions` write access in foundry.toml, and that file is shared with other
        // work in flight. The harness parses these keys and nothing else.
        console2.log("---TINJAU-DEPLOYMENT-BEGIN---");
        console2.log("CHAIN_ID=", block.chainid);
        console2.log("POOL_MANAGER=", address(poolManager));
        console2.log("TINJAU_REGISTRY=", address(registry));
        console2.log("TINJAU_HOOK=", address(hook));
        console2.log("LIQUIDITY_ROUTER=", address(liquidityRouter));
        console2.log("SWAP_ROUTER=", address(swapRouter));
        console2.log("RISK_ASSET=", riskAsset);
        console2.log("QUOTE_ASSET=", quoteAsset);
        console2.log("TOKEN0=", token0);
        console2.log("TOKEN1=", token1);
        console2.log("TICK_SPACING=", uint256(int256(TICK_SPACING)));
        console2.log("POOL_ID=", vm.toString(PoolId.unwrap(key.toId())));
        console2.log("BASE_FEE=", uint256(hook.baseFee()));
        console2.log("MAX_FEE=", uint256(hook.maxFee()));
        console2.log("WIDEN_DURATION=", uint256(hook.widenDuration()));
        console2.log("DECAY_DURATION=", uint256(hook.decayDuration()));
        console2.log("MAX_PROTECT_DURATION=", uint256(hook.maxProtectDuration()));
        console2.log("COOLDOWN=", uint256(hook.cooldown()));
        console2.log("DEMO_ENVELOPE=", demoEnvelope ? uint256(1) : uint256(0));
        console2.log("LIQUIDITY_SOURCE= BUILDER_CONTROLLED");
        console2.log("---TINJAU-DEPLOYMENT-END---");
    }

    function _envelope(bool demo) internal pure returns (TinjauRiskPolicy.Envelope memory) {
        return TinjauRiskPolicy.Envelope({
            baseFee: BASE_FEE,
            maxFee: MAX_FEE,
            widenDuration: demo ? DEMO_WIDEN_DURATION : WIDEN_DURATION,
            decayDuration: demo ? DEMO_DECAY_DURATION : DECAY_DURATION,
            maxProtectDuration: demo ? DEMO_MAX_PROTECT_DURATION : MAX_PROTECT_DURATION,
            cooldown: demo ? DEMO_COOLDOWN : COOLDOWN
        });
    }

    function _mineHookAddress(uint160 desiredFlags, bytes memory creationCode, address deployer)
        internal
        pure
        returns (bytes32 salt)
    {
        bytes32 initCodeHash = keccak256(creationCode);
        for (uint256 i = 0; i < 500_000; i++) {
            bytes32 candidateSalt = bytes32(i);
            if (uint160(vm.computeCreate2Address(candidateSalt, initCodeHash, deployer))
                    & Hooks.ALL_HOOK_MASK == desiredFlags) {
                return candidateSalt;
            }
        }
        revert("no salt found in search range");
    }
}
