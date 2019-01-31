pragma solidity ^0.4.24;

import "./interfaces/RegulatorI.sol";
import "./TollBoothOperator.sol";
import "./Owned.sol";

contract Regulator is RegulatorI, Owned {

    mapping(address => uint) vehicleToTypes;
    mapping(address => bool) tollBoothOperators;        

    constructor() Owned() public  {
    }

 /**
     * uint VehicleType:
     * 0: not a vehicle, absence of a vehicle
     * 1 and above: is a vehicle.
     * For instance:
     *   1: motorbike
     *   2: car
     *   3: lorry
     */

    /**
     * Event emitted when a new vehicle has been registered with its type.
     * @param sender The account that ran the action.
     * @param vehicle The address of the vehicle that is registered.
     * @param vehicleType The VehicleType that the vehicle was registered as.
     */
    event LogVehicleTypeSet(address indexed sender, address indexed vehicle, uint indexed vehicleType);

    /**
     * Called by the owner of the regulator to register a new vehicle with its VehicleType.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the arguments mean no change of state.
     *     It should roll back if a 0x vehicle address is passed.
     * @param vehicle The address of the vehicle being registered. This may be an externally
     *   owned account or a contract. The regulator does not care.
     * @param vehicleType The VehicleType of the vehicle being registered.
     *    passing 0 is equivalent to unregistering the vehicle.
     * @return Whether the action was successful.
     * Emits LogVehicleTypeSet with:
     *     The sender of the action.
     *     The address of the vehicle that was changed.
     *     The vehicle type that was set.
     */
    function setVehicleType(address vehicle, uint vehicleType) 
        onlyWhenOwner public returns (bool) {

        require(vehicle != 0x0, "0x vehicle address passed");
        require(vehicleToTypes[vehicle] != vehicleType, "Vehicle type not changed");

        vehicleToTypes[vehicle] = vehicleType;
		// For unregistering nothing special needs to happen

        emit LogVehicleTypeSet(msg.sender, vehicle, vehicleType);

        return true;

    }

    /**
     * @param vehicle The address of the registered vehicle. It should accept a 0x vehicle address.
     * @return The VehicleType of the vehicle whose address was passed. 0 means it is not
     *   a registered vehicle.
     */
    function getVehicleType(address vehicle) view public returns (uint) {

        return vehicleToTypes[vehicle];

    }

    /**
     * Event emitted when a new TollBoothOperator has been created and registered.
     * @param sender The account that ran the action.
     * @param newOperator The newly created TollBoothOperator contract.
     * @param owner The rightful owner of the TollBoothOperator.
     * @param depositWeis The initial deposit amount set in the TollBoothOperator.
     */
    event LogTollBoothOperatorCreated(address indexed sender, address indexed newOperator,
        address indexed owner, uint depositWeis);

    /**
     * Called by the owner of the regulator to deploy a new TollBoothOperator onto the network.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should start the TollBoothOperator in the `true` paused state.
     *     It should roll back if the rightful owner argument is the current owner of the regulator.
     * @param owner The rightful owner of the newly deployed TollBoothOperator.
     * @param deposit The initial value of the TollBoothOperator deposit.
     * @return The address of the newly deployed TollBoothOperator.
     * Emits LogTollBoothOperatorCreated with:
     *     The sender of the action.
     *     The address of the deployed TollBoothOperator.
     *     The rightful owner of the TollBoothOperator.
     *     the initial deposit value.
     */
    function createNewOperator(address owner, uint deposit) 
	    onlyWhenOwner public returns (TollBoothOperatorI) {

        require(owner != getOwner(), "Regulator owner cannot be passed as the owner of the toll booth operator");

		/**
		 * Create the tollBoothOperator. Pass the address of the regulator (this(), a 
		 * toll booth operator needs to know its regulator
		 */
        TollBoothOperator tollBoothOperator = new TollBoothOperator(true, deposit, this);
		/**
		 * Set the future owner of the TollBoothOperator contract to the owner that is passed. 
		 * The owner that is passed is the TollBoothOperator owner. P.S. The regulator is not the owner!
		 **/
        tollBoothOperator.setOwner(owner);
        tollBoothOperators[tollBoothOperator] = true;

        emit LogTollBoothOperatorCreated(msg.sender, tollBoothOperator, owner, deposit);

        return tollBoothOperator;

    }
    /**
     * Event emitted when a TollBoothOperator has been removed from the list of approved operators.
     * @param sender The account that ran the action.
     * @param operator The removed TollBoothOperator.
     */
    event LogTollBoothOperatorRemoved(address indexed sender, address indexed operator);

    /**
     * Called by the owner of the regulator to remove a previously deployed TollBoothOperator from
     * the list of approved operators.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the operator is unknown.
     * @param operator The address of the contract to remove.
     * @return Whether the action was successful.
     * Emits LogTollBoothOperatorRemoved with:
     *     The sender of the action.
     *     The address of the remove TollBoothOperator.
     */
    function removeOperator(address operator) 
	    onlyWhenOwner 
        public returns (bool) {

        require(isOperator(operator), "Unknown toll booth operator");

        delete tollBoothOperators[operator];

        emit LogTollBoothOperatorRemoved(msg.sender, operator);

        return true;

    }

    /**
     * @param operator The address of the TollBoothOperator to test. It should accept a 0 address.
     * @return Whether the TollBoothOperator is indeed approved.
     */
    function isOperator(address operator) view public returns (bool) {

        return tollBoothOperators[operator];

    }

}
