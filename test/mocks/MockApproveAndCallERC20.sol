pragma solidity 0.4.18;

import "../../contracts/interface/ApproveAndCallReceiver.sol";


contract MockApproveAndCallERC20 {
    mapping(address => uint256) public balance;

    // From https://github.com/aragon/aragon-network-token/blob/master/contracts/MiniMeToken.sol
    function approveAndCall(address _spender, uint256 _amount, bytes _extraData) public returns (bool success) {
        // This portion is copied from ConsenSys's Standard Token Contract. It
        //  calls the receiveApproval function that is part of the contract that
        //  is being approved (`_spender`). The function should look like:
        //  `receiveApproval(address _from, uint256 _amount, address
        //  _tokenContract, bytes _extraData)` It is assumed that the call
        //  *should* succeed, otherwise the plain vanilla approve would be used
        ApproveAndCallReceiver(_spender).receiveApproval(
            msg.sender,
            _amount,
            this,
            _extraData
        );
        return true;
    }

    function mintToken(address _to, uint256 _value) public {
        balance[_to] += _value;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balance[_from] >= _value);
        balance[_from] -= _value;
        balance[_to] += _value;
        return true;
    }
}
