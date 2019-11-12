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
// import { withAlert } from "react-alert";


class TollBoothComponent extends Component {

  constructor (props) {
    super(props)
    this.state = {
        hashedSecret: "", 
        clearTextSecret: "",
        selectedTollBoothOperator: false,
        databases: this.props.databases,
        tollBoothOperatorAddress: "",
        tollBoothOperatorName: "",
        enterRoadButtonDisabled: true,
        value: 0,
        tollBooths: [],
        vehicles: [],
        exitTollBooth: "",
        tollBoothOperators: [],
        trips: [],
        logged: "",
        selectedState: this.props.selectedState
    }

    DatabaseServices.getAllTollBoothOperators(this.state.databases.tollBoothOperators)
    .then( (tollBoothOperators) => this.setState({ ...this.state, tollBoothOperators: tollBoothOperators}))
    .then( () => this.setTollBoothOperator(this.state.selectedState.tollBoothOperatorForTollBooth))

  }

  handleChange (e) {
    this.setState({ ...this.state, [e.target.id]: e.target.value })
  }

  selectTollBoothOperator (event) {

    this.setTollBoothOperator(event.target.value)

  }

  setTollBoothOperator(selectedtollBoothOperator) {

    if (selectedtollBoothOperator === "") {
      return;
    }

    this.setState({ ...this.state, tollBoothOperatorAddress: selectedtollBoothOperator, selectedTollBoothOperator: false })
    let tollBoothOperatorInstance = ContractServices.getTollBoothOperator(selectedtollBoothOperator);
    if (tollBoothOperatorInstance !== null) {
      let tollBoothOperator;
      let temp = this.state.selectedState;
      tollBoothOperator = tollBoothOperatorInstance;
      temp.tollBoothOperatorForTollBooth = selectedtollBoothOperator;
      return ContractServices.getTollBoothOperatorCollectedFees(tollBoothOperator)
      .then( (collectedFees) => {
        return this.setState({ ...this.state, tollBoothOperator: tollBoothOperator, collectedFees: collectedFees})})
      .then( () => DatabaseServices.getAllTollBooths(this.state.databases.tollBooths, this.state.tollBoothOperator))
      .then( (list) => this.setState({ ...this.state, tollBooths: list}))
      .then( () => DatabaseServices.getTollBoothOperator(
        {db: this.state.databases.tollBoothOperators, tollBoothOperatorAddress: selectedtollBoothOperator}))
      .then( (operator) => {
        this.setState({ ...this.state, tollBoothOperatorName: operator.name})
        return DatabaseServices.getTrips({db: this.state.databases.trips, tollBoothOperator: operator.name})})
      .then( (trips) => this.setState({ ...this.state, trips: trips, selectedTollBoothOperator: true}))
      .catch( (error) => {
        alert(error);
        console.log(error);
        return this.setState({ ...this.state, selectedTollBoothOperator: false })})
    }
    else {
      this.setState({ ...this.state, selectedTollBoothOperator: false })
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

  handleScroll(event) {
    let headers = document.getElementsByClassName("rt-thead");
    for (let i = 0; i < headers.length; i++) {
      headers[i].scrollLeft = event.target.scrollLeft;
    }
  }

  checkExitRoadInformation() {

    if  (this.state.exitTollBooth === "" || this.state.clearTextSecret === "") {
      return true;
    }
    else {
      return false;
    }

  }

  processExit(txObj) {

    const logExited = txObj.logs[0];
    if (txObj.receipt.logs.length !== 1 ||  txObj.logs.length !== 1 ||
      (logExited.event !== "LogRoadExited" && logExited.event !== "LogPendingPayment")) {
      throw new Error("Error when entering the road")
    }

    const hashedSecret = logExited.args.exitSecretHashed;
    this.setState({ ...this.state, hashedSecret: hashedSecret });
    return DatabaseServices.getTrips({db: this.state.databases.trips, hashedSecret: hashedSecret})
    .then ( (trips) => {
      if (trips.length !== 1) {
        throw new Error("Error during exiting, number of trips found: " + trips.length)
      }
      let trip = trips[0];
      return DatabaseServices.getTollBooth(this.state.databases.tollBooths, 
        this.state.tollBoothOperator, logExited.args.exitBooth)
      .then( (tollBooth) => {
        trip.exitTollBooth = tollBooth.name;
        trip.timestamp = new Date();
        if (logExited.event === "LogRoadExited") {
          trip.finalFee = logExited.args.finalFee.toString(10);
          trip.refund = logExited.args.refundWeis.toString(10);
          trip.status = "Exited";
        }
        else {
          trip.status = "Payment pending";
        }
        return DatabaseServices.getRoutes({db:this.state.databases.routes, tollBoothOperator: this.state.tollBoothOperator,
          entryTollBoothName: trip.entryTollBooth, exitTollBoothName: trip.exitTollBooth})})
      .then( (routes) => {
        if (trip.status === "Exited") {
          trip.routePrice = routes[0].routePrice;
        }
        return DatabaseServices.persist(this.state.databases.trips,  
          {id: hashedSecret, 
            tuple: [
              {key: "exitTollBooth", value: trip.exitTollBooth},
              {key: "finalFee", value: trip.finalFee},
              {key: "refund", value: trip.refund},
              {key: "status", value: trip.status},
              {key: "routePrice", value: trip.routePrice},
              {key: "timestamp", value: new Date()}]})})})
  }

  reportExitRoad() {
    let txObj;
    this.setState({ ...this.state, logged: "", hashedSecret: "" });
    return ContractServices.reportExitRoad(this.state.tollBoothOperator, this.state.exitTollBooth, 
      this.state.clearTextSecret)
    .then( (_txObj) => {
      txObj = _txObj;
      return this.processExit(txObj)})
    .then( () => {
      this.setState({ ...this.state, logged: txObj.logs[0].event });
      return DatabaseServices.getTrips({db: this.state.databases.trips, 
        tollBoothOperator: this.state.tollBoothOperatorName})})
    .then( (trips) => this.setState({ ...this.state, trips: trips}))
    .catch( (error) => {
      alert(error);
      return console.log(error)})
  }

  render () {

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
                    <ControlLabel>Name</ControlLabel>
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

    const TrGroupComponent = props => {
      return <div className="rt-tr-group" role="rowgroup" style={{ minWidth: props.minWidth }}>{props.children}</div>
    }

    const tripHistory = this.state.selectedTollBoothOperator === true ? (
      <div>
        <Panel bsStyle="primary" >
          <Panel.Heading><Panel.Title componentClass="h1"><b>Trip history for toll booth operator</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              <Row>
                <Col md={11}>
                  <ReactTable
                    data={this.state.trips}
                    columns={[
                          {
                            Header: "Vehicle",
                            accessor: "vehicle"
                          },
                          {
                            Header: "Entry toll booth",
                            accessor: "entryTollBooth"
                          },
                          {
                            Header: "Exit toll booth",
                            accessor: "exitTollBooth"
                          },
                          {
                            Header: "Value",
                            accessor: "value"
                          },
                          {
                            Header: "Base deposit",
                            accessor: "baseDeposit"
                          },
                          {
                            Header: "Status",
                            accessor: "status"
                          },
                          {
                            Header: "Refund",
                            accessor: "refund"
                          },
                          {
                            Header: "Route price",
                            accessor: "routePrice"
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

    const exitRoad = this.state.selectedTollBoothOperator === true ? (
      <div>
        <Panel bsStyle="primary" >
          <Panel.Heading><Panel.Title componentClass="h1"><b>Exit the toll system</b></Panel.Title></Panel.Heading>
          <Panel.Body>
            <Grid>
              <Row>
                <Col md={6}>
                  <FormGroup
                    controlId="exitTollBooth">
                    <ControlLabel>Exit toll booth</ControlLabel>
                    <FormControl componentClass="select"
                      onChange={this.handleChange.bind(this)}>
                      <option value={""}>Select exit toll booth</option>
                      {getAllTollBooths}
                    </FormControl>
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
                      disabled={this.checkExitRoadInformation()}
                      onClick={this.reportExitRoad.bind(this)}>Exit</Button>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <Label bsStyle="info">{this.state.logged !== "" ? this.state.logged + " for " + 
                    this.state.hashedSecret: ""}</Label>
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
        <Row>{tripHistory}</Row>
        <Row>{exitRoad}</Row>
      </Grid>
    )
  }
}

export default TollBoothComponent
