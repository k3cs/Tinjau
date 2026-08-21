// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

/// @notice Task P4.4 — deploy a `PoolSwapTest` router against the builder-owned PoolManager
/// from P0.5, so the synthetic-injection test's `swapOnce.ts` has something to swap through.
/// P4.2 only deployed a `PoolModifyLiquidityTest` liquidity router (used once, to seed the
/// demo pool) — no swap router was deployed at that time. Mirrors how
/// `DeployTestnetHookAndPool.s.sol` deployed `PoolModifyLiquidityTest` inline.
///
/// Requires P0.5 (PoolManager) to already be deployed. Set POOL_MANAGER before running:
///
/// Run:
///   forge script script/DeployTestnetSwapRouter.s.sol:DeployTestnetSwapRouter \
///     --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $POSTER_PRIVATE_KEY
contract DeployTestnetSwapRouter is Script {
    function run() external {
        IPoolManager poolManager = IPoolManager(vm.envAddress("POOL_MANAGER"));

        vm.startBroadcast();
        PoolSwapTest swapRouter = new PoolSwapTest(poolManager);
        vm.stopBroadcast();

        console2.log("PoolSwapTest deployed at:", address(swapRouter));
        console2.log("---");
        console2.log("Record this as POOL_SWAP_ROUTER in the root .env (P4.4 evidence).");
    }
}
