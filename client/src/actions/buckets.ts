import { RootState } from '../reducers';
import { Dispatch } from 'redux';
import { bucketsAddresses } from "../config";
import { newBucketContract } from "../utils";
import { TokenType } from "../reducers/buckets";
import IERC20Detailed from '../contracts/IERC20Detailed.json';
import { AbiItem } from "web3-utils";
import { config } from "../config";
import { TokenDetails, ERC20Details } from "../reducers/buckets";
import { debug } from "./debug";

export const BUCKETS_LOADING = "BUCKETS_LOADING";
export interface BucketsLoadingAction {
  type: typeof BUCKETS_LOADING
  recipientAddress: string
}

export const BUCKETS_UNLOADED = "BUCKETS_UNLOADED";
export interface BucketsUnloadedAction {
  type: typeof BUCKETS_UNLOADED
  recipientAddress: string
}

export const BUCKETS_LOADING_BUCKET = "BUCKETS_LOADING_BUCKET";
export interface BucketsLoadingBucketAction {
  type: typeof BUCKETS_LOADING_BUCKET
  recipientAddress: string
  bucketAddress: string
}

export const BUCKETS_REDEEMABLE_TOKEN_ADDRESS_LOADED = "BUCKETS_REDEEMABLE_TOKEN_ADDRESS_LOADED";
export interface BucketsRedeemableTokenAddressLoadedAction {
  type: typeof BUCKETS_REDEEMABLE_TOKEN_ADDRESS_LOADED
  recipientAddress: string
  bucketAddress: string
  tokenAddress: string
}

export const BUCKETS_REDEEMABLE_TOKEN_TYPE_LOADED = "BUCKETS_REDEEMABLE_TOKEN_TYPE_LOADED";
export interface BucketsRedeemableTokenTypeLoadedAction {
  type: typeof BUCKETS_REDEEMABLE_TOKEN_TYPE_LOADED
  recipientAddress: string
  bucketAddress: string
  tokenType: TokenType
}

export const BUCKETS_REDEEMABLE_TOKEN_DETAILS_LOADED = "BUCKETS_REDEEMABLE_TOKEN_DETAILS_LOADED";
export interface BucketsRedeemableTokenDetailsLoadedAction {
  type: typeof BUCKETS_REDEEMABLE_TOKEN_DETAILS_LOADED
  recipientAddress: string
  bucketAddress: string
  tokenDetails: TokenDetails
}

export type BucketsActions =
  BucketsLoadingAction |
  BucketsUnloadedAction |
  BucketsLoadingBucketAction |
  BucketsRedeemableTokenAddressLoadedAction |
  BucketsRedeemableTokenTypeLoadedAction |
  BucketsRedeemableTokenDetailsLoadedAction;

export const loadingBuckets = (recipientAddress: string): BucketsLoadingAction => ({
  type: BUCKETS_LOADING,
  recipientAddress,
});

export const unloadBuckets = (recipientAddress: string): BucketsUnloadedAction => ({
  type: BUCKETS_UNLOADED,
  recipientAddress,
});

export const loadingBucket = (recipientAddress: string, bucketAddress: string): BucketsLoadingBucketAction => ({
  type: BUCKETS_LOADING_BUCKET,
  recipientAddress,
  bucketAddress,
});

export const tokenAddressLoaded = (recipientAddress: string, bucketAddress: string, tokenAddress: string): BucketsRedeemableTokenAddressLoadedAction => ({
  type: BUCKETS_REDEEMABLE_TOKEN_ADDRESS_LOADED,
  recipientAddress,
  bucketAddress,
  tokenAddress,
});

export const tokenTypeLoaded = (recipientAddress: string, bucketAddress: string, tokenType: TokenType): BucketsRedeemableTokenTypeLoadedAction => ({
  type: BUCKETS_REDEEMABLE_TOKEN_TYPE_LOADED,
  recipientAddress,
  bucketAddress,
  tokenType,
});

export const tokenDetailsLoaded = (recipientAddress: string, bucketAddress: string, tokenDetails: TokenDetails): BucketsRedeemableTokenDetailsLoadedAction => ({
  type: BUCKETS_REDEEMABLE_TOKEN_DETAILS_LOADED,
  recipientAddress,
  bucketAddress,
  tokenDetails,
});

export const loadBuckets = (recipientAddress: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(loadingBuckets(recipientAddress));

    const addresses = bucketsAddresses();
    addresses.forEach((bucketAddress) => {
      dispatch<any>(loadBucket(recipientAddress, bucketAddress));
    });
  }
}

const loadBucket = (recipientAddress: string, bucketAddress: string) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(loadingBucket(recipientAddress, bucketAddress));
    const bucket = newBucketContract(bucketAddress);

    const _type = await bucket.methods.bucketType().call();
    const type = _type === "20" ? "erc20" : "ntf";
    dispatch(tokenTypeLoaded(recipientAddress, bucketAddress, type as TokenType));

    const tokenAddress = await bucket.methods.tokenAddress().call();
    dispatch(tokenAddressLoaded(recipientAddress, bucketAddress, tokenAddress));

    try {
      const tokenDetails = await loadERC20Token(tokenAddress);
      dispatch(tokenDetailsLoaded(recipientAddress, bucketAddress, tokenDetails));
    } catch (e) {
      dispatch(debug(`error loading token details (${tokenAddress}) ${e}`));
      //FIXME: dispatch error
    }
  }
}

const loadERC20Token = (address: string): Promise<ERC20Details> => {
  return new Promise(async (resolve, reject) => {
    const erc20Abi = IERC20Detailed.abi as AbiItem[];
    const erc20 = new config.web3!.eth.Contract(erc20Abi, address);
    try {
      const name = await erc20.methods.name().call();
      const symbol = await erc20.methods.symbol().call();
      const decimals = parseInt(await erc20.methods.decimals().call());
      resolve({
        name,
        symbol,
        decimals,
      });
    } catch(e) {
      reject(e);
    }
  });
}
