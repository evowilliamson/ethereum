var Splitter = artifacts.require("./Splitter.sol");

const Promise = require('bluebird');
Promise.promisifyAll(web3.eth, { suffix: "Promise" });
web3.eth.getAccounts(function(err, _accounts) { accounts = _accounts; })

var tryCatch = require("./exceptions.js").tryCatch;
var errTypes = require("./exceptions.js").errTypes;
var gasPrice = 100000000000;
var totalAmount = 10000000000000000;
var splitAmount = 4000000000000000

function getGasUsedInWei(txObj) {
  return gasPrice * txObj.receipt.gasUsed;
}

/**
 * Use this method to make the BigNumber smaller so to avoid overflowing when adding numbers
 * @param {*} number 
 */
function div(number) {
	return number / 1000;
} 

function getContractBalance() {
  return Splitter.deployed().then(function(instance) {
    return web3.eth.getBalancePromise(instance.address);
  }).then(function(balance) {
    return balance
  });
}

contract('Splitter', function(accounts) {

  describe("Splitting the money", function() {

    it("should generate an error when trying to do a split on a deactivated contract", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.deactivate({ from: accounts[0] });
      }).then(function() {
        tryCatch(splitter.split(
          accounts[1], accounts[2],
          {from: accounts[0], value: totalAmount, gasPrice: gasPrice}), errTypes.revert);
      });
    });

    it("should put 100000000000 wei in the Splitter contract", function() {
        return Splitter.deployed().then(function(instance) {
          splitter = instance;
          return splitter.activate({ from: accounts[0] });
        }).then(function() {          
          return splitter.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, gasPrice: gasPrice});
        }).then(function() {
          return getContractBalance();
        }).then(function(balance) {
          assert.equal(balance.toNumber(), totalAmount, totalAmount + " wasn't in the Splitter contract");
        });
      });
    });

  describe("Withdrawing the money", function() {
    it("should not allow the withdrawal of part of the money when the contract is deactivated", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.deactivate({ from: accounts[0] });
      }).then(function() {
        tryCatch(splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice }), errTypes.revert);
      });
    });

    it("should activate contract again", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.activate({ from: accounts[0] });
      });
    });

    it("should allow the withdrawal of part of the money by first benifciary", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalance(accounts[1]);
      }).then(function(balance) {
        balanceBefore = balance.toNumber();
        return splitter.withdraw(splitAmount, { from: accounts[1], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj;
        return web3.eth.getBalance(accounts[1]);
      }).then(function(balance) {
        balanceAfter = balance.toNumber();
        assert.equal(
          div(balanceBefore) + div(splitAmount), 
          div(balanceAfter) + div(getGasUsedInWei(txObj)), 
          "Benifciary did not withdraw " + splitAmount);
      });
    });

    it("should allow the withdrawal of part of the money by second benifciary", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalance(accounts[2]);
      }).then(function(balance) {
        balanceBefore = balance.toNumber();
        return splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj;
        return web3.eth.getBalance(accounts[2]);
      }).then(function(balance) {
        balanceAfter = balance.toNumber();
        assert.equal(
          div(balanceBefore) + div(splitAmount), 
          div(balanceAfter) + div(getGasUsedInWei(txObj)), 
          "Benifciary did not withdraw " + splitAmount);
      });
    });

    it("should generate an error when any benifciary tries to withdraw again with an " + 
      "amount that exceeds the balance in the contract", function() {
      return Splitter.deployed().then(function(instance) {
        tryCatch(instance.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice }), errTypes.revert);
      });
    });

  }); 

});