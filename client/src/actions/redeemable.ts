import { RootState } from '../reducers';
import ERC20BucketFactory from '../contracts/ERC20BucketFactory.json';
import NFTBucketFactory from '../contracts/NFTBucketFactory.json';
import ERC20Bucket from '../contracts/ERC20Bucket.json';
import Bucket from '../contracts/Bucket.json';
import IERC20Detailed from '../contracts/IERC20Detailed.json';
import IERC721Metadata from '../contracts/IERC721Metadata.json';
import { config } from "../config";
import { Dispatch } from 'redux';
import { ZERO_ADDRESS } from "../utils";
import { debug } from "./debug";
import { AbiItem } from "web3-utils";

interface ContractSpecs {
  networks: {
    [id: string]: {
      address: string
    }
  }
}

const contractAddress = (specs: ContractSpecs, networkID: string | number): string => {
  return specs.networks[networkID.toString()].address;
}

export const ERROR_REDEEMABLE_NOT_FOUND = "ERROR_REDEEMABLE_NOT_FOUND";
export interface ErrRedeemableNotFound {
  type: typeof ERROR_REDEEMABLE_NOT_FOUND
}

export const ERROR_LOADING_REDEEMABLE = "ERROR_LOADING_REDEEMABLE";
export interface ErrLoadingRedeemable {
  type: typeof ERROR_LOADING_REDEEMABLE
  message: string
}

export type RedeemableErrors =
  ErrRedeemableNotFound |
  ErrLoadingRedeemable;

const errRedeemableNotFound = (): ErrRedeemableNotFound => ({
  type: ERROR_REDEEMABLE_NOT_FOUND,
});

const errLoadingRedeemable = (message: string): ErrLoadingRedeemable => ({
  type: ERROR_LOADING_REDEEMABLE,
  message,
});

export const REDEEMABLE_LOADING = "REDEEMABLE_LOADING";
export interface RedeemableLoadingAction {
  type: typeof REDEEMABLE_LOADING
  address: string
  recipient: string
}

export const REDEEMABLE_LOADING_ERROR = "REDEEMABLE_LOADING_ERROR";
export interface RedeemableLoadingErrorAction {
  type: typeof REDEEMABLE_LOADING_ERROR
  error: ErrLoadingRedeemable
}

export const REDEEMABLE_LOADED = "REDEEMABLE_LOADED";
export interface RedeemableLoadedAction {
  type: typeof REDEEMABLE_LOADED
  expirationTime: number
  recipient: string
  amount: string
  codeHash: string
}

export const REDEEMABLE_NOT_FOUND = "REDEEMABLE_NOT_FOUND";
export interface RedeemableNotFoundAction {
  type: typeof REDEEMABLE_NOT_FOUND
  error: ErrRedeemableNotFound
}

