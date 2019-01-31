import React, { Component } from "react"
import * as DatabaseServices from "../service/DatabaseServices"
import Grid from "react-bootstrap/lib/Grid"
import Row from "react-bootstrap/lib/Row"
import Label from 'react-bootstrap/lib/Label'
import Col from "react-bootstrap/lib/Col"
import Panel from "react-bootstrap/lib/Panel"
import Button from "react-bootstrap/lib/Button"

class Regulator extends Component {
  constructor (props, context) {
    super(props, context)

    this.handleChange = this.handleChange.bind(this)

    this.state = {
      buttonsDisabled: false,
      databaseCleared: false,
      databases: this.props.databases
    }

  }

  async componentWillMount () {
  }

  handleChange (e) {
    this.setState({ ...this.state, [e.target.id]: e.target.value })
  }

  clearDatabases () {

    this.setState({ ...this.state, hideButtons: true})
    DatabaseServices.clearDatabase(this.state.databases.vehicles)
    .then(DatabaseServices.clearDatabase(this.state.databases.tollBoothOperators))
    .then(DatabaseServices.clearDatabase(this.state.databases.tollBooths))
    .then(DatabaseServices.clearDatabase(this.state.databases.routes))
    .then(this.setState({ ...this.state, hideButtons: false, databaseCleared: true}))

  }

  render () {

    const showDatabaseClearedMessage = this.state.databaseCleared === true ? (
      <Row>
      <Col md={3}>
        <Label
          bsStyle="info">{"Database cleared, make sure to deploy smart contracts again to revert blockchain state"}
        </Label>
      </Col>
      </Row>
    ) : ""

    return (
      <Grid>
        <p />
        <Row>
          <Panel bsStyle="primary">
            <Panel.Heading><Panel.Title componentClass="h1"><b>Off-chain database</b></Panel.Title></Panel.Heading>
            <Panel.Body>
              <Grid>
                <Row>
                  <Col md={3}>
                    <Button
                      bsStyle="primary"
                      disabled={this.state.buttonsDisabled}
                      onClick={this.clearDatabases.bind(this)}>Clear off-chain database</Button>
                  </Col>
                </Row>
                {showDatabaseClearedMessage}
              </Grid>
            </Panel.Body>
          </Panel>
        </Row>
      </Grid>
    )
  }
}

export default Regulator
