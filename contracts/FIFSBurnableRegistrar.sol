pragma solidity 0.4.18;

import "./interface/ApproveAndCallReceiver.sol";
import "./zeppelin/ERC20.sol";
import "./zeppelin/Ownable.sol";
import "./FIFSResolvingRegistrar.sol";


/**
 * A registrar that allocates subdomains to the first person who claims them by burning the required
 * amount of tokens.

 * Note: requires the token to support the `approveAndCall()` interface.
 */
contract FIFSBurnableRegistrar is Ownable, ApproveAndCallReceiver, FIFSResolvingRegistrar {
    ERC20 public burningToken;
    uint256 public registrationCost;

    address private constant BURN_ADDRESS = 0xdead;

    /**
     * Constructor.
     * @param _ensAddr The address of the ENS registry.
     * @param _resolver The address of the default resolver to use for subdomains.
     * @param _node The node that this registrar administers.
     * @param _burningToken The token to be burned for claiming addresses.
     * @param _startingCost The initial cost of claiming an address.
     */
    function FIFSBurnableRegistrar(
        AbstractENS _ensAddr,
        AbstractPublicResolver _resolver,
        bytes32 _node,
        ERC20 _burningToken,
        uint256 _startingCost
    ) public Ownable FIFSResolvingRegistrar(_ensAddr, _resolver, _node) {
        burningToken = _burningToken;
        registrationCost = _startingCost;
    }

    /**
     * `approveAndCall()` callback.
     * Expects to register a subdomain via an external call to `register()` or
     * `registerWithResolver()` if the `_amount` is greater than or equal to `registrationCost`.
     * Burns `registrationCost` number of tokens from the sender.
     * @param _from The address of the claimer.
     * @param _amount The amount of tokens approved by the claimer.
     * @param _ The address of the token (unused).
     * @param _data An encoded call to `registerWithResolver()`.
     */
    function receiveApproval(address _from, uint256 _amount, address _, bytes _data) external {
        require(msg.sender == address(burningToken));

        // Make the external call and if successful, burn the tokens
        require(this.call(_data));
    }

    /**
     * Set the token to be burnt.
     * @param _burningToken The token to be burnt.
     */
    function setBurningToken(ERC20 _burningToken) external onlyOwner {
        burningToken = _burningToken;
    }

    /**
     * Set registration cost (in tokens) for claiming a subdomain.
     * @param _cost The cost (in tokens).
     */
    function setRegistrationCost(uint256 _cost) external onlyOwner {
        registrationCost = _cost;
    }

    /**
     * Register a subdomain with the default resolver if it hasn't been claimed yet.
     * Overwrites `FIFSResolvingRegistrar.register()`, to avoid polymorphism.
     * @param _subnode The hash of the label to register.
     * @param _owner The address of the new owner.
     */
    function register(bytes32 _subnode, address _owner) external {
        registerWithResolver(_subnode, _owner, defaultResolver);
    }

    /**
     * Register a subdomain if it hasn't been claimed yet.
     * Requires the _owner to have approved at least the amount of the requiredCost to this
     * contract for the burningToken.
     * @param _subnode The hash of the label to register.
     * @param _owner The address of the new owner.
     * @param _resolver The address of the resolver.
     */
    function registerWithResolver(bytes32 _subnode, address _owner, AbstractPublicResolver _resolver) public {
        super.registerWithResolver(_subnode, _owner, _resolver);

        // Burn tokens
        if (registrationCost > 0) {
            require(burningToken.transferFrom(_owner, BURN_ADDRESS, registrationCost));
        }
    }
}
