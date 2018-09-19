pragma solidity 0.4.24;


contract IENS {
    function owner(bytes32 _node) public view returns (address);
    function setOwner(bytes32 _node, address _owner) public;
}


contract IDeed {
    address public owner;
    address public previousOwner;
}


contract IHashRegistrarSimplified {
    enum Mode { Open, Auction, Owned, Forbidden, Reveal, NotYetAvailable }

    function entries(bytes32 _hash) public view returns (Mode, address, uint, uint, uint);
    function transfer(bytes32 _hash, address _newOwner) public;
}


/**
 * @dev DeedHolder provides a way for owners of ENS deeds to restrict their
 *      ability to make changes to a name they own. Once ownership of a deed is
 *      transferred to DeedHolder, the original owner may not do anything with
 *      the deed other than transfer ownership to another account until the
 *      registrar is upgraded, at which point they may claim back ownership of
 *      the deed. The transfer function allows owners to precommit to an upgrade
 *      path before the new registrar is deployed.
 *      Designed to be used with the initially deployed ENS and
 *      HashRegistrarSimplified contracts.
 *
 * Adapted from Nick Johnson's DeedHolder:
 *   https://gist.github.com/Arachnid/3acaf6ed437ee79e8e894b2ce5e82441
 */
contract DeedHolder {
    IHashRegistrarSimplified public registrar;
    bytes32 public registrarNode;

    IENS internal ens;
    mapping(bytes32=>address) private owners;

    event TransferDeed(bytes32 indexed node, address indexed newOwner);

    modifier onlyDeedOwner(bytes32 _node) {
        require(owner(_node) == msg.sender);
        _;
    }

    modifier newRegistrar() {
        require(ens.owner(registrarNode) != address(registrar));
        _;
    }

    constructor(address _ens, bytes32 _registrarNode) public {
        ens = IENS(_ens);
        registrarNode = _registrarNode;
        registrar = IHashRegistrarSimplified(ens.owner(registrarNode));
    }

    /**
     * @dev Claims back the deed after a registrar upgrade.
     * @param _node The node hash of the deed to transfer.
     */
    function claim(bytes32 _node) public onlyDeedOwner(_node) newRegistrar {
        registrar.transfer(_node, msg.sender);
    }

    /**
     * @dev owner returns the address of the account that owns a deed. Initially
     *      this is the owner of the deed according to the registry, or the
     *      previousOwner if ownership has already been transferred to this
     *      contract. Afterwards, the owner may transfer control to anther account.
     * @param _node The node hash of the deed to check.
     * @return The address owning the deed.
     */
    function owner(bytes32 _node) public view returns(address) {
        if (owners[_node] != 0) {
            return owners[_node];
        }
        var (, deedAddress, , ,) = registrar.entries(_node);

        var deed = IDeed(deedAddress);
        var deedOwner = deed.owner();
        if (deedOwner == address(this)) {
            return deed.previousOwner();
        }
        return deedOwner;
    }

    /**
     * @dev Transfers control of a deed to a new account.
     * @param _node The node hash of the deed to transfer.
     * @param _newOwner The address of the new owner.
     */
    function transfer(bytes32 _node, address _newOwner) public onlyDeedOwner(_node) {
        owners[_node] = _newOwner;
        emit TransferDeed(_node, _newOwner);
    }
}
