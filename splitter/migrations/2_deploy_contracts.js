const Splitter = artifacts.require("./Splitter.sol");
const SimpleStorage = artifacts.require("./SimpleStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(Splitter);
  deployer.deploy(SimpleStorage);
};
