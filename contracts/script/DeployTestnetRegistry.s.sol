// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EventStateRegistry} from "../src/EventStateRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Task P1.8 — deploy EventStateRegistry to X Layer Testnet (chain 1952), plus a mock
/// USD₮0 bond token (real USD₮0 has `codesize` 0 on testnet, confirmed on-chain 2026-08-17,
/// same reasoning as the mock wNVDAx/USDG in P0.5 — DeployTestnetInfra.s.sol).
///
/// Set env vars before running: POSTER (address), RESOLVER (address).
///
/// Run:
///   POSTER=0x... RESOLVER=0x... \
///   forge script script/DeployTestnetRegistry.s.sol:DeployTestnetRegistry \
///     --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $POSTER_PRIVATE_KEY
contract DeployTestnetRegistry is Script {
    uint256 constant CHALLENGE_WINDOW = 48 hours; // spec §4.2 documented default

    function run() external {
        address poster = vm.envAddress("POSTER");
        address resolver = vm.envAddress("RESOLVER");

        vm.startBroadcast();

        MockERC20 mockUsdt0 = new MockERC20("Mock USD Tether 0 (testnet)", "mockUSDT0", 6);
        console2.log("MockERC20 mockUSDT0 (bond token) deployed at:", address(mockUsdt0));

        EventStateRegistry registry = new EventStateRegistry(address(mockUsdt0), poster, resolver, CHALLENGE_WINDOW);
        console2.log("EventStateRegistry deployed at:", address(registry));

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Record these in task-tracker.md P1.8 evidence line:");
        console2.log("MOCK_USDT0=", address(mockUsdt0));
        console2.log("REGISTRY=", address(registry));
    }
}
