import React, { Component } from 'react'
import SimpleStorageContract from '../build/contracts/SimpleStorage.json'
import SplitterContract from '../build/contracts/Splitter.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

const Promise = require('bluebird');
Promise.promisifyAll(this.state.web3.eth, { suffix: "Promise" });

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      storageValue: 0,
      web3: null,
      alice_balance: 0,
      carol_balance: 0,
      bob_balance: 0,
      splitter_balance: 0
    };
    this.handleChange = this.handleChange.bind(this);
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    console.log("fdsfdfdf")
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
    /*
     * SMART CONTRACT EXAMPLE
     *
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract')
    const simpleStorage = contract(SimpleStorageContract)
    simpleStorage.setProvider(this.state.web3.currentProvider)
    const splitter = contract(SplitterContract)
    splitter.setProvider(this.state.web3.currentProvider)
    
    // Declaring this for later so we can chain functions on SimpleStorage.
    var simpleStorageInstance
    var splitterInstance

    // Get accounts.
    this.state.web3.eth.getAccounts((error, accounts) => {
      simpleStorage.deployed().then((instance) => {
        simpleStorageInstance = instance
        return simpleStorageInstance.set(5, {from: accounts[0]})
      }).then((result) => {
        return simpleStorage.deployed()
      }).then((instance) => {
        splitterInstance = instance
        return this.getAccountBalance(accounts[0])
      }).then((result) => {
        this.setState({ alice_balance: result.toString(10) })
        return this.getAccountBalance(accounts[1])
      }).then((result) => {
        this.setState({ carol_balance: result.toString(10) })
        return this.getAccountBalance(accounts[2])
      }).then((result) => {
        this.setState({ bob_balance: result.toString(10) })
        return this.getAccountBalance(splitterInstance.address)
      }).then((result) => {
        // Update state with the result.
        return this.setState({ splitter_balance: result.toString(10) })
      })
    })
  }

  handleChange (evt) {
    this.setState({ [evt.target.name]: evt.target.value });
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
              <h1>Good to Go!</h1>
              <p>Your Truffle Box is installed and ready.</p>
              <h2>Smart Contract Example</h2>
              <p>If your contracts compiled and migrated successfully, below will show a stored value of 5 (by default).</p>
              <p>Try changing the value stored on <strong>line 59</strong> of App.js.</p>
              <p>The stored value is: {this.state.carol_balance}</p>
              <form>
              <p>Splitter account balance</p>
              <input type="text" name="splitter_balance" value={this.state.splitter_balance} onChange={this.handleChange} />
              <p>Alice account balance</p>
              <input type="text" name="alice_balance" value={this.state.alice_balance} onChange={this.handleChange} />
              <p>Carol account balance</p>
              <input type="text" name="carol_balance" value={this.state.carol_balance} onChange={this.handleChange} />
              <p>Bob account balance</p>
              <input type="text" name="bob_balance" value={this.state.bob_balance} onChange={this.handleChange} />
              </form>          
            </div>
          </div>

        </main>
      </div>
    );
  }
}

export default App
