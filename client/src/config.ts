import Web3 from "web3";

export interface Config {
  web3: Web3 | undefined
}

export const config: Config = {
  web3: undefined
};

export const recipientBucketsPath = "/recipients/:recipientAddress/buckets";
export const redeemablePath = "/buckets/:bucketAddress/redeemables/:recipientAddress";

export const buildRecipientBucketsPath = (recipientAddress: string) => {
  return `/recipients/${recipientAddress}/buckets`;
}

export const buildRedeemablePath = (bucketAddress: string, recipientAddress: string) => {
  return `/buckets/${bucketAddress}/redeemables/${recipientAddress}`;
}

export const bucketsAddresses = (): Array<string> => {
  const s = process.env.REACT_APP_BUCKETS;
  if (s === undefined) {
    return [];
  }

  return s.split(",").map((a) => a.trim());
}
