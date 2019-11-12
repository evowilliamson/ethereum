import contract from 'truffle-contract'
import Web3 from 'web3'
import Regulator from '../contracts/Regulator.json'
import TollBoothOperator from '../contracts/TollBoothOperator.json'
const Promise = require("bluebird");

const url = 'http://localhost:8545';

const newContract = (web3, json) => {
  const createdContract = contract(json);
  createdContract.setProvider(web3.currentProvider);
  return createdContract;
}

let configurations = { GAS: 100000000}
export const getConfigurations = () => configurations;
let web3;
export const loadConfigurations = () => 
  new Promise((resolve) => {
    resolve(new Web3(new Web3.providers.HttpProvider(url)))})
  .then ( (_web3) => {
    web3 = _web3;
    configurations.web3 = web3;
    Promise.promisifyAll(configurations.web3.eth, { suffix: "Promise" });
    return new Promise((resolve, reject) => { 
      web3.eth.getAccounts(
          (error, accounts) => (error ? reject(error) : resolve(accounts)))})})
  .then ( (accounts) => { 
    configurations.accounts = accounts;
    return newContract(web3, Regulator)})
  .then ( (instance) => { 
    configurations.regulator = instance; 
    return newContract(web3, TollBoothOperator)})
  .then ( (instance) => {
    configurations.tollBoothOperator = instance; 
      return configurations.regulator.deployed()})
  .then ( (instance) => {
    return configurations.regulator = instance})
  .then( () => console.log(configurations));
  

