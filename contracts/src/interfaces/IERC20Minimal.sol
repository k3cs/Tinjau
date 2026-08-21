// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC20 (minimal)
/// @notice Minimal ERC-20 interface covering only what EventStateRegistry needs
/// (transferFrom to pull bonds, transfer to pay out bonds, decimals for documentation/
/// off-chain tooling convenience). Deliberately not importing a full OpenZeppelin ERC20
/// implementation here since the registry never mints/holds arbitrary ERC-20 logic itself —
/// it only calls into an already-deployed token (USD₮0 on X Layer).
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}
