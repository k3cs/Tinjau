// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockERC20
/// @notice Freely-mintable ERC-20, deployed for real on X Layer Testnet (chain 1952) to stand
/// in for wNVDAx / USDG in the testnet demo pool (tasks P0.5, P4.2).
///
/// @dev Why this exists: wNVDAx (`0xa8ddb5cd96b5222afe198316e9a57caa642850d5`) and USDG
/// (`0x4ae46a509F6b1D9056937BA4500cb143933D2dc8`) both have `codesize` 0 on testnet 1952
/// (confirmed on-chain 2026-08-17) — they represent real custodied assets and only exist on
/// mainnet 196. Since the testnet leg of this project already uses a builder-deployed
/// PoolManager (canonical v4 also doesn't exist on testnet 1952), it's consistent to also use
/// mock tokens there rather than needing real capital just to run a testnet demo.
///
/// `mint` is deliberately unrestricted (anyone can mint to anyone) — this is a testnet-only
/// demo token with zero real value. NEVER deploy this pattern to mainnet; the real wNVDAx/USDG
/// contracts are used there instead (see AFTERHOURS spec §4.3, §7).
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /// @notice Unrestricted mint — testnet-only demo token, no real value. Anyone may mint to
    /// any address, matching the "judges need zero setup" goal for the demo (spec §5.3, task
    /// P6.2's pre-funded-relayer requirement extends naturally to "pre-mintable test tokens").
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
