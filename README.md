# Aragon ID

Collection of contracts for verifiably safe ENS registrations.

#### 🚨 Everything in this repo is highly experimental software.

It is not secure to use any of this code in production (mainnet) until proper security audits have
been conducted. It can result in irreversible loss of funds.

## Usage

As summarized by [Dan Finlay](https://medium.com/@danfinlay/the-future-of-ens-subdomain-markets-e5b7d98a18d3)
and [Nick Johnson](https://medium.com/the-ethereum-name-service/results-of-the-first-ens-workshop-ab5e8d39fb79)
as part of the first ENS workshop, ENS subnode registrations are, by default, liable to be changed
by the owner of the node at any time. The node owner has the power to change the details of any
subnodes and can even transfer ownership of the node back to themselves by calling the auction
registrar's [`finalizeAuction()`](https://github.com/ethereum/ens/blob/master/contracts/HashRegistrarSimplified.sol#L458)
or [`transfer()`](https://github.com/ethereum/ens/blob/master/contracts/HashRegistrarSimplified.sol#L475)
at any time. This problem persists all the down way to TLDs, as the ENS root is controlled by the
ENS multisig.

`aragon-id` contains a collection of contracts meant to be used together to mitigate this issue for
users assigned to a subnode. It is heavily influenced by [prior work from Nick Johnson](https://gist.github.com/Arachnid/3acaf6ed437ee79e8e894b2ce5e82441).

### Contracts

#### DeedHolder

Slightly modified version of [Nick Johnson's `DeedHolder`](https://gist.github.com/Arachnid/3acaf6ed437ee79e8e894b2ce5e82441).

The `DeedHolder` acts as a holding repository for deeds (created by the auction registrar for each
registration). Once transferred, deeds, and their corresponding ENS nodes, are locked to the
`DeedHolder` until the original registrar is replaced. This prevents the node owner from being able
to control the ENS node directly and also disables their ability to call the registrar's
`finalizeAuction()` or `transfer()` to re-gain full control of the node.

Given that the migration process to the new registrar is unknown at this time and may require
multiple operations, ownership of the deed will need to be transferred to a contract whose logic is
likewise unknown. This new owner in charge of the migration would ideally be decided via some
governance mechanism, such as a community multisig. Once the migration is complete, the deed should
again be locked to ensure that the node cannot be tampered with.

Functions:
    - `claim(bytes32 node)`: Re-claim the deed from the `DeedHolder` when the original registrar has
      been replaced by a new registrar
    - `owner(bytes32 node) returns(address)`: Returns the current owner of the deed
    - `transfer(bytes32 node, address newOwner)`: Transfer ownership of the deed (note that the
      new "owner" still has no access to the deed until it becomes claimable)

#### DelegatingDeedHolder (is DeedHolder)

A `DeedHolder` that allows the owner of the deed to set a "manager" for the node (i.e. become the
owner of the ENS node) to allow an external party or contract to manage subnode registrations.

Using the `DeedHolder` by itself makes it impossible for any future changes to be made to the held
ENS node, as the process of transferring the deed also sets the `DeedHolder` as the owner of the
node.

Functions:
    - `setManager(bytes32 node, address manager)`: Set the manager for the ENS node tied to the
      deed. Preferrably a registrar contract (see below).

#### FIFSResolvingRegistrar

A [`FIFSRegistrar`](https://github.com/ethereum/ens/blob/master/contracts/FIFSRegistrar.sol)
implementation that also sets the resolver (and the corresponding address mapping, if the registry
supports the address interface) when a subnode is claimed.

Functions:
    - `register(bytes32 subnode, address owner)`: Register the subnode with the default resolver, if
      not already claimed
    - `registerWithResolver(bytes32 subnode, address owner, AbstractPublicResolver resolver)`:
      Register the subnode with the given resolver, which must conform to the [Resolver spec](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-137.md#resolver-specification)

#### FIFSBurnableRegistrar (is FIFSResolvingRegistrar)

A ownable `FIFSResolvingRegistrar` that allows the owner to set a price (in a token) for registering
subnodes. Tokens used in this way will be burned by being sent to `0xdead`. Supports the
`ApproveAndCallReceiver` interface.

Functions:
    - `register(bytes32 subnode, address owner)`: Register the subnode with the default resolver, if
      the `owner` has pre-approved the contract for at least the registration cost. This operation
      will fail if burning the token through `token.transferFrom(owner, "0xdead") fails.
    - `registerWithResolver(bytes32 subnode, address owner, AbstractPublicResolver resolver)`:
      Register the subnode with the given resolver, which must conform to the [Resolver spec](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-137.md#resolver-specification),
      if the `owner` has pre-approved the contract for at least the registration cost
    - `setBurningToken(ERC20 burningToken)`: Set the token to be burned when there is a registration
      cost
    - `setRegistrationCost(uint256 cost)`: Set the cost of registering a subnode
    - `receiveApproval(address from, uint256 amount, address token, bytes data)`:
      `ApproveAndCallReceiver` implementation, for tokens that support the `ApproveAndCall`
      interface

### Example

The `DeedHolder` and `DelegatingDeedHolder` contracts are meant to be used for the initially
deployed set of ENS contracts (specifically, the [auction registrar](https://github.com/ethereum/ens/blob/master/contracts/HashRegistrarSimplified.sol#L103)).
Assuming those are available, your flow will probably be something like (in pseudo-JS):

```js
// Contract instances
const ens = '...'
const publicResolver = '...'
const auctionRegistrar = '...'
const token = '...'

// Deploy contracts
const deedHolder = DelegatingDeedHolder.new(ens.address, namehash('eth'))
const nodeRegistrar = FIFSBurnableRegistrar.new(
    ens.address,
    publicResolver.address,
    namehash('node.eth'),
    token.address,
    10
)

// Transfer deed ownership to the deed holder and set up the nodeRegistrar as the manager
auctionRegistrar.transfer(web3.sha3('node'), deedHolder.address)
deedHolder.setManager(web3.sha3('node'), nodeRegistrar.address)

// Register via token.approve()
token.approve(nodeRegistrar.address, 10, { from: '<owner address>' })
nodeRegistrar.register(web3.sha3('subnode'), '<owner address>')

// Register via token.approveAndCall()
token.approveAndCall(nodeRegistrar.address, 10, '<call data for register(bytes32,address)>')

// Eventually reclaim ownership of deed, when the registrar has been updated
deedHolder.claim(web3.sha3('node'))
```

## Developing

```sh
npm install
npm test
```

## Installing (for Web3 projects)

**Note**: Exported ABIs are coming, so hang tight :)
