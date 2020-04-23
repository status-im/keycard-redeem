pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

import "./erc20/IERC20.sol";
import "./RedeemUtil.sol";

contract GiftBucket {

  bool initialized;

  address payable public owner;

  IERC20 public tokenContract;

  uint256 public expirationTime;

  uint256 constant maxTxDelayInBlocks = 10;

  struct Gift {
    address recipient;
    uint256 amount;
    bytes32 code;
  }

  mapping(address => Gift) public gifts;

  uint256 public redeemableSupply;

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

    tokenContract = IERC20(_tokenAddress);
    expirationTime = _expirationTime;
    owner = payable(_owner);

    DOMAIN_SEPARATOR = keccak256(abi.encode(
      EIP712DOMAIN_TYPEHASH,
      keccak256("KeycardGift"),
      keccak256("1"),
      RedeemUtil.getChainID(),
      address(this)
    ));

    initialized = true;
  }

  function totalSupply() public view returns(uint256) {
    return tokenContract.balanceOf(address(this));
  }

  function availableSupply() public view returns(uint256) {
    uint256 _totalSupply = this.totalSupply();
    require(_totalSupply >= redeemableSupply, "redeemableSupply is greater than redeemableSupply");

    return _totalSupply - redeemableSupply;
  }

  function createGift(address recipient, uint256 amount, bytes32 code) external onlyOwner {
    require(amount > 0, "invalid amount");

    uint256 _availableSupply = this.availableSupply();
    require(_availableSupply >= amount, "low supply");

    Gift storage gift = gifts[recipient];
    require(gift.recipient == address(0), "recipient already used");

    gift.recipient = recipient;
    gift.amount = amount;
    gift.code = code;

    require(redeemableSupply + amount > redeemableSupply, "addition overflow");
    redeemableSupply += amount;
  }

  function redeem(RedeemUtil.Redeem calldata _redeem, bytes calldata _sig) external {
    RedeemUtil.validateRedeem(_redeem, maxTxDelayInBlocks, expirationTime, 0);

    address recipient = RedeemUtil.recoverSigner(DOMAIN_SEPARATOR, _redeem, _sig);

    Gift storage gift = gifts[recipient];
    require(gift.recipient == recipient, "not found");

    RedeemUtil.validateCode(_redeem, gift.code);

    uint256 amount = gift.amount;
    require(redeemableSupply >= amount, "not enough redeemable supply");

    gift.recipient = address(0);
    gift.amount = 0;
    gift.code = 0;

    redeemableSupply -= amount;

    tokenContract.transfer(_redeem.receiver, amount);
  }

  function kill() external onlyOwner {
    RedeemUtil.validateExpired(expirationTime);

    bool success = tokenContract.transfer(owner, this.totalSupply());
    assert(success);

    selfdestruct(owner);
  }
}
