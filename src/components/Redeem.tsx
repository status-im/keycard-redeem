import React, { useEffect } from 'react';
import { RootState } from '../reducers';
import { useRouteMatch } from 'react-router-dom';
import {
  shallowEqual,
  useSelector,
  useDispatch,
} from 'react-redux';
import { redeemPath } from '../config';
import {
  loadRedeemable,
  BucketErrors,
  ERROR_LOADING_REDEEMABLE,
  ERROR_REDEEMABLE_NOT_FOUND,
} from '../actions/bucket';
import {
  toBaseUnit,
  KECCAK_EMPTY_STRING2,
} from "../utils";
import {
  redeem,
  RedeemErrors,
  ERROR_REDEEMING,
  ERROR_WRONG_SIGNER,
} from '../actions/redeem';

const buckerErrorMessage = (error: BucketErrors): string => {
  switch (error.type) {
    case ERROR_LOADING_REDEEMABLE:
      return "couldn't load redeemable";

    case ERROR_REDEEMABLE_NOT_FOUND:
      return "redeemable not found or already redeemed";

    default:
      return "something went wrong";
  }
}

const redeemErrorMessage = (error: RedeemErrors): string => {
  switch (error.type) {
    case ERROR_WRONG_SIGNER:
      return `wrong signer. expected signature from ${error.expected}, got signature from ${error.actual}`;

    case ERROR_REDEEMING:
      return `redeem error: ${error.message}`;

    default:
      return "something went wrong";
  }
}

interface URLParams {
  bucketAddress: string
  recipientAddress: string
}

export default function(ownProps: any) {
  const dispatch = useDispatch()

  const match = useRouteMatch<URLParams>({
    path: redeemPath,
    exact: true,
  });

  if (match === null) {
    return null;
  }

  const bucketAddress = match.params.bucketAddress;
  const recipientAddress = match.params.recipientAddress;

  const props = useSelector((state: RootState) => {
    return {
      bucketAddress: state.bucket.address,
      loading: state.bucket.loading,
      expirationTime: state.bucket.expirationTime,
      error: state.bucket.error,
      recipient: state.bucket.recipient,
      amount: state.bucket.amount,
      codeHash: state.bucket.codeHash,
      tokenAddress: state.bucket.tokenAddress,
      tokenSymbol: state.bucket.tokenSymbol,
      tokenDecimals: state.bucket.tokenDecimals,
      receiver: state.web3.account,
      redeeming: state.redeem.loading,
      redeemError: state.redeem.error,
      redeemTxHash: state.redeem.txHash,
    }
  }, shallowEqual);

  const emptyCode = props.codeHash === KECCAK_EMPTY_STRING2;

  useEffect(() => {
    dispatch(loadRedeemable(bucketAddress, recipientAddress));
  }, [dispatch, bucketAddress, recipientAddress]);

  if (props.error) {
    return <>Error: {buckerErrorMessage(props.error)}</>;
  }

  if (props.loading) {
    return <>loading bucket...</>;
  }

  if (props.tokenSymbol === undefined || props.tokenDecimals === undefined) {
    return <>loading token info...</>;
  }

  const [displayAmount, roundedDisplayAmount] = toBaseUnit(props.amount!, props.tokenDecimals, 2);

  return <>
    Bucket Address: {props.bucketAddress}<br />
    Recipient: {props.recipient}<br />
    Amount: {props.amount}<br />
    Expiration Time: {new Date(props.expirationTime! * 1000).toLocaleDateString("default", {hour: "numeric", minute: "numeric"})}<br />
    Code Hash: {props.codeHash} {emptyCode ? "(empty string)" : ""}<br />
    Token Address: {props.tokenAddress}<br />
    Token Symbol: {props.tokenSymbol}<br />
    Token Decimals: {props.tokenDecimals}<br />
    Display Amount: {displayAmount} <br />
    Rounded Display Amount: {roundedDisplayAmount} <br />
    Receiver: {props.receiver} <br />

    <br /><br /><br />
    <button
      disabled={props.redeeming}
      onClick={() => dispatch(redeem(bucketAddress, recipientAddress, ""))}>
      {props.redeeming ? "Redeeming..." : "Redeem"}
    </button>
    <br />
    {props.redeemError && `Error: ${redeemErrorMessage(props.redeemError)}`}

    {props.redeemTxHash && `Done! Tx Hash: ${props.redeemTxHash}`}
  </>;
}