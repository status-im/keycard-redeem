# Keycard Redeem Utils

## create-redeemable

This script is an easy way to deploy factories, bucket and create redeemables. Redeemables can be created in batches.

### Installation

`yarn install`

### General usage & options

You launch the script with

`node scripts/create-redeemable.js <options>`

General options are

`--endpoint`: the address of the RPC endpoint. The client as an empty origin so make sure to start the Ethereum node as needed. For ws, you can just start it with --wsorigins="*". The default value is ws://127.0.0.1:8546. You can use Infura if desired.

`--sender`: the address signing and sending the transactions. This account will pay for gas. **THIS ACCOUNT MUST BE ALREADY UNLOCKED**. If not specified, accounts[0] is used. Also in this case, the account must be unlocked. Ignored if --account is used.

`--account`: the path to a JSON encoded private key. If this is specified, sender will be ignored. Use this if your endpoint is Infura or similar. You do not need a local node in this case. You also need to specify --passfile. This is option is ***required*** if you are using Infura.

`--passfile`: the path to a file storing the password for the JSON encoded private key. Always used with --account.

`--nft`: passing this option makes the tool work with NFT factory/bucket instead of ERC20 bucket. Conversely, omitting this option assumes ERC20.

### Factory creation options

`--deploy-factory`: Deploys a factory and prints the address on screen. Depending on the `--nft` option either an ERC20BucketFactory or NFTBucketFactory is created.

### Bucket creation options

`--deploy-bucket`: Deploys a bucket and prints the address on screen. If using Infura, the output will not always work, in that case you must use etherscan.io or similar to get the bucket address.

`--factory`: The address of the factory to invoke to create the bucket

`--token`: the ERC20 or NFT token that will be associated to the bucket

`--validity-in-days`: the validity of the bucket in days. Optional. Defaults to 365. After expiry the bucket does not accept redeem requests anymore but can be killed to return the redeemables to the creator.

`--start-in-days`: the number of days after which the created bucket starts accepting redeem requests. Optional. Defaults to 0. Useful to make redeeming available from a specific date onwards.

`--max-tx-delay-blocks`: How many blocks can elapse at maximum between the time the redeem request is signed and the block with the transaction is processed. Optional. Defaults to 10. Does not change if you don't need to

### Redeemable creation options

Before looking at the options, there is a difference between ERC20 and NFT to take into consideration. In case of ERC20, you must first send the total amount of tokens that will be redeemable to the bucket with a simple ERC20 transaction. This is not handled by the tool because it can be done with any wallet.

In case of NFT, the NFT must belong to the owner of the bucket and they will be transferred to the bucket automatically when creating the redeemables.

`--file`: the path to the CSV describing the redeemables to be created. Each lines contains 3 fields separated by comma:
  1. the Keycard address (0x prefixed hexadecimal)
  2. the amount written as decimal (using a dot as separator for decimals) or the token id in case of NFT. If you prefer to write the amount in wei, you can write the field as hexadecimal with 0x prefix.
  3. the redeem code. It can be a 32-byte binary value (encoded as 0x prefixed hexadecimal) or a human readable string.

`--bucket`: the address of the bucket where the redeemable will be created.

`--amount-decimals`: the number of decimals of the ERC20 token. Optional. If not specified, it will be queried from the token contract.

`--token`: the same token used to create the Bucket. Optional. If not specified, it will be queried from the bucket.

## relay

A small HTTP server relaying accepting redeem transactions, signing them and submitting to the network. It allows dApps devs to provide gas abstraction for redeem transactions. The dApp communicates with the relay over a simple HTTP interface. To work it requires the private key to an account owning ETH in order to pay for gas.

### General usage & options

You launch the script with

`node scripts/create-redeemable.js <options>`

The options are

`--endpoint`: the address of the RPC endpoint. The client as an empty origin so make sure to start the Ethereum node as needed. For ws, you can just start it with --wsorigins="*". The default value is ws://127.0.0.1:8546. You can use Infura if desired.

`--sender`: the address signing and sending the transactions. This account will pay for gas. **THIS ACCOUNT MUST BE ALREADY UNLOCKED**. If not specified, accounts[0] is used. Also in this case, the account must be unlocked. Ignored if --account is used.

`--account`: the path to a JSON encoded private key. If this is specified, sender will be ignored. Use this if your endpoint is Infura or similar. You do not need a local node in this case. You also need to specify --passfile. This is option is ***required*** if you are using Infura.

`--passfile`: the path to a file storing the password for the JSON encoded private key. Always used with --account.

### HTTP interface

The http interface is very simple

* `POST /redeem`: signs and forward redeem transactions, paying for the gas. It returns a JSON with a single key `tx` containing the transaction hash. Accepts a JSON containing 3 keys:
  1. `bucket`: the bucket address. If this address is not in the list of allowed recipients the call will fail
  2. `message`: the entire content of the Redeem message
  3. `sig`: the signature generated by Keycard over the message

* `GET /bucket/:address`: returns 200 if the given address in the list of allowed buckets and 404 if it is not.
