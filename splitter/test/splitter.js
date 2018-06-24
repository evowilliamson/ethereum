const Splitter = artifacts.require("./Splitter.sol");
const BigNumber = require('bignumber.js');
const Promise = require('bluebird');
  
contract('Splitter', function(accounts) {

  Promise.promisifyAll(web3.eth, { suffix: "Promise" });
  
  const expectedExceptionPromise = require("./expected_exception_ganache_and_geth.js");  
  const gasPrice = 100000000000;
  const totalAmount = 10000000000000000;
  const splitAmount = 4000000000000000;
  
  let splitter;

  function getGasUsedInWei(txObj) {
    return gasPrice * txObj.receipt.gasUsed;
  }
  
  function getContractBalance() {
      return web3.eth.getBalancePromise(splitter.address);
  }

  beforeEach("should deploy a new instance", function() {
    return Splitter.new({ from: accounts[0] })
        .then(instance => splitter = instance);
  });

  describe("Deactivate a contract", function() {
    it("should allow the deactivation of an active contract", function() {
      return splitter.deactivate({ from: accounts[0] })
        .then(function(txObj) {
        assert.strictEqual(txObj.logs[0].event, "DeactivateContract");
        assert.strictEqual(txObj.logs[0].args.owner, accounts[0]);
      });
    });

    it("should allow the activation of an inactive contract", function() {
      return splitter.deactivate({ from: accounts[0] })
        .then(function() {
        return splitter.activate({ from: accounts[0] });
        }).then(function(txObj) {
          assert.strictEqual(txObj.logs[0].event, "ActivateContract");
        // Check that the owner really activated it, not somebody else
        assert.strictEqual(txObj.logs[0].args.owner, accounts[0]);
      });
    });

  });

  describe("Splitting the money", function() {
    it("should generate an error when trying to do a split on a deactivated contract", function() {
      return splitter.deactivate({ from: accounts[0] })
        .then(function() {
        return expectedExceptionPromise(function () {
          return splitter.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, 
            gasPrice: gasPrice});
        });
      });
    });

    it("should put {totalAmount} wei in the Splitter contract", function() {
      return getContractBalance()
        .then(function (balance) {
        balanceBefore = balance;
        return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount,
            gasPrice: gasPrice });
      }).then(function (txObj) {
        assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
        assert.strictEqual(txObj.logs[0].args.donator, accounts[0]);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), totalAmount.toString(10));
        return getContractBalance();
      }).then(function (balance) {
        let balanceAfter = balance;
        assert.strictEqual
          (totalAmount.toString(10),
          new BigNumber(balanceAfter).minus(new BigNumber(balanceBefore)).toString(10), 
            totalAmount.toString(10) + " wasn't in the Splitter contract, balance before: " + 
              balanceBefore + ", balance after: " + balanceAfter);
      });
    });

    it("should put {totalAmount} wei in the Splitter contract, twice, when doing two splits " + 
       "by different donators", function() {
      return getContractBalance()
        .then(function (balance) {
        balanceBefore = balance;
        return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, 
            gasPrice: gasPrice });
      }).then(function (txObj) {
        return splitter.split(accounts[4], accounts[5], { from: accounts[3], value: totalAmount, 
            gasPrice: gasPrice });
      }).then(function (txObj) {
        assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
        assert.strictEqual(txObj.logs[0].args.donator, accounts[3]);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), totalAmount.toString(10));
        return getContractBalance();
      }).then(function (balance) {
        let balanceAfter = balance;
        assert.strictEqual
          (new BigNumber(totalAmount).multipliedBy(2).toString(10),
          new BigNumber(balanceAfter).minus(new BigNumber(balanceBefore)).toString(10), 
          new BigNumber(totalAmount).multipliedBy(2).toString(10) + " wasn't in the Splitter");
      });
    });

    it("should put {totalAmount}*2 wei in the Splitter contract when doing two splits", function() {
      return getContractBalance()
        .then(function (balance) {
        balanceBefore = balance;
        return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, 
          gasPrice: gasPrice });
      }).then(function () {
        return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, 
          gasPrice: gasPrice });
      }).then(function (txObj) {
        assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
        assert.strictEqual(txObj.logs[0].args.donator, accounts[0]);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), totalAmount.toString(10));
        return getContractBalance();
      }).then(function (balance) {
        let balanceAfter = balance;
        assert.strictEqual
          (new BigNumber(totalAmount).multipliedBy(2).toString(10),
          new BigNumber(balanceAfter).minus(new BigNumber(balanceBefore)).toString(10), 
            new BigNumber(totalAmount).multipliedBy(2).toString(10) + " wasn't in the Splitter contract");
      });
    });
  });

  describe("Withdrawing the money", function() {
    it("should not allow the withdrawal of part of the money when the contract is " + 
      "deactivated", function() {
      return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, 
        gasPrice: gasPrice }).then(function (txObj) {
        return splitter.deactivate({ from: accounts[0] });
      }).then(function() {
        return expectedExceptionPromise(function () {
          return splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice });
        });
      });
    });

    it("should allow the withdrawal of part of the money by one benifciary", function() {
      let balanceBefore;
      let txObj;
      return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, 
        gasPrice: gasPrice }).then(function (txObj) {
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
          "Benifciary did not withdraw " + splitAmount.toString(10));
      });      
    });

    it("should allow the withdrawal of part of the money by a second benifciariy", function() {
      let balanceBefore;
      let txObj;
      return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, 
        gasPrice: gasPrice }).then(function (txObj) {
        return splitter.withdraw(splitAmount, { from: accounts[1], gasPrice: gasPrice });
      }).then(function() {
        return web3.eth.getBalancePromise(accounts[2]);
      }).then(function(balance) {
        balanceBefore = balance;
        return splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice });
      }).then(function(_txObj) {
        txObj = _txObj
        return web3.eth.getBalancePromise(accounts[2]);
      }).then(function(balance) {
        let balanceAfter = balance;
        assert.strictEqual(
          new BigNumber(balanceBefore).plus(new BigNumber(splitAmount)).toString(10), 
          new BigNumber(balanceAfter).plus(new BigNumber(getGasUsedInWei(txObj))).toString(10), 
          "Benifciary did not withdraw " + splitAmount.toString(10));
      });      
    });

    it("should not allow the withdrawal of funds that are not available for a " + 
      "benifciary", function() {
      return splitter.split(accounts[1], accounts[2], 
        { from: accounts[0], value: totalAmount, gasPrice: gasPrice })
        .then(function () {
        return expectedExceptionPromise(function () {
          return splitter.withdraw(new BigNumber(totalAmount).multipliedBy(2).toString(10), 
            { from: accounts[2], gasPrice: gasPrice });
        });
      });
    });
  });

});
