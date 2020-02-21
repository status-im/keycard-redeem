pragma solidity ^0.6.1;

import "./GiftBucket.sol";
import "./Proxy.sol";

contract GiftBucketFactory {
  GiftBucket public GiftBucketImplementation;

  event Created(address indexed gifter, address indexed bucket);

  constructor() public {
    GiftBucketImplementation = new GiftBucket(address(0), block.timestamp + 1);
  }

  function create(address _tokenAddress, uint256 _expirationTime) public returns (address) {
    address p = address(new Proxy("", address(GiftBucketImplementation)));

    GiftBucket g = GiftBucket(p);
    g.initialize(_tokenAddress, _expirationTime, msg.sender);

    emit Created(msg.sender, address(p));

    return address(p);
  }
}
