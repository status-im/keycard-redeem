const express = require('express');
const Web3 = require('web3');
const parseArgs = require('minimist');
const Account = require('./account.js');
const utils = require('./utils.js');
const fs = require('fs');
const morgan = require("morgan");

const argv = parseArgs(process.argv.slice(2), {string: ["sender", "bucket"], default: {"endpoint": "ws://127.0.0.1:8546"}});
const web3 =  new Web3(argv["endpoint"]);
const account = new Account(web3);

const Bucket = utils.loadContract(web3, "Bucket");

const port = process.env.PORT || 3000;
const app = express();
app.use(morgan('combined'))

async function redeem(bucket, message, sig) {
  Bucket.transactionConfirmationBlocks = 1;
  Bucket.options.address = bucket;
  let methodCall = Bucket.methods.redeem(message, sig);
  return account.sendMethod(methodCall, Bucket.options.address);
}

function validateAddress(addr) {
  return addr != null && addr.startsWith("0x") && addr.length == 42;
}

function validate32Bytes(data) {
  return data != null && data.startsWith("0x") && data.length == 66;
}

function validateNumber(num) {
  return !isNaN(parseInt(num));
}

async function validateBucket(bucket) {
  Bucket.options.address = bucket;
  const owner = await Bucket.methods.owner().call();
  return account.address() === owner;
}

async function validateRequest(body) {
  if (!validateAddress(body.bucket)) {
    return "invalid bucket address";
  } else if (!await validateBucket(body.bucket)) {
    return "invalid bucket owner";
  } else if (body.message === undefined) {
    return "message must be specified";
  } else if (!validateNumber(body.message.blockNumber)) {
    return "invalid block number";
  } else if (!validate32Bytes(body.message.blockHash)) {
    return "invalid block hash";
  } else if (!validateAddress(body.message.receiver)) {
    return "invalid receiver address";
  } else if (!validate32Bytes(body.message.code)) {
    return "invalid code";
  } else {
    return null;
  }
}

async function redeemOptions(req, res) {
  res.append("Access-Control-Allow-Origin", ["*"]);
  res.append("Access-Control-Allow-Headers", ["*"]);
  res.json({message: "ok"})
}

async function redeemRequest(req, res) {
  res.append("Access-Control-Allow-Origin", ["*"]);
  res.append("Access-Control-Allow-Headers", ["*"]);

  let err = await validateRequest(req.body);
  if (err) {
    res.status(400).json({error: err});
  }

  try {
    let receipt = await redeem(req.body.bucket, req.body.message, req.body.sig);
    res.json({tx: receipt.transactionHash});
  } catch(e) {
    console.error(e)
    res.status(500).json({error: "Couldn't send tx"});
  }
}

async function run() {
  await account.init(argv);

  app.use(express.json());
  app.post('/redeem', redeemRequest);
  app.options('/redeem', redeemOptions);
  app.listen(port, () => console.log(`Relayer listening at http://localhost:${port}`));
}

run();
