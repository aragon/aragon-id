pragma solidity 0.4.18;


import "./DeedHolder.sol";


/**
 * A deed holder that allows the deed owner of an ENS node to set a permanent "manager" for the
 * node. The manager is set to be the node's owner, taking control over creating subdomains and
 * other administrative tasks.
 *
 * This layer on top of the DeedHolder is necessary to take back control of the ENS node from the
 * DeedHolder, as the initial transfer of the deed to the DeedHolder also transfers the ENS node
 * ownership.
 */
contract DelegatingDeedHolder is DeedHolder {
    function DelegatingDeedHolder(address _ens, bytes32 _registrarNode)
        public
        DeedHolder(_ens, _registrarNode)
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
