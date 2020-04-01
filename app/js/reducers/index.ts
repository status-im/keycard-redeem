import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import {
  Web3State,
  web3Reducer,
} from './web3';
import {
  BucketState,
  bucketReducer,
} from './bucket';
import {
  RedeemState,
  redeemReducer,
} from './redeem';

export interface RootState {
  web3: Web3State,
  bucket: BucketState,
  redeem: RedeemState,
}

export default function(history) {
  return combineReducers({
    web3: web3Reducer,
    router: connectRouter(history),
    bucket: bucketReducer,
    redeem: redeemReducer,
  });
}
