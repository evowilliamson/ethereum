pragma solidity ^0.4.24;

import "./Owned.sol";
import "./interfaces/DepositHolderI.sol";

contract DepositHolder is Owned, DepositHolderI {
    uint amount;    

    constructor(uint _amount) Owned() public {

        require(_amount > 0);
        amount = _amount;

    }

    /**
     * Event emitted when the deposit value has been set.
     * @param sender The account that ran the action.
     * @param depositWeis The value of the deposit measured in weis.
     */
    event LogDepositSet(address indexed sender, uint depositWeis);

    /**
     * Called by the owner of the DepositHolder.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the argument passed is 0.
     *     It should roll back if the argument is no different from the current deposit.
     * @param depositWeis The value of the deposit being set, measured in weis.
     * @return Whether the action was successful.
     * Emits LogDepositSet with:
     *     The sender of the action.
     *     The new value that was set.
     */
    function setDeposit(uint depositWeis)
        onlyWhenOwner() public returns (bool) {

        require(depositWeis > 0);
        require(depositWeis != amount);

        amount = depositWeis;

        emit LogDepositSet(msg.sender, amount);
        return true;

    }

    /**
     * @return The base price, then to be multiplied by the multiplier, a given vehicle
     * needs to deposit to enter the road system.
     */
    function getDeposit()
        public view returns(uint) {

        return amount;

    }

}
