import React, { Component } from 'react'
import Panel from 'react-bootstrap/lib/Panel'
import Grid from 'react-bootstrap/lib/Grid'
import Row from 'react-bootstrap/lib/Row'
import Col from 'react-bootstrap/lib/Col'
import FormGroup from 'react-bootstrap/lib/FormGroup'
import ControlLabel from 'react-bootstrap/lib/ControlLabel'
import FormControl from 'react-bootstrap/lib/FormControl'
import * as ContractServices from "../service/ContractServices"
import * as DatabaseServices from "../service/DatabaseServices"
import ReactTable from "react-table";
import Label from 'react-bootstrap/lib/Label'
import Button from 'react-bootstrap/lib/Button'

class VehicleComponent extends Component {

  constructor (props) {
    super(props)
    this.state = {
        hashedSecret: "", 
        clearTextSecret: "",
        selected: false,
        databases: this.props.databases,
        tollBoothOperatorAddress: "",
        enterRoadButtonDisabled: true,
        value: 0,
        tollBooths: [],
        vehicles: [],
        entryTollBooth: "",
        tollBoothOperators: [],
        trips: [],
        selectedState: this.props.selectedState
    }

    DatabaseServices.getVehicles({db: this.state.databases.vehicles})
    .then( (vehicles) => {
      this.setState({ ...this.state, vehicles: vehicles});
      return DatabaseServices.getAllTollBoothOperators(this.state.databases.tollBoothOperators)})
    .then( (tollBoothOperators) => this.setState({ ...this.state, tollBoothOperators: tollBoothOperators}))
    .then( () => this.setVehicle(this.state.selectedState.vehicle))

  }

  handleChange (e) {
    this.setState({ ...this.state, [e.target.id]: e.target.value })
  }

  setVehicle(selectedVehicle) {

    if (selectedVehicle === "") {
      return;
    }
    else {
      let temp = this.state.selectedState
      temp.vehicle = selectedVehicle;
    }

    this.setState({ ...this.state, vehicleAddress: selectedVehicle, selected: false })
    let vehicleAddress = selectedVehicle;
    let vehicleName;
    let vehicleBalance;
    this.setState({ ...this.state, vehicleAddress: selectedVehicle});
    if (vehicleAddress !== null) {
        return DatabaseServices.getVehicle(this.state.databases.vehicles, vehicleAddress)
        .then( (vehicle) => { 
          vehicleName = vehicle.name;
          return ContractServices.getBalance(vehicleAddress)})
        .then( (balance) => {
          vehicleBalance = balance;
          return DatabaseServices.getTrips({db: this.state.databases.trips, vehicle: vehicleName})})
        .then( (trips) => this.setState({ ...this.state, vehicleAddress: vehicleAddress, 
          vehicleBalance: vehicleBalance, vehicleName: vehicleName, trips: trips, selected: true}))
    }

  }

  selectVehicle (event) {

    this.setVehicle(event.target.value);

  }

  selectTollBoothOperator(event) {

    if (event.target.value === "") {
      return;
    }

    this.setState({ ...this.state, tollBoothOperatorAddress: event.target.value })
    let _tollBoothOperatorAddress = event.target.value;
    let tollBoothOperator;
    let tollBoothOperatorInstance = ContractServices.getTollBoothOperator(_tollBoothOperatorAddress)
    if (tollBoothOperatorInstance !== null) {
      tollBoothOperator = tollBoothOperatorInstance;
      return DatabaseServices.getAllTollBooths(this.state.databases.tollBooths, tollBoothOperator)
      .then( (list) => this.setState({ ...this.state, 
          tollBooths: list, tollBoothOperator: tollBoothOperator, tollBoothOperatorAddress: _tollBoothOperatorAddress}))
      .catch( (error) => {
        alert(error);
        return console.log(error);
      })
    }

  }

  checkEnterRoadInformation() {

    if  (this.state.entryTollBooth === "" || this.state.value === 0 || 
    this.state.tollBoothOperatorAddress === "" || this.state.clearTextSecret === "") {
      return true;
    }
    else {
      return false;
    }

  }

