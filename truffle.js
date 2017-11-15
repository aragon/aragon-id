require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    }
  }
};
