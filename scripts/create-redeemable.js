#!/usr/bin/env node

import Web3 from 'web3';
import parseArgs from 'minimist';
import fs from 'fs';

const argv = parseArgs(process.argv.slice(2), {boolean: ["nft", "deploy-factory", "deploy-bucket"], string: ["sender", "factory", "bucket", "token"], default: {"endpoint": "ws://127.0.0.1:8546", "start-in-days": 0, "validity-days": 365, "max-tx-delay-blocks": 10}});

const web3 = new Web3(argv["endpoint"]);

const classPrefix = argv["nft"] ? "NFT" : "ERC20";

const BucketConfig = loadEmbarkArtifact(`./src/embarkArtifacts/contracts/${classPrefix}Bucket.js`);
const BucketFactoryConfig = loadEmbarkArtifact(`./src/embarkArtifacts/contracts/${classPrefix}BucketFactory.js`);
const IERC721 = loadEmbarkArtifact(`./src/embarkArtifacts/contracts/IERC721.js`);

const BucketFactory = new web3.eth.Contract(BucketFactoryConfig["abiDefinition"]);
const Bucket = new web3.eth.Contract(BucketConfig["abiDefinition"]);
const ERC721 = new web3.eth.Contract(IERC721["abiDefinition"]);

function loadEmbarkArtifact(path) {
    let file = fs.readFileSync(path, "utf-8");
    let json = file.replace(/import.*/, "").replace(/.*EmbarkJS.Blockchain.*/, "").replace(/export default.*/, "").replace(/const[^=]*= /, "").replace(/;/, "").trim();
    let loadedAsset = JSON.parse(json);
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

async function createRedeemable(sender, bucket, keycard) {
    Bucket.options.address = bucket;
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

async function transferNFT(sender, token, bucket, keycard) {
    Bucket.options.address = bucket;
    ERC721.options.address = token ? token : await Bucket.methods.tokenContract().call();

    let methodCall = ERC721.methods.safeTransferFrom(senderAddress(sender), bucket, keycard.amount, createNFTData(keycard.keycard, keycard.code));

    try {
        let receipt = await sendMethod(methodCall, sender, ERC721.options.address);
        return receipt;
    } catch(err) {
        console.error(err);
        return null;
    }
}

function processLine(line) {
    let c = line.split(",").map((e) => e.toLowerCase().trim());
    return {keycard: c[0], amount: parseInt(c[1]), code: c[2]};
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

    let keycards;

    if (argv["file"]) {
        let file = fs.readFileSync(argv["file"], 'utf8');
        keycards = file.split("\n").map(processLine);
        for (let keycard of keycards) {
            await argv["nft"] ? createRedeemable(sender, bucket, keycard) : transferNFT(sender, argv["token"], bucket, keycard);
        }
    } else if (!hasDoneSomething) {
        console.error("the --file option must be specified");
        process.exit(0);
    }

    process.exit(0);
}

run();
