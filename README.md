# aragon-id

Collection of contracts for verifiably safe ENS registrations.

#### 🚨 Everything in this repo is highly experimental software.
It is not secure to use any of this code in production (mainnet) until proper security audits have
been conducted. It can result in irreversible loss of funds.

## Usage

As summarized by [Dan Finlay](https://medium.com/@danfinlay/the-future-of-ens-subdomain-markets-e5b7d98a18d3)
and [Nick Johnson](https://medium.com/the-ethereum-name-service/results-of-the-first-ens-workshop-ab5e8d39fb79)
as part of the first ENS workshop, ENS subdomain registrations are, by default, liable to be changed
by the owner of the domain at any time. The domain owner has the power to change the details of any
subdomains and can even transfer ownership of the domain back to themselves by calling the [auction
registrar's `finalizeAuction()`](https://github.com/ethereum/ens/blob/master/contracts/HashRegistrarSimplified.sol#L458)
at any time. This problem persists all the down way to TLDs, as the ENS root is controlled by the
ENS multisig.

`aragon-id` contains a collection of contracts meant to be used together to mitigate this issue for
users assigned to a subdomain. It is heavily influenced by [prior work from Nick Johnson](https://gist.github.com/Arachnid/3acaf6ed437ee79e8e894b2ce5e82441).

### Contracts

#### DeedHolder

Slightly modified version of [Nick Johnson's `DeedHolder`](https://gist.github.com/Arachnid/3acaf6ed437ee79e8e894b2ce5e82441).

The `DeedHolder` acts as a holding repository for deeds (created by the auction registrar for each
registration). Once transferred, deeds, and their corresponding ENS domains, are locked to the
`DeedHolder` until the original registrar is replaced. This prevents the domain owner from being
able to both control the ENS domain directly, as well as disabling the ability to call the
registrar's `finalizeAuction()` to re-gain full control of the domain.

Functions:
    - `claim(bytes32 node)`: Re-claim the deed from the `DeedHolder` when the original registrar has
      been replaced by a new registrar
    - `owner(bytes32 node) returns(address)`: Returns the current owner of the deed
    - `transfer(bytes32 node, address newOwner)`: Transfer ownership of the deed

#### DelegatingDeedHolder (is DeedHolder)

A `DeedHolder` that allows the owner of the deed to set a "manager" for the domain (i.e. become the
owner of the ENS node) to allow an external party or contract to manage subdomain registrations.

Using the `DeedHolder` by itself will make it impossible for any future changes to be made to the
ENS node, as the process of transferring the deed also sets the `DeedHolder` as the owner of the
node.

Functions:
    - `setManager(bytes32 node, address manager)`: Set the manager for the ENS node tied to the
      deed. Preferrably a registrar contract (see below).

#### FIFSResolvingRegistrar

A [`FIFSRegistrar`](https://github.com/ethereum/ens/blob/master/contracts/FIFSRegistrar.sol)
implementation that also sets the resolver (and the corresponding address mapping, if the registry
supports the address interface) when a subdomain is claimed.

Functions:
    - `register(bytes32 subnode, address owner)`: Register the subnode with the default resolver, if
      not already claimed
    - `registerWithResolver(bytes32 subnode, address owner, AbstractPublicResolver resolver)`:
      Register the subnode with the given resolver, which must conform to the [Resolver spec](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-137.md#resolver-specification)

#### FIFSBurnableRegistrar (is FIFSResolvingRegistrar)

A ownable `FIFSResolvingRegistrar` that allows the owner to set a price (in a token) for registering
subdomains. Tokens used in this way will be burned by being sent to `0xdead`. Supports the
`ApproveAndCallReceiver` interface.

Functions:
    - `register(bytes32 subnode, address owner)`: Register the subnode with the default resolver, if
      the `owner` has pre-approved the contract for at least the registration cost
    - `registerWithResolver(bytes32 subnode, address owner, AbstractPublicResolver resolver)`:
      Register the subnode with the given resolver, which must conform to the [Resolver spec](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-137.md#resolver-specification),
      if the `owner` has pre-approved the contract for at least the registration cost
    - `setBurningToken(ERC20 burningToken)`: Set the token to be burned when there is a registration
      cost
    - `setRegistrationCost(uint256 cost)`: Set the cost of registering a subdomain
    - `receiveApproval(address from, uint256 amount, address token, bytes data)`:
      `ApproveAndCallReceiver` implementation, for tokens that support the `ApproveAndCall`
      interface

### Example

The `DeedHolder` and `DelegatingDeedHolder` contracts are meant to be used for the initially
deployed set of ENS contracts (specifically, the [auction registrar](https://github.com/ethereum/ens/blob/master/contracts/HashRegistrarSimplified.sol#L103)). Assuming those are available, your flow will probably be
something like (in pseudo-JS):

```js
// Contract instances
const ens = '...'
const publicResolver = '...'
const auctionRegistrar = '...'
const token = '...'

// Deploy contracts
const deedHolder = DelegatingDeedHolder.new(ens.address, namehash('eth'))
const domainRegistrar = FIFSBurnableRegistrar.new(
    ens.address,
    publicResolver.address,
    namehash('domain.eth'),
    token.address,
    10
)

// Transfer deed ownership to the deed holder and set up the domainRegistrar as the manager
auctionRegistrar.transfer(web3.sha3('domain'), deedHolder.address)
deedHolder.setManager(web3.sha3('domain'), domainRegistrar.address)

// Register via token.approve()
token.approve(domainRegistrar.address, 10, { from: '<owner address>' })
domainRegistrar.register(web3.sha3('subDomain'), '<owner address>')

// Register via token.approveAndCall()
token.approveAndCall(domainRegistrar.address, 10, '<call data for register(bytes32,address)>')

// Eventually reclaim ownership of deed, when the registrar has been updated
deedHolder.claim(web3.sha3('domain'))
```

## Installing

```sh
npm install
npm test
```

**Note**: Exported ABIs are coming, so hang tight :)
