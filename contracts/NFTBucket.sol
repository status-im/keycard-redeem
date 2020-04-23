pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

import "./erc721/IERC721.sol";
import "./erc721/IERC721Receiver.sol";
import "./erc721/IERC165.sol";
import "./RedeemUtil.sol";

contract NFTBucket is IERC165, IERC721Receiver {
  bool initialized;

  address payable public owner;

  IERC721 public tokenContract;

  uint256 public expirationTime;

  uint256 constant maxTxDelayInBlocks = 10;

  struct Gift {
    address recipient;
    uint256 tokenID;
    bytes32 code;
  }

  mapping(address => Gift) public gifts;

  bytes4 private constant _ERC721_RECEIVED = 0x150b7a02; //bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))

  bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
  bytes32 DOMAIN_SEPARATOR;

  modifier onlyOwner() {
    require(msg.sender == owner, "owner required");
    _;
  }

  constructor(address _tokenAddress, uint256 _expirationTime) public {
    initialize(_tokenAddress, _expirationTime, msg.sender);
  }

  function initialize(address _tokenAddress, uint256 _expirationTime, address _owner) public {
    require(initialized == false, "already initialized");

    RedeemUtil.validateExpiryDate(_expirationTime);

    tokenContract = IERC721(_tokenAddress);
    expirationTime = _expirationTime;
    owner = payable(_owner);

    DOMAIN_SEPARATOR = keccak256(abi.encode(
      EIP712DOMAIN_TYPEHASH,
      keccak256("KeycardNFTGift"),
      keccak256("1"),
      RedeemUtil.getChainID(),
      address(this)
    ));

    initialized = true;
  }

  function redeem(RedeemUtil.Redeem calldata _redeem, bytes calldata _sig) external {
    RedeemUtil.validateRedeem(_redeem, maxTxDelayInBlocks, expirationTime, 0);

    address recipient = RedeemUtil.recoverSigner(DOMAIN_SEPARATOR, _redeem, _sig);

    Gift storage gift = gifts[recipient];
    require(gift.recipient == recipient, "not found");

    RedeemUtil.validateCode(_redeem, gift.code);

    tokenContract.safeTransferFrom(address(this), _redeem.receiver, gift.tokenID);
  }

  function kill() external onlyOwner {
    RedeemUtil.validateExpired(expirationTime);

    tokenContract.setApprovalForAll(owner, true);
    assert(tokenContract.isApprovedForAll(address(this), owner));

    selfdestruct(owner);
  }

  function supportsInterface(bytes4 interfaceID) external override(IERC165) view returns (bool) {
      return interfaceID == _ERC721_RECEIVED;
  }

  function onERC721Received(address _operator, address _from, uint256 _tokenID, bytes calldata _data) external override(IERC721Receiver) returns(bytes4) {
    require(msg.sender == address(tokenContract), "only the NFT contract can call this");
    require((_operator == owner) || (_from == owner), "only the owner can create gifts");
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

    Gift storage gift = gifts[recipient];
    require(gift.recipient == address(0), "recipient already used");

    gift.recipient = recipient;
    gift.tokenID = _tokenID;
    gift.code = code;

    return _ERC721_RECEIVED;
  }
}
