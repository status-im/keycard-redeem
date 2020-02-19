import Web3 from 'web3';
import { Dispatch } from 'redux';
import { config } from '../config';

export const VALID_NETWORK_NAME = "Ropsten";
export const VALID_NETWORK_ID = 3;
// export const VALID_NETWORK_NAME = "Goerli";
// export const VALID_NETWORK_ID = 5;
export const LOCAL_NETWORK_ID = 1337;

export const WEB3_INITIALIZED = "WEB3_INITIALIZED";
export const WEB3_ERROR = "WEB3_ERROR";
export const WEB3_NETWORK_ID_LOADED = "WEB3_NETWORK_ID_LOADED";
export const WEB3_ACCOUNT_LOADED = "WEB3_ACCOUNT_LOADED";

export const web3Initialized = () => ({
  type: WEB3_INITIALIZED,
})

export const web3NetworkIDLoaded = networkID => ({
  type: WEB3_NETWORK_ID_LOADED,
  networkID,
});

export const web3Error = error => ({
  type: WEB3_ERROR,
  error,
});

export const web3AccoutLoaded = account => ({
  type: WEB3_ACCOUNT_LOADED,
  account,
});

export const initWeb3 = () => {
  if (window.ethereum) {
    config.web3 = new Web3(window.ethereum);
    return (dispatch, getState) => {
      window.ethereum.enable()
        .then(() => {
          dispatch(web3Initialized());
          dispatch(loadNetwordId());
        })
        .catch((err) => {
          dispatch(web3Error(err));
        });
    }
  } else if (window.web3) {
    config.web3 = window.web3;
    return (dispatch, getState) => {
      dispatch(web3Initialized());
      dispatch(loadNetwordId());
    }
  } else {
    //FIXME: move to config
    // const web3 = new Web3('https://ropsten.infura.io/v3/f315575765b14720b32382a61a89341a');
    // const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/f315575765b14720b32382a61a89341a'));
    config.web3 = new Web3(new Web3.providers.WebsocketProvider('wss://ropsten.infura.io/ws/v3/f315575765b14720b32382a61a89341a'));
    return (dispatch, getState) => {
      dispatch(web3Initialized());
      dispatch(loadNetwordId());
    }
  }
}

const loadNetwordId = () => {
  return (dispatch, getState) => {
    config.web3.eth.net.getId().then((id) => {
      dispatch(web3NetworkIDLoaded(id))
      if (id !== VALID_NETWORK_ID && id !== LOCAL_NETWORK_ID) {
        dispatch(web3Error(`wrong network, please connect to ${VALID_NETWORK_NAME}`));
        return;
      }

      dispatch(web3NetworkIDLoaded(id))
      dispatch(loadMainAccount());
    })
    .catch((err) => {
      dispatch(web3Error(err));
    });
  };
}

const loadMainAccount = () => {
  return (dispatch, getState) => {
    web3.eth.getAccounts()
      .then(accounts => {
        dispatch(web3AccoutLoaded(accounts[0]));
      })
      .catch((err) => {
        dispatch(web3Error(err));
      });
  };
}
