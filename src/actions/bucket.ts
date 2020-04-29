import { RootState } from '../reducers';
import ERC20Bucket from '../embarkArtifacts/contracts/ERC20Bucket';
import IERC20Detailed from '../embarkArtifacts/contracts/IERC20Detailed';
import { config } from "../config";
import { Dispatch } from 'redux';

export const ERROR_REDEEMABLE_NOT_FOUND = "ERROR_REDEEMABLE_NOT_FOUND";
export interface ErrRedeemableNotFound {
  type: typeof ERROR_REDEEMABLE_NOT_FOUND
}

export const ERROR_LOADING_REDEEMABLE = "ERROR_LOADING_REDEEMABLE";
export interface ErrLoadingRedeemable {
  type: typeof ERROR_LOADING_REDEEMABLE
  message: string
}

export type BucketErrors =
  ErrRedeemableNotFound |
  ErrLoadingRedeemable;

const errRedeemableNotFound = (): ErrRedeemableNotFound => ({
  type: ERROR_REDEEMABLE_NOT_FOUND,
});

const errLoadingRedeemable = (message: string): ErrLoadingRedeemable => ({
  type: ERROR_LOADING_REDEEMABLE,
  message,
});

export const BUCKET_REDEEMABLE_LOADING = "BUCKET_REDEEMABLE_LOADING";
export interface BucketRedeemableLoadingAction {
  type: typeof BUCKET_REDEEMABLE_LOADING
  address: string
  recipient: string
}

export const BUCKET_REDEEMABLE_LOADING_ERROR = "BUCKET_REDEEMABLE_LOADING_ERROR";
export interface BucketRedeemableLoadingErrorAction {
  type: typeof BUCKET_REDEEMABLE_LOADING_ERROR
  error: ErrLoadingRedeemable
}

export const BUCKET_REDEEMABLE_LOADED = "BUCKET_REDEEMABLE_LOADED";
export interface BucketRedeemableLoadedAction {
  type: typeof BUCKET_REDEEMABLE_LOADED
  expirationTime: number
  recipient: string
  amount: string
  codeHash: string
}

export const BUCKET_REDEEMABLE_NOT_FOUND = "BUCKET_REDEEMABLE_NOT_FOUND";
export interface BucketRedeemableNotFoundAction {
  type: typeof BUCKET_REDEEMABLE_NOT_FOUND
  error: ErrRedeemableNotFound
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
  BucketRedeemableLoadingAction |
  BucketRedeemableLoadingErrorAction |
  BucketRedeemableLoadedAction |
  BucketRedeemableNotFoundAction |
  BucketTokenLoadingAction |
  BucketTokenLoadedAction;

export const loadingRedeemable = (address: string, recipient: string): BucketRedeemableLoadingAction => ({
  type: BUCKET_REDEEMABLE_LOADING,
  address,
  recipient,
});

export const redeemableLoaded = (expirationTime: number, recipient: string, amount: string, codeHash: string): BucketRedeemableLoadedAction => ({
  type: BUCKET_REDEEMABLE_LOADED,
  expirationTime,
  recipient,
  amount,
  codeHash,
});

export const redeemableNotFound = (): BucketRedeemableNotFoundAction => ({
  type: BUCKET_REDEEMABLE_NOT_FOUND,
  error: errRedeemableNotFound(),
});

export const errorLoadingRedeemable = (errorMessage: string): BucketRedeemableLoadingErrorAction => ({
  type: BUCKET_REDEEMABLE_LOADING_ERROR,
  error: errLoadingRedeemable(errorMessage),
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
  const bucketAbi = ERC20Bucket.options.jsonInterface;
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

const newERC20Contract = (address: string) => {
  const erc20Abi = IERC20Detailed.options.jsonInterface;
  const erc20 = new config.web3!.eth.Contract(erc20Abi, address);
  return erc20;
}

export const loadRedeemable = (bucketAddress: string, recipientAddress: string) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(loadingRedeemable(bucketAddress, recipientAddress));
    const bucket = newBucketContract(bucketAddress);
    bucket.methods.expirationTime().call().then((expirationTime: number) => {
      bucket.methods.redeemables(recipientAddress).call().then((result: any) => {
        const { recipient, data, code } = result;
        const amount = data;
        if (amount === "0") {
          dispatch(redeemableNotFound())
          return;
        }

        dispatch(redeemableLoaded(expirationTime, recipient, amount, code));
        dispatch<any>(loadToken(bucket))
      }).catch((err: string) => {
        dispatch(errorLoadingRedeemable(err))
        console.error("err: ", err)
      })
    }).catch((err: string) => {
      dispatch(errorLoadingRedeemable(`error loading expirationTime: ${err}`))
      console.error("err: ", err)
    });
  };
};

//FIXME: set the proper Contract type
export const loadToken = (bucket: any) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.tokenAddress().call().then(async (address: string) => {
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
