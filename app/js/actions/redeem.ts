import { RootState } from '../reducers';
import GiftBucket from '../../../embarkArtifacts/contracts/GiftBucket';
import IERC20Detailed from '../../../embarkArtifacts/contracts/IERC20Detailed';
import { config } from "../config";
import { Dispatch } from 'redux';
import { newBucketContract } from "./bucket";
import { sha3 } from "web3-utils";
import { recoverTypedSignature } from 'eth-sig-util';
import { Web3Type } from "../actions/web3";

const sleep = (ms: number) => {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

interface RedeemMessage {
  receiver: string
  code: string
}

export const ERROR_REDEEMING = "ERROR_REDEEMING";
export interface ErrRedeeming {
  type: typeof ERROR_REDEEMING
  message: string
}

export const ERROR_WRONG_SIGNER = "ERROR_WRONG_SIGNER";
export interface ErrWrongSigner {
  type: typeof ERROR_WRONG_SIGNER
  expected: string
  actual: string
}

export type RedeemErrors =
  ErrRedeeming |
  ErrWrongSigner;

export const REDEEM_LOADING = "REDEEM_LOADING";
export interface RedeemLoadingAction {
  type: typeof REDEEM_LOADING
}

export const REDEEM_ERROR = "REDEEM_ERROR";
export interface RedeemErrorAction {
  type: typeof REDEEM_ERROR
  error: RedeemErrors
}

export const REDEEM_DONE = "REDEEM_DONE";
export interface RedeemDoneAction {
  type: typeof REDEEM_DONE
  txHash: string
}

export type RedeemActions =
  RedeemLoadingAction |
  RedeemErrorAction |
  RedeemDoneAction;

const redeeming = () => ({
  type: REDEEM_LOADING,
});

const wrongSigner = (expected: string, actual: string) => ({
  type: REDEEM_ERROR,
  error: {
    type: ERROR_WRONG_SIGNER,
    expected,
    actual,
  }
});

const redeemError = (message: string) => ({
  type: REDEEM_ERROR,
  error: {
    type: ERROR_REDEEMING,
    message,
  }
});

const redeemDone = (txHash: string) => ({
  type: REDEEM_DONE,
  txHash,
});

export const redeem = (bucketAddress: string, recipientAddress: string, code: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(redeeming());
    const state = getState();
    const web3Type = state.web3.type;
    const bucketAddress = state.bucket.address;
    const bucket = newBucketContract(bucketAddress);
    const codeHash = sha3(code);
    const account = state.web3.account;

    const message = {
      receiver: state.web3.account,
      code: codeHash,
    };

    //FIXME: is signer needed?
    signRedeem(web3Type, bucketAddress, state.web3.account, message).then(async ({ sig, address }: SignRedeemResponse) => {
      const recipient = state.bucket.recipient;
      //FIXME: remove! hack to wait for the request screen to slide down
      await sleep(3000);
      if (address.toLowerCase() != recipient.toLowerCase()) {
        //FIXME: handle error
        dispatch(wrongSigner(recipient, address));
        return;
      }

      const redeem = bucket.methods.redeem(message, sig);
      const gas = await redeem.estimateGas();
      redeem.send({ from: account, gas }).then(resp => {
        dispatch(redeemDone(resp.transactionHash));
      }).catch(err => {
        console.error("redeem error: ", err);
        dispatch(redeemError(err))
      });
    }).catch(err => {
      console.error("sign redeem error: ", err);
      dispatch(redeemError(err))
    });
  }
}

interface SignRedeemResponse {
  sig: string
  address: string
}

async function signRedeem(web3Type: Web3Type, contractAddress: string, signer: string, message: RedeemMessage): Promise<SignRedeemResponse> {
  const chainId = await config.web3!.eth.net.getId();
  const domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ];

  const redeem = [
    { name: "receiver", type: "address" },
    { name: "code", type: "bytes32" },
  ];

  const domainData = {
    name: "KeycardGift",
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress
  };

  const data = {
    types: {
      EIP712Domain: domain,
      Redeem: redeem,
    },
    primaryType: ("Redeem" as const),
    domain: domainData,
    message: message
  };

  if (web3Type === Web3Type.Status) {
    return signWithKeycard(signer, data);
  } else {
    return signWithWeb3(signer, data);
  }
}

const signWithWeb3 = (signer: string, data: any) => {
  return new Promise((resolve, reject) => {
    (window as any).ethereum.sendAsync({
      method: "eth_signTypedData_v3",
      params: [signer, JSON.stringify(data)],
      from: signer,
    }, (err, resp) => {
      if (err) {
        reject(err);
      } else {
        const sig = resp.result;
        const address = recoverTypedSignature({
          data,
          sig
        });

        resolve({ sig, address });
      }
    })
  });
}

const signWithKeycard = (signer: string, data: any) => {
  return new Promise((resolve, reject) => {
    (window as any).ethereum.send("keycard_signTypedData", [signer, JSON.stringify(data)]).then(resp => {
      const sig = resp.result;
      const address = recoverTypedSignature({
        data,
        sig
      });
      resolve({ sig, address });
    }).catch(err => {
      reject(err);
    })
  });
}
