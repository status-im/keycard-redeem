pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

import "./erc721/IERC721.sol";
import "./erc721/IERC721Receiver.sol";
import "./erc721/IERC165.sol";

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

  struct Redeem {
    uint256 blockNumber;
    bytes32 blockHash;
    address receiver;
    bytes32 code;
  }

  bytes4 private constant _ERC721_RECEIVED = 0x150b7a02; //bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))

  bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
  bytes32 constant REDEEM_TYPEHASH = keccak256("Redeem(uint256 blockNumber,bytes32 blockHash,address receiver,bytes32 code)");
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

    require(_expirationTime > block.timestamp, "expiration can't be in the past");

    tokenContract = IERC721(_tokenAddress);
    expirationTime = _expirationTime;
    owner = payable(_owner);

    DOMAIN_SEPARATOR = keccak256(abi.encode(
      EIP712DOMAIN_TYPEHASH,
      keccak256("KeycardNFTGift"),
      keccak256("1"),
      _getChainID(),
      address(this)
    ));

    initialized = true;
  }

  function _getChainID() internal pure returns (uint256) {
    uint256 id;
    assembly {
      id := chainid()
    }

    return id;
  }

  function redeem(Redeem calldata _redeem, bytes calldata sig) external {
    require(_redeem.blockNumber < block.number, "transaction cannot be in the future");
    require(_redeem.blockNumber >= (block.number - maxTxDelayInBlocks), "transaction too old");
    require(_redeem.blockHash == blockhash(_redeem.blockNumber), "invalid block hash");

    require(block.timestamp < expirationTime, "expired gift");

    address recipient = recoverSigner(_redeem, sig);

    Gift storage gift = gifts[recipient];
    require(gift.recipient == recipient, "not found");

    bytes32 codeHash = keccak256(abi.encodePacked(_redeem.code));
    require(codeHash == gift.code, "invalid code");

    tokenContract.safeTransferFrom(address(this), _redeem.receiver, gift.tokenID);
  }

  function kill() external onlyOwner {
    require(block.timestamp >= expirationTime, "not expired yet");

    tokenContract.setApprovalForAll(owner, true);
    assert(tokenContract.isApprovedForAll(address(this), owner));

    selfdestruct(owner);
  }

  function hashRedeem(Redeem memory _redeem) internal pure returns (bytes32) {
    return keccak256(abi.encode(
      REDEEM_TYPEHASH,
      _redeem.blockNumber,
      _redeem.blockHash,
      _redeem.receiver,
      _redeem.code
    ));
  }

  function recoverSigner(Redeem memory _redeem, bytes memory sig) internal view returns(address) {
    require(sig.length == 65, "bad signature length");

    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := byte(0, mload(add(sig, 96)))
    }

    if (v < 27) {
      v += 27;
    }

    require(v == 27 || v == 28, "signature version doesn't match");

    bytes32 digest = keccak256(abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        hashRedeem(_redeem)
    ));

    return ecrecover(digest, v, r, s);
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
