# Aragon ID

Verifiably safe ENS registrations.

#### 🚨 Everything in this repo is highly experimental software.

It is not secure to use any of this code in production (mainnet) until proper security audits have
been conducted. It can result in irreversible loss of funds.

## Why

Aragon users, as well as most blockchain users in general, are plagued by [Zooko's Triangle](https://en.wikipedia.org/wiki/Zooko%27s_triangle)—
addresses are secure and decentralized, but not human-friendly. Aside from being the most important
of the three for wide-adoption, it should also be noted that human-friendliness may be considered an
aspect of security: cryptographic addresses have been shown to be easy for users to innocently
mistake and [attackers to maliciously spoof](https://blog.gridplus.io/hardware-wallet-vulnerabilities-f20688361b88).

Although several projects are building services to address this problem, such as [uPort](https://www.uport.me/)
and [Civic](https://www.civic.com/), none are yet mature or readily available for mass-market
adoption. In light of this, Aragon ID is a simple identity system to bridge the gap until such
projects are ready. It leverages the existing [ENS](https://ens.domains/) infrastructure to securely
provide two-way, first-in-first-served mappings of addresses to `<name>.aragonid.eth` identifiers.
Afterwards, users will be able to resolve and reverse-resolve any `<name>.aragonid.eth` to an
address and trust that their name registrations are safely in their own control.

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

At its heart, Aragon ID is a collection of contracts that mitigate this lack of security for
registrants of a subnode. It is heavily influenced by [prior work from Nick Johnson](https://gist.github.com/Arachnid/3acaf6ed437ee79e8e894b2ce5e82441).

### In an Aragon Client

New users of Aragon should be recommended to register a human-friendly name under
`<name>.aragonid.eth` if they don't already have an ENS identifier associated with their address.
While the registration process is initially free and first-in-first-served, in the event of bad
actors or high demand, Aragon may require users to burn a number of [Aragon Network Tokens](https://github.com/aragon/aragon-network-token)
or another token as a cost of registration.

To fully register a name, two transactions from the user are required; unfortunately, there is no
secure way to to create a two-way registration (both address-to-name and name-to-address resolvable)
for a user in one transaction. As such, registration should first occur in the "forward" direction,
through the deployed [FIFSBurnableRegistrar](#fifsburnableregistrar-is-fifsresolvingregistrar) for
`aragonid.eth`, to secure a name. On its success, the "reverse" registration should be then be sent
to the existing [ENS Reverse Registrar](http://docs.ens.domains/en/latest/userguide.html#reverse-name-resolution).

Note that users have full control of their `<name>.aragonid.eth` subnode, and their registration may
be altered in the event of a transfer. Before using an identifier, Aragon clients should first check
that the address it resolves to has not changed.

## Future work

Although Aragon previously [integrated with Keybase](https://blog.aragon.one/how-aragon-approaches-identity-and-the-ethereum-keybase-resolver-d548133e4a26),
the existence of ENS now allows us to build an identity system that avoids relying on a centralized
3rd party. In doing so, we lost a number of features that were previously provided by Keybase, such
as off-chain storage (e.g. profile photos or other service identitifers). In the future, we plan to
integrate Aragon ID with decentralized off-chain storage services, such as [Swarm](https://github.com/ethersphere/swarm)
or [IPFS](https://ipfs.io/), to provide such functionality.

Finally, in the wake of upcoming identity services like uPort and Civic, it should be noted that
Aragon ID works at the most basic level of Ethereum identities: account addresses. This means that
users in the future will be able to associate their Aragon ID identifier to any identity that would
be provided through a service, and vice-versa. Future users who come to Aragon with an existing
identity may even opt to skip the Aragon ID registration process altogether.

As an example, in the case of the ongoing [standardization of Ethereum identities](https://github.com/ethereum/EIPs/issues/725),
a user of Aragon could be represented by an ERC725 identity contract that is registered to an Aragon
ID identifier. This identity contract would have a resolvable name and address, be allowed to
interact with an Aragon organization via its `ACTION` keys, and be able to prove various details
about itself to an organization via its held [claims](https://github.com/ethereum/EIPs/issues/735).
In the future, an Aragon organization, possibly through a future [Aragon app](http://wiki.aragon.one/dev/apps/),
could also be a claims issuer for identities—the most basic of which could be claims about
membership or administration (e.g. "Brett Sun is the general director of Aradentity Inc.").

## Contracts

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

## Installing (for Web3 projects)

**Note**: Exported ABIs are coming, so hang tight :)

## Developing

```sh
npm install
npm test
```
