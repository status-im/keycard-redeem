import { RootState } from '../reducers';
import GiftBucket from '../../../embarkArtifacts/contracts/GiftBucket';
import IERC20Detailed from '../../../embarkArtifacts/contracts/IERC20Detailed';
import { config } from "../config";
import { Contract } from 'web3-eth-contract';
import { Dispatch } from 'redux';

export const ERROR_GIFT_NOT_FOUND = "ERROR_GIFT_NOT_FOUND";
export interface ErrGiftNotFound {
  type: typeof ERROR_GIFT_NOT_FOUND
}

export const ERROR_LOADING_GIFT = "ERROR_LOADING_GIFT";
export interface ErrLoadingGift {
  type: typeof ERROR_LOADING_GIFT
  message: string
}

export type BucketErrors =
  ErrGiftNotFound |
  ErrLoadingGift;

const errGiftNotFound = (): ErrGiftNotFound => ({
  type: ERROR_GIFT_NOT_FOUND,
});

const errLoadingGift = (message: string): ErrLoadingGift => ({
  type: ERROR_LOADING_GIFT,
  message,
});

export const BUCKET_GIFT_LOADING = "BUCKET_GIFT_LOADING";
export interface BucketGiftLoadingAction {
  type: typeof BUCKET_GIFT_LOADING
  address: string
  recipient: string
}

export const BUCKET_GIFT_LOADING_ERROR = "BUCKET_GIFT_LOADING_ERROR";
export interface BucketGiftLoadingErrorAction {
  type: typeof BUCKET_GIFT_LOADING_ERROR
  error: ErrLoadingGift
}

export const BUCKET_GIFT_LOADED = "BUCKET_GIFT_LOADED";
export interface BucketGiftLoadedAction {
  type: typeof BUCKET_GIFT_LOADED
  expirationTime: number
  recipient: string
  amount: string
  codeHash: string
}

export const BUCKET_GIFT_NOT_FOUND = "BUCKET_GIFT_NOT_FOUND";
export interface BucketGiftNotFoundAction {
  type: typeof BUCKET_GIFT_NOT_FOUND
  error: ErrGiftNotFound
}

export const BUCKET_TOKEN_LOADING = "BUCKET_TOKEN_LOADING";
export interface BucketTokenLoadingAction {
  type: typeof BUCKET_TOKEN_LOADING
  address: string
}

export const BUCKET_TOKEN_LOADED = "BUCKET_TOKEN_LOADED";
export interface BucketTokenLoadedAction {
  type: typeof BUCKET_TOKEN_LOADED
  symbol: string
  decimals: number
}

export type BucketActions =
  BucketGiftLoadingAction |
  BucketGiftLoadingErrorAction |
  BucketGiftLoadedAction |
  BucketGiftNotFoundAction |
  BucketTokenLoadingAction |
  BucketTokenLoadedAction;

export const loadingGift = (address: string, recipient: string): BucketGiftLoadingAction => ({
  type: BUCKET_GIFT_LOADING,
  address,
  recipient,
});

export const giftLoaded = (expirationTime: number, recipient: string, amount: string, codeHash: string): BucketGiftLoadedAction => ({
  type: BUCKET_GIFT_LOADED,
  expirationTime,
  recipient,
  amount,
  codeHash,
});

export const giftNotFound = (): BucketGiftNotFoundAction => ({
  type: BUCKET_GIFT_NOT_FOUND,
  error: errGiftNotFound(),
});

export const errorLoadingGift = (errorMessage: string): BucketGiftLoadingErrorAction => ({
  type: BUCKET_GIFT_LOADING_ERROR,
  error: errLoadingGift(errorMessage),
});

export const loadingToken = (address: string): BucketTokenLoadingAction => ({
  type: BUCKET_TOKEN_LOADING,
  address,
});

export const tokenLoaded = (symbol: string, decimals: number): BucketTokenLoadedAction => ({
  type: BUCKET_TOKEN_LOADED,
  symbol,
  decimals,
});

export const newBucketContract = (address: string) => {
  const bucketAbi = GiftBucket.options.jsonInterface;
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

const newERC20Contract = (address: string) => {
  const erc20Abi = IERC20Detailed.options.jsonInterface;
  const erc20 = new config.web3!.eth.Contract(erc20Abi, address);
  return erc20;
}

export const loadGift = (bucketAddress: string, recipientAddress: string) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(loadingGift(bucketAddress, recipientAddress));
    const bucket = newBucketContract(bucketAddress);
    const expirationTime = await bucket.methods.expirationTime().call();
    bucket.methods.gifts(recipientAddress).call().then((result: any) => {
      const { recipient, amount, code } = result;
      if (amount === "0") {
        dispatch(giftNotFound())
        return;
      }

      dispatch(giftLoaded(expirationTime, recipient, amount, code));
      dispatch<any>(loadToken(bucket))
    }).catch(err => {
      dispatch(errorLoadingGift(err))
      console.error("err: ", err)
    })
  };
};

export const loadToken = (bucket: Contract) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.tokenContract().call().then(async (address: string) => {
      const erc20Abi = IERC20Detailed.options.jsonInterface;
      const erc20 = new config.web3!.eth.Contract(erc20Abi, address);
      dispatch(loadingToken(address));

      const symbol = await erc20.methods.symbol().call();
      const decimals = await erc20.methods.decimals().call();
      dispatch(tokenLoaded(symbol, decimals));
    }).catch((err: string) => {
      //FIXME: manage error
      console.error("ERROR: ", err);
    })
  }
}
