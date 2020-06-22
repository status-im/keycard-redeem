import React from 'react';
import {
  useDispatch,
} from 'react-redux';
import {
  deployERC20,
  deployNFT,
} from '../actions/newContract';

export default function() {
  const dispatch = useDispatch();
  const deployERC20Handler = () => dispatch(deployERC20());
  const deployNFTHandler = () => dispatch(deployNFT());

  return <>
    <p>
      <button onClick={deployERC20Handler}>deploy ERC20!</button>
        <button onClick={deployNFTHandler}>deploy NFT!</button>
    </p>
  </>;
}
