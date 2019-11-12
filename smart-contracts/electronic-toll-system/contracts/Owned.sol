pragma solidity ^0.4.24;

import "./interfaces/OwnedI.sol";

contract Owned is OwnedI {
    address owner;

    /**
     * If the sender is not equal to the owner, then revert the transaction
     */
    modifier onlyWhenOwner() {

        require(msg.sender == owner);
        _;

    }

    constructor() public {

        owner = msg.sender;

    }

    /**
     * Event emitted when a new owner has been set.
     * @param previousOwner The previous owner, who happened to effect the change.
     * @param newOwner The new, and current, owner the contract.
     */
    event LogOwnerSet(address indexed previousOwner, address indexed newOwner);

    /**
     * Sets the new owner for this contract.
     *     It should roll back if the caller is not the current owner.
     *     It should roll back if the argument is the current owner.
     *     It should roll back if the argument is a 0 address.
     * @param newOwner The new owner of the contract
     * @return Whether the action was successful.
     * Emits LogOwnerSet with:
     *     The sender of the action.
     *     The new owner.
     */
    function setOwner(address newOwner) onlyWhenOwner() public returns (bool) {

        require(newOwner != owner);
        require(newOwner != 0);

        emit LogOwnerSet(owner, newOwner);

        owner = newOwner;

        return true;

    }

    /**
     * @return The owner of this contract.
     */
    function getOwner() view public returns (address) {

        return owner;

    }
    
}
