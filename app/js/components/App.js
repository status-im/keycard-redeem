import React from 'react';

export default function App(props) {
  if (!props.initialized) {
    return "initializing...";
  }

  if (props.error) {
    return <>
      <p>Error: {props.error}</p>
    </>;
  }

  return <>
    <p>Network ID {props.networkID}</p>
    <p>Hello {props.account}</p>
  </>;
}

