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
                                                      // initialize(address,uint256,address)
    address p = address(new Proxy(abi.encodeWithSelector(0xc350a1b5, _tokenAddress, _expirationTime, msg.sender), address(GiftBucketImplementation)));
    emit Created(msg.sender, p);
    return p;
  }
}
