import { sha3 } from "web3-utils";
import BN from "bn.js";
import {
  Token,
  TokenERC20,
} from "./actions/redeemable";
import { AbiItem } from "web3-utils";
import Bucket from './contracts/Bucket.json';
import { config } from "./config";

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