  checkEnteredRoad(txObj, hashedSecret) {

    const logEntered = txObj.logs[0];
    if (txObj.receipt.logs.length !== 1 || 
      txObj.logs.length !== 1 ||
      logEntered.event !== "LogRoadEntered" ||
      logEntered.args.vehicle !== this.state.vehicleAddress ||
      logEntered.args.entryBooth !== this.state.entryTollBooth ||
      logEntered.args.exitSecretHashed !== hashedSecret || 
      logEntered.args.depositedWeis.toString(10) !== parseInt(this.state.value, 10).toString(10)) {
        throw new Error("Error when entering the road")
      }

  }

  enterRoad () {
    let entryTollBoothName;
    let hashedSecret;
    let vehicleName;
    this.setState({ ...this.state, hashedSecret: "" })
    return ContractServices.hashClearTextSecret(this.state.tollBoothOperator, this.state.vehicleAddress, 
      this.state.clearTextSecret)
    .then( (hashed) => { 
      hashedSecret = hashed;
      return ContractServices.enterRoad(this.state.tollBoothOperator, this.state.entryTollBooth, 
        hashedSecret, this.state.value, this.state.vehicleAddress)})
    .then( (txObj) => {
      this.checkEnteredRoad(txObj, hashedSecret);
      return DatabaseServices.getTollBooth(this.state.databases.tollBooths, 
        this.state.tollBoothOperator, this.state.entryTollBooth)})
    .then( (tollBooth) => {
      entryTollBoothName = tollBooth.name;        
      return DatabaseServices.getVehicles({db: this.state.databases.vehicles, 
        address: this.state.vehicleAddress})})
    .then( (vehicles) => {
      vehicleName = vehicles[0].name;        
      return DatabaseServices.getTollBoothOperator({db: this.state.databases.tollBoothOperators, 
        tollBoothOperatorAddress: this.state.tollBoothOperator.address})})
    .then( (tollBoothOperator) => {
      return DatabaseServices.persist(this.state.databases.trips, 
        {id: hashedSecret, tuple: [
          {key: "hashedSecret", value: hashedSecret},
          {key: "entryTollBooth", value: entryTollBoothName},
          {key: "exitTollBooth", value: ""},
          {key: "vehicle", value: vehicleName},
          {key: "value", value: this.state.value},
          {key: "baseDeposit", value: tollBoothOperator.baseDeposit},
          {key: "status", value: "Entered"},
          {key: "tollBoothOperator", value: tollBoothOperator.name},
          {key: "timestamp", value: new Date()}]})})
    .then( () => DatabaseServices.getTrips({db: this.state.databases.trips, vehicle: vehicleName}))
    .then ((trips) => this.setState({ ...this.state, hashedSecret: hashedSecret, trips: trips }))
    .catch( (error) => {
      alert(error);
      return console.log(error)})
  }

  handleScroll(event) {
    let headers = document.getElementsByClassName("rt-thead");
    for (let i = 0; i < headers.length; i++) {
      headers[i].scrollLeft = event.target.scrollLeft;
    }
  }

