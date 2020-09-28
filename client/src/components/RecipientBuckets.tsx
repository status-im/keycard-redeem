import React, { useEffect } from 'react';
import { RootState } from '../reducers';
import { useRouteMatch } from 'react-router-dom';
import {
  shallowEqual,
  useSelector,
  useDispatch,
} from 'react-redux';
import { recipientBucketsPath, buildRedeemablePath } from '../config';
import { loadBuckets, unloadBuckets } from "../actions/buckets";
import { ERC20Details } from "../reducers/buckets";
import { Link } from "react-router-dom";

interface BuckestListItemProps {
  bucketAddress: string
  recipientAddress: string
}

const BuckestListItem = (ownProps: BuckestListItemProps) => {
  const props = useSelector((state: RootState) => {
    const redeemable = state.buckets.redeemables[ownProps.bucketAddress];
    if (redeemable === undefined) {
      return null;
    }

    return {
      bucketAddress: ownProps.bucketAddress,
      recipientAddress: ownProps.recipientAddress,
      loading: redeemable.loading,
      tokenAddress: redeemable.tokenAddress,
      tokenType: redeemable.tokenType,
      tokenDetails: redeemable.tokenDetails,
    }
  }, shallowEqual);

  if (props === null) {
    return null;
  }

  return <div>
    Bucket: {props.bucketAddress}
    {props.loading && <span> (LOADING...)</span>}
    <br />
    Token address: {props.tokenAddress}
    <br />
    Type: {props.tokenType}
    <br />
    {props.tokenDetails && <>
      Symbol: {props.tokenDetails.symbol}
      <br />
      Name: {props.tokenDetails.name}
      <br />
    </>}
    <Link to={buildRedeemablePath(props.bucketAddress, props.recipientAddress)}>DETAILS</Link>
    <hr />
  </div>;
}

interface URLParams {
  recipientAddress: string
}

export default function(ownProps: any) {
  const dispatch = useDispatch()

  const match = useRouteMatch<URLParams>({
    path: recipientBucketsPath,
    exact: true,
  });

  if (match === null) {
    return null;
  }

  const recipientAddress = match.params.recipientAddress;

  const props = useSelector((state: RootState) => {
    return {
      loading: state.buckets.loading,
      buckets: state.buckets.buckets,
    }
  }, shallowEqual);

  useEffect(() => {
    console.log("loading buckets")
    dispatch(loadBuckets(recipientAddress));

    return () => {
      dispatch(unloadBuckets(recipientAddress));
    }
  }, [dispatch, recipientAddress]); // FIXME: unload buckets

  return <div>
    <div>buckets for {recipientAddress}</div>
    <ul>
      {props.buckets.map(bucketAddress => <li key={bucketAddress}>
        <BuckestListItem bucketAddress={bucketAddress} recipientAddress={recipientAddress} />
      </li>)}
    </ul>
  </div>;
}
