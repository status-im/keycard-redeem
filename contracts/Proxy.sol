pragma solidity ^0.5.16;

contract Proxy {
  /**
   * @param constructData Constructor input data for initializing the proxy
   * @param contractLogic Address of the contract used as implementation logic for the proxy
   */
  constructor(bytes memory constructData, address contractLogic) public {
    // save the code address
    assembly { // solium-disable-line
      sstore(0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7, contractLogic)
    }

    if (constructData.length == 0) {
      return;
    }

    (bool success,) = contractLogic.delegatecall(constructData); // solium-disable-line
    require(success, "Construction failed");
  }

  /**
   * @dev Fallback function allowing to perform a delegatecall to the given implementation.
   * This function will return whatever the implementation call returns
   */
  function() external payable {
    assembly { // solium-disable-line
      let contractLogic := sload(0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7)
      calldatacopy(0x0, 0x0, calldatasize())
      let success := delegatecall(sub(gas(), 10000), contractLogic, 0x0, calldatasize(), 0, 0)
      let retSz := returndatasize()
      returndatacopy(0, 0, retSz)
      switch success
        case 0 {
          revert(0, retSz)
        }
      default {
        return(0, retSz)
      }
    }
  }
}
