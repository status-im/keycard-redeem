import { sha3 } from "web3-utils";
import BN from "bn.js";
import {
  Token,
  TokenERC20,
} from "./actions/redeemable";
import { AbiItem } from "web3-utils";
import Bucket from './contracts/Bucket.json';
import { config } from "./config";
import { recoverTypedSignature } from 'eth-sig-util';
import { Web3Type } from "./actions/web3";

// keccak256("")
export const KECCAK_EMPTY_STRING  = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
export const KECCAK_EMPTY_STRING2 = sha3(KECCAK_EMPTY_STRING);

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const toBaseUnit = (fullAmount: string, decimalsSize: number, roundDecimals: number) => {
  const amount = new BN(fullAmount);
  const base = new BN(10).pow(new BN(decimalsSize));
  const whole = amount.div(base).toString();
  let decimals = amount.mod(base).toString();
  for (let i = decimals.length; i < decimalsSize; i++) {
    decimals = `0${decimals}`;
  }

  return `${whole}.${decimals.slice(0, roundDecimals)}`;
}

export const isTokenERC20 = (token: Token): token is TokenERC20 => {
  return (token as TokenERC20).decimals !== undefined;
}

export const compressAddress = (a: string, padding: number = 4) => {
  return `${a.slice(0, padding + 2)}...${a.slice(a.length - padding)}`;
}

export const newBucketContract = (address: string) => {
  const bucketAbi = Bucket.abi as AbiItem[];
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

export interface SignRedeemResponse {
  sig: string
  signer: string
}

export const signTypedDataWithKeycard = (data: any): Promise<SignRedeemResponse> => {
  return new Promise((resolve, reject) => {
    (window as any).ethereum.request({
      method: "keycard_signTypedData",
      params: JSON.stringify(data)
    }).then((sig: any) => {
      const signer = recoverTypedSignature({
        data,
        sig
      });
      resolve({ sig, signer });
    }).catch((err: string) => {
      alert("err")
      reject(err);
    })
  });
}

export const signTypedDataWithWeb3 = (signer: string, data: any): Promise<SignRedeemResponse> => {
  return new Promise((resolve, reject) => {
    (window as any).ethereum.sendAsync({
      method: "eth_signTypedData_v3",
      params: [signer, JSON.stringify(data)],
      from: signer,
    }, (err: string, resp: any) => {
      if (err) {
        reject(err);
      } else {
        const sig = resp.result;
        const signer = recoverTypedSignature({
          data,
          sig
        });

        resolve({ sig, signer });
      }
    })
  });
}

//FIXME: use a proper message for authentication instead of KeycardERC20Bucket
export const signTypedLogin = async (chainID: number, signer: string, web3Type: Web3Type): Promise<SignRedeemResponse> => {
  const message = {
    blockNumber: 1,
    blockHash: "0x0000000000000000000000000000000000000000",
    code: "0x0000000000000000000000000000000000000000",
    receiver: signer,
  }

  const domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ];

  const redeem = [
    { name: "blockNumber", type: "uint256" },
    { name: "blockHash", type: "bytes32" },
    { name: "receiver", type: "address" },
    { name: "code", type: "bytes32" },
  ];

  const domainData = {
    name: "KeycardERC20Bucket",
    version: "1",
    chainId: chainID,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  };

  const data = {
    types: {
      EIP712Domain: domain,
      Redeem: redeem,
    },
    primaryType: "Redeem",
    domain: domainData,
    message: message
  };

  if (web3Type === Web3Type.Status) {
    return signTypedDataWithKeycard(data);
  } else {
    return signTypedDataWithWeb3(signer, data);
  }
}
