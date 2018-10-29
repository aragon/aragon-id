const namehash = require('eth-ens-namehash').hash
const keccak256 = require('js-sha3').keccak_256
const logDeploy = require('@aragon/os/scripts/helpers/deploy-logger')
const getAccounts = require('@aragon/os/scripts/helpers/get-accounts')

const globalArtifacts = this.artifacts // Not injected unless called directly via truffle
const globalWeb3 = this.web3 // Not injected unless called directly via truffle
const defaultOwner = process.env.OWNER
const defaultENSAddress = process.env.ENS

const tld = namehash('eth')
const label = '0x'+keccak256('aragonid')
const node = namehash('aragonid.eth')

module.exports = async (
  truffleExecCallback,
  {
    artifacts = globalArtifacts,
    web3 = globalWeb3,
    ensAddress = defaultENSAddress,
    owner = defaultOwner,
    verbose = true
  } = {}
) => {
  const log = (...args) => {
    if (verbose) { console.log(...args) }
  }

  const accounts = await getAccounts(web3)

  log(`Deploying AragonID with ENS: ${ensAddress} and owner: ${owner}`)
  const FIFSResolvingRegistrar = artifacts.require('FIFSResolvingRegistrar')
  const ENS = artifacts.require('AbstractENS')

  const publicResolver = await ENS.at(ensAddress).resolver(namehash('resolver.eth'))
  const aragonID = await FIFSResolvingRegistrar.new(ensAddress, publicResolver, node)
  await logDeploy(aragonID, { verbose })

  log('assigning ENS name to AragonID')
  const ens = ENS.at(ensAddress)

  if (await ens.owner(node) === accounts[0]) {
    log('Transferring name ownership from deployer to AragonID')
    await ens.setOwner(node, aragonID.address)
  } else {
    log('Creating subdomain and assigning it to AragonID')
    try {
      await ens.setSubnodeOwner(tld, label, aragonID.address)
    } catch (err) {
      console.error(
        `Error: could not set the owner of 'aragonid.eth' on the given ENS instance`,
        `(${ensAddress}). Make sure you have ownership rights over the subdomain.`
      )
      throw err
    }
  }

  if (owner) {
    log('assigning owner name')
    await aragonID.register('0x'+keccak256('owner'), owner)
  }

  log('===========')
  log('Deployed AragonID:', aragonID.address)
}
