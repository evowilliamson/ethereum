import React, { Component } from 'react'
import {Route} from 'react-router-dom'
import Nav from 'react-bootstrap/lib/Nav'
import NavItem from 'react-bootstrap/lib/NavItem'
import Regulator from './component/RegulatorComponent'
import TollBoothOperator from './component/TollBoothOperatorComponent'
import TollBooth from './component/TollBoothComponent'
import Maintainance from './component/MaintainanceComponent'
import Vehicle from './component/VehicleComponent';
const PouchDB = require('pouchdb').default

class App extends Component {

  constructor (props) {
    super(props)

    this.state = { currentTab: "", 
      vehicles: new PouchDB('./vehicle_docs_.db'), 
      tollBoothOperators: new PouchDB('/tollBoothOperators_docs_.db'),
      tollBooths: new PouchDB('/tollBooths_docs_.db'),
      routes: new PouchDB('./routes_docs_.db'),
      multipliers: new PouchDB('./multipliers_docs_.db'),
      trips: new PouchDB('./trips_docs_.db'),
      selectedState: {tollBoothOperator: "", vehicle: "", tollBoothOperatorForTollBooth: ""}
     }

  }

  getDatabases() {
    return {
      vehicles: this.state.vehicles, 
      tollBoothOperators: this.state.tollBoothOperators,
      tollBooths: this.state.tollBooths,
      routes: this.state.routes,
      multipliers: this.state.multipliers,
      trips: this.state.trips};
  }

  handleTabChange(newTab) {
    this.setState({ currentTab: newTab })
    this.props.history.push(newTab)
  }

  render () {
    return (
      <div>
        <Nav bsStyle='pills' activeKey={this.state.currentTab} onSelect={this.handleTabChange.bind(this)}>
          <NavItem eventKey='/regulator'>Regulator</NavItem>
          <NavItem eventKey='/tollBoothOperator'>Toll booth operators</NavItem>
          <NavItem eventKey='/vehicle'>Vehicles</NavItem>
          <NavItem eventKey='/tollBooth' >Toll booths</NavItem>
          <NavItem eventKey='/maintainance' >Maintainance</NavItem>
        </Nav>
        <Route path='/regulator' render={(props) => 
          <Regulator {... props} databases={this.getDatabases()}/>}/>
        <Route path='/tollBoothOperator' render={(props) => 
          <TollBoothOperator {... props} databases={this.getDatabases()} selectedState={this.state.selectedState}/>}/>
        <Route path='/vehicle' render={(props) => 
          <Vehicle {... props} databases={this.getDatabases()} selectedState={this.state.selectedState}/>}/>
        <Route path='/tollBooth' render={(props) => 
          <TollBooth {... props} databases={this.getDatabases()} selectedState={this.state.selectedState}/>}/>
        <Route path='/maintainance' render={(props) => 
          <Maintainance {... props} databases={this.getDatabases()}/>}/>
      </div>
    )
  }
  
}

export default App
