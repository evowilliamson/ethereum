import React, { Component } from "react"
import Panel from "react-bootstrap/lib/Panel"
import Grid from "react-bootstrap/lib/Grid"
import Row from "react-bootstrap/lib/Row"
import Col from "react-bootstrap/lib/Col"
import FormGroup from "react-bootstrap/lib/FormGroup"
import ControlLabel from "react-bootstrap/lib/ControlLabel"
import FormControl from "react-bootstrap/lib/FormControl"
import Button from "react-bootstrap/lib/Button"
import { getConfigurations } from "../config/config"
import * as ContractServices from "../service/ContractServices"
import * as DatabaseServices from "../service/DatabaseServices"
import Label from 'react-bootstrap/lib/Label'
import ReactTable from "react-table";

class TollBoothOperatorComponent extends Component {
  constructor (props) {
    super(props)

    this.handleChange = this.handleChange.bind(this)
    this.selectTollBoothOperatorAddress = this.selectTollBoothOperator.bind(this);

    this.state = {
      gas: getConfigurations().GAS,
      tollBoothOperatorAddress: "",
      tollBoothOperator: null,
      tollBoothOperatorOwner: "",
      tollBoothAddress: "",
      tollBoothName: "",
      newTollBoothAddress: "",
      entryTollBooth: "",
      exitTollBooth: "",
      routePrice: 0,
      newRouteEntryTollBooth: "",
      newRouteExitTollBooth: "",
      newRoutePrice: 0,
      multiplier: 0,
      vehicleType: 0,
      collectedFees: 0,
      selected: false,
      multiplierButtonDisabled: true,
      tollBoothButtonDisabled: true,
      routeButtonDisabled: true,
      tollBoothOperators: [],
      tollBooths: [],
      routes: [],
      multipliers: [],
      databases: this.props.databases,
      selectedState: this.props.selectedState,
      pendingPaymentCleared: false
    }

    DatabaseServices.getAllTollBoothOperators(this.state.databases.tollBoothOperators)
    .then( (tollBoothOperators) => this.setState({ ...this.state, tollBoothOperators: tollBoothOperators}))
    .then( () => this.setTollBoothOperator(this.state.selectedState.tollBoothOperator))

  }

  addTollBooth () {
    let addedTollBoothAddress = this.state.tollBoothAddress;
    this.setState({ ...this.state, newTollBoothAddress: "" })
    return ContractServices.addTollBooth(this.state.tollBoothAddress, this.state.tollBoothOperator,
      this.state.tollBoothOperatorOwner, this.state.gas)
    .then( () => { this.setState({ ...this.state, newTollBoothAddress: addedTollBoothAddress }) })
    .then( () => DatabaseServices.inDocuments(this.state.databases.tollBooths, 
      ["tollBoothOperator", "name"], [this.state.tollBoothOperator.address, this.state.tollBoothName]))
    .then( () => DatabaseServices.inDocuments(this.state.databases.tollBooths, 
      ["tollBoothOperator", "address"], [this.state.tollBoothOperator.address, this.state.tollBoothAddress]))
    .then( () => DatabaseServices.persist(this.state.databases.tollBooths, 
      {id: addedTollBoothAddress + "-" + this.state.tollBoothOperator.address, tuple: [
        {key: "address", value: addedTollBoothAddress},
        {key: "name", value: this.state.tollBoothName},
        {key: "tollBoothOperator", value: this.state.tollBoothOperator.address},
        {key: "timestamp", value: new Date()}]}))
    .then( () => DatabaseServices.getAllTollBooths(this.state.databases.tollBooths, this.state.tollBoothOperator))
    .then( (list) => this.setState({ ...this.state, tollBooths: list}))
    .catch( (error) => {
      alert(error);
      return console.log(error)})
  }

