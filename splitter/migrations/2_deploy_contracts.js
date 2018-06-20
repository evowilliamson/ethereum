var Splitter = artifacts.require("./Splitter.sol");
var SimpleStorage = artifacts.require("./SimpleStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(Splitter);
  deployer.deploy(SimpleStorage);
};
