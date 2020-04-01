import {
  RedeemActions,
  RedeemErrors,
  REDEEM_LOADING,
  REDEEM_ERROR,
  REDEEM_DONE,
} from "../actions/redeem";
import {
  BucketGiftLoadingAction,
  BUCKET_GIFT_LOADING
} from "../actions/bucket";

export interface RedeemState {
  loading: boolean
  error: RedeemErrors | undefined
  txHash: string | undefined
  receiver: string | undefined
}

const initialState: RedeemState = {
  loading: false,
  error: undefined,
  txHash: undefined,
  receiver: undefined,
}

export const redeemReducer = (state: RedeemState = initialState, action: RedeemActions | BucketGiftLoadingAction): RedeemState => {
  switch (action.type) {
    case BUCKET_GIFT_LOADING: {
      return initialState;
    }

    case REDEEM_LOADING: {
      return {
        ...initialState,
        loading: true,
      }
    }

    case REDEEM_ERROR: {
      return {
        ...initialState,
        loading: false,
        error: action.error,
      }
    }

    case REDEEM_DONE: {
      return {
        ...initialState,
        loading: false,
        txHash: action.txHash,
      }
    }

    default:
      return state;
  }
}

