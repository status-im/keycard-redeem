pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

abstract contract Bucket {
  bool initialized;
  address payable public owner;
  address public tokenAddress;
  uint256 public expirationTime;
  uint256 public startTime;
  uint256 public maxTxDelayInBlocks;

  bytes32 constant REDEEM_TYPEHASH = keccak256("Redeem(uint256 blockNumber,bytes32 blockHash,address receiver,bytes32 code)");
  bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
  bytes32 DOMAIN_SEPARATOR;

  string _relayerURI;

  struct Redeemable {
    address recipient;
    bytes32 code;
    uint256 data;
  }

  struct Redeem {
    uint256 blockNumber;
    bytes32 blockHash;
    address receiver;
    bytes32 code;
  }

  event Redeemed(address indexed recipient, uint256 indexed data);

  mapping(address => Redeemable) public redeemables;

  modifier onlyOwner() {
    require(msg.sender == owner, "owner required");
    _;
  }

  constructor(bytes memory _eip712DomainName, address _tokenAddress, uint256 _startTime, uint256 _expirationTime, uint256 _maxTxDelayInBlocks) public {
    initialize(_eip712DomainName, _tokenAddress, _startTime, _expirationTime, _maxTxDelayInBlocks, msg.sender);
  }

  function initialize(bytes memory _eip712DomainName, address _tokenAddress, uint256 _startTime, uint256 _expirationTime, uint256 _maxTxDelayInBlocks, address _owner) public {
    require(initialized == false, "already initialized");
    require(_maxTxDelayInBlocks > 0 && _maxTxDelayInBlocks < 256, "the valid range is 1 to 255");
    require(_expirationTime > block.timestamp, "expiration can't be in the past");

    tokenAddress = _tokenAddress;
    startTime = _startTime;
    expirationTime = _expirationTime;
    maxTxDelayInBlocks = _maxTxDelayInBlocks;
    owner = payable(_owner);

    DOMAIN_SEPARATOR = keccak256(abi.encode(
      EIP712DOMAIN_TYPEHASH,
      keccak256(_eip712DomainName),
      keccak256("1"),
      getChainID(),
      address(this)
    ));

    initialized = true;
  }

  function transferRedeemable(uint256 data, Redeem memory redeem) virtual internal;

  function transferRedeemablesToOwner() virtual internal;

  function bucketType() virtual external returns (uint256);

  function redeem(Redeem calldata _redeem, bytes calldata _sig) external {
    // validate Redeem
    require(_redeem.blockNumber < block.number, "transaction cannot be in the future");
    require(_redeem.blockNumber >= (block.number - maxTxDelayInBlocks), "transaction too old");
    require(_redeem.blockHash == blockhash(_redeem.blockNumber), "invalid block hash");
    require(block.timestamp < expirationTime, "expired redeemable");
    require(block.timestamp > startTime, "reedeming not yet started");

    address recipient = recoverSigner(DOMAIN_SEPARATOR, _redeem, _sig);

    Redeemable storage redeemable = redeemables[recipient];
    require(redeemable.recipient == recipient, "not found");

    // validate code
    bytes32 codeHash = keccak256(abi.encodePacked(_redeem.code));
    require(codeHash == redeemable.code, "invalid code");

    uint256 data = redeemable.data;

    redeemable.recipient = address(0);
    redeemable.code = 0;
    redeemable.data = 0;

    transferRedeemable(data, _redeem);
    emit Redeemed(recipient, data);
  }

  function kill() external onlyOwner {
    require(block.timestamp >= expirationTime, "not expired yet");
    transferRedeemablesToOwner();
    selfdestruct(owner);
  }

  function getChainID() internal pure returns (uint256) {
    uint256 id;
    assembly {
      id := chainid()
    }

    return id;
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

  function recoverSigner(bytes32 _domainSeparator, Redeem memory _redeem, bytes memory _sig) internal pure returns(address) {
    require(_sig.length == 65, "bad signature length");

    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      r := mload(add(_sig, 32))
      s := mload(add(_sig, 64))
      v := byte(0, mload(add(_sig, 96)))
    }

    if (v < 27) {
      v += 27;
    }

    require(v == 27 || v == 28, "signature version doesn't match");

    bytes32 digest = keccak256(abi.encodePacked(
        "\x19\x01",
        _domainSeparator,
        hashRedeem(_redeem)
    ));

    return ecrecover(digest, v, r, s);
  }

  function setRelayerURI(string calldata uri) external onlyOwner {
    _relayerURI = uri;
  }

  function relayerURI() public view returns (string memory) {
    return _relayerURI;
  }
}
