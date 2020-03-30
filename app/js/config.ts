import Web3 from "web3";

export const config = {
  web3: Web3 | undefined
};

export const redeemPath = "/redeem/:bucketAddress/:recipientAddress";
