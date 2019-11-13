import React, { Component } from 'react'
import SplitterContract from '../build/contracts/Splitter.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

const gasPrice = 100000000000;

class Try extends React.Component {

  contract = require('truffle-contract');
  splitter = this.contract(SplitterContract);
  sequentialPromiseNamed = require("./utils/sequentialPromiseNamed.js"); 
  splitterInstance;
  alice;
  carol;
  bob;

  constructor(props) {
    super(props);
    this.state = {
      items: [],
      text: '',
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
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
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

  handleSplitMoney (evt) {
    evt.preventDefault();
    this.splitterInstance.split(this.carol, this.bob, { from: this.alice, value: this.state.money_to_contract, 
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
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />
        <form>
          <label htmlFor="new-todo">
            What needs to be done?
          </label>
          <input
            id="new-todo"
            onChange={this.handleChange}
            value={this.state.text}
          />
          <h3>Money to send to Splitter Contract</h3>
          <input type="text" size="30" name="money_to_contract" value={this.state.money_to_contract} 
              onChange={this.handleChange} />&nbsp;&nbsp;
          <button onClick={this.handleSplitMoney.bind(this)}>Split Money</button>
          <button>
            Add #{this.state.items.length + 1}
          </button>
        </form>
      </div>
    );
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  handleSubmit(e) {
    e.preventDefault();
    if (!this.state.text.length) {
      return;
    }
    const newItem = {
      text: this.state.text,
      id: Date.now()
    };
    this.setState(prevState => ({
      items: prevState.items.concat(newItem),
      text: ''
    }));
  }
}

class TodoList extends React.Component {
  render() {
    return (
      <ul>
        {this.props.items.map(item => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    );
  }
}
  
  //ReactDOM.render(<TodoApp />, mountNode);
export default Try