require("@nomiclabs/hardhat-ethers");
require("./tasks/transfer-ens");
require("./tasks/impersonate");

const { homedir } = require("os");
const { join } = require("path");

// get the network url and account private key from ~/.aragon/network_key.json
function getNetworkConfig(network) {
  try {
    const { rpc, keys } = require(join(
      homedir(),
      `.aragon/${network}_key.json`
    ));
    return { url: rpc, accounts: keys };
  } catch (_) {
    return { url: "", accounts: [] };
  }
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.4.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // TODO: target average DAO use
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
    },
    mainnet: getNetworkConfig("mainnet"),
    rinkeby: getNetworkConfig("rinkeby"),
    mumbai: getNetworkConfig("mumbai"),
    matic: getNetworkConfig("matic"),
  },
};
