import {
  Token,
  RedeemableActions,
  RedeemableErrors,
  REDEEMABLE_LOADING,
  REDEEMABLE_LOADING_ERROR,
  REDEEMABLE_NOT_FOUND,
  REDEEMABLE_LOADED,
  TOKEN_LOADING,
  TOKEN_LOADED,
  TOKEN_METADATA_LOADING,
  TOKEN_METADATA_LOADED,
} from "../actions/redeemable";

export interface RedeemableState {
  loading: boolean
  address: string | undefined
  expirationTime: number | undefined
  tokenAddress: string | undefined
  token: Token | undefined
  loadingTokenMetadata: boolean
  error: RedeemableErrors | undefined
  recipient: string | undefined
  amount: string | undefined
  codeHash: string | undefined
}

const initialState: RedeemableState = {
  loading: false,
  address: undefined,
  expirationTime: undefined,
  tokenAddress: undefined,
  token: undefined,
  loadingTokenMetadata: false,
  error: undefined,
  recipient: undefined,
  amount: undefined,
  codeHash: undefined,
}

export const redeemableReducer = (state: RedeemableState = initialState, action: RedeemableActions): RedeemableState => {
  switch (action.type) {
    case REDEEMABLE_LOADING: {
      return {
        ...initialState,
        loading: true,
        address: action.address,
        recipient: action.recipient,
      }
    }

    case REDEEMABLE_LOADING_ERROR: {
      return {
        ...initialState,
        loading: false,
        error: action.error,
      }
    }

    case REDEEMABLE_NOT_FOUND: {
      return {
        ...state,
        loading: false,
        error: action.error,
      }
    }

    case REDEEMABLE_LOADED: {
      return {
        ...state,
        loading: false,
        expirationTime: action.expirationTime,
        recipient: action.recipient,
        amount: action.amount,
        codeHash: action.codeHash,
      }
    }

    case TOKEN_LOADING: {
      return {
        ...state,
        tokenAddress: action.address,
      }
    }

    case TOKEN_LOADED: {
      return {
        ...state,
        token: action.token,
      }
    }

    case TOKEN_METADATA_LOADING: {
      if (action.tokenAddress !== state.tokenAddress || action.recipient !== state.recipient) {
        // bucket or recipient changed before starting loading
        return state;
      }

      return {
        ...state,
        loadingTokenMetadata: true,
      }
    }

    case TOKEN_METADATA_LOADED: {
      if (action.tokenAddress !== state.tokenAddress || action.recipient !== state.recipient) {
        // bucket or recipient changed after starting loading
        return state;
      }

      if (state.token === undefined) {
        return state;
      }

      return {
        ...state,
        loadingTokenMetadata: false,
        token: {
          ...state.token,
          metadata: action.metadata,
        }
      }
    }

    default:
      return state
  }
}
