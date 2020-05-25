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

const BucketConfig = utils.loadJSON(`./dist/contracts/Bucket.json`);

const port = process.env.PORT || 3000;
const app = express();
app.use(morgan('combined'))

let allowedBuckets = [];

async function redeem(message, sig) {
  const Bucket = utils.json2Contract(web3, BucketConfig);
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

function validateBucket(bucket) {
  return allowedBuckets.includes(bucket.toLowerCase());
}

function validateRequest(body) {
  if (!validateAddress(body.bucket)) {
    return "invalid bucket address";
  } else if (!validateBucket(body.bucket)) {
    return "cannot send to this bucket";
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

  let err = validateRequest(req.body);
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

function bucketRequest(req, res) {
  if (validateBucket(req.params.address)) {
    res.status(200).json({"allowed": true});
  } else {
    res.status(404).json({"allowed": false});
  }
}

function loadBucketList(path) {
  let file = fs.readFileSync(path, 'utf8');
  allowedBuckets = file.split("\n").map((line) => line.toLowerCase().trim());
}

function checkBuckets() {
  allowedBuckets = allowedBuckets.filter((line) => {
    if (validateAddress(line)) {
      return true;
    } else {
      console.warn(`${line} is an invalid bucket address, ignored`);
      return false;
    }
  });

  if (allowedBuckets.length == 0) {
    console.error("no valid buckets, exiting");
    process.exit(1);
  }
}

async function run() {
  if (argv["bucket-list"]) {
    loadBucketList(argv["bucket-list"]);
  } else if (argv["bucket"]) {
    allowedBuckets = [argv["bucket"].toLowerCase()];
  } else {
    console.error("the either the --bucket or --bucket-list option must be specified");
    process.exit(1);
  }

  checkBuckets();

  await account.init(argv);

  app.use(express.json());
  app.post('/redeem', redeemRequest);
  app.options('/redeem', redeemOptions);
  app.get('/bucket/:address', bucketRequest);
  app.listen(port, () => console.log(`Relayer listening at http://localhost:${port}`));
}

run();
