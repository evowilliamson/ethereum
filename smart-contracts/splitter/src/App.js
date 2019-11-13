import React, { Component } from 'react'
import SplitterContract from '../build/contracts/Splitter.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'


const gasPrice = 1000000;

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
      web3: null,
      alice_balance: 0,
      carol_balance: 0,
      bob_balance: 0,
      splitter_balance: 0,
      money_to_contract: 0,
      withdraw_by_bob: 0,
      withdraw_by_carol: 0 ,
      messages: ""    
    };
    this.handleChange = this.handleChange.bind(this);
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
    this.state.web3.eth.getTransactionReceiptMined = 
      require("./utils/getTransactionReceiptMined.js");  

    
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

    evt.preventDefault();
    return this.splitterInstance.split.sendTransaction(this.carol, this.bob, 
      { from: this.alice, value: this.state.money_to_contract, 
      gasPrice: gasPrice }
    ).then((txHash) => {
      this.setState({messages: "Transaction is being processed "+ txHash });
      return this.state.web3.eth.getTransactionReceiptMined(txHash);
    }).then((txObj) => {
      this.setState({messages: "Transaction processed "});
      return this.getAccountBalance(this.splitterInstance.address
      ).then((balance) => {
      this.setState({splitter_balance: balance.toString(10) });
      return this.getAccountBalance(this.alice)
      }).then((balance) => {
        return this.setState({alice_balance: balance.toString(10) });
      })
    }).catch((error) => {
      return this.setState({messages: "Error: "+ error });
    })
  };


  withdraw(account, amount) {
    return this.splitterInstance.withdraw.sendTransaction(amount, 
      { from: account, gasPrice: gasPrice }
    ).then((txHash) => {
      this.setState({messages: "Transaction is being processed "+ txHash });
      return this.state.web3.eth.getTransactionReceiptMined(txHash);
    }).then((txObj) => {
      return this.setState({messages: "Transaction processed "});
    }).catch((error) => {
      return this.setState({messages: "Error: "+ error });
    })
  }

  handleWithdrawBob (evt) {
    evt.preventDefault();
    return this.withdraw(this.bob, this.state.withdraw_by_bob)
    .then((txObj) => {
      return this.getAccountBalance(this.splitterInstance.address)
    }).then((balance) => {
      this.setState({splitter_balance: balance });
      return this.getAccountBalance(this.bob)
    }).then((balance) => {
      return this.setState({bob_balance: balance });
    })
  };

  handleWithdrawCarol (evt) {
    evt.preventDefault();
    return this.withdraw(this.carol, this.state.withdraw_by_carol)
    .then((txObj) => {
      return this.getAccountBalance(this.splitterInstance.address)
    }).then((balance) => {
      this.setState({splitter_balance: balance });
      return this.getAccountBalance(this.carol)
    }).then((balance) => {
      return this.setState({carol_balance: balance });
    })
  };

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
              <input type="text" size="30" name="splitter_balance" value={this.state.splitter_balance} 
                onChange={this.handleChange} />
              <h3>Alice account balance</h3>
              <input type="text" size="30" name="alice_balance" value={this.state.alice_balance} 
                onChange={this.handleChange} />
              <h3>Carol account balance</h3>
              <input type="text" size="30" name="carol_balance" value={this.state.carol_balance} 
                onChange={this.handleChange} />
              <h3>Bob account balance</h3>
              <input type="text" size="30" name="bob_balance" value={this.state.bob_balance} 
                onChange={this.handleChange} />
              <br></br>
              <h3>Money to send to Splitter Contract</h3>
              <input type="text" size="30" name="money_to_contract" value={this.state.money_to_contract} 
                onChange={this.handleChange} />&nbsp;&nbsp;
              <button onClick={this.handleSplitMoney.bind(this)}>Split Money</button>
              <h3>Money to withdraw by Carol</h3>
              <input type="text" size="30" name="withdraw_by_carol" value={this.state.withdraw_by_carol} 
                onChange={this.handleChange} />&nbsp;&nbsp;
              <button onClick={this.handleWithdrawCarol.bind(this)}>Withdraw</button>
              <h3>Money to withdraw by Bob</h3>
              <input type="text" size="30" name="withdraw_by_bob" value={this.state.withdraw_by_bob} 
                onChange={this.handleChange} />&nbsp;&nbsp;
              <button onClick={this.handleWithdrawBob.bind(this)}>Withdraw</button>
              <h4>Messsages</h4>
              <textarea name="messages" rows="4" cols="50" value={this.state.messages} 
                onChange={this.handleChange}/>
              </form>          
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
