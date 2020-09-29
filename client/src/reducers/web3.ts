import {
  Web3Actions,
  WEB3_INITIALIZED,
  WEB3_ERROR,
  WEB3_NETWORK_ID_LOADED,
  WEB3_ACCOUNT_LOADED,
  Web3Type,
} from '../actions/web3';

export interface Web3State {
  initialized: boolean
  networkID: number | undefined
  chainID: number | undefined
  error: string | undefined
  account: string | undefined
  type: Web3Type
}

const initialState: Web3State = {
  initialized: false,
  networkID: undefined,
  chainID: undefined,
  error: undefined,
  account: undefined,
  type: Web3Type.None,
};

export const web3Reducer = (state: Web3State = initialState, action: Web3Actions): Web3State => {
  switch (action.type) {
    case WEB3_INITIALIZED: {
      return {
        ...state,
        initialized: true,
        type: action.web3Type,
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
        chainID: action.chainID,
      }
    }

    case WEB3_ACCOUNT_LOADED: {
      return {
        ...state,
        account: action.account,
      }
    }

    default:
      return state
  }
}
