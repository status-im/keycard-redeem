import Web3 from 'web3';
import { config } from '../config';
import {
  Dispatch,
} from 'redux';
import { RootState } from '../reducers';
import { debug } from "./debug";

// export const VALID_NETWORK_NAME = "Ganache";
// export const VALID_NETWORK_ID = 5777;

export const VALID_NETWORK_NAME = "Ropsten";
export const VALID_NETWORK_ID = 3;

// export const VALID_NETWORK_NAME = "Goerli";
// export const VALID_NETWORK_ID = 5;

export const LOCAL_NETWORK_IDS = [1337, 5777];
export const VALID_NETWORK_IDS = [VALID_NETWORK_ID, ...LOCAL_NETWORK_IDS];

export enum Web3Type {
  None,
  Generic,
  Remote,
  Status
}

export const WEB3_INITIALIZED = "WEB3_INITIALIZED";
export interface Web3InitializedAction {
  type: typeof WEB3_INITIALIZED
  web3Type: Web3Type
}

export const WEB3_ERROR = "WEB3_ERROR";
export interface Web3ErrorAction {
  type: typeof WEB3_ERROR
  error: string
}

export const WEB3_NETWORK_ID_LOADED = "WEB3_NETWORK_ID_LOADED";
export interface Web3NetworkIDLoadedAction {
  type: typeof WEB3_NETWORK_ID_LOADED
  networkID: number
  chainID: number
}

export const WEB3_ACCOUNT_LOADED = "WEB3_ACCOUNT_LOADED";
export interface Web3AccountLoadedAction {
  type: typeof WEB3_ACCOUNT_LOADED
  account: string
}

export type Web3Actions =
  Web3InitializedAction |
  Web3ErrorAction |
  Web3NetworkIDLoadedAction |
  Web3AccountLoadedAction;


export const web3Initialized = (t: Web3Type): Web3Actions => ({
  type: WEB3_INITIALIZED,
  web3Type: t,
})

export const web3NetworkIDLoaded = (networkID: number, chainID: number): Web3Actions => ({
  type: WEB3_NETWORK_ID_LOADED,
  networkID,
  chainID,
});

export const web3Error = (error: string): Web3Actions => ({
  type: WEB3_ERROR,
  error: error,
});

export const accountLoaded = (account: string): Web3Actions => ({
  type: WEB3_ACCOUNT_LOADED,
  account
});

export const initializeWeb3 = () => {
  const w = window as any;
  return async (dispatch: Dispatch, getState: () => RootState) => {
    if (w.ethereum) {
      config.web3 = new Web3(w.ethereum);
      (config.web3! as any).eth.handleRevert = true;

      w.ethereum.enable()
        .then(() => {
          checkNetworkAndChainId().then((resp: any) => {
            dispatch(debug(`network id: ${resp.networkID}`))
            dispatch(debug(`chain id: ${resp.chainID}`))
            dispatch(web3NetworkIDLoaded(resp.networkID, resp.chainID))
            dispatch(web3Initialized(resp.type));
            dispatch<any>(loadAddress());
          })
        })
        .catch((err: string) => {
          console.error("web3 error", err)
          dispatch(web3Error(err));
        });
    } else {
      dispatch(web3Error("web3 not supported"));
    }
  };
}

const loadAddress = () => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    config.web3!.eth.getAccounts().then((accounts: string[]) => {
      dispatch(debug(`current account: ${accounts[0]}`));
      dispatch(accountLoaded(accounts[0]));
    });
  };
}

const checkNetworkAndChainId = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      const networkID = await config.web3!.eth.net.getId();
      const type = (window as any).ethereum.isStatus ? Web3Type.Status : Web3Type.Generic;

      if (!VALID_NETWORK_IDS.includes(networkID)) {
        reject(`wrong network, please connect to ${VALID_NETWORK_NAME}`);
        return;
      }

      let chainID;

      //FIXME: status should fix the getChainId error
      if (type === Web3Type.Status) {
        chainID = networkID;
      } else if (LOCAL_NETWORK_IDS.includes(networkID)) {
        chainID = 1;
      } else {
        chainID = await config.web3!.eth.getChainId();
      }

      resolve({
        type,
        networkID,
        chainID,
      });
    } catch(e) {
      reject(e);
    }
  });
}
