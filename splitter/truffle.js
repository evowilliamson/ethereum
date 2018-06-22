module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 100000000000
    },
    net42: {
      host: "localhost",
      port: 8545,
      network_id: 42,
      gasPrice: 100000000000
    },
    ropsten: {
      network_id: 3,
      host: "localhost",
      port: 8545,
      gas: 2900000
      }    
  }
};
