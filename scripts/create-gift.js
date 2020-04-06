#!/usr/bin/env node

import Web3 from 'web3';
import parseArgs from 'minimist';
import fs from 'fs';

const argv = parseArgs(process.argv.slice(2), {boolean: ["deploy-factory", "deploy-bucket"], string: ["sender", "factory", "bucket", "token"], default: {"endpoint": "ws://127.0.0.1:8546", "validity-days": 365}});

const web3 = new Web3(argv["endpoint"]);

const GiftBucketConfig = loadEmbarkArtifact('./embarkArtifacts/contracts/GiftBucket.js');
const GiftBucketFactoryConfig = loadEmbarkArtifact('./embarkArtifacts/contracts/GiftBucketFactory.js');

const GiftBucketFactory = new web3.eth.Contract(GiftBucketFactoryConfig["abiDefinition"]);
const GiftBucket = new web3.eth.Contract(GiftBucketConfig["abiDefinition"]);

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
    let code = "0x" + GiftBucketFactoryConfig["code"];
    let methodCall = GiftBucketFactory.deploy({data: code});
    let receipt = await sendMethod(methodCall, sender, null);
    return receipt.contractAddress;
}

async function deployBucket(sender, factory, token, validityInDays) {
    let now = Math.round(new Date().getTime() / 1000);
    let expirationDate = now + (60 * 60 * 24 * validityInDays); 

    GiftBucketFactory.options.address = factory;
    let methodCall = GiftBucketFactory.methods.create(token.toLowerCase(), expirationDate);

    try {
        let receipt = await sendMethod(methodCall, sender, GiftBucketFactory.options.address);
        return receipt.events.BucketCreated.returnValues.bucket;
    } catch(err) {
        console.error(err);
        return null;
    }
}

async function createGift(sender, bucket, keycard) {
    GiftBucket.options.address = bucket;
    let methodCall = GiftBucket.methods.createGift(keycard.keycard, keycard.amount, keycard.code);

    try {
        let receipt = await sendMethod(methodCall, sender, GiftBucket.options.address);
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
    GiftBucketFactory.transactionConfirmationBlocks = 3;
    GiftBucket.transactionConfirmationBlocks = 3;

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

        bucket = await deployBucket(sender, factory, argv["token"], argv["validity-days"]);
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
            await createGift(sender, bucket, keycard)
        }
    } else if (!hasDoneSomething) {
        console.error("the --file option must be specified");
        process.exit(0);
    }

    process.exit(0);
}

run();