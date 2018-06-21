const Splitter = artifacts.require("./Splitter.sol");
const BigNumber = require('bignumber.js');
const Promise = require('bluebird');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
web3.eth.getAccounts(function(err, _accounts) { accounts = _accounts; })

var tryCatch = require("./exceptions.js").tryCatch;
var errTypes = require("./exceptions.js").errTypes;
var gasPrice = 100000000000;
var totalAmount = 10000000000000000;
var splitAmount = 4000000000000000;

function getGasUsedInWei(txObj) {
  return gasPrice * txObj.receipt.gasUsed;
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
      let splitter;
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
      let splitter;
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.activate({ from: accounts[0] });
      }).then(function(txObj) {          
        assert.strictEqual(txObj.logs[0].event, "ActivateContract");
        return splitter.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, gasPrice: gasPrice});
      }).then(function(txObj) {
        assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
        return getContractBalance();
      }).then(function(balance) {
        assert.strictEqual(balance.toString(10), totalAmount.toString(10), totalAmount + " wasn't in the Splitter contract");
      });
    });
  });

  describe("Withdrawing the money", function() {
    it("should not allow the withdrawal of part of the money when the contract is deactivated", function() {
      let splitter;
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.deactivate({ from: accounts[0] });
      }).then(function() {
        tryCatch(splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice }), errTypes.revert);
      });
    });

    it("should activate contract again", function() {
      let splitter;
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return splitter.activate({ from: accounts[0] });
      }).then(function(txObj) {
        assert.strictEqual(txObj.logs[0].event, "ActivateContract");
      });
    });

    it("should allow the withdrawal of part of the money by first benifciary", function() {
      let splitter;
      let balanceBefore;
      let txObj;
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalancePromise(accounts[1]);
      }).then(function(balance) {
        balanceBefore = balance;
        return splitter.withdraw(splitAmount, { from: accounts[1], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj
        assert.strictEqual(txObj.logs[0].event, "MoneyWithdrawnBy");
        return web3.eth.getBalancePromise(accounts[1]);
      }).then(function(balance) {
        let balanceAfter = balance;
        assert.strictEqual(
          new BigNumber(balanceBefore).plus(new BigNumber(splitAmount)).toString(10), 
          new BigNumber(balanceAfter).plus(new BigNumber(getGasUsedInWei(txObj))).toString(10), 
          "Benifciary did not withdraw " + splitAmount);
      });
    });

    it("should allow the withdrawal of part of the money by first benifciary", function() {
      let splitter;
      let balanceBefore;
      let txObj;
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return web3.eth.getBalancePromise(accounts[2]);
      }).then(function(balance) {
        balanceBefore = balance;
        return splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj
        assert.strictEqual(txObj.logs[0].event, "MoneyWithdrawnBy");
        return web3.eth.getBalancePromise(accounts[2]);
      }).then(function(balance) {
        let balanceAfter = balance;
        assert.strictEqual(
          new BigNumber(balanceBefore).plus(new BigNumber(splitAmount)).toString(10), 
          new BigNumber(balanceAfter).plus(new BigNumber(getGasUsedInWei(txObj))).toString(10), 
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

  describe("Splitting the money again against same contract", function() {
    it("should put 100000000000 wei in the Splitter contract", function() {
      let splitter;
      let balanceBefore;
      return Splitter.deployed().then(function(instance) {
        splitter = instance;
        return getContractBalance();
      }).then(function(balance) {
        balanceBefore = balance;
        return splitter.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, gasPrice: gasPrice});
      }).then(function(txObj) {
        assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
        return getContractBalance();
      }).then(function(balance) {
        let balanceAfter = balance;
        assert.strictEqual(
          new BigNumber(balanceBefore).plus(new BigNumber(totalAmount)).toString(10),
          new BigNumber(balanceAfter).toString(10),
          totalAmount + " wasn't in the Splitter contract");
      });
    });
  });

});