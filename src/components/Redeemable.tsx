import React, { useEffect } from 'react';
import classNames from 'classnames';
import { RootState } from '../reducers';
import { useRouteMatch } from 'react-router-dom';
import {
  shallowEqual,
  useSelector,
  useDispatch,
} from 'react-redux';
import { redeemablePath } from '../config';
import {
  TokenERC20,
  TokenNFT,
  loadRedeemable,
  RedeemableErrors,
  ERROR_LOADING_REDEEMABLE,
  ERROR_REDEEMABLE_NOT_FOUND,
} from '../actions/redeemable';
import {
  toBaseUnit,
  KECCAK_EMPTY_STRING2,
  isTokenERC20,
} from "../utils";
import {
  redeem,
  RedeemErrors,
  ERROR_REDEEMING,
  ERROR_WRONG_SIGNER,
} from '../actions/redeem';
import {
  flipCard,
  toggleDebug,
} from "../actions/layout";
import "../styles/Redeemable.scss";
import "../styles/Debug.scss";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUndo as flipIcon,
  faWrench as debugIcon,
} from '@fortawesome/free-solid-svg-icons'


const buckerErrorMessage = (error: RedeemableErrors): string => {
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
      return error.message;

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
    path: redeemablePath,
    exact: true,
  });

  if (match === null) {
    return null;
  }

  const bucketAddress = match.params.bucketAddress;
  const recipientAddress = match.params.recipientAddress;

  const props = useSelector((state: RootState) => {
    return {
      bucketAddress: state.redeemable.address,
      loading: state.redeemable.loading,
      expirationTime: state.redeemable.expirationTime,
      error: state.redeemable.error,
      recipient: state.redeemable.recipient,
      amount: state.redeemable.amount,
      codeHash: state.redeemable.codeHash,
      tokenAddress: state.redeemable.tokenAddress,
      token: state.redeemable.token,
      loadingTokenMetadata: state.redeemable.loadingTokenMetadata,
      receiver: state.web3.account,
      redeeming: state.redeem.loading,
      redeemError: state.redeem.error,
      redeemTxHash: state.redeem.txHash,
      cardFlipped: state.layout.cardFlipped,
      debugLines: state.debug.lines,
      debugOpen: state.layout.debugOpen,
    }
  }, shallowEqual);

  const emptyCode = props.codeHash === KECCAK_EMPTY_STRING2;

  useEffect(() => {
    dispatch(loadRedeemable(bucketAddress, recipientAddress));
  }, [dispatch, bucketAddress, recipientAddress]);

  if (props.error) {
    return <div className={classNames({ paper: true, error: true })}>
      {buckerErrorMessage(props.error)}
    </div>;
  }

  if (props.loading) {
    return <div className={classNames({ paper: true })}>
      loading bucket...
    </div>;
  }

  if (props.token === undefined) {
    return <div className={classNames({ paper: true })}>
      loading token info...
    </div>;
  }

  const erc20Header = (token: TokenERC20) => {
    const roundedDisplayAmount = toBaseUnit(props.amount!, token.decimals, 2);
    return <>
      <span className="amount">{roundedDisplayAmount}</span>
      <span className="erc20-symbol">{token.symbol}</span>
    </>
  }

  const nftHeader = (token: TokenNFT) => {
    return <>
      <span className="nft-symbol">{token.symbol}</span>
      {token.metadata !== undefined && <span className="name">
        {token.metadata.name}
      </span>}
    </>
  }

  const erc20Content = (token: TokenERC20) => {
    return <>
    </>
  }

  const nftContent = (token: TokenNFT) => {
    return <>
      {props.loadingTokenMetadata ? "loading metadata..." : <>
        {token.metadata !== undefined && <>
          <span className="nft-description">
            {token.metadata.description}
          </span>
          <img className="nft-image" src={token.metadata.image} alt={token.metadata.name} />
        </>}
      </>}
    </>
  }

  const isERC20 = isTokenERC20(props.token);
  const tokenHeader = isERC20 ? erc20Header(props.token as TokenERC20) : nftHeader(props.token as TokenNFT);
  const tokenContent = isERC20 ? erc20Content(props.token as TokenERC20) : nftContent(props.token as TokenNFT);

  const cardClass = classNames({
    card: true,
    flipped: props.cardFlipped,
  });

  const frontClass = classNames({
    side: true,
    front: true,
    erc20: isERC20,
    nft: !isERC20,
  });

  const backClass = classNames({ side: true, back: true });

  return <div>
    <div className={cardClass}>
      <div className={frontClass}>
        <div className="header">
          <button className="flip" onClick={ () => { dispatch(flipCard(true)) } }>
            <FontAwesomeIcon icon={flipIcon} />
          </button>

          <div className="info">
            {tokenHeader}
          </div>
        </div>
        <div className="content">
          <div className="info">
            {tokenContent}
          </div>
          {props.redeemError && <div className="error">
            {redeemErrorMessage(props.redeemError)}
          </div>}
          {props.redeemTxHash && <div className="success">
            Done! Tx Hash: {props.redeemTxHash}
          </div>}
        </div>
        <div className="footer">
          <button
            className="btn-redeem"
            disabled={props.redeeming}
            onClick={() => dispatch(redeem(bucketAddress, recipientAddress, "", isERC20))}>
            {props.redeeming ? "Redeeming..." : "Redeem"}
          </button>
        </div>
      </div>

      <div className={backClass}>
        <div className="header">
          <button className="flip" onClick={ () => { dispatch(flipCard(false)) } }>
            <FontAwesomeIcon icon={flipIcon} />
          </button>
        </div>
        <div className="content">
          <dl>
            <dt>Bucket Address</dt>
            <dd>{props.bucketAddress}</dd>
            <dt>Bucket Address</dt>
            <dd>{props.bucketAddress}</dd>
            <dt>Recipient</dt>
            <dd>{props.recipient}</dd>
            <dt>Amount</dt>
            <dd>{props.amount}</dd>
            <dt>Expiration Time</dt>
            <dd>{new Date(props.expirationTime! * 1000).toLocaleDateString("default", {hour: "numeric", minute: "numeric"})}</dd>
            <dt>Code Hash</dt>
            <dd>{props.codeHash} {emptyCode ? "(empty string)" : ""}</dd>
            <dt>Token Address</dt>
            <dd>{props.tokenAddress}</dd>
            <dt>Token Type: {isERC20 ? "ERC20" : "NFT"}</dt>
            <dt>Receiver</dt>
            <dd>{props.receiver} </dd>
          </dl>
        </div>
        <div className="footer">
        </div>
      </div>
    </div>
    <div className="debug">
      <FontAwesomeIcon
        onClick={() => dispatch(toggleDebug(!props.debugOpen)) }
        icon={debugIcon}
        className="btn" />
      {props.debugOpen && <ul>
        {props.debugLines.map((text: string, i: number) => (<li key={i}>
          {text}
        </li>))}
      </ul>}
    </div>
  </div>;
}
