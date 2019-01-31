import React, { Component } from "react"
import FormGroup from "react-bootstrap/lib/FormGroup"
import FormControl from "react-bootstrap/lib/FormControl"
import * as ContractServices from "../service/ContractServices"
import * as DatabaseServices from "../service/DatabaseServices"
import Grid from "react-bootstrap/lib/Grid"
import Row from "react-bootstrap/lib/Row"
import Col from "react-bootstrap/lib/Col"
import ControlLabel from "react-bootstrap/lib/ControlLabel"
import Panel from "react-bootstrap/lib/Panel"
import Button from "react-bootstrap/lib/Button"
import { getConfigurations } from "../config/config"
import ReactTable from "react-table";
import "react-table/react-table.css";

class Regulator extends Component {
  constructor (props, context) {
    super(props, context)

    this.handleTollBoothOperatorChange = this.handleTollBoothOperatorChange.bind(this);
    this.handleVehicleChange = this.handleVehicleChange.bind(this);

    this.state = {
      vehicleAddress: "",
      vehicleName: "",
      vehicleType: 0,
      gas: getConfigurations().GAS,
      regulator: getConfigurations().accounts[0],
      newVehicleAddress: "",
      tollBoothOperatorOwner: "",
      newTollBoothOperator: "",
      baseDeposit: 0,
      tollBoothName: "",
      tollBoothOperatorButtonDisabled: true,
      vehicleButtonDisabled: true,
      databases: this.props.databases,
      vehicles: [],
      tollBoothOperators: []
    }

    DatabaseServices.getVehicles({db: this.state.databases.vehicles})
    .then( (vehicles) => this.setState({ ...this.state, vehicles: vehicles}))
    .then( () => DatabaseServices.getAllTollBoothOperators(this.state.databases.tollBoothOperators))
    .then( (tollBoothOperators) => this.setState({ ...this.state, tollBoothOperators: tollBoothOperators, 
      tollBoothOperatorButtonDisabled: true, vehicleButtonDisabled: true}))

  }

  async componentWillMount () {
    let regulatorOwner;
    return ContractServices.getRegulatorOwner()
    .then( (owner) => {
      regulatorOwner = owner;
      return this.setState({ ...this.state, regulator: regulatorOwner, 
        tollBoothOperatorButtonDisabled: true, vehicleButtonDisabled: true})})
  }

  handleVehicleChange (e) {
    let tempState = { ...this.state, [e.target.id]: e.target.value };
    if  (tempState.vehicleName === "" || tempState.vehicleAddress === "") {
      this.setState({ ...this.state, [e.target.id]: e.target.value, vehicleButtonDisabled: true });
    }
    else {
      this.setState({ ...this.state, [e.target.id]: e.target.value, vehicleButtonDisabled: false})
    }
  }

  handleTollBoothOperatorChange (e) {
    let tempState = { ...this.state, [e.target.id]: e.target.value };
    if  (tempState.tollBoothName === "" || tempState.tollBoothOperatorOwner === "" || 
      parseInt(tempState.baseDeposit, 10) === 0) {
      this.setState({ ...this.state, [e.target.id]: e.target.value, tollBoothOperatorButtonDisabled: true });
    }
    else {
      this.setState({ ...this.state, [e.target.id]: e.target.value, tollBoothOperatorButtonDisabled: false})
    }
  }

  registerVehicle () {
    let addedVehicleAddress = this.state.vehicleAddress;
    this.setState({ ...this.state, tollBoothOperatorButtonDisabled: true, newVehicleAddress: "" })
    return ContractServices.setVehicleType(this.state.vehicleAddress, this.state.vehicleType,
      this.state.regulator, this.state.gas)
    .then( () => this.setState({ ...this.state, newVehicleAddress: addedVehicleAddress, tollBoothOperatorButtonDisabled: false }))
    .then( () => DatabaseServices.inDocuments(this.state.databases.vehicles, ["name"], [this.state.vehicleType]))
    .then( () => DatabaseServices.persist(this.state.databases.vehicles, 
      {id: addedVehicleAddress, tuple: [
        {key: "address", value: addedVehicleAddress},
        {key: "name", value: this.state.vehicleName},
        {key: "type", value: this.state.vehicleType},
        {key: "timestamp", value: new Date()}]}))
    .then( () => DatabaseServices.getVehicles({db:this.state.databases.vehicles}))
    .then( (list) => this.setState({ ...this.state, vehicles: list}))
    .catch( (error) => { alert(error); console.log(error); this.setState({ ...this.state, tollBoothOperatorButtonDisabled: false })});
  }

