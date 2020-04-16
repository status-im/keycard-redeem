pragma solidity ^0.6.1;

import "./NFTBucket.sol";
import "./Proxy.sol";

contract NFTBucketFactory {
  NFTBucket public NFTBucketImplementation;

  event BucketCreated(address indexed gifter, address indexed bucket);

  constructor() public {
    NFTBucketImplementation = new NFTBucket(address(0), block.timestamp + 1);
  }

  function create(address _tokenAddress, uint256 _expirationTime) public returns (address) {
    address p = address(new Proxy(abi.encodeWithSelector(0xc350a1b5, _tokenAddress, _expirationTime, msg.sender), address(NFTBucketImplementation)));
    emit BucketCreated(msg.sender, p);
    return p;
  }
}
