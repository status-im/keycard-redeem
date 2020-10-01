module.exports.bucketShouldBeOwnable = (bucketType, argsFunc) => {
  it(`deploy an ownable ${bucketType} bucket`, async () => {
    [bucketSpecs, deployer, tokenInstance, args] = argsFunc();
    const contract = new web3.eth.Contract(bucketSpecs.abi);
    const deploy = contract.deploy({
      data: bucketSpecs.bytecode,
      arguments: [tokenInstance.options.address, ...args],
    });
    const gas = await deploy.estimateGas();
    const deployed = await deploy.send({
      from: deployer,
      gas,
    });

    const bucket = new web3.eth.Contract(bucketSpecs.abi, deployed.options.address);
    const owner = await bucket.methods.owner().call();
    assert.equal(owner, deployer);
  });
}

module.exports.factoryShouldCreateAnOwnableBucket = (bucketType, argsFunc) => {
  it(`factory creates an ownable ${bucketType} bucket`, async () => {
    [factorySpecs, bucketSpecs, deployer, tokenInstance, args] = argsFunc();
    const factoryContract = new web3.eth.Contract(factorySpecs.abi);
    const deploy = factoryContract.deploy({
      data: factorySpecs.bytecode,
      arguments: [],
    });
    const deployGas = await deploy.estimateGas();
    const deployed = await deploy.send({
      from: deployer,
      gas: deployGas,
    });

    const factory = new web3.eth.Contract(factorySpecs.abi, deployed.options.address);
    const create = factory.methods.create(tokenInstance.options.address, ...args);
    const createGas = await create.estimateGas();
    const rec = await create.send({
      from: deployer,
      gas: createGas,
    });

    const bucket = new web3.eth.Contract(bucketSpecs.abi, rec.events.BucketCreated.returnValues.bucket);
    const owner = await bucket.methods.owner().call();
    assert.equal(owner, deployer);
  });
}