  registerTollBoothOperator() {
    let createdTollBoothOperator;
    this.setState({ ...this.state, tollBoothOperatorButtonDisabled: true, newTollBoothOperator: "" });
    return ContractServices.registerTollBoothOperator(
      this.state.tollBoothOperatorOwner,
      this.state.regulator,
      this.state.baseDeposit,
      this.state.gas)
    .then( (txObj) => {
      createdTollBoothOperator = txObj.logs[1].args.newOperator;
      return ContractServices.getTollBoothOperator(createdTollBoothOperator)})
   .then( (tollBoothOperator) => ContractServices.setPaused2(tollBoothOperator, false, this.state.tollBoothOperatorOwner, this.state.gas))
    .then( () => this.setState({ ...this.state, newTollBoothOperator: createdTollBoothOperator, tollBoothOperatorButtonDisabled: false }))
    .then( () => DatabaseServices.inDocuments(this.state.databases.tollBoothOperators, ["name"], [this.state.tollBoothName]))
    .then( () => DatabaseServices.persist(this.state.databases.tollBoothOperators, 
        {id: createdTollBoothOperator, tuple: [
        {key: "address", value: createdTollBoothOperator},
        {key: "name", value: this.state.tollBoothName},
        {key: "owner", value: this.state.tollBoothOperatorOwner},
        {key: "baseDeposit", value: this.state.baseDeposit},
        {key: "timestamp", value: new Date()}]}))
    .then( () => DatabaseServices.getAllTollBoothOperators(this.state.databases.tollBoothOperators))
    .then( (list) => this.setState({ ...this.state, tollBoothOperators: list}))
    .catch( (error) => { alert(error); console.log(error); return this.setState({ ...this.state, tollBoothOperatorButtonDisabled: false })
    })
  }

  render () {

    const getAllAccounts = getConfigurations().accounts.map(
      account => (<option key={account} value={account}>{account}</option>))

    const registerTollBoothOperator = (
      <Panel bsStyle="primary" >
        <Panel.Heading><Panel.Title componentClass="h1"><b>Toll booth operators</b></Panel.Title></Panel.Heading>
        <Panel.Body>
          <Grid>
            <Row>
              <Col md={11}>
                <ReactTable
                  data={this.state.tollBoothOperators}
                  columns={[
                      {
                        Header: "Toll booth operator",
                        accessor: "address"
                      },
                      {
                        Header: "Name",
                        accessor: "name"
                      },
                      {
                        Header: "Toll booth operator owner",
                        accessor: "owner"
                      },
                      {
                        Header: "Base deposit",
                        accessor: "baseDeposit"
                      },
                      {
                        Header: "Timestamp",
                        accessor: "timestamp"
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
              <p />
            </Row>
            <br />
            <Row>
              <Col md={5}>
                <FormGroup
                  controlId="tollBoothOperatorOwner">
                  <ControlLabel>Toll booth operator owner address</ControlLabel>
                  <FormControl componentClass="select"
                    onChange={this.handleTollBoothOperatorChange.bind(this)}>
                    <option value={""}>Select toll booth operator owner address</option>
                    {getAllAccounts}
                  </FormControl>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={5}>
                <FormGroup
                  controlId="tollBoothName">
                  <ControlLabel>Name</ControlLabel>
                  <FormControl
                    type="text"
                    value={this.state.tollBoothName}
                    onChange={this.handleTollBoothOperatorChange.bind(this)} />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={2}>
                <FormGroup
                  controlId="baseDeposit">
                  <ControlLabel>Base deposit</ControlLabel>
                  <FormControl
                    type="number"
                    value={this.state.baseDeposit}
                    onChange={this.handleTollBoothOperatorChange.bind(this)} />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={3}>
                <Button
                  bsStyle="primary"
                  disabled={this.state.tollBoothOperatorButtonDisabled}
                  onClick={this.registerTollBoothOperator.bind(this)}>Create toll booth operator</Button>
              </Col>
            </Row>            
          </Grid>
          <p />
        </Panel.Body>
      </Panel>      
    )

    const registerVehicle = (
      <Panel bsStyle="primary">
        <Panel.Heading><Panel.Title componentClass="h1"><b>Vehicles</b></Panel.Title></Panel.Heading>
        <Panel.Body>
          <Grid>
            <Row>
              <Col md={10}>
              <ReactTable
                data={this.state.vehicles}
                columns={[
                      {
                        Header: "Vehicle",
                        accessor: "address"
                      },
                      {
                        Header: "Name",
                        accessor: "name"
                      },
                      {
                        Header: "Type",
                        accessor: "type"
                      },
                      {
                        Header: "Timestamp",
                        accessor: "timestamp"
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
              <Col md={5}>
                <FormGroup
                  controlId="vehicleAddress">
                  <ControlLabel>Vehicle address</ControlLabel>
                  <FormControl componentClass="select" 
                              onChange={ this.handleVehicleChange.bind(this) }>
                  <option value={""}>Select vehicle address</option>
                  {getAllAccounts}
                </FormControl>
                </FormGroup>
              </Col>
            </Row>
            <Row>
            <Col md={5}>
              <FormGroup
                controlId="vehicleName">
                <ControlLabel>Name</ControlLabel>
                <FormControl
                  type="text"
                  value={this.state.vehicleName}
                  onChange={ this.handleVehicleChange.bind(this) } />
              </FormGroup>
            </Col>
          </Row>
            <Row>
              <Col md={2}>
                <FormGroup
                  controlId="vehicleType">
                  <ControlLabel>Vehicle type</ControlLabel>
                  <FormControl
                    type="number"
                    value={this.state.vehicleType}
                    placeholder="Enter type"
                    onChange={this.handleVehicleChange.bind(this)} />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={3}>
                <Button
                  bsStyle="primary"
                  disabled={this.state.vehicleButtonDisabled}
                  onClick={this.registerVehicle.bind(this)}>Register vehicle</Button>
              </Col>
            </Row>            
          </Grid>
          <p />
        </Panel.Body>
      </Panel>      
    )

    return (
      <Grid>
        <p/>
          <Row>{registerTollBoothOperator}</Row>
          <Row>{registerVehicle}</Row>
      </Grid>
    )
  }
}

export default Regulator
