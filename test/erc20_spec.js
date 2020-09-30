const TestToken = artifacts.require('TestToken');
const ERC20Bucket = artifacts.require('ERC20Bucket');
const ERC20BucketFactory = artifacts.require('ERC20BucketFactory');

const TOTAL_SUPPLY = 10000;
const GIFT_AMOUNT = 10;
const REDEEM_CODE = web3.utils.sha3("hello world");
const NOW = Math.round(new Date().getTime() / 1000);
const START_TIME = NOW - 1;
const EXPIRATION_TIME = NOW + 60 * 60 * 24; // in 24 hours
const MAX_TX_DELAY_BLOCKS = 10;

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
    name: "KeycardERC20Bucket",
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
    web3.currentProvider.send({
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
    web3.currentProvider.send({
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

contract("ERC20Bucket", function () {
  let bucketInstance,
    factoryInstance,
    tokenInstance,
    shop,
    user,
    relayer,
    keycard_1,
    keycard_2;

  before(async () => {
    const accounts = await web3.eth.getAccounts();
    shop      = accounts[0];
    user      = accounts[1];
    relayer   = accounts[2];
    keycard_1 = accounts[3];
    keycard_2 = accounts[4];

    const deployedTestToken = await TestToken.deployed();
    tokenInstance = new web3.eth.Contract(TestToken.abi, deployedTestToken.address);
  });

  it("deploy factory", async () => {
    const contract = new web3.eth.Contract(ERC20BucketFactory.abi);
    const deploy = contract.deploy({ data: ERC20BucketFactory.bytecode });
    const gas = await deploy.estimateGas();
    const rec = await deploy.send({
      from: shop,
      gas,
    });

    factoryInstance = new web3.eth.Contract(ERC20BucketFactory.abi, rec.options.address);
  });

  it("deploy bucket", async () => {
    const instance = new web3.eth.Contract(ERC20Bucket.abi);
    const deploy = instance.deploy({
      data: ERC20Bucket.bytecode,
      arguments: [tokenInstance.options.address, START_TIME, EXPIRATION_TIME, MAX_TX_DELAY_BLOCKS]
    });
    const gas = await deploy.estimateGas();
    const rec = await deploy.send({
      from: shop,
      gas,
    });

    bucketInstance = new web3.eth.Contract(ERC20Bucket.abi, rec.options.address);
  });

  it("deploy bucket via factory", async () => {
    const create = factoryInstance.methods.create(tokenInstance._address, START_TIME, EXPIRATION_TIME, MAX_TX_DELAY_BLOCKS);
    const gas = await create.estimateGas();
    const receipt = await create.send({
      from: shop,
      gas: gas,
    });
  });

  it("return correct bucket type", async function () {
    let bucketType = await bucketInstance.methods.bucketType().call();
    assert.equal(parseInt(bucketType), 20);
  });

  it("shop buys 100 tokens", async function () {
    let supply = await tokenInstance.methods.totalSupply().call();
    assert.equal(parseInt(supply), 0);

    await tokenInstance.methods.mint(TOTAL_SUPPLY).send({
      from: shop,
    });

    supply = await tokenInstance.methods.totalSupply().call();
    assert.equal(parseInt(supply), TOTAL_SUPPLY);

    let shopBalance = await tokenInstance.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), TOTAL_SUPPLY);
  });

  it("add supply", async function() {
    let bucketBalance = await tokenInstance.methods.balanceOf(bucketInstance.options.address).call();
    assert.equal(parseInt(bucketBalance), 0, `bucket balance before is ${bucketBalance} instead of 0`);

    let shopBalance = await tokenInstance.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), TOTAL_SUPPLY, `shop balance before is ${shopBalance} instead of ${TOTAL_SUPPLY}`);

    const transfer = tokenInstance.methods.transfer(bucketInstance.options.address, TOTAL_SUPPLY);
    const transferGas = await transfer.estimateGas();
    await transfer.send({
      from: shop,
      gas: transferGas,
    });

    bucketBalance = await tokenInstance.methods.balanceOf(bucketInstance.options.address).call();
    assert.equal(parseInt(bucketBalance), TOTAL_SUPPLY, `bucket balance after is ${bucketBalance} instead of ${TOTAL_SUPPLY}`);

    shopBalance = await tokenInstance.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), 0, `shop balance after is ${shopBalance} instead of 0`);

    let totalSupply = await bucketInstance.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), TOTAL_SUPPLY, `total contract supply is ${totalSupply} instead of ${TOTAL_SUPPLY}`);

    let availableSupply = await bucketInstance.methods.availableSupply().call();
    assert.equal(parseInt(availableSupply), TOTAL_SUPPLY, `available contract supply is ${availableSupply} instead of ${TOTAL_SUPPLY}`);
  });

  async function testCreateRedeemable(keycard, amount) {
    let initialSupply = await bucketInstance.methods.totalSupply().call();
    let initialAvailableSupply = await bucketInstance.methods.availableSupply().call();

    const redeemCodeHash = web3.utils.sha3(REDEEM_CODE);
    const createRedeemable = bucketInstance.methods.createRedeemable(keycard, amount, redeemCodeHash);
    const createRedeemableGas = await createRedeemable.estimateGas();
    await createRedeemable.send({
      from: shop,
      gas: createRedeemableGas,
    });

    let totalSupply = await bucketInstance.methods.totalSupply().call();
    assert.equal(parseInt(totalSupply), parseInt(initialSupply), `totalSupply is ${totalSupply} instead of ${initialSupply}`);

    let availableSupply = await bucketInstance.methods.availableSupply().call();
    assert.equal(parseInt(availableSupply), parseInt(initialAvailableSupply) - amount);
  }

  it("createRedeemable should fail if amount is zero", async function() {
    try {
      await testCreateRedeemable(keycard_1, 0);
      assert.fail("createRedeemable should have failed");
    } catch(e) {
      assert.match(e.message, /invalid amount/);
    }
  });


  it("createRedeemable fails if amount > totalSupply", async function() {
    try {
      await testCreateRedeemable(keycard_1, TOTAL_SUPPLY + 1);
      assert.fail("createRedeemable should have failed");
    } catch(e) {
      assert.match(e.message, /low supply/);
    }
  });

  it("createRedeemable", async function() {
    await testCreateRedeemable(keycard_1, GIFT_AMOUNT);
  });

  it("createRedeemable should fail if keycard has already been used", async function() {
    try {
      await testCreateRedeemable(keycard_1, 1);
      assert.fail("createRedeemable should have failed");
    } catch(e) {
      assert.match(e.message, /recipient already used/);
    }
  });

  it("createRedeemable amount > availableSupply", async function() {
    try {
      await testCreateRedeemable(keycard_2, TOTAL_SUPPLY - GIFT_AMOUNT + 1);
      assert.fail("createRedeemable should have failed");
    } catch(e) {
      assert.match(e.message, /low supply/);
    }
  });

  async function testRedeem(receiver, recipient, signer, relayer, redeemCode, blockNumber, blockHash) {
    let initialBucketBalance = await tokenInstance.methods.balanceOf(bucketInstance.options.address).call();
    let initialUserBalance = await tokenInstance.methods.balanceOf(user).call();
    let initialRedeemableSupply = await bucketInstance.methods.redeemableSupply().call();

    let redeemable = await bucketInstance.methods.redeemables(recipient).call();
    const amount = parseInt(redeemable.data);

    const message = {
      blockNumber: blockNumber,
      blockHash: blockHash,
      receiver: receiver,
      code: redeemCode,
    };

    const sig = await signRedeem(bucketInstance.options.address, signer, message);
    const redeem = bucketInstance.methods.redeem(message, sig);
    const redeemGas = await redeem.estimateGas();
    let receipt = await redeem.send({
      from: relayer,
      gas: redeemGas,
    });

    assert.equal(receipt.events.Redeemed.returnValues.recipient, recipient);
    assert.equal(receipt.events.Redeemed.returnValues.data, redeemable.data);

    let expectedBucketBalance = parseInt(initialBucketBalance) - amount;
    let bucketBalance = await tokenInstance.methods.balanceOf(bucketInstance.options.address).call();
    assert.equal(parseInt(bucketBalance), expectedBucketBalance, `bucketBalance after redeem should be ${expectedBucketBalance} instead of ${bucketBalance}`);

    let expectedUserBalance = parseInt(initialUserBalance + amount);
    userBalance = await tokenInstance.methods.balanceOf(user).call();
    assert.equal(parseInt(userBalance), expectedUserBalance, `user`, `userBalance after redeem should be ${expectedUserBalance} instead of ${userBalance}`);

    let expectedRedeemableSupply = initialRedeemableSupply - amount;
    let redeemableSupply = await bucketInstance.methods.redeemableSupply().call();
    assert.equal(parseInt(redeemableSupply), expectedRedeemableSupply, `redeemableSupply after redeem should be ${expectedRedeemableSupply} instead of ${redeemableSupply}`);
  }

  it("cannot redeem before start date", async function() {
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
      await testRedeem(user, keycard_1, keycard_2, relayer, REDEEM_CODE, block.number, block.hash);
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
    let initialShopBalance = parseInt(await tokenInstance.methods.balanceOf(shop).call());
    let initialBucketBalance = parseInt(await tokenInstance.methods.balanceOf(bucketInstance.options.address).call());

    await bucketInstance.methods.kill().send({
      from: shop,
    });

    let expectedShopBalance = initialShopBalance + initialBucketBalance;
    let shopBalance = await tokenInstance.methods.balanceOf(shop).call();
    assert.equal(parseInt(shopBalance), expectedShopBalance, `shop balance after kill is ${shopBalance} instead of ${expectedShopBalance}`);

    let bucketBalance = await tokenInstance.methods.balanceOf(bucketInstance.options.address).call();
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
    await mineAt(NOW);
  });
});
