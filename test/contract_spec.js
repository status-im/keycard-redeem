const TestToken = require('Embark/contracts/TestToken');
const GiftsBatch = require('Embark/contracts/GiftsBatch');

let shop,
    user;

// For documentation please see https://framework.embarklabs.io/docs/contracts_testing.html
config({
  contracts: {
    deploy: {
      "TestToken": {
        args: [],
      }
    }
  }
}, (_err, _accounts) => {
  shop    = _accounts[0];
  keycard_1 = _accounts[1];
  keycard_2 = _accounts[2];
  user    = _accounts[3];
});

const TOTAL_SUPPLY = 10000;
const GIFT_AMOUNT = 10;
const REDEEM_CODE = web3.utils.sha3("hello world");
const NOW = Math.round(new Date().getTime() / 1000);
const EXPIRATION_TIME = NOW + 60 * 60 * 24; // in 24 hours

let sendMethod;

async function signRedeem(contractAddress, signer, message) {
  const result = await web3.eth.net.getId();
  const chainId = parseInt(result);

  let domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ];

  let redeem = [
    { name: "keycard", type: "address" },
    { name: "receiver", type: "address" },
    { name: "code", type: "bytes32" },
  ];

  let domainData = {
    name: "KeycardGift",
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress
  };

  let data = {
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
      from: keycard_2
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

contract("TestToken", function () {
  sendMethod = (web3.currentProvider.sendAsync) ? web3.currentProvider.sendAsync.bind(web3.currentProvider) : web3.currentProvider.send.bind(web3.currentProvider);

  let giftsBatchInstance;

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

  it("deploy", async function() {
    const deploy = GiftsBatch.deploy({
      arguments: [TestToken.address, EXPIRATION_TIME],
    });
    giftsBatchInstance = await deploy.send({
      gas: 900000,
    });

    const approve = TestToken.methods.approve(giftsBatchInstance._address, TOTAL_SUPPLY)
    const approveGas = await approve.estimateGas();
    await approve.send({
      from: shop,
      gas: approveGas,
    });


    const addSupply = giftsBatchInstance.methods.addSupply(TOTAL_SUPPLY)
    const addSupplyGas = await addSupply.estimateGas();
    await addSupply.send({
      from: shop,
      gas: addSupplyGas,
    });

    let shopBalance = await TestToken.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), 0);

    let factoryBalance = await TestToken.methods.balanceOf(giftsBatchInstance._address).call();
    assert.equal(parseInt(factoryBalance), TOTAL_SUPPLY);

    let totalSupply = await giftsBatchInstance.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), TOTAL_SUPPLY);

    let availableSupply = await giftsBatchInstance.methods.availableSupply().call();
    assert.equal(parseInt(availableSupply), TOTAL_SUPPLY);
  });

  async function testCreateGift(keycard, amount) {
    const redeemCodeHash = web3.utils.sha3(REDEEM_CODE);
    const createGift = giftsBatchInstance.methods.createGift(keycard, amount, redeemCodeHash);
    const createGiftGas = await createGift.estimateGas();
    await createGift.send({
      from: shop,
      gas: createGiftGas,
    });

    let totalSupply = await giftsBatchInstance.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), TOTAL_SUPPLY);

    let availableSupply = await giftsBatchInstance.methods.availableSupply().call();
    assert.equal(parseInt(availableSupply), TOTAL_SUPPLY - amount);
  }

  it("createGift should fail amount is zero", async function() {
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
      assert.match(e.message, /keycard already used/);
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

  async function testRedeem(redeemCode) {
    let totalSupply = await giftsBatchInstance.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), TOTAL_SUPPLY);

    let factoryBalance = await TestToken.methods.balanceOf(giftsBatchInstance._address).call();
    assert.equal(parseInt(factoryBalance), TOTAL_SUPPLY);

    let userBalance = await TestToken.methods.balanceOf(user).call();
    assert.equal(parseInt(userBalance), 0);

    // const gift = await giftsBatchInstance.methods.gifts(keycard_1).call();
    // const giftBlockNumber = gift.blockNumber;
    // const message = web3.utils.sha3(user);
    // const sig = await web3.eth.sign(message, keycard_1);

    const message = {
      keycard: keycard_1,
      receiver: user,
      code: redeemCode,
    };

    const sig = await signRedeem(giftsBatchInstance._address, keycard_1, message);

    const redeem = giftsBatchInstance.methods.redeem(message, sig);
    const redeemGas = await redeem.estimateGas();
    await redeem.send({
      from: user,
      gas: redeemGas,
    });

    factoryBalance = await TestToken.methods.balanceOf(giftsBatchInstance._address).call();
    assert.equal(parseInt(factoryBalance), TOTAL_SUPPLY - GIFT_AMOUNT);

    userBalance = await TestToken.methods.balanceOf(user).call();
    assert.equal(parseInt(userBalance), GIFT_AMOUNT);

    totalSupply = await giftsBatchInstance.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), TOTAL_SUPPLY - GIFT_AMOUNT);
  }

  // it("cannot redeem after expiration date", async function() {
  //   await mineAt(EXPIRATION_TIME);
  //   try {
  //     await testRedeem(REDEEM_CODE);
  //     assert.fail("redeem should have failed");
  //   } catch(e) {
  //     assert.match(e.message, /expired/);
  //   }
  // });

  // it("cannot redeem with invalid code", async function() {
  //   await mineAt(NOW);
  //   try {
  //     await testRedeem(web3.utils.sha3("bad-code"));
  //     assert.fail("redeem should have failed");
  //   } catch(e) {
  //     assert.match(e.message, /invalid code/);
  //   }
  // });

  it("can redeem before expiration date", async function() {
    await mineAt(NOW);
    await testRedeem(REDEEM_CODE);
  });

  // async function testKill() {
  //   let shopBalance = await TestToken.methods.balanceOf(shop).call();
  //   assert.equal(parseInt(shopBalance), 0);

  //   let factoryBalance = await TestToken.methods.balanceOf(giftsBatchInstance._address).call();
  //   assert.equal(parseInt(factoryBalance), TOTAL_SUPPLY - GIFT_AMOUNT);

  //   await giftsBatchInstance.methods.kill().send({
  //     from: shop,
  //   });

  //   shopBalance = await TestToken.methods.balanceOf(shop).call();
  //   assert.equal(parseInt(shopBalance), TOTAL_SUPPLY - GIFT_AMOUNT);

  //   factoryBalance = await TestToken.methods.balanceOf(giftsBatchInstance._address).call();
  //   assert.equal(parseInt(factoryBalance), 0);
  // }

  // it("shop cannot kill contract before expirationTime", async function() {
  //   await mineAt(NOW);
  //   try {
  //     await testKill();
  //     assert.fail("redeem should have failed");
  //   } catch(e) {
  //     assert.match(e.message, /not expired yet/);
  //   }
  // });

  // it("shop can kill contract after expirationTime", async function() {
  //   await mineAt(EXPIRATION_TIME);
  //   await testKill();
  // });
});
