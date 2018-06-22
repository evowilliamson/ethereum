pragma solidity ^0.4.24;

contract Ownable {
    address owner;

    event OwnershipTransferred(address previousOwner, address newOwner);

    constructor() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0x0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

}