  setMultiplier () {
    return ContractServices.setMultiplier(this.state.tollBoothOperator, this.state.vehicleType, this.state.multiplier, 
      this.state.tollBoothOperatorOwner, this.state.gas)
    .then( () => DatabaseServices.persist(this.state.databases.multipliers, 
      {id: this.state.vehicleType + "-" + this.state.tollBoothOperator.address, tuple: [
        {key: "vehicleType", value: this.state.vehicleType},
        {key: "multiplier", value: this.state.multiplier},
        {key: "tollBoothOperator", value: this.state.tollBoothOperator.address},
        {key: "timestamp", value: new Date()}]}))
    .then( () => DatabaseServices.getAllMultipliers(this.state.databases.multipliers, this.state.tollBoothOperator))
    .then( (list) => this.setState({ ...this.state, multipliers: list}))
    .catch( (error) => {
      alert(error);
      return console.log(error)})
  }

  // Price not being udpated
  setRoute() {
    let setRouteEntryTollBooth = this.state.entryTollBooth;
    let setRouteExitTollBooth = this.state.exitTollBooth;
    let setRoutePrice = this.state.routePrice;
    let entryTollBoothName, exitTollBoothName;
    let txObj;
    this.setState({ ...this.state, newRouteEntryTollBooth: "", newRouteExitTollBooth: "", newRoutePrice: 0 })
    return ContractServices.setRoutePrice(
      this.state.tollBoothOperator, this.state.routePrice, this.state.entryTollBooth, this.state.exitTollBooth, 
      this.state.tollBoothOperatorOwner, this.state.gas)
    .then( (_txObj) => {
      txObj = _txObj;
      this.setState({ ...this.state, 
      newRouteEntryTollBooth: setRouteEntryTollBooth, newRouteExitTollBooth: setRouteExitTollBooth,
      newRoutePrice: setRoutePrice })})
    .then( () => DatabaseServices.getTollBooth(this.state.databases.tollBooths, 
      this.state.tollBoothOperator, setRouteEntryTollBooth))
    .then( (tollBooth) => {
      entryTollBoothName = tollBooth.name;
      return DatabaseServices.getTollBooth(this.state.databases.tollBooths, 
        this.state.tollBoothOperator, setRouteExitTollBooth)})
    .then( (tollBooth) => {
      exitTollBoothName = tollBooth.name;
      return DatabaseServices.persist(this.state.databases.routes, 
        {id: setRouteEntryTollBooth + "-" + setRouteExitTollBooth + "-" + this.state.tollBoothOperator.address, 
          tuple: [
          {key: "tollBoothOperator", value: this.state.tollBoothOperator.address},
          {key: "entryTollBoothAddress", value: setRouteEntryTollBooth},
          {key: "exitTollBoothAddress", value: setRouteExitTollBooth},
          {key: "entryTollBoothName", value: entryTollBoothName},
          {key: "exitTollBoothName", value: exitTollBoothName},
          {key: "routePrice", value: setRoutePrice},
          {key: "timestamp", value: new Date()}]})})
    .then( () => DatabaseServices.getRoutes({db: this.state.databases.routes, tollBoothOperator: this.state.tollBoothOperator}))
    .then( (list) => {
      const logEntered = txObj.logs[1]; // 0 is LogRoutePriceSet, 1 is LogRoadExited
      // Check if pending payments were cleared
      if (txObj.receipt.logs.length === 2 &&  txObj.logs.length === 2 && logEntered.event === "LogRoadExited") {
        let hashedSecret = logEntered.args.exitSecretHashed;
        this.setState({ ...this.state, routes: list, pendingPaymentCleared: true})
        return DatabaseServices.getTrips({db: this.state.databases.trips, hashedSecret: hashedSecret})
        .then ( (trips) => {
          if (trips.length !== 1) {
            throw new Error("Error during exiting, number of trips found: " + trips.length)
          }
          // Adjust the trip status in the off-chain database
          return DatabaseServices.persist(this.state.databases.trips,  
            {id: hashedSecret, 
              tuple: [
                {key: "exitTollBooth", value: exitTollBoothName},
                {key: "finalFee", value: logEntered.args.finalFee.toString(10)},
                {key: "refund", value: logEntered.args.refundWeis.toString(10)},
                {key: "status", value: "Exited"},
                {key: "routePrice", value: setRoutePrice},
                {key: "timestamp", value: new Date()}]})})}
      else {
        return this.setState({ ...this.state, routes: list, pendingPaymentCleared: false})
      }})
    .catch( (error) => {
      alert(error);
      return console.log(error)})
  }
  
