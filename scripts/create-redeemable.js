#!/usr/bin/env node

const Web3 = require('web3');
const parseArgs = require('minimist');
const fs = require('fs');
const utils = require('./utils.js');
const keccak256 = require('js-sha3').keccak256;
const BigNumber = require('bignumber.js');
const Account = require('./account.js');

const argv = parseArgs(process.argv.slice(2), {boolean: ["nft", "deploy-factory", "deploy-bucket"], string: ["sender", "factory", "bucket", "token"], default: {"endpoint": "ws://127.0.0.1:8546", "start-in-days": 0, "validity-days": 365, "max-tx-delay-blocks": 10}});

const web3 = new Web3(argv["endpoint"]);
const account = new Account(web3);

const classPrefix = argv["nft"] ? "NFT" : "ERC20";

const BucketFactoryCode = utils.loadContractCode(`${classPrefix}BucketFactory`);
const BucketFactory = utils.loadContract(web3, `${classPrefix}BucketFactory`);
const Bucket = utils.loadContract(web3, `${classPrefix}Bucket`);
const ERC721 = utils.loadContract(web3, "IERC721");
const ERC20  = utils.loadContract(web3, "IERC20Detailed");

const KECCAK_EMPTY_STRING  = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
const KECCAK_EMPTY_STRING2 = web3.utils.sha3(KECCAK_EMPTY_STRING);

async function deployFactory() {
  let methodCall = BucketFactory.deploy({data: BucketFactoryCode});
  let receipt = await account.sendMethod(methodCall, null);
  return receipt.contractAddress;
}

async function deployBucket(factory, token, startInDays, validityInDays, maxTxDelayBlocks) {
  let now = Math.round(new Date().getTime() / 1000);
  let startDate = now + (60 * 60 * 24 * startInDays);
  let expirationDate = now + (60 * 60 * 24 * validityInDays);

  BucketFactory.options.address = factory;
  let methodCall = BucketFactory.methods.create(token.toLowerCase(), startDate, expirationDate, maxTxDelayBlocks);

  try {
    let receipt = await account.sendMethod(methodCall, BucketFactory.options.address);
    let bucketAddress = receipt.logs[0].topics[2].slice(26);
    return `0x${bucketAddress}`;
  } catch(err) {
    console.error(err);
    return null;
  }
}

async function createRedeemable(keycard) {
  console.log("creating redeemable", keycard.keycard, keycard.amount)
  let methodCall = Bucket.methods.createRedeemable(keycard.keycard, keycard.amount, keycard.code);

  try {
    let receipt = await account.sendMethod(methodCall, Bucket.options.address);
    return receipt;
  } catch(err) {
    console.error(err);
    return null;
  }
}

function createNFTData(keycard, code) {
  return keycard.toLowerCase() + code.replace("0x", "");
}

async function transferNFT(keycard) {
  let methodCall = ERC721.methods.safeTransferFrom(account.senderAddress(),  Bucket.options.address, keycard.amount, createNFTData(keycard.keycard, keycard.code));

  try {
    let receipt = await account.sendMethod(methodCall, ERC721.options.address);
    return receipt;
  } catch(err) {
    console.error(err);
    return null;
  }
}

function processCode(code) {
  if (code === "" || code === undefined) {
    return KECCAK_EMPTY_STRING2;
  }

  if (!code.startsWith("0x")) {
    code = "0x" + Buffer.from(code, 'utf8').toString('hex');
  }

  return "0x" + web3.utils.sha3(code);
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
  return (token || !readIfMissing) ? token : await Bucket.methods.tokenAddress().call();
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

  let hasDoneSomething = false;

  await account.init(argv);

  let factory;

  if (argv["deploy-factory"]) {
    factory = await deployFactory();
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

    bucket = await deployBucket(factory, argv["token"], argv["start-in-days"], argv["validity-days"], argv["max-tx-delay-blocks"]);

    if (argv["relayer-uri"] !== undefined && argv["relayer-uri"] !== "") {
      const uri = argv["relayer-uri"];
      Bucket.options.address = bucket;
      console.log("setting relayer URI to ", uri);
      let setRelayerURI = Bucket.methods.setRelayerURI(uri);
      await account.sendMethod(setRelayerURI, bucket);
    }

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
    keycards = file
                .split("\n")
                .filter(line => line.trim() !== "" && !/^#/.test(line.trim()))
                .map((line) => processLine(line, decimals));

    for (let keycard of keycards) {
      const create = argv["nft"] ? transferNFT : createRedeemable;
      await create(keycard);
      console.log(`http://localhost:3000/redeem/#/buckets/${bucket}/redeemables/${keycard.keycard}`)
    }
  } else if (!hasDoneSomething) {
    console.error("the --file option must be specified");
    process.exit(0);
  }

  process.exit(0);
}

run();
