pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

import "./ERC20Token.sol";

contract GiftBucket {

  address payable public owner;

  ERC20Token public tokenContract;

  uint256 public expirationTime;

  struct Gift {
    address keycard;
    uint256 amount;
    bytes32 code;
  }

  mapping(address => Gift) public gifts;

  struct Redeem {
    address keycard;
    address receiver;
    bytes32 code;
  }

  uint256 public redeemableSupply;

  bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
  bytes32 constant REDEEM_TYPEHASH = keccak256("Redeem(address keycard,address receiver,bytes32 code)");
  bytes32 DOMAIN_SEPARATOR;

  modifier onlyOwner() {
    require(msg.sender == owner, "owner required");
    _;
  }

  constructor(address _tokenAddress, uint256 _expirationTime) public {
    require(_expirationTime > block.timestamp, "expiration can't be in the past");

    tokenContract = ERC20Token(_tokenAddress);
    expirationTime = _expirationTime;
    owner = msg.sender;
    DOMAIN_SEPARATOR = keccak256(abi.encode(
      EIP712DOMAIN_TYPEHASH,
      keccak256("KeycardGift"),
      keccak256("1"),
      _getChainID(),
      address(this)
    ));
  }

  function _getChainID() internal pure returns (uint256) {
    uint256 id;
    assembly {
      id := chainid()
    }

    return id;
  }

  function totalSupply() public returns(uint256) {
    return tokenContract.balanceOf(address(this));
  }

  function availableSupply() public returns(uint256) {
    uint256 _totalSupply = this.totalSupply();
    return _totalSupply - redeemableSupply;
  }

  function createGift(address keycard, uint256 amount, bytes32 code) external onlyOwner {
    require(amount > 0, "invalid amount");

    uint256 _availableSupply = this.availableSupply();
    require(_availableSupply >= amount, "low supply");

    Gift storage gift = gifts[keycard];
    require(gift.amount == 0, "keycard already used");

    gift.keycard = keycard;
    gift.amount = amount;
    gift.code = code;

    redeemableSupply += amount;
  }

  function redeem(Redeem calldata _redeem, bytes calldata sig) external {
    require(block.timestamp < expirationTime, "expired gift");

    bool signedByKeycard = verify(_redeem, sig);
    require(signedByKeycard, "wrong keycard sig");

    Gift memory gift = gifts[_redeem.keycard];
    require(gift.amount > 0, "not found");

    bytes32 codeHash = keccak256(abi.encodePacked(_redeem.code));
    require(codeHash == gift.code, "invalid code");


    redeemableSupply -= gift.amount;
    tokenContract.transfer(_redeem.receiver, gift.amount);
  }

  function kill() external onlyOwner {
    require(block.timestamp >= expirationTime, "not expired yet");

    bool success = tokenContract.transfer(owner, this.totalSupply());
    assert(success);

    selfdestruct(owner);
  }

  function hashRedeem(Redeem memory _redeem) internal pure returns (bytes32) {
    return keccak256(abi.encode(
      REDEEM_TYPEHASH,
      _redeem.keycard,
      _redeem.receiver,
      _redeem.code
    ));
  }

  function verify(Redeem memory _redeem, bytes memory sig) internal view returns(bool) {
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

    return ecrecover(digest, v, r, s) == _redeem.keycard;
  }
}
