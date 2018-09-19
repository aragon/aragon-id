pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/ens/AbstractENS.sol";
import "./ens/IPublicResolver.sol";
import "./IFIFSResolvingRegistrar.sol";


/**
 * A registrar that allocates subdomains and sets resolvers to the first person to claim them.
 *
 * Adapted from ENS' FIFSRegistrar:
 *   https://github.com/ethereum/ens/blob/master/contracts/FIFSRegistrar.sol
 */
contract FIFSResolvingRegistrar is IFIFSResolvingRegistrar {
    bytes32 public rootNode;
    AbstractENS internal ens;
    IPublicResolver internal defaultResolver;

    bytes4 private constant ADDR_INTERFACE_ID = 0x3b3b57de;

    event ClaimSubdomain(bytes32 indexed subnode, address indexed owner, address indexed resolver);

    /**
     * Constructor.
     * @param _ensAddr The address of the ENS registry.
     * @param _defaultResolver The address of the default resolver to use for subdomains.
     * @param _node The node that this registrar administers.
     */
    constructor(AbstractENS _ensAddr, IPublicResolver _defaultResolver, bytes32 _node)
        public
    {
        ens = _ensAddr;
        defaultResolver = _defaultResolver;
        rootNode = _node;
    }

    /**
     * Register a subdomain with the default resolver if it hasn't been claimed yet.
     * @param _subnode The hash of the label to register.
     * @param _owner The address of the new owner.
     */
    function register(bytes32 _subnode, address _owner) external {
        registerWithResolver(_subnode, _owner, defaultResolver);
    }

    /**
     * Register a subdomain if it hasn't been claimed yet.
     * @param _subnode The hash of the label to register.
     * @param _owner The address of the new owner.
     * @param _resolver The address of the resolver.
     *                  If the resolver supports the address interface, the subdomain's address will
     *                  be set to the new owner.
     */
    function registerWithResolver(bytes32 _subnode, address _owner, IPublicResolver _resolver) public {
        bytes32 node = keccak256(rootNode, _subnode);
        address currentOwner = ens.owner(node);
        require(currentOwner == address(0));

        ens.setSubnodeOwner(rootNode, _subnode, address(this));
        ens.setResolver(node, _resolver);
        if (_resolver.supportsInterface(ADDR_INTERFACE_ID)) {
            _resolver.setAddr(node, _owner);
        }

        // Give ownership to the claimer
        ens.setOwner(node, _owner);

        emit ClaimSubdomain(_subnode, _owner, address(_resolver));
    }
}
