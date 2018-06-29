import React, { Component } from 'react'
import SplitterContract from '../build/contracts/Splitter.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

const gasPrice = 100000000000;

class App extends Component {

  contract = require('truffle-contract');
  splitter = this.contract(SplitterContract);
  sequentialPromiseNamed = require("./utils/sequentialPromiseNamed.js"); 
  splitterInstance;
  alice;
  carol;
  bob;

  constructor(props) {
    super(props)

    this.state = {
      storageValue: 0,
      web3: null,
      alice_balance: 0,
      carol_balance: 0,
      bob_balance: 0,
      splitter_balance: 0,
      money_to_contract: 0,
      withdraw_by_bob: 0,
      withdraw_by_carol: 0 ,
      transaction_status: ""    
    };
    this.handleChange = this.handleChange.bind(this);
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch((error) => {
      console.log(error)
    })
  }

  getAccountBalance(address) {
      return this.state.web3.eth.getBalancePromise(address);
  }

  instantiateContract() {

    this.splitter.setProvider(this.state.web3.currentProvider)
    const Promise = require('bluebird');
    Promise.promisifyAll(this.state.web3.eth, { suffix: "Promise" });
    
    this.state.web3.eth.getAccounts((error, accounts) => {
      if (accounts.length < 3) {
        throw new Error("There must be at least three accounts");
      }
      this.alice = accounts[0];
      this.carol = accounts[1];
      this.bob = accounts[2];
    })

    this.splitter.deployed().then((instance) => {
      this.splitterInstance = instance;
      return this.sequentialPromiseNamed({
        alice_balance:    () => this.getAccountBalance(this.alice),
        carol_balance:    () => this.getAccountBalance(this.carol),
        bob_balance:      () => this.getAccountBalance(this.bob),
        splitter_balance: () => this.getAccountBalance(this.splitterInstance.address)
      }).then((result) => {
        return this.setState({ 
          alice_balance:    result.alice_balance.toString(10),
          carol_balance:    result.carol_balance.toString(10),
          bob_balance:      result.bob_balance.toString(10),
          splitter_balance: result.splitter_balance.toString(10)
        })
      })
    })
  }

  handleChange (evt) {
    this.setState({ [evt.target.name]: evt.target.value });
  }

  handleSplitMoney (evt) {

    return this.splitterInstance.split(this.carol, this.bob, { from: this.alice, value: this.state.money_to_contract, 
      gasPrice: gasPrice });      
    };

  withdraw(account, amount) {
    return this.splitterInstance.withdraw(amount, { from: account, gasPrice: gasPrice }
    ).then((txObj) => {
      console.log(txObj);
      return this.setState({ 
        transaction_status: txObj.logs[0].event
      })
    })
    .catch((error) => {
      console.log(error);
      return this.setState({ 
        transaction_status: error
      })
    })
  }

  handleWithdrawBob (evt) {
    return this.withdraw(this.bob, this.state.withdraw_by_bob);
  }

  handleWithdrawCarol (evt) {
    return this.withdraw(this.carol, this.state.withdraw_by_carol);
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Truffle Box</a>
        </nav>
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Splitter Contract</h1>
              <form>
              <h3>Splitter contract balance</h3>
              <input type="text" size="30" name="splitter_balance" value={this.state.splitter_balance} onChange={this.handleChange} />
              <h3>Alice account balance</h3>
              <input type="text" size="30" name="alice_balance" value={this.state.alice_balance} onChange={this.handleChange} />
              <h3>Carol account balance</h3>
              <input type="text" size="30" name="carol_balance" value={this.state.carol_balance} onChange={this.handleChange} />
              <h3>Bob account balance</h3>
              <input type="text" size="30" name="bob_balance" value={this.state.bob_balance} onChange={this.handleChange} />
              <br></br>
              <h3>Money to send to Splitter Contract</h3>
              <input type="text" size="30" name="money_to_contract" value={this.state.money_to_contract} onChange={this.handleChange} />&nbsp;&nbsp;
              <button onClick={this.handleSplitMoney.bind(this)}>Split Money</button>
              <h3>Money to withdraw by Bob</h3>
              <input type="text" size="30" name="withdraw_by_bob" value={this.state.withdraw_by_bob} onChange={this.handleChange} />&nbsp;&nbsp;
              <button onClick={this.handleWithdrawBob.bind(this)}>Withdraw</button>
              <h3>Money to withdraw by Carol</h3>
              <input type="text" size="30" name="withdraw_by_carol" value={this.state.withdraw_by_carol} onChange={this.handleChange} />&nbsp;&nbsp;
              <button onClick={this.handleWithdrawCarol.bind(this)}>Withdraw</button>
              <h4>Transaction status</h4>
              <textarea name="transaction_status" rows="4" cols="50" value={this.state.transaction_status} onChange={this.handleChange}/>
              </form>          
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
