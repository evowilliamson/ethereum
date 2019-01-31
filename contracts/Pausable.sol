pragma solidity ^0.4.24;

import "./interfaces/PausableI.sol";
import "./Owned.sol";

contract Pausable is PausableI, Owned {

    bool paused;

    modifier whenPaused() {

        require(paused);
        _;

    }

    modifier whenNotPaused() {

        require(!paused);
        _;

    }

    constructor(bool _paused) public {

        paused = _paused;

    }

    /**
     * Event emitted when a new paused state has been set.
     * @param sender The account that ran the action.
     * @param newPausedState The new, and current, paused state of the contract.
     */
    event LogPausedSet(address indexed sender, bool indexed newPausedState);

	/**
     * Sets the new paused state for this contract.
     *     It should roll back if the caller is not the current owner of this contract.
     *     It should roll back if the state passed is no different from the current.
     * @param newState The new desired "paused" state of the contract.
     * @return Whether the action was successful.
     * Emits LogPausedSet with:
     *     The sender of the action.
     *     The new state.
     */
    function setPaused(bool newState) onlyWhenOwner public returns (bool) {

        require(newState != paused);

        paused = newState;
        emit LogPausedSet(msg.sender, newState);

        return true;

    }

	/**
	 * @return Whether the contract is indeed paused.
	 */
    function isPaused() view public returns (bool) {

        return paused;

    }

}
