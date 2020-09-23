const fs = require('fs');
const path = require('path');

const CONTRACTS_PATH="./client/src/contracts";

module.exports.loadContractFile = (fileName) => {
  let content = fs.readFileSync(path.join(__dirname, "../", CONTRACTS_PATH, `${fileName}.json`), "utf-8");
  return content;
};

module.exports.loadContractCode = (contractName) => {
  const content = this.loadContractFile(contractName);
  const obj = JSON.parse(content);
  return obj.bytecode;
};

module.exports.loadContract = (web3, contractName) => {
  let content = this.loadContractFile(contractName);
  const obj = JSON.parse(content);
  return new web3.eth.Contract(obj.abi);
};
