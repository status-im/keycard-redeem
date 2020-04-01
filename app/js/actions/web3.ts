import Web3 from 'web3';
import { config } from '../config';
import {
  Dispatch,
} from 'redux';
import { RootState } from '../reducers';

export const VALID_NETWORK_NAME = "Ropsten";
export const VALID_NETWORK_ID = 3;
// export const VALID_NETWORK_NAME = "Goerli";
// export const VALID_NETWORK_ID = 5;
export const LOCAL_NETWORK_ID = 1337;

enum Web3Type {
  Generic,
  Remote,
  Status,
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

export const web3NetworkIDLoaded = (id: number): Web3Actions => ({
  type: WEB3_NETWORK_ID_LOADED,
  networkID: id,
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
  return (dispatch: Dispatch, getState: () => RootState) => {
    if (w.ethereum) {
      config.web3 = new Web3(w.ethereum);
      w.ethereum.enable()
        .then(() => {
          const t: Web3Type = w.ethereum.isStatus ? Web3Type.Status : Web3Type.Generic;
          dispatch(web3Initialized(t));
          config.web3!.eth.net.getId().then((id: number) => {
            if (id !== VALID_NETWORK_ID && id !== LOCAL_NETWORK_ID) {
              dispatch(web3Error(`wrong network, please connect to ${VALID_NETWORK_NAME}`));
              return;
            }

            dispatch(web3NetworkIDLoaded(id))
            dispatch(loadAddress());
          });
        })
        .catch((err: string) => {
          //FIXME: handle error
          console.log("error", err)
        });
    } else if (config.web3) {
      const t: Web3Type = w.ethereum.isStatus ? Web3Type.Status : Web3Type.Generic;
      dispatch(web3Initialized(t));
      config.web3!.eth.net.getId().then((id: number) => {
        dispatch(web3NetworkIDLoaded(id))
        dispatch(loadAddress());
      })
      .catch((err: string) => {
        //FIXME: handle error
        console.log("error", err)
      });
    } else {
      dispatch(web3Error("web3 not supported"));
    }
  };
}

const loadAddress = () => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    web3.eth.getAccounts().then((accounts: string[]) => {
      dispatch(accountLoaded(accounts[0]));
    });
  };
}
