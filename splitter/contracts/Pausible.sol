pragma solidity ^0.4.24;


/*
Pausible super contract
*/
contract Pausible {

    bool public active = false;

    event ActivateContract(address owner);
    event DeactivateContract(address owner);

    /** Abstract contract
     **/
    constructor() public {
        active = true;
    }

    modifier onlyWhenActive() {
        require(active, "Contract is not active");
        _;
    }

    function activate(address owner) internal {
        if (!active) {
            emit ActivateContract(owner);
            active = true;
        }
    }

    function deactivate(address owner) internal {
        if (active) {
            emit DeactivateContract(owner);
            active = false;
        }
    }
 
}