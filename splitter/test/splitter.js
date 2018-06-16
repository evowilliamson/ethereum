var Splitter = artifacts.require("./Splitter.sol");

const Promise = require('bluebird');
Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });
web3.eth.getAccountsPromise().then(_accounts => accounts = _accounts);

var tryCatch = require("./exceptions.js").tryCatch;
var errTypes = require("./exceptions.js").errTypes;

contract('Splitter', function(accounts) {

  describe("Splitting the money", function() {
    it("should put 1000000 wei in the Splitter contract", function() {
      return Splitter.deployed().then(function(instance) {
        instance.split(accounts[1], accounts[2], {from: accounts[0], value: 200000000000000});
        return instance.getBalance();
      }).then(function(balance) {
        assert.equal(balance.valueOf(), 200000000000000, "200000000000000 wasn't in the Splitter contract");
      });
    });

    it("should generate an error when trying to do a split on the same contract again", function() {
      return Splitter.deployed().then(function(instance) {
        tryCatch(instance.split(accounts[1], accounts[2], {from: accounts[0], value: 200000000000000}), errTypes.revert);
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
        return splitter.withdraw(100000000000000, { from: accounts[1] });
      }).then(function() {
        return web3.eth.getBalancePromise(accounts[1]);
      }).then(function(balance) {
        balanceAfter = balance.toNumber();
        assert.equal(balanceBefore, balanceAfter, "Benifciary did not withdraw 100000000000000");
      });
    });
  }); 

  // it("should send coin correctly", function() {
  //   return MetaCoin.deployed().then(function(instance) {
  //     meta = instance;
  //     return meta.getBalance.call(account_one);
  //   }).then(function(balance) {
  //     account_one_starting_balance = balance.toNumber();
  //     return meta.getBalance.call(account_two);
  //   }).then(function(balance) {
  //     account_two_starting_balance = balance.toNumber();
  //     return meta.sendCoin(account_two, amount, {from: account_one});
  //   }).then(function() {
  //     return meta.getBalance.call(account_one);
  //   }).then(function(balance) {
  //     account_one_ending_balance = balance.toNumber();
  //     return meta.getBalance.call(account_two);
  //   }).then(function(balance) {
  //     account_two_ending_balance = balance.toNumber();

  //     assert.equal(account_one_ending_balance, account_one_starting_balance - amount, "Amount wasn't correctly taken from the sender");
  //     assert.equal(account_two_ending_balance, account_two_starting_balance + amount, "Amount wasn't correctly sent to the receiver");
  //   });
  // });

});
