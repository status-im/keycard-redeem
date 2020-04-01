import {
  BucketActions,
  BucketErrors,
  BUCKET_GIFT_LOADING,
  BUCKET_GIFT_NOT_FOUND,
  BUCKET_GIFT_LOADED,
  BUCKET_TOKEN_LOADING,
  BUCKET_TOKEN_LOADED,
} from "../actions/bucket";

export interface BucketState {
  loading: boolean
  address: string | undefined
  expirationTime: number | undefined
  tokenAddress: string | undefined
  tokenSymbol: string | undefined
  tokenDecimals: number | undefined
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
  tokenSymbol: undefined,
  tokenDecimals: undefined,
  error: undefined,
  recipient: undefined,
  amount: undefined,
  codeHash: undefined,
}

export const bucketReducer = (state: BucketState = initialState, action: BucketActions): BucketState => {
  switch (action.type) {
    case BUCKET_GIFT_LOADING: {
      return {
        ...initialState,
        loading: true,
        address: action.address,
        recipient: action.recipient,
      }
    }

    case BUCKET_GIFT_NOT_FOUND: {
      return {
        ...state,
        loading: false,
        error: action.error,
      }
    }

    case BUCKET_GIFT_LOADED: {
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
        tokenSymbol: action.symbol,
        tokenDecimals: action.decimals,
      }
    }

    default:
      return state
  }
}
