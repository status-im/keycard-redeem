import { sha3 } from "web3-utils";
import BN from "bn.js";

// keccak256("")
export const KECCAK_EMPTY_STRING  = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
export const KECCAK_EMPTY_STRING2 = sha3(KECCAK_EMPTY_STRING);

export const toBaseUnit = (fullAmount: string, decimalsSize: number, roundDecimals: number) => {
  const amount = new BN(fullAmount);
  const base = new BN(10).pow(new BN(decimalsSize));
  const whole = amount.div(base).toString();
  let decimals = amount.mod(base).toString();
  for (let i = decimals.length; i < decimalsSize; i++) {
    decimals = `0${decimals}`;
  }

  const full = `${whole}.${decimals}`;
  const rounded = `${whole}.${decimals.slice(0, roundDecimals)}`;

  return [full, rounded];
}