  handleChange (event) {
    this.setState({ ...this.state, [event.target.id]: event.target.value })
  }

  selectTollBoothOperator (event) {

    this.setTollBoothOperator(event.target.value)

  }

  setTollBoothOperator(selectedtollBoothOperator) {

    if (selectedtollBoothOperator === "") {
      return;
    }

    this.setState({ ...this.state, tollBoothOperatorAddress: selectedtollBoothOperator, selected: false })
    let tollBoothOperatorInstance = ContractServices.getTollBoothOperator(selectedtollBoothOperator);
    if (tollBoothOperatorInstance !== null) {
      let tollBoothOwner;
      let tollBoothOperator;
      let temp = this.state.selectedState;
      tollBoothOperator = tollBoothOperatorInstance;
      temp.tollBoothOperator = selectedtollBoothOperator;
      return ContractServices.getTollBoothOperatorOwner(tollBoothOperator)
      .then( (owner) => {
        tollBoothOwner = owner;
        return ContractServices.getTollBoothOperatorCollectedFees(tollBoothOperator)})
      .then( (collectedFees) => {
        return this.setState({ ...this.state, tollBoothOperator: tollBoothOperator,
          collectedFees: collectedFees, selected: true, 
          tollBoothOperatorOwner: tollBoothOwner})})
      .then( () => DatabaseServices.getAllTollBooths(this.state.databases.tollBooths, this.state.tollBoothOperator))
      .then( (list) => this.setState({ ...this.state, tollBooths: list}))
      .then( () => DatabaseServices.getAllMultipliers(this.state.databases.multipliers, this.state.tollBoothOperator))
      .then( (list) => this.setState({ ...this.state, multipliers: list}))
      .then( () => DatabaseServices.getRoutes({db:this.state.databases.routes, tollBoothOperator: this.state.tollBoothOperator}))
      .then( (list) => this.setState({ ...this.state, routes: list}))
      .catch( (error) => {
        alert(error);
        console.log(error);
        return this.setState({ ...this.state, selected: false })})
    }
    else {
      this.setState({ ...this.state, selected: false })
    }    

  }

  handleTollBoothChange (e) {
    let tempState = { ...this.state, [e.target.id]: e.target.value };
    if  (tempState.tollBoothName === "" || tempState.tollBoothAddress === "") {
      this.setState({ ...this.state, [e.target.id]: e.target.value, tollBoothButtonDisabled: true });
    }
    else {
      this.setState({ ...this.state, [e.target.id]: e.target.value, tollBoothButtonDisabled: false})
    }
  }

  handleRouteChange (e) {
    let tempState = { ...this.state, [e.target.id]: e.target.value };
    if  (tempState.entryTollBooth === "" || tempState.exitTollBooth === "") {
      this.setState({ ...this.state, [e.target.id]: e.target.value, routeButtonDisabled: true });
    }
    else {
      this.setState({ ...this.state, [e.target.id]: e.target.value, routeButtonDisabled: false})
    }
  }

  handleMultiplierChange (e) {
    let tempState = { ...this.state, [e.target.id]: e.target.value };
    if (tempState.vehicleType === "" || tempState.vehicleType === "0" ||
      tempState.multiplier === "") {
      this.setState({ ...this.state, [e.target.id]: e.target.value, multiplierButtonDisabled: true });
    }
    else {
      this.setState({ ...this.state, [e.target.id]: e.target.value, multiplierButtonDisabled: false})
    }
  }

