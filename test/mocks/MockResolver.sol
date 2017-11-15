pragma solidity 0.4.18;

import "../../contracts/ens/AbstractENS.sol";


contract MockResolver {
    bytes4 constant private INTERFACE_META_ID = 0x01ffc9a7;

    function supportsInterface(bytes4 interfaceID) public constant returns (bool) {
        return interfaceID == INTERFACE_META_ID;
    }
}
