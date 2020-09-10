pragma solidity ^0.5.16;

import "./ERC20Bucket.sol";
import "./Proxy.sol";

contract ERC20BucketFactory {
  ERC20Bucket public ERC20BucketImplementation;

  event BucketCreated(address indexed provider, address indexed bucket);

  constructor() public {
    ERC20BucketImplementation = new ERC20Bucket(address(0), 0, block.timestamp + 1, 1);
  }

  function create(address _tokenAddress, uint256 _startTime, uint256 _expirationTime, uint256 _maxTxDelayInBlocks) public returns (address) {
    address p = address(new Proxy(abi.encodeWithSelector(0xe0c69ab8, "KeycardERC20Bucket", _tokenAddress, _startTime, _expirationTime, _maxTxDelayInBlocks, msg.sender), address(ERC20BucketImplementation)));
    emit BucketCreated(msg.sender, p);
    return p;
  }
}
