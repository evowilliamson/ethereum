const Splitter = artifacts.require("./Splitter.sol");
const HackerOne = artifacts.require("./HackerOne.sol");
const HackerTwo = artifacts.require("./HackerTwo.sol");
const BigNumber = require('bignumber.js');
const Promise = require('bluebird');
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");

contract('SplitterHackTest', function(accounts) {

  Promise.promisifyAll(web3.eth, { suffix: "Promise" });
  
  const hackerOwner = accounts[0];
  const other = accounts[1];
  const somePerson = accounts[2];
  const AMOUNT = 9000;
  
  let hacker;

  function getContractBalance(address) {
      return web3.eth.getBalancePromise(address); 
  }

  function createSplitter(hackerOne) {
    return hackerOne.createSplitter(other, { from: hackerOwner })
      .then(tx => Splitter.at(tx.logs[0].args.splitter))
  }

  function createSplitterHackerTwo(hacker) {
    return Splitter.new(hacker.address, { from: other } )
  }

  function createHackerOne() {
    return HackerOne.new( { from: hackerOwner } )
  }

  function createHackerTwo() {
    return HackerTwo.new( { from: hackerOwner } )
  }

  function addSplitter(splitter, hacker) {
    return hacker.addSplitter(splitter.address, { from: other } );
  }

  function getBalances(splitter, hacker) {
    return Promise.allNamed({
      balanceSplitter: () => getContractBalance(splitter.address),
      balanceHacker: () => getContractBalance(hacker.address),
      balanceOther: () => getContractBalance(other)})
  }

  function doSplit(splitter, hacker) {
    let balancesBefore;
    return getBalances(splitter, hacker)
    .then( (balances) => { 
      balancesBefore = balances; 
      return splitter.sendTransaction( {from: somePerson, value: 9000, gas: 30000000, gasPrice: 1000} ) })
    .then( () => getBalances(splitter, hacker))
    .then( (balances) => { 
      balancesAfter = balances; 
      console.log("After hack: ");
      console.log("Splitter balance: " + new BigNumber(balancesAfter.balanceSplitter)
        .minus(new BigNumber(balancesBefore.balanceSplitter)).toString(10));
      console.log("Hacker balance: " + new BigNumber(balancesAfter.balanceHacker)
        .minus(new BigNumber(balancesBefore.balanceHacker)).toString(10));
      return console.log("Other address balance: " + new BigNumber(balancesAfter.balanceOther)
        .minus(new BigNumber(balancesBefore.balanceOther)).toString(10));})
  }

  it("Address one is a malicious contract", () => {
    console.log("Amount sent: " + AMOUNT);
    return createHackerOne()
    .then( (instance) => {
      hacker = instance; 
      return createSplitter(hacker)})
    .then( (splitter) => doSplit(splitter, hacker))})

  it("Address two is a malicious contract", () => {
    let splitter;
    console.log("Amount sent: " + AMOUNT);
    return createHackerTwo()
    .then( (instance) => {
      hacker = instance; 
      return createSplitterHackerTwo(hacker)})
    .then( (instance) => {
      splitter = instance;
      return addSplitter(splitter, hacker)})
    .then( () => {
      return doSplit(splitter, hacker)})
  });
})
  

