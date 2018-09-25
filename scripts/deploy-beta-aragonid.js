const namehash = require('eth-ens-namehash').hash
const keccak256 = require('js-sha3').keccak_256

const globalArtifacts = this.artifacts // Not injected unless called directly via truffle
const defaultOwner = process.env.OWNER || '0x4cb3fd420555a09ba98845f0b816e45cfb230983'
const defaultENSAddress = process.env.ENS || '0xfbae32d1cde62858bc45f51efc8cc4fa1415447e'

const tld = namehash('eth')
const label = '0x'+keccak256('aragonid')
const node = namehash('aragonid.eth')

module.exports = async (
  truffleExecCallback,
  {
    artifacts = globalArtifacts,
    ensAddress = defaultENSAddress,
    owner = defaultOwner,
    verbose = true
  } = {}
) => {
  const log = (...args) => {
    if (verbose) { console.log(...args) }
  }

  log(`Deploying AragonID with ENS: ${ensAddress} and owner: ${owner}`)
  const FIFSResolvingRegistrar = artifacts.require('FIFSResolvingRegistrar')
  const ENS = artifacts.require('AbstractENS')

  const publicResolver = await ENS.at(ensAddress).resolver(namehash('resolver.eth'))
  log('deploying AragonID')
  const aragonID = await FIFSResolvingRegistrar.new(ensAddress, publicResolver, node)

  log('assigning ENS name to AragonID')
  await ENS.at(ensAddress).setSubnodeOwner(tld, label, aragonID.address)

  log('assigning owner name')
  await aragonID.register('0x'+keccak256('owner'), owner)

  log('===========')
  log('Deployed AragonID:', aragonID.address)
}

// Deployed AragonID: 0x3a06a6544e48708142508d9042f94ddda769d04f
