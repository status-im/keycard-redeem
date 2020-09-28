import {
  BucketsActions,
  BUCKETS_LOADING,
  BUCKETS_UNLOADED,
  BUCKETS_LOADING_BUCKET,
  BUCKETS_REDEEMABLE_TOKEN_ADDRESS_LOADED,
  BUCKETS_REDEEMABLE_TOKEN_TYPE_LOADED,
  BUCKETS_REDEEMABLE_TOKEN_DETAILS_LOADED,
} from '../actions/buckets';

export type TokenType = "erc20" | "nft";

export interface ERC20Details {
  name: string
  symbol: string
  decimals: number
}

export type TokenDetails = ERC20Details;

interface Redeemable {
  bucketAddress: string
  tokenAddress: undefined | string
  loading: boolean
  tokenType: undefined | TokenType
  tokenDetails: undefined | ERC20Details
  value: undefined | string
}

export interface BucketsState {
  recipientAddress: undefined | string
  loading: boolean
  buckets: Array<string>
  redeemables: {
    [bucketAddress: string]: Redeemable
  }
}

const initialRedeemableState = {
  bucketAddress: "",
  tokenAddress: undefined,
  loading: true,
  tokenType: undefined,
  tokenDetails: undefined,
  value: undefined
}

const initialState: BucketsState = {
  recipientAddress: undefined,
  loading: false,
  buckets: [],
  redeemables: {},
};

export const bucketsReducer = (state: BucketsState = initialState, action: BucketsActions): BucketsState => {
  switch (action.type) {
    case BUCKETS_LOADING: {
      return {
        ...initialState,
        recipientAddress: action.recipientAddress,
        loading: true,
      };
    }

    case BUCKETS_UNLOADED: {
      if (action.recipientAddress !== state.recipientAddress) {
        return state;
      }

      return initialState;
    }

    case BUCKETS_LOADING_BUCKET: {
      if (action.recipientAddress !== state.recipientAddress) {
        return state;
      }

      return {
        ...state,
        buckets: [
          ...state.buckets,
          action.bucketAddress,
        ],
        redeemables: {
          ...state.redeemables,
          [action.bucketAddress]: {
            ...initialRedeemableState,
            bucketAddress: action.bucketAddress,
            loading: true,
          }
        },
      };
    }

    case BUCKETS_REDEEMABLE_TOKEN_ADDRESS_LOADED: {
      if (action.recipientAddress !== state.recipientAddress) {
        return state;
      }

      const redeemable = state.redeemables[action.bucketAddress];
      if (redeemable === undefined) {
        return state;
      }

      return {
        ...state,
        redeemables: {
          ...state.redeemables,
          [action.bucketAddress]: {
            ...redeemable,
            tokenAddress: action.tokenAddress,
          }
        },
      };
    }

    case BUCKETS_REDEEMABLE_TOKEN_TYPE_LOADED: {
      if (action.recipientAddress !== state.recipientAddress) {
        return state;
      }

      const redeemable = state.redeemables[action.bucketAddress];
      if (redeemable === undefined) {
        return state;
      }

      return {
        ...state,
        redeemables: {
          ...state.redeemables,
          [action.bucketAddress]: {
            ...redeemable,
            tokenType: action.tokenType,
          }
        },
      };
    }

    case BUCKETS_REDEEMABLE_TOKEN_DETAILS_LOADED: {
      if (action.recipientAddress !== state.recipientAddress) {
        return state;
      }

      const redeemable = state.redeemables[action.bucketAddress];
      if (redeemable === undefined) {
        return state;
      }

      return {
        ...state,
        redeemables: {
          ...state.redeemables,
          [action.bucketAddress]: {
            ...redeemable,
            tokenDetails: action.tokenDetails,
          }
        },
      };
    }

    default:
      return state;
  }
}
