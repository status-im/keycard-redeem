import { combineReducers } from 'redux';
import { web3Reducer } from './web3';

export default function() {
  return combineReducers({
    web3: web3Reducer,
  });
}