  render () {

    const getAllTollBooths = this.state.tollBooths.map(
      tollBooth => (<option key={tollBooth.address} value={tollBooth.address}>{tollBooth.name}</option>))

    const getAllVehicles = this.state.vehicles.map(
        vehicle => (<option key={vehicle.address} value={vehicle.address}>{vehicle.name}</option>))

    const getAllTollBoothOperators =  
      this.state.tollBoothOperators.map(
        tollBoothOperator => (
          <option key={tollBoothOperator.address} 
          value={tollBoothOperator.address}>{tollBoothOperator.name}</option>))

    const selectTollBoothOperator = this.state.selected === true ? (
      <div>
        <p />
          <Row>
            <Col md={4}>
              <FormGroup
                controlId="tollBoothOperatorAddress">
                <ControlLabel>Toll booth operator name</ControlLabel>
                <FormControl componentClass="select"
                  onChange={this.selectTollBoothOperator.bind(this)}>
                  <option value={""}>Select toll booth operator</option>
                  {getAllTollBoothOperators}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>
      </div>
    ) : ""

    const showVehicleInformation = this.state.selected === true ? (
      <div>
        <Row>
          <Col md={5}>
            <FormGroup
              controlId="vehicleAddress">
              <ControlLabel>Address</ControlLabel>
              <FormControl readOnly
                type="text"
                value={this.state.vehicleAddress} />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={5}>
            <FormGroup
              controlId="vehicleBalance">
              <ControlLabel>Balance</ControlLabel> <Label bsStyle="info">{ContractServices.weiToEther(this.state.vehicleBalance) + " ether"}</Label>
              <FormControl readOnly
                type="number"
                value={this.state.vehicleBalance} />
            </FormGroup>
          </Col>
        </Row>
      </div>
    ) : ""

    const selectVehicle = (
      <Panel bsStyle="primary">
        <Panel.Heading><Panel.Title componentClass="h1"><b>Vehicle</b></Panel.Title></Panel.Heading>
        <Panel.Body>
          <Grid>
            <Row>
              <Col md={5}>
                <FormGroup
                  controlId="vehicleName">
                  <ControlLabel>Name</ControlLabel>
                  <FormControl componentClass="select"
                    onChange={this.selectVehicle.bind(this)}>
                    <option value="">Select vehicle</option>
                    {getAllVehicles}
                  </FormControl>
                </FormGroup>
              </Col>
            </Row>
            {showVehicleInformation}
          </Grid>
          <p />
        </Panel.Body>
      </Panel>
    )  

    const TrGroupComponent = props => {
      return <div className="rt-tr-group" role="rowgroup" style={{ minWidth: props.minWidth }}>{props.children}</div>
    }

    const tripHistory = this.state.selected === true ? (
      <div>
        <Panel bsStyle="primary" >
          <Panel.Heading><Panel.Title componentClass="h1"><b>Trip history for vehicle</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              <Row>
                <Col md={11}>
                  <ReactTable
                    data={this.state.trips}
                    columns={[
                          {
                            Header: "Entry toll booth",
                            accessor: "entryTollBooth",
                            width: 100
                          },
                          {
                            Header: "Exit toll booth",
                            accessor: "exitTollBooth",
                            width: 100
                          },
                          {
                            Header: "Value",
                            accessor: "value",
                            width: 100
                          },
                          {
                            Header: "Toll booth operator",
                            accessor: "tollBoothOperator",
                            width: 200
                          },
                          {
                            Header: "Base deposit",
                            accessor: "baseDeposit",
                            width: 100
                          },
                          {
                            Header: "Status",
                            accessor: "status",
                            width: 100
                          },
                          {
                            Header: "Refund",
                            accessor: "refund",
                            width: 100
                          },
                          {
                            Header: "Route price",
                            accessor: "routePrice",
                            width: 100
                          },
                          {
                            Header: "Timestamp",
                            accessor: "timestamp",
                            minWidth: 200
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
                    TrGroupComponent={TrGroupComponent}                    
                  />
                </Col>
              </Row>
            </Grid>
            <p />
          </Panel.Body>
        </Panel>
      </div>
    ) : ""

    const enterRoad = this.state.selected === true ? (
      <div>
        <Panel bsStyle="primary" >
          <Panel.Heading><Panel.Title componentClass="h1"><b>Enter the toll system</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              {selectTollBoothOperator}
              <Row>
                <Col md={6}>
                  <FormGroup
                    controlId="entryTollBooth">
                    <ControlLabel>Entry toll booth</ControlLabel>
                    <FormControl componentClass="select"
                      onChange={this.handleChange.bind(this)}>
                      <option value={""}>Select entry toll booth</option>
                      {getAllTollBooths}
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={3}>
                  <FormGroup
                    controlId="value">
                    <ControlLabel>Value</ControlLabel>
                    <FormControl
                      type="number"
                      value={this.state.value}
                      placeholder="Enter value"
                      onChange={this.handleChange.bind(this)} />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={5}>
                  <FormGroup
                    controlId="clearTextSecret">
                    <ControlLabel>Secret</ControlLabel>
                    <FormControl
                      type="text"
                      value={this.state.clearTextSecret}
                      placeholder="Enter value"
                      onChange={this.handleChange.bind(this)} />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                    <Button bsStyle="primary"
                      disabled={this.checkEnterRoadInformation()}
                      onClick={this.enterRoad.bind(this)}>Enter</Button>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <Label bsStyle="info">{this.state.hashedSecret !== "" ? "Hashed secret: " + this.state.hashedSecret : ""}</Label>
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
        <p/>
          <Row>{selectVehicle}</Row>
          <Row>{tripHistory}</Row>
          <Row>{enterRoad}</Row>
      </Grid>
    )
  }
}

export default VehicleComponent
