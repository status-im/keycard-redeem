pragma solidity ^0.5.16;

import "./IERC20.sol";

contract IERC20Detailed is IERC20 {
  function name() public view returns (string memory);
  function symbol() public view returns (string memory);
  function decimals() public view returns (uint8);
}

