pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

import "./Bucket.sol";
import "./erc721/IERC721.sol";
import "./erc721/IERC721Receiver.sol";
import "./erc721/IERC165.sol";

contract NFTBucket is Bucket, IERC165, IERC721Receiver {
  bytes4 private constant _ERC721_RECEIVED = 0x150b7a02; //bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))

  constructor(
    address _tokenAddress,
    uint256 _startTime,
    uint256 _expirationTime,
    uint256 _maxTxDelayInBlocks) Bucket("KeycardNFTBucket", _tokenAddress, _startTime, _expirationTime, _maxTxDelayInBlocks) public {}

  function transferRedeemable(uint256 data, Redeem memory redeem) internal override {
    IERC721(tokenAddress).safeTransferFrom(address(this), redeem.receiver, data);
  }

  function transferRedeemablesToOwner() internal override {
    address owner = owner();
    IERC721(tokenAddress).setApprovalForAll(owner, true);
    assert(IERC721(tokenAddress).isApprovedForAll(address(this), owner));
  }

  function bucketType() external override returns (uint256) {
    return 721;
  }

  function supportsInterface(bytes4 interfaceID) external override(IERC165) view returns (bool) {
      return interfaceID == _ERC721_RECEIVED;
  }

  function onERC721Received(address _operator, address _from, uint256 _tokenID, bytes calldata _data) external override(IERC721Receiver) returns(bytes4) {
    require(msg.sender == tokenAddress, "only the NFT contract can call this");
    require((_operator == owner()) || (_from == owner()), "only the owner can create redeemables");
    require(_data.length == 52, "invalid data field");

    bytes memory d = _data;
    bytes32 tmp;
    bytes32 code;

    assembly {
      // tmp is 12 bytes of padding (taken from the array length) + 20 bytes of address
      tmp := mload(add(d, 20))
      code := mload(add(d, 52))
    }

    address recipient = address(uint160(uint256(tmp)));

    Redeemable storage redeemable = redeemables[recipient];
    require(redeemable.recipient == address(0), "recipient already used");

    redeemable.recipient = recipient;
    redeemable.code = code;
    redeemable.data = _tokenID;

    return _ERC721_RECEIVED;
  }
}
