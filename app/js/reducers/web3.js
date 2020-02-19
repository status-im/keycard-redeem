import {
  WEB3_INITIALIZED,
  WEB3_ERROR,
  WEB3_NETWORK_ID_LOADED,
  WEB3_ACCOUNT_LOADED,
} from '../actions/web3';

const initialState: Web3State = {
  initialized: false,
  networkID: undefined,
  error: undefined,
  account: undefined,
};

export const web3Reducer = (state = initialState, action) => {
  switch (action.type) {
    case WEB3_INITIALIZED: {
      return {
        ...state,
        initialized: true,
      }
    }

    case WEB3_ERROR: {
      return {
        ...state,
        error: action.error,
      }
    }

    case WEB3_NETWORK_ID_LOADED: {
      return {
        ...state,
        networkID: action.networkID,
      }
    }

    case WEB3_ACCOUNT_LOADED: {
      return {
        ...state,
        account: action.account,
      }
    }
  }

  return state;
}
