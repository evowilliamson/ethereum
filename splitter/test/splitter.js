var Splitter = artifacts.require("./Splitter.sol");

const Promise = require('bluebird');
Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });
web3.eth.getAccountsPromise().then(_accounts => accounts = _accounts);

var tryCatch = require("./exceptions.js").tryCatch;
var errTypes = require("./exceptions.js").errTypes;
var gasPrice = 100000000000;
var totalAmount = 10000000000000000;
var splitAmount = 4000000000000000
var leftOverInContract = totalAmount - 2*(splitAmount);

function getGasUsedInWei(txObj) {
  return gasPrice * txObj.receipt.gasUsed;
}

contract('Splitter', function(accounts) {

  describe("Splitting the money", function() {
    it("should put 1000000 wei in the Splitter contract", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, gasPrice: gasPrice});
      }).then(function() {
        return splitter.getBalance();
      }).then(function(balance) {
        assert.equal(balance.toNumber(), totalAmount, totalAmount + " wasn't in the Splitter contract");
      });
    });

    it("should generate an error when trying to do a split on the same contract again", function() {
      return Splitter.deployed().then(function(instance) {
        tryCatch(instance.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, gasPrice: gasPrice}), errTypes.revert);
      });
    });
  });

  describe("Withdrawing the money", function() {
    it("should allow the withdrawal of part of the money by first benifciary", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalancePromise(accounts[1]);
      }).then(function(balance) {
        balanceBefore = balance.toNumber();
        return splitter.withdraw(splitAmount, { from: accounts[1], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj;
        return web3.eth.getBalancePromise(accounts[1]);
      }).then(function(balance) {
        balanceAfter = balance.toNumber();
        assert.equal(balanceBefore + splitAmount , balanceAfter + getGasUsedInWei(txObj), "Benifciary did not withdraw " + splitAmount);
      });
    });

    it("should allow the withdrawal of part of the money by second benifciary", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalancePromise(accounts[2]);
      }).then(function(balance) {
        balanceBefore = balance.toNumber();
        return splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj;
        return web3.eth.getBalancePromise(accounts[2]);
      }).then(function(balance) {
        balanceAfter = balance.toNumber();
        assert.equal(balanceBefore + splitAmount , balanceAfter + getGasUsedInWei(txObj), "Benifciary did not withdraw " + splitAmount);
      });
    });

    it("should generate an error when any benifciary tries to withdraw again with an amount that exceeds the balance in the contract", function() {
      return Splitter.deployed().then(function(instance) {
        tryCatch(instance.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice }), errTypes.revert);
      });
    });

  }); 

  describe("Killing the contract", function() {
    it("should generate an error when any person other than the owner tries to kill the contract", function() {
      return Splitter.deployed().then(function(instance) {
        tryCatch(instance.destruct({ from: accounts[2], gasPrice: gasPrice }), errTypes.revert);
      });
    });

    // At this point, 2000000000000000 is left over in the contract. Upon killing, this amount should be sent to the owner
    it("should allow the destruction of the contract when the owner initiates the action", function() {
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalancePromise(accounts[0]);
      }).then(function(balance) {
        balanceBefore = balance.toNumber();
        return splitter.destruct({ from: accounts[0], gasPrice: gasPrice })
      }).then(function(_txObj) {
        txObj = _txObj;
        return web3.eth.getBalancePromise(accounts[0]);
      }).then(function(balance) {
        balanceAfter = balance.toNumber();
        assert.equal(balanceBefore + leftOverInContract , balanceAfter + getGasUsedInWei(txObj), "Owner didn't get the money left in the contract " + leftOverInContract);
      });
    });

    it("should generate an error when trying to interact with the killed contract", function() {
      return Splitter.deployed().then(function(instance) {
        tryCatch(splitter.getBalance(), errTypes.revert);
      });
    });

  }); 

});
