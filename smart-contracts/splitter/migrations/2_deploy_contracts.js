const Splitter = artifacts.require("./Splitter.sol");
const SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer) {
  deployer.deploy(Splitter);
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, Splitter);
};
