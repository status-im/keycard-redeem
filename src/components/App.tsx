import React from 'react';
import ERC20BucketFactory from '../embarkArtifacts/contracts/ERC20BucketFactory';
import { RootState } from '../reducers';
import {
  shallowEqual,
  useSelector,
} from 'react-redux';
import { Web3Type } from "../actions/web3";

const web3Type = (t: Web3Type) => {
  switch (t) {
    case Web3Type.None:
      return "not a web3 browser";
    case Web3Type.Generic:
      return "generic web3 browser";
    case Web3Type.Remote:
      return "remote web3 node";
    case Web3Type.Status:
      return "status web3 browser";
  }
}

export default function(ownProps: any) {
  const props = useSelector((state: RootState) => {
    return {
      initialized: state.web3.networkID,
      networkID: state.web3.networkID,
      error: state.web3.error,
      account: state.web3.account,
      type: state.web3.type,
    }
  }, shallowEqual);

  if (props.error) {
    return <>Error: {props.error}</>;
  }

  if (!props.initialized) {
    return <>initializing...</>;
  }

  return <>
    Network ID: {props.networkID} <br />
    Factory: {ERC20BucketFactory.address} <br />
    Account: {props.account} <br />
    Web3 Type: {web3Type(props.type)} <br />
    <hr />
    <div>
      {ownProps.children}
    </div>
  </>;
}
