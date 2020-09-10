pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./Bucket.sol";
import "./erc20/IERC20.sol";

contract ERC20Bucket is Bucket {
  uint256 public redeemableSupply;

  constructor(
    address _tokenAddress,
    uint256 _startTime,
    uint256 _expirationTime,
    uint256 _maxTxDelayInBlocks) Bucket("KeycardERC20Bucket", _tokenAddress, _startTime, _expirationTime, _maxTxDelayInBlocks) public {}

  function totalSupply() public view returns(uint256) {
    return IERC20(tokenAddress).balanceOf(address(this));
  }

  function availableSupply() public view returns(uint256) {
    uint256 _totalSupply = this.totalSupply();
    require(_totalSupply >= redeemableSupply, "redeemableSupply is greater than redeemableSupply");

    return _totalSupply - redeemableSupply;
  }

  function createRedeemable(address recipient, uint256 amount, bytes32 code) external onlyOwner {
    require(amount > 0, "invalid amount");

    uint256 _availableSupply = this.availableSupply();
    require(_availableSupply >= amount, "low supply");

    Redeemable storage redeemable = redeemables[recipient];
    require(redeemable.recipient == address(0), "recipient already used");

    redeemable.recipient = recipient;
    redeemable.code = code;
    redeemable.data = amount;

    require(redeemableSupply + amount > redeemableSupply, "addition overflow");
    redeemableSupply += amount;
  }

  function transferRedeemable(uint256 data, Redeem memory redeem) internal {
    require(redeemableSupply >= data, "not enough redeemable supply");
    redeemableSupply -= data;
    IERC20(tokenAddress).transfer(redeem.receiver, data);
  }

  function transferRedeemablesToOwner() internal {
    bool success = IERC20(tokenAddress).transfer(owner, this.totalSupply());
    assert(success);
  }

  function bucketType() external returns (uint256) {
    return 20;
  }
}
