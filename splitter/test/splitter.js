contract('Splitter', function(accounts) {

  const Splitter = artifacts.require("./Splitter.sol");
  const BigNumber = require('bignumber.js');
  const Promise = require('bluebird');
  
  Promise.promisifyAll(web3.eth, { suffix: "Promise" });
  
  const expectedExceptionPromise = require("./expected_exception_ganache_and_geth.js");  
  const gasPrice = 100000000000;
  const totalAmount = 10000000000000000;
  const splitAmount = 4000000000000000;
  const hugeSplitAmount = 10000000000000000;
  
  let splitter;

  function getGasUsedInWei(txObj) {
    return gasPrice * txObj.receipt.gasUsed;
  }
  
  function getContractBalance() {
      return web3.eth.getBalancePromise(splitter.address);
  }
  
  // function testPositiveSplitContract(accounts) {
  //   let splitter;
  //   let balanceBefore;
  //     return getContractBalance()
  //     .then(function (balance) {
  //     balanceBefore = balance;
  //     return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, gasPrice: gasPrice });
  //   }).then(function (txObj) {
  //     assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
  //     return getContractBalance();
  //   }).then(function (balance) {
  //     let balanceAfter = balance;
  //     assert.strictEqual
  //       (totalAmount.toString(10),
  //       new BigNumber(balanceAfter).minus(new BigNumber(balanceBefore)).toString(10), totalAmount + " wasn't in the Splitter contract");
  //   });
  // }

  function testPositiveActivateContract() {
    let splitter;
    return Splitter.deployed().then(function(instance) {
      splitter = instance;
      return splitter.activate({ from: accounts[0] });
    }).then(function(txObj) {
      assert.strictEqual(txObj.logs[0].event, "ActivateContract");
      // Check that the owner really activated it, not somebody else
      assert.strictEqual(txObj.logs[0].args.owner, accounts[0]);
    });
  }

  beforeEach("should deploy a new instance", function() {
    return Splitter.new({ from: accounts[0] })
        .then(instance => splitter = instance);
  });

  describe("Splitting the money", function() {
    it("should generate an error when trying to do a split on a deactivated contract", function() {
      return splitter.deactivate({ from: accounts[0] })
        .then(function() {
        return expectedExceptionPromise(function () {
          return splitter.split(accounts[1], accounts[2], {from: accounts[0], value: totalAmount, gasPrice: gasPrice});
        });
      });
    });

    it("should have put 100000000000 wei in the Splitter contract", function() {
      return getContractBalance()
      .then(function (balance) {
        balanceBefore = balance;
        return splitter.split(accounts[1], accounts[2], { from: accounts[0], value: totalAmount, gasPrice: gasPrice });
      }).then(function (txObj) {
        assert.strictEqual(txObj.logs[0].event, "MoneySplittedBy");
        assert.strictEqual(txObj.logs[0].args.sender, accounts[0]);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), totalAmount.toString(10));
        return getContractBalance();
      }).then(function (balance) {
        let balanceAfter = balance;
        assert.strictEqual
          (totalAmount.toString(10),
          new BigNumber(balanceAfter).minus(new BigNumber(balanceBefore)).toString(10), 
            totalAmount + " wasn't in the Splitter contract, balance before: " + balanceBefore + ", balance after: " + balanceAfter);
      });
    });

    it("should have put 200000000000 wei in the Splitter contract after two splits", function() {
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
        assert.strictEqual(txObj.logs[0].args.sender, accounts[0]);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), totalAmount.toString(10));
        return getContractBalance();
      }).then(function (balance) {
        let balanceAfter = balance;
        assert.strictEqual
          (new BigNumber(totalAmount).multipliedBy(2).toString(10),
          new BigNumber(balanceAfter).minus(new BigNumber(balanceBefore)).toString(10), 
            new BigNumber(totalAmount).multipliedBy(2) + " wasn't in the Splitter contract");
      });
    });
  });


  // describe("Withdrawing the money", function() {
  //   it("should not allow the withdrawal of part of the money when the contract is deactivated", function() {
  //     let splitter;
  //     return Splitter.deployed().then(function(instance) {
  //       splitter = instance;
  //       return splitter.deactivate({ from: accounts[0] });
  //     }).then(function() {
  //       return expectedExceptionPromise(function () {
  //         return splitter.withdraw(splitAmount, { from: accounts[2], gasPrice: gasPrice });
  //       });
  //     });
  //   });

  //   it("should activate contract again", function() {
  //     testPositiveActivateContract();
  //   });

  //   function testPositiveWithdrawal(account) {
  //     let splitter;
  //     let balanceBefore;
  //     let txObj;
  //     return Splitter.deployed().then(function(instance) {
  //       splitter = instance;
  //       return web3.eth.getBalancePromise(account);
  //     }).then(function(balance) {
  //       balanceBefore = balance;
  //       return splitter.withdraw(splitAmount, { from: account, gasPrice: gasPrice });
  //     }).then(function(_txObj) {
  //       txObj = _txObj
  //       assert.strictEqual(txObj.logs[0].event, "MoneyWithdrawnBy");
  //       return web3.eth.getBalancePromise(account);
  //     }).then(function(balance) {
  //       let balanceAfter = balance;
  //       assert.strictEqual(
  //         new BigNumber(balanceBefore).plus(new BigNumber(splitAmount)).toString(10), 
  //         new BigNumber(balanceAfter).plus(new BigNumber(getGasUsedInWei(txObj))).toString(10), 
  //         "Benifciary did not withdraw " + splitAmount);
  //     });      
  //   }

  //   it("should generate an error when any benifciary tries to withdraw again with an " + 
  //     "amount that exceeds the balance in the contract", function() {
  //     return Splitter.deployed().then(function(instance) {
  //       return expectedExceptionPromise(function () {
  //         return instance.withdraw(hugeSplitAmount, { from: accounts[2], gasPrice: gasPrice });
  //       });
  //     });
  //   });

  //   it("should allow the withdrawal of part of the money by first benifciary", function() {
  //     testPositiveWithdrawal(accounts[1]);
  //   });

  //   it("should allow the withdrawal of part of the money by first benifciary", function() {
  //     testPositiveWithdrawal(accounts[2]);
  //   });

  // }); 

  // describe("Splitting the money again against same contract", function() {
  //   it("should put 100000000000 wei again in the Splitter contract", function() {
  //     return testPositiveSplitContract(accounts);
  //   });
  // });

});
