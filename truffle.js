require('babel-core/register')
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')

let rinkebyProvider = {}

const mnemonic = 'stumble story behind hurt patient ball whisper art swift tongue ice alien';

if (process.env.LIVE_NETWORKS) {
  try {
    rinkebyProvider = new HDWalletProvider(...require(require('homedir')()+'/.secret-rinkeby'))
  } catch (e) {
    rinkebyProvider = new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io')
  }
}

module.exports = {
  networks: {
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    devnet: {
      host: "localhost",
      port: 8535,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      network_id: 4,
      provider: rinkebyProvider,
      gas: 6.9e6,
      gasPrice: 15000000001
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,
      gas: 0xffffffffff,
      gasPrice: 0x01
    },
    rpc: {
      network_id: 15,
      host: 'localhost',
      port: 8545,
      gas: 6.9e6,
    },
  }
};
