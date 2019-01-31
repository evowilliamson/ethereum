pragma solidity ^0.4.24;

import "./Owned.sol";
import "./interfaces/TollBoothHolderI.sol";

contract TollBoothHolder is Owned, TollBoothHolderI {

    mapping(address => bool) tollBooths;

    constructor() public {
    }

    /**
     * Event emitted when a toll booth has been added to the TollBoothHolder.
     * @param sender The account that ran the action.
     * @param tollBooth The toll booth just added.
     */
    event LogTollBoothAdded(address indexed sender, address indexed tollBooth);

    /**
     * Called by the owner of the TollBoothHolder.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the argument is already a toll booth.
     *     It should roll back if the argument is a 0x address.
     *     When part of TollBoothOperatorI, it should be possible to add toll booths even when
     *       the contract is paused.
     * @param tollBooth The address of the toll booth being added.
     * @return Whether the action was successful.
     * Emits LogTollBoothAdded with:
     *     The sender of the action.
     *     The address of the toll booth just added.
     */
    function addTollBooth(address tollBooth) onlyWhenOwner public returns (bool) {

        require(tollBooths[tollBooth] == false, "Toll booth is already registered");
        require(tollBooth != 0x0, "Toll booth must be specified");

        tollBooths[tollBooth] = true;

        emit LogTollBoothAdded(msg.sender, tollBooth);

        return true;

    }

    /**
     * @param tollBooth The address of the toll booth we enquire about. It should accept a 0 address.
     * @return Whether the toll booth is indeed known to the holder.
     */
    function isTollBooth(address tollBooth) view public returns (bool) {

        return tollBooths[tollBooth];

    }

    /**
     * Event emitted when a toll booth has been removed from the TollBoothOperator.
     * @param sender The account that ran the action.
     * @param tollBooth The toll booth just removed.
     */
    event LogTollBoothRemoved(address indexed sender, address indexed tollBooth);

    /**
     * Called by the owner of the TollBoothHolder.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the argument has already been removed.
     *     It should roll back if the argument is a 0x address.
     *     When part of TollBoothOperatorI, it should be possible to remove toll booth even when
     *       the contract is paused.
     * @param tollBooth The toll booth to remove.
     * @return Whether the action was successful.
     * Emits LogTollBoothRemoved with:
     *     The sender of the action.
     *     The address of the toll booth just removed.
     */
    function removeTollBooth(address tollBooth) onlyWhenOwner public returns(bool success) {

        require(tollBooths[tollBooth] == true);
        require(tollBooth != 0x0);

        delete tollBooths[tollBooth];

        emit LogTollBoothRemoved(msg.sender, tollBooth);

        return true;

    }

	/**
"If an instance is a `TollBoothHolderI` and also is a `TollBoothOperatorI`, regardless of the Pausible state, allow additions and removals of toll booths. In all other cases, all instance that are `TollBoothHolderI`, are only allowed to add and remove toll booths when the contract is paused"	
	 */

}
