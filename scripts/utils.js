const fs = require('fs');

module.exports.loadJSON = (path) => {
  let file = fs.readFileSync(path, "utf-8");
  let loadedAsset = JSON.parse(file);
  return loadedAsset;
};

module.exports.json2Contract = (web3, config) => {
  return new web3.eth.Contract(config["abiDefinition"]);
};

module.exports.loadContract = (web3, path) => {
  let config = this.loadJSON(path);
  return this.json2Contract(web3, config);
};