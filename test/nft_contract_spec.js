const EmbarkJS = artifacts.require('EmbarkJS');
const TestNFT = artifacts.require('TestNFT');
const _NFTBucket = artifacts.require('NFTBucket');
const NFTBucketFactory = artifacts.require('NFTBucketFactory');

const TOTAL_SUPPLY = 10000;
const GIFT_AMOUNT = 10;
const REDEEM_CODE = web3.utils.sha3("hello world");
const NOW = Math.round(new Date().getTime() / 1000);
const START_TIME = NOW - 1;
const EXPIRATION_TIME = NOW + 60 * 60 * 24; // in 24 hours

let shop,
    user,
    relayer,
    keycard_1,
    keycard_2;

config({
  contracts: {
    deploy: {
      "TestNFT": {
        args: [],
      },
      "NFTBucket": {
        args: ["$TestNFT", START_TIME, EXPIRATION_TIME],
      },
      "NFTBucketFactory": {
        args: [],
      },
    }
  },
}, (_err, _accounts) => {
  shop      = _accounts[0];
  user      = _accounts[1];
  relayer   = _accounts[2];
  keycard_1 = _accounts[3];
  keycard_2 = _accounts[4];
  keycard_3 = _accounts[5];
});

let sendMethod;

async function signRedeem(contractAddress, signer, message) {
  const result = await web3.eth.net.getId();
  let chainId = parseInt(result);
  //FIXME: in tests, getChainID in the contract returns 1 so we hardcode it here to 1.
  chainId = 1;

  const domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ];

  const redeem = [
    { name: "blockNumber", type: "uint256" },
    { name: "blockHash", type: "bytes32" },
    { name: "receiver", type: "address" },
    { name: "code", type: "bytes32" },
  ];

  const domainData = {
    name: "KeycardNFTBucket",
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress
  };

  const data = {
    types: {
      EIP712Domain: domain,
      Redeem: redeem,
    },
    primaryType: "Redeem",
    domain: domainData,
    message: message
  };

  return new Promise((resolve, reject) => {
    sendMethod({
      jsonrpc: '2.0',
      id: Date.now().toString().substring(9),
      method: "eth_signTypedData",
      params: [signer, data],
      from: signer
    }, (error, res) => {
      if (error) {
        return reject(error);
      }
      resolve(res.result);
    });
  });
}

function mineAt(timestamp) {
  return new Promise((resolve, reject) => {
    sendMethod({
      jsonrpc: '2.0',
      method: "evm_mine",
      params: [timestamp],
      id: Date.now().toString().substring(9)
    }, (error, res) => {
      if (error) {
        return reject(error);
      }
      resolve(res.result);
    });
  });
}

if (assert.match === undefined) {
  assert.match = (message, pattern) => {
    assert(pattern.test(message), `${message} doesn't match ${pattern}`);
  }
}

