const fs = require('fs');
const path = require('path');

const CONTRACTS_PATH="./contracts";

module.exports.loadContractFile = (fileName) => {
  let content = fs.readFileSync(path.join(__dirname, CONTRACTS_PATH, fileName), "utf-8");
  return content;
};

module.exports.loadContractCode = (contractName) => {
  return loadContractFile(`${contractName}.bin`);
};

module.exports.loadContract = (web3, contractName) => {
  let content = this.loadContractFile(`${contractName}.abi`);
  let abi = JSON.parse(content);
  return new web3.eth.Contract(abi);
};
