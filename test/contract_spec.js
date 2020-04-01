const EmbarkJS = artifacts.require('EmbarkJS');
const TestToken = artifacts.require('TestToken');
const _GiftBucket = artifacts.require('GiftBucket');
const GiftBucketFactory = artifacts.require('GiftBucketFactory');

const TOTAL_SUPPLY = 10000;
const GIFT_AMOUNT = 10;
const REDEEM_CODE = web3.utils.sha3("hello world");
const NOW = Math.round(new Date().getTime() / 1000);
const EXPIRATION_TIME = NOW + 60 * 60 * 24; // in 24 hours
const NEW_EXPIRATION_TIME = EXPIRATION_TIME + 60;

let shop,
    user,
    relayer,
    keycard_1,
    keycard_2;

config({
  contracts: {
    deploy: {
      "TestToken": {
        args: ["TEST", 18],
      },
      "GiftBucket": {
        args: ["$TestToken", EXPIRATION_TIME],
      },
      "GiftBucketFactory": {
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
    { name: "receiver", type: "address" },
    { name: "code", type: "bytes32" },
  ];

  const domainData = {
    name: "KeycardGift",
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

contract("GiftBucket", function () {
  let GiftBucket;

  sendMethod = (web3.currentProvider.sendAsync) ? web3.currentProvider.sendAsync.bind(web3.currentProvider) : web3.currentProvider.send.bind(web3.currentProvider);

  it("deploy factory", async () => {
    // only to test gas
    const deploy = GiftBucketFactory.deploy({
      arguments: []
    });

    const gas = await deploy.estimateGas();
    await deploy.send({ gas })
  });

  it("deploy bucket", async () => {
    // only to test gas
    const deploy = _GiftBucket.deploy({
      arguments: [TestToken._address, EXPIRATION_TIME]
    });

    const gas = await deploy.estimateGas();
    await deploy.send({ gas })
  });

  it("deploy bucket via factory", async () => {
    const create = GiftBucketFactory.methods.create(TestToken._address, EXPIRATION_TIME);
    const gas = await create.estimateGas();
    const receipt = await create.send({
      from: shop,
      gas: gas,
    });

    const bucketAddress = receipt.events.Created.returnValues.bucket;
    const jsonInterface = _GiftBucket.options.jsonInterface;
    GiftBucket = new EmbarkJS.Blockchain.Contract({
      abi: jsonInterface,
      address: bucketAddress,
    });
  });

  it("shop buys 100 tokens", async function () {
    let supply = await TestToken.methods.totalSupply().call();
    assert.equal(parseInt(supply), 0);

    await TestToken.methods.mint(TOTAL_SUPPLY).send({
      from: shop,
    });

    supply = await TestToken.methods.totalSupply().call();
    assert.equal(parseInt(supply), TOTAL_SUPPLY);

    let shopBalance = await TestToken.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), TOTAL_SUPPLY);
  });

  it("add supply", async function() {
    let bucketBalance = await TestToken.methods.balanceOf(GiftBucket._address).call();
    assert.equal(parseInt(bucketBalance), 0, `bucket balance before is ${bucketBalance} instead of 0`);

    let shopBalance = await TestToken.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), TOTAL_SUPPLY, `shop balance before is ${shopBalance} instead of ${TOTAL_SUPPLY}`);

    const transfer = TestToken.methods.transfer(GiftBucket._address, TOTAL_SUPPLY);
    const transferGas = await transfer.estimateGas();
    await transfer.send({
      from: shop,
      gas: transferGas,
    });

    bucketBalance = await TestToken.methods.balanceOf(GiftBucket._address).call();
    assert.equal(parseInt(bucketBalance), TOTAL_SUPPLY, `bucket balance after is ${bucketBalance} instead of ${TOTAL_SUPPLY}`);

    shopBalance = await TestToken.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), 0, `shop balance after is ${shopBalance} instead of 0`);

    let totalSupply = await GiftBucket.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), TOTAL_SUPPLY, `total contract supply is ${totalSupply} instead of ${TOTAL_SUPPLY}`);

    let availableSupply = await GiftBucket.methods.availableSupply().call();
    assert.equal(parseInt(availableSupply), TOTAL_SUPPLY, `available contract supply is ${availableSupply} instead of ${TOTAL_SUPPLY}`);
  });

  async function testCreateGift(keycard, amount) {
    let initialSupply = await GiftBucket.methods.totalSupply().call();
    let initialAvailableSupply = await GiftBucket.methods.availableSupply().call();

    const redeemCodeHash = web3.utils.sha3(REDEEM_CODE);
    const createGift = GiftBucket.methods.createGift(keycard, amount, redeemCodeHash);
    const createGiftGas = await createGift.estimateGas();
    await createGift.send({
      from: shop,
      gas: createGiftGas,
    });

    let totalSupply = await GiftBucket.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), parseInt(initialSupply), `totalSupply is ${totalSupply} instead of ${initialSupply}`);

    let availableSupply = await GiftBucket.methods.availableSupply().call();
    assert.equal(parseInt(availableSupply), parseInt(initialAvailableSupply) - amount);
  }

  it("createGift should fail if amount is zero", async function() {
    try {
      await testCreateGift(keycard_1, 0);
      assert.fail("createGift should have failed");
    } catch(e) {
      assert.match(e.message, /invalid amount/);
    }
  });


  it("createGift fails if amount > totalSupply", async function() {
    try {
      await testCreateGift(keycard_1, TOTAL_SUPPLY + 1);
      assert.fail("createGift should have failed");
    } catch(e) {
      assert.match(e.message, /low supply/);
    }
  });

  it("createGift", async function() {
    await testCreateGift(keycard_1, GIFT_AMOUNT);
  });

  it("createGift should fail if keycard has already been used", async function() {
    try {
      await testCreateGift(keycard_1, 1);
      assert.fail("createGift should have failed");
    } catch(e) {
      assert.match(e.message, /recipient already used/);
    }
  });

  it("createGift amount > availableSupply", async function() {
    try {
      await testCreateGift(keycard_2, TOTAL_SUPPLY - GIFT_AMOUNT + 1);
      assert.fail("createGift should have failed");
    } catch(e) {
      assert.match(e.message, /low supply/);
    }
  });

  async function testRedeem(receiver, recipient, signer, relayer, redeemCode) {
    let initialBucketBalance = await TestToken.methods.balanceOf(GiftBucket._address).call();
    let initialUserBalance = await TestToken.methods.balanceOf(user).call();
    let initialRedeemableSupply = await GiftBucket.methods.redeemableSupply().call();

    let gift = await GiftBucket.methods.gifts(recipient).call();
    const amount = parseInt(gift.amount);

    const message = {
      receiver: receiver,
      code: redeemCode,
    };

    const sig = await signRedeem(GiftBucket._address, signer, message);
    const redeem = GiftBucket.methods.redeem(message, sig);
    const redeemGas = await redeem.estimateGas();
    await redeem.send({
      from: relayer,
      gas: redeemGas,
    });


    let expectedBucketBalance = parseInt(initialBucketBalance) - amount;
    let bucketBalance = await TestToken.methods.balanceOf(GiftBucket._address).call();
    assert.equal(parseInt(bucketBalance), expectedBucketBalance, `bucketBalance after redeem should be ${expectedBucketBalance} instead of ${bucketBalance}`);

    let expectedUserBalance = parseInt(initialUserBalance + amount);
    userBalance = await TestToken.methods.balanceOf(user).call();
    assert.equal(parseInt(userBalance), expectedUserBalance, `user`, `userBalance after redeem should be ${expectedUserBalance} instead of ${userBalance}`);

    let expectedRedeemableSupply = initialRedeemableSupply - amount;
    let redeemableSupply = await GiftBucket.methods.redeemableSupply().call();
    assert.equal(parseInt(redeemableSupply), expectedRedeemableSupply, `redeemableSupply after redeem should be ${expectedRedeemableSupply} instead of ${redeemableSupply}`);

  }

  it("cannot redeem after expiration date", async function() {
    await mineAt(EXPIRATION_TIME);
    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE);
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /expired/);
    }
  });

  it("cannot redeem with invalid code", async function() {
    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_1, relayer, web3.utils.sha3("bad-code"));
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /invalid code/);
    }
  });

  it("cannot redeem with invalid recipient", async function() {
    await mineAt(NOW);
    try {
      await testRedeem(user, keycard_1, keycard_2, relayer, REDEEM_CODE);
      assert.fail("redeem should have failed");
    } catch(e) {
      assert.match(e.message, /not found/);
    }
  });

  it("can redeem before expiration date", async function() {
    await mineAt(NOW);
    await testRedeem(user, keycard_1, keycard_1, relayer, REDEEM_CODE);
  });

  async function testKill() {
    let initialShopBalance = parseInt(await TestToken.methods.balanceOf(shop).call());
    let initialBucketBalance = parseInt(await TestToken.methods.balanceOf(GiftBucket._address).call());

    await GiftBucket.methods.kill().send({
      from: shop,
    });

    let expectedShopBalance = initialShopBalance + initialBucketBalance;
    let shopBalance = await TestToken.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), expectedShopBalance, `shop balance after kill is ${shopBalance} instead of ${expectedShopBalance}`);

    let bucketBalance = await TestToken.methods.balanceOf(GiftBucket._address).call();
    assert.equal(parseInt(bucketBalance), 0, `bucketBalance after kill is ${bucketBalance} instead of 0`);
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
  });
});
