import { RootState } from '../reducers';
import ERC20Bucket from '../embarkArtifacts/contracts/ERC20Bucket';
import Bucket from '../embarkArtifacts/contracts/Bucket';
import IERC20Detailed from '../embarkArtifacts/contracts/IERC20Detailed';
import IERC721Metadata from '../embarkArtifacts/contracts/IERC721Metadata';
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

export interface TokenERC20 {
  symbol: string
  decimals: number
}

export interface TokenNFTMetadata {
  name: string
  description: string
  image: string
}

export interface TokenNFT {
  symbol: string
  tokenURI: string
  metadata: TokenNFTMetadata | undefined
}

export type Token = TokenERC20 | TokenNFT;

export const BUCKET_TOKEN_LOADED = "BUCKET_TOKEN_LOADED";
export interface BucketTokenLoadedAction {
  type: typeof BUCKET_TOKEN_LOADED
  token: Token,
}

export const BUCKET_TOKEN_METADATA_LOADING = "BUCKET_TOKEN_METADATA_LOADING";
export interface BucketTokenMetadataLoadingAction {
  type: typeof BUCKET_TOKEN_METADATA_LOADING
  tokenAddress: string
  recipient: string
}

export const BUCKET_TOKEN_METADATA_LOADED = "BUCKET_TOKEN_METADATA_LOADED";
export interface BucketTokenMetadataLoadedAction {
  type: typeof BUCKET_TOKEN_METADATA_LOADED
  tokenAddress: string
  recipient: string
  metadata: TokenNFTMetadata
}

export type BucketActions =
  BucketRedeemableLoadingAction |
  BucketRedeemableLoadingErrorAction |
  BucketRedeemableLoadedAction |
  BucketRedeemableNotFoundAction |
  BucketTokenLoadingAction |
  BucketTokenLoadedAction |
  BucketTokenMetadataLoadingAction |
  BucketTokenMetadataLoadedAction;

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

export const tokenLoaded = (token: Token): BucketTokenLoadedAction => ({
  type: BUCKET_TOKEN_LOADED,
  token,
});

export const loadingTokenMetadata = (tokenAddress: string, recipient: string): BucketTokenMetadataLoadingAction => ({
  type: BUCKET_TOKEN_METADATA_LOADING,
  tokenAddress,
  recipient,
});

export const tokenMetadataLoaded = (tokenAddress: string, recipient: string, metadata: TokenNFTMetadata): BucketTokenMetadataLoadedAction => ({
  type: BUCKET_TOKEN_METADATA_LOADED,
  tokenAddress,
  recipient,
  metadata,
});

export const newBucketContract = (address: string) => {
  const bucketAbi = Bucket.options.jsonInterface;
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

export const newERC20BucketContract = (address: string) => {
  const bucketAbi = ERC20Bucket.options.jsonInterface;
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

export const loadRedeemable = (bucketAddress: string, recipientAddress: string) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(loadingRedeemable(bucketAddress, recipientAddress));
    const bucket = newBucketContract(bucketAddress);
    bucket.methods.expirationTime().call().then((expirationTime: number) => {
      bucket.methods.redeemables(recipientAddress).call().then((result: any) => {
        const { recipient, data, code } = result;
        if (data === "0") {
          dispatch(redeemableNotFound())
          return;
        }

        dispatch(redeemableLoaded(expirationTime, recipient, data, code));
        dispatch<any>(loadToken(bucket, data, recipient))
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
export const loadToken = (bucket: any, data: string, recipient: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.bucketType().call().then((type: string) => {
      switch (type) {
        case "20":
          dispatch<any>(loadERC20Token(bucket, data, recipient));
          break;
        case "721":
          dispatch<any>(loadNFTToken(bucket, data, recipient));
          break;
        default:
          //FIXME: manage error
          console.error("unknown bucket type ", type);
      }
    }).catch((err: string) => {
      //FIXME: manage error
      console.error("ERROR: ", err);
    })
  }
};

//FIXME: fix type any
export const loadERC20Token = (bucket: any, data: string, recipient: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.tokenAddress().call().then(async (address: string) => {
      const erc20Abi = IERC20Detailed.options.jsonInterface;
      const erc20 = new config.web3!.eth.Contract(erc20Abi, address);
      dispatch(loadingToken(address));

      const symbol = await erc20.methods.symbol().call();
      const decimals = parseInt(await erc20.methods.decimals().call());
      dispatch(tokenLoaded({symbol, decimals}));
    }).catch((err: string) => {
      //FIXME: manage error
      console.error("ERROR: ", err);
    })
  }
}

export const loadNFTToken = (bucket: any, data: string, recipient: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.tokenAddress().call().then(async (address: string) => {
      const nftAbi = IERC721Metadata.options.jsonInterface;
      const nft = new config.web3!.eth.Contract(nftAbi, address);
      dispatch(loadingToken(address));

      const symbol = await nft.methods.symbol().call();
      const tokenURI = await nft.methods.tokenURI(data).call();
      dispatch(tokenLoaded({symbol, tokenURI, metadata: undefined}));
      dispatch(loadingTokenMetadata(address, recipient))

      fetch(tokenURI)
        .then(response => response.json())
        .then(data => {
          dispatch(tokenMetadataLoaded(address, recipient, {
            name: data.name,
            description: data.description,
            image: data.image,
          }));
        })
        .catch((err: string) => {
          //FIXME: manage error
          console.error("ERROR: ", err);
        });
    }).catch((err: string) => {
      //FIXME: manage error
      console.error("ERROR: ", err);
    })
  }
}
