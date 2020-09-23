const Migrations = artifacts.require("Migrations");
const NFTBucketFactory = artifacts.require("NFTBucketFactory");
const ERC20BucketFactory = artifacts.require("ERC20BucketFactory");
const TestToken = artifacts.require("TestToken");

module.exports = function(deployer, network) {
  deployer.deploy(Migrations);
  deployer.deploy(NFTBucketFactory);
  deployer.deploy(ERC20BucketFactory);

  if (network === "development") {
    deployer.deploy(TestToken, "TEST", 18);
  }
};
