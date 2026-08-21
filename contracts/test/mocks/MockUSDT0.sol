// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockUSDT0
/// @notice Minimal 6-decimal ERC-20 mock standing in for real USD₮0
/// (0x779ded0c9e1022225f8e0630b35a9b54be713736 on X Layer) in local Foundry tests. Real
/// USD₮0 is NOT deployed or interacted with anywhere in this test suite — no live RPC, no
/// forked mainnet state. This mock exists solely to exercise the registry's bond-locking
/// transferFrom/transfer flow with correct 6-decimal semantics.
contract MockUSDT0 {
    string public constant name = "Mock USD Tether 0";
    string public constant symbol = "USD\xE2\x82\xAE0"; // display only, not load-bearing
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
