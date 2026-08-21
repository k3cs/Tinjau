// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TinjauRiskTypes} from "../../src/TinjauRiskTypes.sol";
import {TinjauRiskPolicy} from "../../src/TinjauRiskPolicy.sol";

/// @notice A stand-in registry that answers `TinjauFeeHook`'s four reads and can be made to
/// answer them BADLY.
///
/// @dev Why this exists. The real `TinjauRiskRegistry` refuses to store a rumour-driven
/// `PROTECT`, an out-of-range enum, or an undefined reason bit — which is exactly why it
/// cannot be used to test that the hook survives one. The hook's trust model assumes the
/// writing path may be compromised; proving the hook fails closed therefore requires a
/// registry that can lie. Nothing here is deployed, and the shape of every return value is
/// copied from the real contract so a signature drift shows up as a compile error there.
contract MockTinjauRiskRegistry {
    TinjauRiskPolicy.Envelope public envelope;
    bool public paused;
    mapping(address => bool) public supportedAsset;

    /// @dev 0 = answer normally, 1 = revert, 2 = return `_raw` verbatim.
    uint8 public mode;
    TinjauRiskTypes.RiskRecord private _record;
    bytes private _raw;

    constructor(TinjauRiskPolicy.Envelope memory e) {
        envelope = e;
    }

    function setPaused(bool v) external {
        paused = v;
    }

    function setSupported(address asset, bool v) external {
        supportedAsset[asset] = v;
    }

    function setRecord(TinjauRiskTypes.RiskRecord memory r) external {
        _record = r;
        mode = 0;
    }

    function setMode(uint8 m) external {
        mode = m;
    }

    function setRaw(bytes calldata b) external {
        _raw = b;
        mode = 2;
    }

    function currentRecord(address, bytes32) external view returns (TinjauRiskTypes.RiskRecord memory) {
        if (mode == 1) revert("registry down");
        if (mode == 2) {
            bytes memory b = _raw;
            assembly {
                return(add(b, 32), mload(b))
            }
        }
        return _record;
    }
}
