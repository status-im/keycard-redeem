pragma solidity >=0.5.0 <0.7.0;

import "./IERC20.sol";

abstract contract IERC20Detailed is IERC20 {
  function name() virtual public view returns (string memory);
  function symbol() virtual public view returns (string memory);
  function decimals() virtual public view returns (uint8);
}

