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
import {PoolModifyLiquidityTest} from "v4-core/src/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

import {TinjauFeeHook} from "../src/TinjauFeeHook.sol";
import {TinjauRiskRegistry} from "../src/TinjauRiskRegistry.sol";
import {TinjauRiskPolicy} from "../src/TinjauRiskPolicy.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Deploys the Tinjau enforcement leg — `TinjauRiskRegistry` + `TinjauFeeHook` + a
/// BUILDER-CONTROLLED dynamic-fee test pool and its routers — on X Layer Testnet (chain 1952).
///
/// @dev THE POOL THIS CREATES IS BUILDER-CONTROLLED TEST LIQUIDITY, seeded with freely-mintable
/// mock tokens that have no value. It proves the mechanism end to end. It is not a real market
/// and nothing measured on it may be presented as a market result (tracker §0.10).
///
/// @dev CHAIN GUARD. `run()` refuses to execute on any chain other than 1952 unless
/// `TINJAU_EXPECTED_CHAIN_ID` is set explicitly. Mainnet deployment is out of scope for this
/// project entirely; an accidental `--rpc-url` should fail loudly rather than spend.
///
/// @dev The address-mining and pool-init mechanics are the ones already proven by
/// `DeployTestnetHookAndPool.s.sol` (the historical AFTERHOURS deployment). The salt must be
/// mined against `CREATE2_FACTORY`, not against the broadcasting EOA: an EOA-originated
/// transaction cannot execute CREATE2 itself, so Foundry routes a salted `new` through the
/// canonical deterministic-deployment proxy, and that proxy is the deployer whose address goes
/// into the CREATE2 preimage. Mining against the EOA instead produces an address whose low bits
/// do not encode the hook's permissions, and `Hooks.validateHookPermissions` reverts on the
/// real deployment while passing in a local test.
///
/// Environment (all addresses; nothing is hardcoded):
///   POOL_MANAGER   - existing v4 PoolManager (builder-deployed on 1952)
///   RISK_ASSET     - the tokenised-equity side, e.g. the mock wNVDAx
///   QUOTE_ASSET    - the quote side, e.g. the mock USDG
///   ASSESSOR       - address whose EIP-712 signature the registry will accept
///   GUARDIAN       - address that may pause and rotate the assessor
/// Optional:
///   TINJAU_REGISTRY          - reuse an already-deployed registry instead of deploying one
///   SEED_LIQUIDITY           - liquidity delta to seed (default 1e24)
///   TINJAU_EXPECTED_CHAIN_ID - override the 1952 guard (never set this to a mainnet id)
///
/// Dry run (NO transactions are sent — this is the command used to validate the script):
///   forge script script/DeployTinjauHookAndPool.s.sol:DeployTinjauHookAndPool \
///     --rpc-url https://testrpc.xlayer.tech --sender <ADDRESS>
///
/// Broadcast (a separate, separately-authorised step; not run as part of building this):
///   forge script script/DeployTinjauHookAndPool.s.sol:DeployTinjauHookAndPool \
///     --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract DeployTinjauHookAndPool is Script {
    using PoolIdLibrary for PoolKey;

    // Inherited from the deployed historical hook (tracker §0.11). These are not chosen here.
    uint24 constant BASE_FEE = 500; // 0.05%
    uint24 constant MAX_FEE = 20_000; // 2%
    uint32 constant WIDEN_DURATION = 3600; // 1h fully widened
    uint32 constant DECAY_DURATION = 18_000; // 5h linear decay
    uint32 constant MAX_PROTECT_DURATION = 21_600; // 6h hard cap; >= widen + decay
    uint32 constant COOLDOWN = 3600; // 1h before protection may re-arm

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // sqrt(1) in Q64.96
    int24 constant TICK_SPACING = 60;

    uint256 constant X_LAYER_TESTNET = 1952;

    function run() external {
        uint256 expectedChainId = vm.envOr("TINJAU_EXPECTED_CHAIN_ID", X_LAYER_TESTNET);
        require(block.chainid == expectedChainId, "wrong chain: refusing to deploy");

        IPoolManager poolManager = IPoolManager(vm.envAddress("POOL_MANAGER"));
        address riskAsset = vm.envAddress("RISK_ASSET");
        address quoteAsset = vm.envAddress("QUOTE_ASSET");
        address assessor = vm.envAddress("ASSESSOR");
        address guardian = vm.envAddress("GUARDIAN");
        address existingRegistry = vm.envOr("TINJAU_REGISTRY", address(0));
        int256 seedLiquidity = int256(vm.envOr("SEED_LIQUIDITY", uint256(1_000_000e18)));

        require(riskAsset != quoteAsset, "RISK_ASSET and QUOTE_ASSET must differ");
        require(assessor != address(0) && guardian != address(0), "assessor/guardian required");

        // v4 requires currency0 < currency1 by address.
        (address token0, address token1) =
            riskAsset < quoteAsset ? (riskAsset, quoteAsset) : (quoteAsset, riskAsset);

        vm.startBroadcast();
        address deployer = msg.sender;

        // --- 1. registry ---------------------------------------------------------------
        TinjauRiskRegistry registry;
        if (existingRegistry != address(0)) {
            registry = TinjauRiskRegistry(existingRegistry);
            console2.log("Reusing TinjauRiskRegistry at:", address(registry));
        } else {
            registry = new TinjauRiskRegistry(
                assessor,
                guardian,
                TinjauRiskPolicy.Envelope({
                    baseFee: BASE_FEE,
                    maxFee: MAX_FEE,
                    widenDuration: WIDEN_DURATION,
                    decayDuration: DECAY_DURATION,
                    maxProtectDuration: MAX_PROTECT_DURATION,
                    cooldown: COOLDOWN
                })
            );
            console2.log("TinjauRiskRegistry deployed at:", address(registry));
        }

        // Only the guardian may vet an asset. If the broadcaster is the guardian this runs
        // now; otherwise it is left as an explicit manual step rather than silently skipped,
        // because a hook that cannot resolve its asset charges baseFee forever and would look
        // like a working deployment.
        if (deployer == guardian) {
            registry.setAssetSupported(riskAsset, true);
            console2.log("Marked RISK_ASSET supported.");
        } else {
            console2.log("!! DEPLOYER IS NOT GUARDIAN. Guardian must call:");
            console2.log("   registry.setAssetSupported(RISK_ASSET, true)");
        }

        // --- 2. hook, at a mined address -------------------------------------------------
        bytes memory creationCode =
            abi.encodePacked(type(TinjauFeeHook).creationCode, abi.encode(poolManager, registry));
        bytes32 salt = _mineHookAddress(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG, creationCode, CREATE2_FACTORY
        );

        TinjauFeeHook hook = new TinjauFeeHook{salt: salt}(poolManager, registry);
        console2.log("TinjauFeeHook deployed at:", address(hook));

        // --- 3. the builder-controlled test pool ------------------------------------------
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            // The hook refuses a static-fee pool: v4 silently ignores a fee override on one,
            // which would leave the registry reading PROTECT while the pool charged its static
            // fee, with nothing on chain to reveal the mismatch.
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        poolManager.initialize(key, SQRT_PRICE_1_1);
        console2.log("Pool initialized. token0:", token0);
        console2.log("                  token1:", token1);

        // --- 4. routers and seed liquidity (mock tokens, no value) ------------------------
        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(poolManager);
        PoolSwapTest swapRouter = new PoolSwapTest(poolManager);
        console2.log("PoolModifyLiquidityTest at:", address(liquidityRouter));
        console2.log("PoolSwapTest at:", address(swapRouter));

        // casting to 'uint256' is safe: seedLiquidity is required positive on the next line
        // forge-lint: disable-next-line(unsafe-typecast)
        require(seedLiquidity > 0, "SEED_LIQUIDITY must be positive");
        uint256 mintAmount = uint256(seedLiquidity) * 2;

        MockERC20(token0).mint(deployer, mintAmount);
        MockERC20(token1).mint(deployer, mintAmount);
        MockERC20(token0).approve(address(liquidityRouter), type(uint256).max);
        MockERC20(token1).approve(address(liquidityRouter), type(uint256).max);
        MockERC20(token0).approve(address(swapRouter), type(uint256).max);
        MockERC20(token1).approve(address(swapRouter), type(uint256).max);

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
        console2.log("Seed liquidity added (BUILDER-CONTROLLED test liquidity, no value).");

        vm.stopBroadcast();

        // --- 5. readback, so the log is evidence rather than intent -----------------------
        console2.log("---");
        console2.log("chainId:", block.chainid);
        console2.log("REGISTRY=", address(registry));
        console2.log("HOOK=", address(hook));
        console2.log("LIQUIDITY_ROUTER=", address(liquidityRouter));
        console2.log("SWAP_ROUTER=", address(swapRouter));
        console2.log("POOL_ID=", vm.toString(PoolId.unwrap(key.toId())));
        console2.log("hook.baseFee:", hook.baseFee());
        console2.log("hook.maxFee:", hook.maxFee());
        console2.log("previewFee now (expect baseFee, nothing assessed yet):", hook.previewFee(key));
    }

    /// @dev Brute-force salt search for an address whose low 14 bits equal `desiredFlags`
    /// exactly. `deployer` must be the account that will actually execute the CREATE2 —
    /// `CREATE2_FACTORY` when broadcasting from an EOA.
    function _mineHookAddress(uint160 desiredFlags, bytes memory creationCode, address deployer)
        internal
        pure
        returns (bytes32 salt)
    {
        bytes32 initCodeHash = keccak256(creationCode);
        for (uint256 i = 0; i < 500_000; i++) {
            bytes32 candidateSalt = bytes32(i);
            address candidate = vm.computeCreate2Address(candidateSalt, initCodeHash, deployer);
            if (uint160(candidate) & Hooks.ALL_HOOK_MASK == desiredFlags) {
                return candidateSalt;
            }
        }
        revert("no salt found in search range");
    }
}
