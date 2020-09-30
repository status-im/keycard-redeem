const Migrations = artifacts.require("Migrations");
const NFTBucketFactory = artifacts.require("NFTBucketFactory");
const ERC20BucketFactory = artifacts.require("ERC20BucketFactory");
const TestToken = artifacts.require("TestToken");
const TestNFT = artifacts.require("TestNFT");

module.exports = function(deployer, network) {
  deployer.deploy(Migrations);
  deployer.deploy(NFTBucketFactory);
  deployer.deploy(ERC20BucketFactory);

  if (network === "development") {
    deployer.deploy(TestToken, "Dev Test Token", "DTT", 18);
    deployer.deploy(TestNFT);
  }
};
