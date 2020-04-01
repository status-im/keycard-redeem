import Web3Utils from "web3-utils";

const BN = Web3Utils.BN;

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
