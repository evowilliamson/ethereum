const CreditService = artifacts.require("./CreditService.sol");
const Queue = artifacts.require("./Queue.sol")

module.exports = function(deployer) {
  deployer.deploy(Queue);
  deployer.link(Queue, CreditService);
  deployer.deploy(CreditService);
};
