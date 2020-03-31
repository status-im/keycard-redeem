import Web3 from "web3";

export interface Config {
  web3: Web3 | undefined
}

export const config: Config = {
  web3: undefined
};

export const redeemPath = "/redeem/:bucketAddress/:recipientAddress";
