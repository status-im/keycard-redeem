pragma solidity ^0.5.16;

import "./StandardToken.sol";

/**
 * @notice ERC20Token for test scripts, can be minted by anyone.
 */
contract TestToken is StandardToken {
  string private _symbol;
  uint256 private _decimals;

  constructor(string memory symbol, uint256 decimals) public {
    _symbol = symbol;
    _decimals = decimals;
  }

  // fallback
  function() external {
    uint256 amount = 5000;
    mint(amount * uint256(10)**_decimals);
  }

  function symbol() public view returns (string memory) {
    return _symbol;
  }

  function decimals() public view returns (uint256) {
    return _decimals;
  }

  /**
   * @notice any caller can mint any `_amount`
   * @param _amount how much to be minted
   */
  function mint(uint256 _amount) public {
    mint(msg.sender, _amount);
  }
}
