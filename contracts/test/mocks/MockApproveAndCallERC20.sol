pragma solidity 0.4.24;

import "../../interface/ApproveAndCallReceiver.sol";


contract MockApproveAndCallERC20 {
    mapping(address => uint256) public balances;
    mapping(address => mapping (address => uint256)) internal allowed;

    // From https://github.com/aragon/aragon-network-token/blob/master/contracts/MiniMeToken.sol
    function approveAndCall(address _spender, uint256 _amount, bytes _extraData) public returns (bool success) {
        approve(_spender, _amount);

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

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        return true;
    }

    function mintToken(address _to, uint256 _value) public {
        balances[_to] += _value;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_value <= balances[_from]);
        require(_value <= allowed[_from][msg.sender]);

        balances[_from] -= _value;
        balances[_to] += _value;
        allowed[_from][msg.sender] -= _value;
        return true;
    }
}
