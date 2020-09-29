import { Dispatch } from 'redux';
import { RootState } from '../reducers';
import { Web3Type } from "../actions/web3";
import {
  SignRedeemResponse,
  signTypedDataWithKeycard,
  signTypedDataWithWeb3,
  signTypedLogin,
} from "../utils";
import { buildRecipientBucketsPath } from "../config";
import { push } from "react-router-redux";

export const start = () => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    const state = getState();
    const account = state.web3.account!;
    const web3Type = state.web3.type;
    const chainID = state.web3.chainID!;

    signTypedLogin(chainID, account, web3Type).then((resp: SignRedeemResponse) => {
      const path = buildRecipientBucketsPath(resp.signer);
      dispatch(push(path));
    }).catch(err => {
      //FIXME: handle error
      console.error(err)
    });
  }
}