  render () {

    const getAllAccounts = getConfigurations().accounts.map(
      account => (<option key={account} value={account}>{account}</option>))

    const getAllTollBooths = this.state.tollBooths.map(
      tollBooth => (<option key={tollBooth.address} value={tollBooth.address}>{tollBooth.name}</option>))
  
    const getAllTollBoothOperators =  
      this.state.tollBoothOperators.map(
        tollBoothOperator => (
          <option key={tollBoothOperator.address} 
          value={tollBoothOperator.address}>{tollBoothOperator.name}</option>))

    const showTollBoothOperatorInformation = this.state.selected === true ? (
      <div>
      <ControlLabel>Owner</ControlLabel>
      <FormControl readOnly
        type="text"
        value={this.state.tollBoothOperatorOwner}/>
      <p/>
      <ControlLabel>Address</ControlLabel>
      <FormControl readOnly
        type="text"
        value={this.state.tollBoothOperatorAddress}/>
      <p/>
      <ControlLabel>Collected fees</ControlLabel>
      <FormControl readOnly
        type="number"
        value={this.state.collectedFees}/>
      </div>
    ) : ""

    const selectTollBoothOperator = (
      <div>
        <p />
        <Panel bsStyle="primary">
          <Panel.Heading><Panel.Title componentClass="h1"><b>Toll booth operator</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              <Row>
                <Col md={5}>
                  <FormGroup
                    controlId="tollBoothOperatorAddress">
                    <ControlLabel>Toll booth operator name</ControlLabel>
                    <FormControl componentClass="select" 
                      onChange={this.selectTollBoothOperator.bind(this)}>
                      <option value="">Select toll booth operator</option>
                      {getAllTollBoothOperators}
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={5}>{showTollBoothOperatorInformation}
                </Col>
              </Row>
            </Grid>
            <p />
          </Panel.Body>
        </Panel>
      </div>
    )

    const addTollBooths = this.state.selected === true ? (
      <div>
        <Panel bsStyle="primary">
          <Panel.Heading><Panel.Title componentClass="h1"><b>Toll booths</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              <Row>
                <Col md={6}>
                  <ReactTable
                    data={this.state.tollBooths}
                    columns={[
                      {
                        Header: "Toll booths",
                        columns: [
                          {
                            Header: "Address",
                            accessor: "address"
                          },
                          {
                            Header: "Name",
                            accessor: "name"
                          },
                          {
                            Header: "Timestamp",
                            accessor: "timestamp"
                          }
                        ]
                      }
                    ]}
                    defaultSorted={[
                      {
                        id: "timestamp",
                        desc: true
                      }
                    ]}
                    defaultPageSize={5}
                    className="-striped -highlight"
                  />
                </Col>
              </Row>
              <br />
              <Row>
                <Col md={4}>
                  <FormGroup
                    controlId="tollBoothAddress">
                    <ControlLabel>Address</ControlLabel>
                    <FormControl componentClass="select"
                      onChange={this.handleTollBoothChange.bind(this)}>
                      <option value={""}>Select toll booth address</option>
                      {getAllAccounts}
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={2}>
                  <FormGroup
                    controlId="tollBoothName">
                    <ControlLabel>Name</ControlLabel>
                    <FormControl
                      type="text"
                      value={this.state.tollBoothName}
                      onChange={this.handleTollBoothChange.bind(this)} />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={3}>
                  <Button
                    bsStyle="primary"
                    disabled={this.state.tollBoothButtonDisabled}
                    onClick={this.addTollBooth.bind(this)}>Create toll booth</Button>
                </Col>
              </Row>
            </Grid>
            <p />
          </Panel.Body>
        </Panel>
      </div>
    ) : ""

    const addRoutes = this.state.selected === true ? (
      <div>
        <Panel bsStyle="primary" >
          <Panel.Heading><Panel.Title componentClass="h1"><b>Routes</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
            <Row>
                <Col md={7}>
                <ReactTable
                  data={this.state.routes}
                  columns={[
                    {
                      Header: "Routes",
                      columns: [
                        {
                          Header: "Entry toll booth name",
                          accessor: "entryTollBoothName"
                        },
                        {
                          Header: "Exit toll booth name",
                          accessor: "exitTollBoothName"
                        },
                        {
                          Header: "Route price",
                          accessor: "routePrice"
                        },
                        {
                          Header: "Timestamp",
                          accessor: "timestamp"
                        }
                      ]
                    }
                  ]}
                  defaultSorted={[
                    {
                      id: "timestamp",
                      desc: true
                    }
                  ]}
                  defaultPageSize={5}
                  className="-striped -highlight"
                />                
                </Col>
            </Row>
            <br/>              
            <Row>
                <Col md={6}>
                <FormGroup
                    controlId="entryTollBooth">
                    <ControlLabel>Entry toll booth</ControlLabel>
                    <FormControl componentClass="select"
                      onChange={this.handleRouteChange.bind(this)}>
                      <option value={""}>Select entry toll booth</option>
                      {getAllTollBooths}
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                <FormGroup
                    controlId="exitTollBooth">
                    <ControlLabel>Exit toll booth</ControlLabel>
                    <FormControl componentClass="select"
                      onChange={this.handleRouteChange.bind(this)}>
                      <option value={""}>Select exit toll booth</option>
                      {getAllTollBooths}
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={3}>
                  <FormGroup
                    controlId="routePrice">
                    <ControlLabel>Price</ControlLabel>
                    <FormControl
                      type="number"
                      value={this.state.routePrice}
                      placeholder="Enter price"
                      onChange={this.handleChange.bind(this)} />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                    <Button bsStyle="primary"
                      disabled={this.state.routeButtonDisabled}
                      onClick={this.setRoute.bind(this)}>Set route</Button>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <Label bsStyle="info">{this.state.pendingPaymentCleared ? "Pending payment cleared" : ""}</Label>
                </Col>
              </Row>
            </Grid>
            <p />
          </Panel.Body>
        </Panel>
      </div>
    ) : ""

    const addMultiplier = this.state.selected === true ? (
      <div>
        <Panel bsStyle="primary" >
          <Panel.Heading><Panel.Title componentClass="h1"><b>Multipliers</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              <Row>
                <Col md={7}>
                <ReactTable
                  data={this.state.multipliers}
                  columns={[
                    {
                      Header: "Multipliers",
                      columns: [
                        {
                          Header: "Vehicle type",
                          accessor: "vehicleType"
                        },
                        {
                          Header: "Multiplier",
                          accessor: "multiplier"
                        },
                        {
                          Header: "Timestamp",
                          accessor: "timestamp"
                        }
                      ]
                    }
                  ]}
                  defaultSorted={[
                    {
                      id: "timestamp",
                      desc: true
                    }
                  ]}
                  defaultPageSize={5}
                  className="-striped -highlight"
                />                
                </Col>
              </Row>
              <br/>
              <Row>
                <Col md={4}>
                  <FormGroup
                    controlId="vehicleType">
                    <ControlLabel>Vehicle type</ControlLabel>
                    <FormControl
                      type="number"
                      value={this.state.vehicleType}
                      placeholder="Enter vehicle type"
                      onChange={this.handleMultiplierChange.bind(this)}/>
                  </FormGroup>
                </Col>
                <Col md={4}>
                <FormGroup
                    controlId="multiplier">
                    <ControlLabel>Multiplier</ControlLabel>
                    <FormControl
                      type="number"
                      value={this.state.multiplier}
                      placeholder="Enter multiplier"
                      onChange={this.handleMultiplierChange.bind(this)}/>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                    <Button bsStyle="primary"
                      disabled={this.state.multiplierButtonDisabled}
                      onClick={this.setMultiplier.bind(this)}>Set multiplier</Button>
                </Col>
              </Row>
            </Grid>
            <p />
          </Panel.Body>
        </Panel>
      </div>
    ) : ""

    return (
      <Grid>
        <Row>{selectTollBoothOperator}</Row>
        <Row>{addTollBooths}</Row>
        <Row>{addRoutes}</Row>
        <Row>{addMultiplier}</Row>
      </Grid>
    )
  }
}

export default TollBoothOperatorComponent
