import { getConfigurations } from '../config/config'

export const getRegulatorOwner = () => 
    getConfigurations().regulator.getOwner()

export const getTollBoothOperator = (tollBoothOperatorAddress) => 
    getConfigurations().tollBoothOperator.at(tollBoothOperatorAddress)

export const getTollBoothOperatorOwner = (tollBoothOperator) => 
  tollBoothOperator.getOwner.call();

export const getTollBoothOperatorCollectedFees = (tollBoothOperator) => 
  tollBoothOperator.getCollectedFeesAmount.call();

export const setPaused2 = (tollBoothOperator, paused, from, gas) => 
  tollBoothOperator.setPaused(paused, { from, gas })

export const setVehicleType = (_address, _type, _regulator, gas) => 
  getConfigurations().regulator.setVehicleType(_address, _type, { from: _regulator, gas })

export const registerTollBoothOperator = (_owner, _regulator, _deposit, gas) => 
  getConfigurations().regulator.createNewOperator(_owner, _deposit, { from: _regulator, gas: gas })

export const addTollBooth = (tollBoothAddress, tollBoothOperator, owner, gas) =>
  tollBoothOperator.addTollBooth(tollBoothAddress, { from: owner, gas: gas })

export const setRoutePrice = (tollBoothOperator, routePrice, entryTollBooth, exitTollBooth, owner, gas) => 
  tollBoothOperator.setRoutePrice(entryTollBooth, exitTollBooth, routePrice, 
    { from: owner, gas: gas })

export const setMultiplier = (tollBoothOperator, vehicleType, multiplier, owner, gas) => 
  tollBoothOperator.setMultiplier(vehicleType, multiplier, { from: owner, gas: gas })

export const getBalance = (address) => 
  getConfigurations().web3.eth.getBalancePromise(address)
  .then( (balance) => balance.toString());

export const weiToEther = (wei) =>
  getConfigurations().web3.fromWei(wei);

export const enterRoad = (tollBoothOperator, entryTollBooth, hashedSecret, value, vehicle) => 
  tollBoothOperator.enterRoad(entryTollBooth, hashedSecret, 
    { from: vehicle, value: value, gas: getConfigurations().GAS })

export const reportExitRoad = (tollBoothOperator, exitTollBooth, hashedSecret) => 
  tollBoothOperator.reportExitRoad(hashedSecret, { from: exitTollBooth, gas: getConfigurations().GAS })

export const hashClearTextSecret = (tollBoothOperator, vehicle, clearTextSecret) => 
  tollBoothOperator.hashSecret(clearTextSecret, { from: vehicle, gas: getConfigurations().GAS } )

export const toBytes32 = (i) => {
    const stringed = "0000000000000000000000000000000000000000000000000000000000000000" + i.toString(16);
    return "0x" + stringed.substring(stringed.length - 64, stringed.length); 
}
