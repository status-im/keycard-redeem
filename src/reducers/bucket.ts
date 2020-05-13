import {
  Token,
  BucketActions,
  BucketErrors,
  BUCKET_REDEEMABLE_LOADING,
  BUCKET_REDEEMABLE_LOADING_ERROR,
  BUCKET_REDEEMABLE_NOT_FOUND,
  BUCKET_REDEEMABLE_LOADED,
  BUCKET_TOKEN_LOADING,
  BUCKET_TOKEN_LOADED,
  BUCKET_TOKEN_METADATA_LOADING,
  BUCKET_TOKEN_METADATA_LOADED,
} from "../actions/bucket";

export interface BucketState {
  loading: boolean
  address: string | undefined
  expirationTime: number | undefined
  tokenAddress: string | undefined
  token: Token | undefined
  loadingTokenMetadata: boolean
  error: BucketErrors | undefined
  recipient: string | undefined
  amount: string | undefined
  codeHash: string | undefined
}

const initialState: BucketState = {
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

export const bucketReducer = (state: BucketState = initialState, action: BucketActions): BucketState => {
  switch (action.type) {
    case BUCKET_REDEEMABLE_LOADING: {
      return {
        ...initialState,
        loading: true,
        address: action.address,
        recipient: action.recipient,
      }
    }

    case BUCKET_REDEEMABLE_LOADING_ERROR: {
      return {
        ...initialState,
        loading: false,
        error: action.error,
      }
    }

    case BUCKET_REDEEMABLE_NOT_FOUND: {
      return {
        ...state,
        loading: false,
        error: action.error,
      }
    }

    case BUCKET_REDEEMABLE_LOADED: {
      return {
        ...state,
        loading: false,
        expirationTime: action.expirationTime,
        recipient: action.recipient,
        amount: action.amount,
        codeHash: action.codeHash,
      }
    }

    case BUCKET_TOKEN_LOADING: {
      return {
        ...state,
        tokenAddress: action.address,
      }
    }

    case BUCKET_TOKEN_LOADED: {
      return {
        ...state,
        token: action.token,
      }
    }

    case BUCKET_TOKEN_METADATA_LOADING: {
      if (action.tokenAddress !== state.tokenAddress || action.recipient !== state.recipient) {
        // bucket or recipient changed before starting loading
        return state;
      }

      return {
        ...state,
        loadingTokenMetadata: true,
      }
    }

    case BUCKET_TOKEN_METADATA_LOADED: {
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