contract("NFTBucket", function () {
  let NFTBucket;

  sendMethod = (web3.currentProvider.sendAsync) ? web3.currentProvider.sendAsync.bind(web3.currentProvider) : web3.currentProvider.send.bind(web3.currentProvider);

  it("deploy factory", async () => {
    // only to test gas
    const deploy = NFTBucketFactory.deploy({
      arguments: []
    });

    const gas = await deploy.estimateGas();
    await deploy.send({ gas })
  });

  it("deploy bucket", async () => {
    // only to test gas
    const deploy = _NFTBucket.deploy({
      arguments: [TestNFT._address, START_TIME, EXPIRATION_TIME]
    });

    const gas = await deploy.estimateGas();
    await deploy.send({ gas })
  });

  it("deploy bucket via factory", async () => {
    const create = NFTBucketFactory.methods.create(TestNFT._address, START_TIME, EXPIRATION_TIME);
    const gas = await create.estimateGas();
    const receipt = await create.send({
      from: shop,
      gas: gas,
    });

    const bucketAddress = receipt.events.BucketCreated.returnValues.bucket;
    const jsonInterface = _NFTBucket.options.jsonInterface;
    NFTBucket = new EmbarkJS.Blockchain.Contract({
      abi: jsonInterface,
      address: bucketAddress,
    });
  });

  function createRedeemableData(recipient) {
      const redeemCodeHash = web3.utils.sha3(REDEEM_CODE);
      return recipient + redeemCodeHash.replace("0x", "");
  }

  async function checkRedeemable(recipient, tokenID) {
    let redeemable = await NFTBucket.methods.redeemables(recipient).call();
    assert.equal(redeemable.recipient, recipient, "redeemable not found");
    assert.equal(parseInt(redeemable.data), tokenID, "token ID does not match");
    let tokenOwner = await TestNFT.methods.ownerOf(tokenID).call();
    assert.equal(tokenOwner, NFTBucket._address, "token owner is wrong");
  }

  it("mint directly to redeemable", async function () {
    await TestNFT.methods.mint(NFTBucket._address, 42, createRedeemableData(keycard_1)).send({
      from: shop,
    });

    await checkRedeemable(keycard_1, 42);
  });

  it("transfer token from shop", async function() {
    await TestNFT.methods.mint(shop, 0xcafe).send({from: shop,});
    await TestNFT.methods.safeTransferFrom(shop, NFTBucket._address, 0xcafe, createRedeemableData(keycard_2)).send({from: shop});

    await checkRedeemable(keycard_2, 0xcafe);
  });

  it("cannot create two redeemables for the same recipient", async function() {
    await TestNFT.methods.mint(shop, 43).send({from: shop});

    try {
      await TestNFT.methods.safeTransferFrom(shop, NFTBucket._address, 43, createRedeemableData(keycard_2)).send({from: shop});
      assert.fail("transfer should have failed");
    } catch(e) {
      assert.match(e.message, /already used/);
    }

  });

  it("cannot create two redeemables for the same token", async function() {
    try {
      await NFTBucket.methods.onERC721Received(shop, shop, 0xcafe, createRedeemableData(keycard_3)).send({from: shop});
      assert.fail("transfer should have failed");
    } catch(e) {
      assert.match(e.message, /only the NFT/);
    }

  });

  async function testRedeem(receiver, recipient, signer, relayer, redeemCode, blockNumber, blockHash) {
    let redeemable = await NFTBucket.methods.redeemables(recipient).call();
    const tokenID = redeemable.data;

    const message = {
      blockNumber: blockNumber,
      blockHash: blockHash,
      receiver: receiver,
      code: redeemCode,
    };

    const sig = await signRedeem(NFTBucket._address, signer, message);
    const redeem = NFTBucket.methods.redeem(message, sig);
    const redeemGas = await redeem.estimateGas();
    let receipt = await redeem.send({
      from: relayer,
      gas: redeemGas,
    });

    assert.equal(receipt.events.Redeemed.returnValues.recipient, recipient);
    assert.equal(receipt.events.Redeemed.returnValues.data, tokenID);

    let tokenOwner = await TestNFT.methods.ownerOf(tokenID).call();
    assert.equal(tokenOwner, receiver, `Token owner is ${tokenOwner} instead of the expected ${receiver}`);
  }

  it("cannot redeem before the start date", async function() {
    const block = await web3.eth.getBlock("latest");
    await mineAt(START_TIME);

    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE, block.number, block.hash);
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /not yet started/);
    }
  });

  it("cannot redeem after expiration date", async function() {
    const block = await web3.eth.getBlock("latest");
    await mineAt(EXPIRATION_TIME);

    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE, block.number, block.hash);
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /expired/);
    }
  });

  it("cannot redeem with invalid code", async function() {
    const block = await web3.eth.getBlock("latest");
    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, web3.utils.sha3("bad-code"), block.number, block.hash);
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /invalid code/);
    }
  });

  it("cannot redeem with invalid recipient", async function() {
    const block = await web3.eth.getBlock("latest");
    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_3, relayer, REDEEM_CODE, block.number, block.hash);
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /not found/);
    }
  });

  it("cannot redeem with a block in the future", async function() {
    const block = await web3.eth.getBlock("latest");
    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE, (block.number + 2), "0x0000000000000000000000000000000000000000000000000000000000000000");
    } catch (e) {
      assert.match(e.message, /future/);
    }
  });

  it("cannot redeem with an old block", async function() {
    const currentBlock = await web3.eth.getBlock("latest");
    const block = await web3.eth.getBlock(currentBlock.number - 10);

    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE, block.number, block.hash);
    } catch (e) {
      assert.match(e.message, /too old/);
    }
  });

  it("cannot redeem with an invalid hash", async function() {
    const block = await web3.eth.getBlock("latest");

    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE, block.number, "0x0000000000000000000000000000000000000000000000000000000000000000");
    } catch (e) {
      assert.match(e.message, /invalid block hash/);
    }
  });

  it("can redeem before expiration date", async function() {
    const block = await web3.eth.getBlock("latest");
    await mineAt(NOW);
    await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE, block.number, block.hash);
  });

  async function testKill() {
    assert(!await TestNFT.methods.isApprovedForAll(NFTBucket._address, shop).call(), `${shop} should not be the operator of bucket's tokens`);
    await NFTBucket.methods.kill().send({from: shop});
    assert(await TestNFT.methods.isApprovedForAll(NFTBucket._address, shop).call(), `${shop} should become the operator of the destroyed bucket's tokens`);
  }

  it("shop cannot kill contract before expirationTime", async function() {
    await mineAt(NOW);
    try {
      await testKill();
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /not expired yet/);
    }
  });

  it("shop can kill contract after expirationTime", async function() {
    await mineAt(EXPIRATION_TIME);
    await testKill();
    await mineAt(NOW);
  });
});
