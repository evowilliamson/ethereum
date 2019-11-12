pragma solidity ^0.4.24;

import "./interfaces/RegulatedI.sol";

contract Regulated is RegulatedI {

    RegulatorI regulator;

    constructor (address _regulator) public {
        require(_regulator != 0x0);
        regulator = RegulatorI(_regulator);
    }

    /**
     * Event emitted when a new regulator has been set.
     * @param previousRegulator The previous regulator of the contract.
     * @param newRegulator The new, and current, regulator of the contract.
     */
    event LogRegulatorSet(address indexed previousRegulator, address indexed newRegulator);

    /**
     * Sets the new regulator for this contract.
     *     It should roll back if any address other than the current regulator of this contract
     *       calls this function.
     *     It should roll back if the new regulator address is 0.
     *     It should roll back if the new regulator is the same as the current regulator.
     * @param newRegulator The new desired regulator of the contract. It is assumed, that this is the
     *     address of a `RegulatorI` contract. It is not necessary to prove it is a `RegulatorI`.
     * @return Whether the action was successful.
     * Emits LogRegulatorSet with:
     *     The sender of the action.
     *     The new regulator.
     */
    function setRegulator(address newRegulator) public returns (bool) {

        require(regulator == msg.sender, "Can only be called by the current regulator");
        require(newRegulator != 0x0, "New regulator cannot be 0 address");
        require(newRegulator != address(regulator), "New and current regulator cannot be the same");

        regulator = RegulatorI(newRegulator);

        emit LogRegulatorSet(msg.sender, newRegulator);

        return true;

    }

    /**
     * @return The current regulator.
     */
    function getRegulator() view public returns (RegulatorI) {

        return regulator;

    }

}
 