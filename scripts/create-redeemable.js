#!/usr/bin/env node

const Web3 = require('web3');
const parseArgs = require('minimist');
const fs = require('fs');
const keccak256 = require('js-sha3').keccak256;
const BigNumber = require('bignumber.js');

const argv = parseArgs(process.argv.slice(2), {boolean: ["nft", "deploy-factory", "deploy-bucket"], string: ["sender", "factory", "bucket", "token"], default: {"endpoint": "ws://127.0.0.1:8546", "start-in-days": 0, "validity-days": 365, "max-tx-delay-blocks": 10, "amount-decimals": 18}});

const web3 = new Web3(argv["endpoint"]);

const classPrefix = argv["nft"] ? "NFT" : "ERC20";

const BucketConfig = loadJSON(`./dist/contracts/${classPrefix}Bucket.json`);
const BucketFactoryConfig = loadJSON(`./dist/contracts/${classPrefix}BucketFactory.json`);
const IERC721 = loadJSON(`./dist/contracts/IERC721.json`);
const IERC20Detailed = loadJSON(`./dist/contracts/IERC20Detailed.json`);

const BucketFactory = new web3.eth.Contract(BucketFactoryConfig["abiDefinition"]);
const Bucket = new web3.eth.Contract(BucketConfig["abiDefinition"]);
const ERC721 = new web3.eth.Contract(IERC721["abiDefinition"]);
const ERC20 = new web3.eth.Contract(IERC20Detailed["abiDefinition"]);

function loadJSON(path) {
  let file = fs.readFileSync(path, "utf-8");
  let loadedAsset = JSON.parse(file);
  return loadedAsset;
}

async function getDefaultSender() {
  let accounts = await web3.eth.getAccounts();
  return accounts[0];
}

function loadAccount(account, passfile) {
  let json = fs.readFileSync(account, "utf-8");
  let pass = fs.readFileSync(passfile, "utf-8").split("\n")[0].replace("\r", "");
  return web3.eth.accounts.decrypt(json, pass);
}

async function sendMethod(methodCall, sender, to) {
  let receipt;

  if (typeof(sender) == "string") {
    let gasAmount = await methodCall.estimateGas({from: sender});
    receipt = await methodCall.send({from: sender, gas: gasAmount});
  } else {
    let gasAmount = await methodCall.estimateGas({from: sender.address});
    let data = methodCall.encodeABI();
    let signedTx = await sender.signTransaction({to: to, data: data, gas: gasAmount});
    receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }

  return receipt;
}

async function deployFactory(sender) {
  let code = "0x" + BucketFactoryConfig["code"];
  let methodCall = BucketFactory.deploy({data: code});
  let receipt = await sendMethod(methodCall, sender, null);
  return receipt.contractAddress;
}

async function deployBucket(sender, factory, token, startInDays, validityInDays, maxTxDelayBlocks) {
  let now = Math.round(new Date().getTime() / 1000);
  let startDate = now + (60 * 60 * 24 * startInDays);
  let expirationDate = now + (60 * 60 * 24 * validityInDays);

  BucketFactory.options.address = factory;
  let methodCall = BucketFactory.methods.create(token.toLowerCase(), startDate, expirationDate, maxTxDelayBlocks);

  try {
    let receipt = await sendMethod(methodCall, sender, BucketFactory.options.address);
    return receipt.events.BucketCreated.returnValues.bucket;
  } catch(err) {
    console.error(err);
    return null;
  }
}

async function createRedeemable(sender, keycard) {
  let methodCall = Bucket.methods.createRedeemable(keycard.keycard, keycard.amount, keycard.code);

  try {
    let receipt = await sendMethod(methodCall, sender, Bucket.options.address);
    return receipt;
  } catch(err) {
    console.error(err);
    return null;
  }
}

function createNFTData(keycard, code) {
  return keycard.toLowerCase() + code.replace("0x", "");
}

function senderAddress(sender) {
  if (typeof(sender) == "string") {
    return sender;
  } else {
    return sender.address;
  }
}

async function transferNFT(sender, keycard) {
  let methodCall = ERC721.methods.safeTransferFrom(senderAddress(sender),  Bucket.options.address, keycard.amount, createNFTData(keycard.keycard, keycard.code));

  try {
    let receipt = await sendMethod(methodCall, sender, ERC721.options.address);
    return receipt;
  } catch(err) {
    console.error(err);
    return null;
  }
}

function processCode(code) {
  if (!code.startsWith("0x")) {
    code = "0x" + Buffer.from(code, 'utf8').toString('hex');
  }

  return "0x" + keccak256(code);
}

function processAmount(amount, decimals) {
  if (amount.startsWith("0x")) {
    return amount;
  } else {
    return new BigNumber(amount).multipliedBy(Math.pow(10, decimals)).toString();
  }
}

function processLine(line, decimals) {
  let c = line.split(",").map((e) => e.toLowerCase().trim());
  return {keycard: c[0], amount: processAmount(c[1], decimals), code: processCode(c[2])};
}

async function getToken(token, readIfMissing) {
  return (token || !readIfMissing) ? token : await Bucket.methods.tokenContract().call();
}

async function getDecimals(decimals, readIfMissing) {
  if (decimals) {
    return decimals
  } else if (readIfMissing) {
    return await ERC20.methods.decimals().call();
  } else {
    return 0;
  }
}

async function run() {
  BucketFactory.transactionConfirmationBlocks = 3;
  Bucket.transactionConfirmationBlocks = 3;
  ERC721.transactionConfirmationBlocks = 3;

  let sender;
  let hasDoneSomething = false;

  if (argv["account"]) {
    if (!argv["passfile"]) {
      console.error("the ---passfile option must be specified when using the --account option");
      process.exit(1);
    }

    if (argv["sender"]) {
      console.warn("--account used, --sender will be ignored");
    }

    sender = loadAccount(argv["account"], argv["passfile"]);
  } else {
    sender = argv["sender"] || await getDefaultSender();
  }

  let factory;

  if (argv["deploy-factory"]) {
    factory = await deployFactory(sender);
    hasDoneSomething = true;
    console.log("Factory deployed at: " + factory);
  } else {
    factory = argv["factory"];
  }

  let bucket;

  if (argv["deploy-bucket"]) {
    if (!factory) {
      console.error("the --factory or --deploy-factory option must be specified");
      process.exit(1);
    }

    if (!argv["token"]) {
      console.error("the --token option must be specified");
      process.exit(1);
    }

    if (!argv["validity-days"]) {
      console.error("the --validity-days option must be specified");
      process.exit(1);
    }

    bucket = await deployBucket(sender, factory, argv["token"], argv["start-in-days"], argv["validity-days"], argv["max-tx-delay-blocks"]);
    hasDoneSomething = true;
    console.log("Bucket deployed at: " + bucket);
  } else {
    bucket = argv["bucket"];
  }

  Bucket.options.address = bucket;

  let keycards;

  if (argv["file"]) {
    const token = await getToken(argv["token"], (argv["nft"] || !argv["amount-decimals"]));

    ERC721.options.address = token;
    ERC20.options.address = token;

    const decimals = await getDecimals(argv["amount-decimals"], !argv["nft"]);

    let file = fs.readFileSync(argv["file"], 'utf8');
    keycards = file.split("\n").map((line) => processLine(line, decimals));

    for (let keycard of keycards) {
      await argv["nft"] ? transferNFT(sender, keycard) : createRedeemable(sender, keycard);
    }
  } else if (!hasDoneSomething) {
    console.error("the --file option must be specified");
    process.exit(0);
  }

  process.exit(0);
}

run();
