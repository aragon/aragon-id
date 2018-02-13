const namehash = require('eth-ens-namehash').hash
const keccak256 = require('js-sha3').keccak_256

const FIFSResolvingRegistrar = artifacts.require('FIFSResolvingRegistrar')
const ENS = artifacts.require('AbstractENS')

const owner = '0x4cb3fd420555a09ba98845f0b816e45cfb230983'
const ens = '0xaa0ccb537289d226941745c4dd7a819a750897d0'

const tld = namehash('eth')
const label = '0x'+keccak256('aragonid')
const node = namehash('aragonid.eth')

module.exports = async callback => {
  const publicResolver = await ENS.at(ens).resolver(namehash('resolver.eth'))
  console.log('deploying AragonID')
  const aragonID = await FIFSResolvingRegistrar.new(ens, publicResolver, node)

  console.log('assigning ENS name to AragonID')
  await ENS.at(ens).setSubnodeOwner(tld, label, aragonID.address)

  console.log('assigning owner name')
  await aragonID.register('0x'+keccak256('owner'), owner)

  console.log('===========')
  console.log('Deployed AragonID:', aragonID.address)
}

// Deployed AragonID: 0x9f4984865797213dd4431551114c47bd98be8aac