export const TOKEN_LOADING = "TOKEN_LOADING";
export interface TokenLoadingAction {
  type: typeof TOKEN_LOADING
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

export const TOKEN_LOADED = "TOKEN_LOADED";
export interface TokenLoadedAction {
  type: typeof TOKEN_LOADED
  token: Token,
}

export const TOKEN_METADATA_LOADING = "TOKEN_METADATA_LOADING";
export interface TokenMetadataLoadingAction {
  type: typeof TOKEN_METADATA_LOADING
  tokenAddress: string
  recipient: string
}

export const TOKEN_METADATA_LOADED = "TOKEN_METADATA_LOADED";
export interface TokenMetadataLoadedAction {
  type: typeof TOKEN_METADATA_LOADED
  tokenAddress: string
  recipient: string
  metadata: TokenNFTMetadata
}

export type RedeemableActions =
  RedeemableLoadingAction |
  RedeemableLoadingErrorAction |
  RedeemableLoadedAction |
  RedeemableNotFoundAction |
  TokenLoadingAction |
  TokenLoadedAction |
  TokenMetadataLoadingAction |
  TokenMetadataLoadedAction;

export const loadingRedeemable = (address: string, recipient: string): RedeemableLoadingAction => ({
  type: REDEEMABLE_LOADING,
  address,
  recipient,
});

export const redeemableLoaded = (expirationTime: number, recipient: string, amount: string, codeHash: string): RedeemableLoadedAction => ({
  type: REDEEMABLE_LOADED,
  expirationTime,
  recipient,
  amount,
  codeHash,
});

export const redeemableNotFound = (): RedeemableNotFoundAction => ({
  type: REDEEMABLE_NOT_FOUND,
  error: errRedeemableNotFound(),
});

export const errorLoadingRedeemable = (errorMessage: string): RedeemableLoadingErrorAction => ({
  type: REDEEMABLE_LOADING_ERROR,
  error: errLoadingRedeemable(errorMessage),
});

export const loadingToken = (address: string): TokenLoadingAction => ({
  type: TOKEN_LOADING,
  address,
});

export const tokenLoaded = (token: Token): TokenLoadedAction => ({
  type: TOKEN_LOADED,
  token,
});

export const loadingTokenMetadata = (tokenAddress: string, recipient: string): TokenMetadataLoadingAction => ({
  type: TOKEN_METADATA_LOADING,
  tokenAddress,
  recipient,
});

export const tokenMetadataLoaded = (tokenAddress: string, recipient: string, metadata: TokenNFTMetadata): TokenMetadataLoadedAction => ({
  type: TOKEN_METADATA_LOADED,
  tokenAddress,
  recipient,
  metadata,
});

export const newBucketContract = (address: string) => {
  const bucketAbi = Bucket.abi as AbiItem[];
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

export const newERC20BucketContract = (address: string) => {
  const bucketAbi = ERC20Bucket.abi as AbiItem[];
  const bucket = new config.web3!.eth.Contract(bucketAbi, address);
  return bucket;
}

export const loadRedeemable = (bucketAddress: string, recipientAddress: string) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    const networkID = getState().web3.networkID!;
    dispatch(debug(`erc20 factory address: ${contractAddress(ERC20BucketFactory, networkID)}`));
    dispatch(debug(`nft factory address: ${contractAddress(NFTBucketFactory, networkID)}`));
    dispatch(debug(`bucket address: ${bucketAddress}`));
    dispatch(debug(`recipient address: ${recipientAddress}`));
    dispatch(loadingRedeemable(bucketAddress, recipientAddress));
    const bucket = newBucketContract(bucketAddress);
    bucket.methods.expirationTime().call().then((expirationTime: number) => {
      bucket.methods.redeemables(recipientAddress).call().then((result: any) => {
        const { recipient, data, code } = result;
        if (recipient === ZERO_ADDRESS) {
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
      const erc20Abi = IERC20Detailed.abi as AbiItem[];
      const erc20 = new config.web3!.eth.Contract(erc20Abi, address);
      dispatch(loadingToken(address));

      const symbol = await erc20.methods.symbol().call();
      const decimals = parseInt(await erc20.methods.decimals().call());
      dispatch(debug(`erc20 token: ${symbol} ${address}`));
      dispatch(tokenLoaded({symbol, decimals}));
    }).catch((err: string) => {
      //FIXME: manage error
      dispatch(debug(`error loading token: ${err})`));
      console.error("ERROR: ", err);
    })
  }
}

export const loadNFTToken = (bucket: any, data: string, recipient: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.tokenAddress().call().then(async (address: string) => {
      const nftAbi = IERC721Metadata.abi as AbiItem[];
      const nft = new config.web3!.eth.Contract(nftAbi, address);
      dispatch(loadingToken(address));

      const symbol = await nft.methods.symbol().call();
      const tokenURI = await nft.methods.tokenURI(data).call();
      dispatch(tokenLoaded({symbol, tokenURI, metadata: undefined}));
      dispatch(loadingTokenMetadata(address, recipient))

      dispatch(debug(`nft token: ${symbol} ${address}`));

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
          dispatch(debug(`error loading metadata: ${err})`));
          //FIXME: manage error
          console.error("ERROR: ", err);
        });
    }).catch((err: string) => {
      dispatch(debug(`error loading token: ${err})`));
      //FIXME: manage error
      console.error("ERROR: ", err);
    })
  }
}
