import React from 'react';
import {
  shallowEqual,
  useSelector,
  useDispatch,
} from 'react-redux';

export default function(ownProps: any) {
  const props = useSelector(state => {
    return {
      initialized: state.web3.networkID,
      networkID: state.web3.networkID,
      error: state.web3.error,
    }
  }, shallowEqual);

  if (props.error) {
    return `Error: ${props.error}`;
  }

  if (!props.initialized) {
    return "initializing...";
  }

  return ownProps.children;
}
