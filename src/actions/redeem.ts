import { RootState } from '../reducers';
import { config } from "../config";
import { Dispatch } from 'redux';
import { newBucketContract } from "./redeemable";
import { sha3 } from "web3-utils";
import { recoverTypedSignature } from 'eth-sig-util';
import { Web3Type } from "../actions/web3";
import { KECCAK_EMPTY_STRING } from '../utils';
import { debug } from "./debug";

interface RedeemMessage {
  receiver: string
  code: string
  blockNumber:  number
  blockHash:  string
}

interface SignRedeemResponse {
  sig: string
  signer: string
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

export const redeem = (bucketAddress: string, recipientAddress: string, cleanCode: string, isERC20: boolean) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    let finalCode;
    if (cleanCode === "") {
      finalCode = KECCAK_EMPTY_STRING;
    } else {
      finalCode = sha3(cleanCode);
    }

    dispatch(redeeming());
    const state = getState();
    const web3Type = state.web3.type;

    const bucket = newBucketContract(bucketAddress);
    const account = state.web3.account;
    if (account === undefined) {
      //FIXME: show error?
      return;
    }

    const latestBlock = await config.web3!.eth.getBlock("latest");
    const prevBlock = await config.web3!.eth.getBlock(latestBlock.number - 1);

    const message = {
      receiver: state.web3.account!,
      code: finalCode!,
      blockNumber: prevBlock.number,
      blockHash:  prevBlock.hash,
    };

    const domainName = isERC20 ? "KeycardERC20Bucket" : "KeycardNFTBucket";
    //FIXME: is signer needed?
    dispatch(debug("signing redeem"));
    signRedeem(web3Type, bucketAddress, state.web3.account!, message, domainName).then(async ({ sig, signer }: SignRedeemResponse) => {
      dispatch(debug(`signature: ${sig}, signer: ${signer}`));
      const recipient = state.redeemable.recipient!;
      if (signer.toLowerCase() !== recipient.toLowerCase()) {
        //FIXME: handle error
        dispatch(wrongSigner(recipient, signer));
        return;
      }

      dispatch<any>(sendTransaction(account, bucket, bucketAddress, message, sig));

    }).catch((err: any) => {
      console.error("sign redeem error reason:", err.reason);
      console.error("sign redeem error:", err);
      dispatch(redeemError(err.reason || err.message || err))
    });
  }
}

async function signRedeem(web3Type: Web3Type, contractAddress: string, signer: string, message: RedeemMessage, domainName: string): Promise<SignRedeemResponse> {
  const chainId = await config.web3!.eth.net.getId();

  const domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ];

  const redeem = [
    { name: "blockNumber", type: "uint256" },
    { name: "blockHash", type: "bytes32" },
    { name: "receiver", type: "address" },
    { name: "code", type: "bytes32" },
  ];

  const domainData = {
    name: domainName,
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
    message: message,
  };

  if (web3Type === Web3Type.Status) {
    return signWithKeycard(data);
  } else {
    return signWithWeb3(signer, data);
  }
}

const signWithWeb3 = (signer: string, data: any): Promise<SignRedeemResponse> => {
  return new Promise((resolve, reject) => {
    (window as any).ethereum.sendAsync({
      method: "eth_signTypedData_v3",
      params: [signer, JSON.stringify(data)],
      from: signer,
    }, (err: string, resp: any) => {
      if (err) {
        reject(err);
      } else {
        const sig = resp.result;
        const signer = recoverTypedSignature({
          data,
          sig
        });

        resolve({ sig, signer });
      }
    })
  });
}

const signWithKeycard = (data: any): Promise<SignRedeemResponse> => {
  return new Promise((resolve, reject) => {
    (window as any).ethereum.send("keycard_signTypedData", JSON.stringify(data)).then((resp: any) => {
      const sig = resp.result;
      const signer = recoverTypedSignature({
        data,
        sig
      });
      resolve({ sig, signer });
    }).catch((err: string) => {
      reject(err);
    })
  });
}

//FIXME: fix bucket contract type
const sendTransaction = (account: string, bucket: any, bucketAddress: string, message: RedeemMessage, sig: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    bucket.methods.relayerURI().call().then((uri: string) => {
      if (uri === "") {
        dispatch<any>(sendEthTransaction(account, bucket, message, sig));
      } else {
        dispatch<any>(sendTransactionToRelayer(uri, bucket.options.address, message, sig));
      }
    }).catch((err: any) => {
      dispatch(debug(`error getting relayerURI: ${err}`));
    });
  }
}

//FIXME: fix bucket contract type
const sendEthTransaction = (account: string, bucket: any, message: RedeemMessage, sig: string) => {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    const redeem = bucket.methods.redeem(message, sig);
    dispatch(debug(`calling estimateGas`));
    redeem.estimateGas({ from: account }).then((gas: number) => {
      dispatch(debug(`gas ${gas}`));
      dispatch(debug(`sending eth transaction`));
      redeem.send({
        from: account,
        gas
      }).then((resp: any) => {
        dispatch(redeemDone(resp.transactionHash));
      }).catch((err: any) => {
        dispatch(debug(`error: ${err.reason || err.message || err}`));
        dispatch(redeemError(err.reason || err.message || err));
      });
    }).catch((err: any) => {
      dispatch(debug(`error get gas estimation: ${err.reason || err.message || err}`));
      dispatch(redeemError(err.reason || err.message || err));
    });
  }
}

const sendTransactionToRelayer = (uri: string, bucketAddress: string, message: RedeemMessage, sig: string) => {
  return (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(debug(`sending transaction to relayer: ${uri}`));
    const body = {
      bucket: bucketAddress,
      message: message,
      sig: sig,
    };

    const options = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    }

    fetch(uri, options)
      .then(resp => resp.json())
      .then(data => {
        if (data.error !== undefined) {
          throw(data.error);
        }

        dispatch(redeemDone(data.tx));
        console.log(data)
      })
      .catch((err: string) => {
        dispatch(debug(`error posting transaction to relayer: ${uri}, ${err}`));
        dispatch(redeemError("error posting transaction to relay server"))
        console.error(err);
      });
  }
}
