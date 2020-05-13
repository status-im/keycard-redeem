const express = require('express');
const Web3 = require('web3');
const parseArgs = require('minimist');
const Account = require('./account.js');
const utils = require('./utils.js');


const argv = parseArgs(process.argv.slice(2), {string: ["sender"], default: {"endpoint": "ws://127.0.0.1:8546"}});
const web3 =  new Web3(argv["endpoint"]);
const account = new Account(web3);

const BucketConfig = utils.loadJSON(`./dist/contracts/Bucket.json`);

const app = express();
const port = 3000;

async function redeem(bucket, blockNumber, blockHash, receiver, code, sig) {
  const Bucket = utils.json2Contract(web3, BucketConfig);
  Bucket.transactionConfirmationBlocks = 1;
  Bucket.options.address = bucket;
  let methodCall = Bucket.methods.redeem({blockNumber: blockNumber, blockHash: blockHash, receiver: receiver, code: code}, sig);
  return account.sendMethod(methodCall, Bucket.options.address);
}

async function redeemRequest(req, res) {
  let receipt = redeem(req.body.bucket, req.body.blockNumber, req.body.blockHash, req.body.receiver, req.body.code, req.body.sig);
  res.json({tx: receipt.transactionHash});
}

async function run() {
  await account.init(argv);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.post('/redeem', redeemRequest);
  app.listen(port, () => console.log(`Relayer listening at http://localhost:${port}`));
}

run();