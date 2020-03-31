import React, { useEffect } from 'react';
import { useRouteMatch } from 'react-router-dom';
import {
  shallowEqual,
  useSelector,
  useDispatch,
} from 'react-redux';
import { redeemPath } from '../config';
import {
  loadGift,
  BucketError,
  ERROR_LOADING_GIFT,
  ERROR_GIFT_NOT_FOUND,
} from '../actions/bucket';
import { toBaseUnit } from "../utils";

const errorMessage = (error: BucketError): string => {
  switch (error.type) {
    case ERROR_LOADING_GIFT:
      return "couldn't load gift.";

    case ERROR_GIFT_NOT_FOUND:
      return "gift not found";

    default:
      return "something went wrong";
  }
}

export default function(ownProps: any) {
  const dispatch = useDispatch()
  const match = useRouteMatch({
    path: redeemPath,
    exact: true,
  });

  const bucketAddress = match.params.bucketAddress;
  const recipientAddress = match.params.recipientAddress;

  const props = useSelector(state => {
    return {
      bucketAddress: state.bucket.address,
      loading: state.bucket.loading,
      found: state.bucket.found,
      error: state.bucket.error,
      recipient: state.bucket.recipient,
      amount: state.bucket.amount,
      codeHash: state.bucket.codeHash,
      tokenAddress: state.bucket.tokenAddress,
      tokenSymbol: state.bucket.tokenSymbol,
      tokenDecimals: state.bucket.tokenDecimals,
      receiver: state.web3.account,
    }
  }, shallowEqual);

  useEffect(() => {
    dispatch(loadGift(bucketAddress, recipientAddress));
  }, [bucketAddress, recipientAddress]);

  if (props.error) {
    return `Error: ${errorMessage(props.error)}`;
  }

  if (props.loading) {
    return "loading bucket...";
  }

  if (props.tokenSymbol === undefined || props.tokenDecimals === undefined) {
    return "loading token info...";
  }

  const [displayAmount, roundedDisplayAmount] = toBaseUnit(props.amount, props.tokenDecimals, 2);

  return <>
    Bucket Address: {props.bucketAddress}<br />
    Recipient: {props.recipient}<br />
    Amount: {props.amount}<br />
    Code Hash: {props.codeHash}<br />
    Token Address: {props.tokenAddress}<br />
    Token Symbol: {props.tokenSymbol}<br />
    Token Decimals: {props.tokenDecimals}<br />
    Display Amount: {displayAmount} <br />
    Rounded Display Amount: {roundedDisplayAmount} <br />
    Receiver: {props.receiver} <br />

    <br /><br /><br />
  </>;
}