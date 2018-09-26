pragma solidity 0.4.24;

/*
    Copyright 2017, Jordi Baylina (Giveth)

    Adapted from:
      https://github.com/aragon/aragon-network-token/blob/master/contracts/interface/ApproveAndCallReceiver.sol
*/

contract ApproveAndCallReceiver {
    function receiveApproval(address _from, uint256 _amount, address _token, bytes _data) external;
}
