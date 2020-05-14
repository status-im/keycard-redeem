import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { History } from 'history';
import {
  Web3State,
  web3Reducer,
} from './web3';
import {
  RedeemableState,
  redeemableReducer,
} from './redeemable';
import {
  RedeemState,
  redeemReducer,
} from './redeem';

export interface RootState {
  web3: Web3State,
  redeemable: RedeemableState,
  redeem: RedeemState,
}

export default function(history: History) {
  return combineReducers({
    web3: web3Reducer,
    router: connectRouter(history),
    redeemable: redeemableReducer,
    redeem: redeemReducer,
  });
}
