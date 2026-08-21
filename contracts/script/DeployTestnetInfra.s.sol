// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PoolManager} from "v4-core/src/PoolManager.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Task P0.5 — deploy a builder-owned Uniswap v4 PoolManager plus two freely-mintable
/// mock ERC-20 tokens (standing in for wNVDAx/USDG, which have `codesize` 0 on testnet 1952 —
/// confirmed on-chain 2026-08-17) on X Layer Testnet (chain 1952).
///
/// Run once P0.3 (testnet OKB) is funded:
///   forge script script/DeployTestnetInfra.s.sol:DeployTestnetInfra \
///     --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $POSTER_PRIVATE_KEY
///
/// Deliberately does NOT deploy the hook or initialize a pool — that's task P4.2, a separate
/// script, kept separate so P0.5 and P4.2 can be independently verified per the task tracker.
contract DeployTestnetInfra is Script {
    /// @dev Initial mint: generous testnet-only supply, no real value. 1,000,000 of each,
    /// scaled to each token's own decimals.
    uint256 constant INITIAL_MOCK_WNVDAX = 1_000_000 * 1e18; // 18 decimals, matches real wNVDAx
    uint256 constant INITIAL_MOCK_USDG = 1_000_000 * 1e6; // 6 decimals, matches real USDG

    function run() external {
        address deployer = msg.sender;

        vm.startBroadcast();

        PoolManager poolManager = new PoolManager(deployer);
        console2.log("PoolManager deployed at:", address(poolManager));

        MockERC20 mockWNVDAx = new MockERC20("Mock Wrapped NVDAx (testnet)", "mockWNVDAx", 18);
        console2.log("MockERC20 mockWNVDAx deployed at:", address(mockWNVDAx));

        MockERC20 mockUSDG = new MockERC20("Mock USDG (testnet)", "mockUSDG", 6);
        console2.log("MockERC20 mockUSDG deployed at:", address(mockUSDG));

        mockWNVDAx.mint(deployer, INITIAL_MOCK_WNVDAX);
        mockUSDG.mint(deployer, INITIAL_MOCK_USDG);
        console2.log("Minted initial testnet-only supply to deployer:", deployer);

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Record these three addresses in task-tracker.md P0.5 evidence line:");
        console2.log("POOL_MANAGER=", address(poolManager));
        console2.log("MOCK_WNVDAX=", address(mockWNVDAx));
        console2.log("MOCK_USDG=", address(mockUSDG));
    }
}
