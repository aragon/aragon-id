pragma solidity 0.4.24;


import "./DeedHolder.sol";


/**
 * A deed holder that allows the current owner of the deed to set a "manager" for the held ENS node.
 * The manager is set to be the node's owner, taking control over creating subdomains and other
 * administrative tasks. Managers do not have to be permanent; they can return control of the ENS
 * node back to this deed holder to allow a new manager to be later set.
 *
 * This extra layer over the DeedHolder allows one to control how the ENS node is managed after
 * transferring their deed ownership to a DeedHolder, as the initial transfer of the deed to the
 * DeedHolder also transfers control of the ENS node.
 */
contract DelegatingDeedHolder is DeedHolder {
    constructor(address _ens, bytes32 _registrarNode)
        public
        DeedHolder(_ens, _registrarNode)
    // solhint-disable-next-line no-empty-blocks
    { }

    /**
     * If this DelegatingDeedHolder is the current manager of the node on ENS, set it to the new
     * manager.
     * @param _node The node hash of the deed to transfer.
     * @param _manager New manager for the node
     */
    function setManager(bytes32 _node, address _manager) public onlyDeedOwner(_node) {
        bytes32 node = keccak256(registrarNode, _node);
        require(ens.owner(node) == address(this));
        ens.setOwner(node, _manager);
    }
}
