const fs = require('fs');

module.exports.loadJSON = function(path) {
  let file = fs.readFileSync(path, "utf-8");
  let loadedAsset = JSON.parse(file);
  return loadedAsset;
}

module.exports.loadContract = function(web3, path) {
  let config = this.loadJSON(path);
  return new web3.eth.Contract(config["abiDefinition"]);
}