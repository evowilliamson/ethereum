pragma solidity ^0.4.24;

import "./Splitter.sol";

contract HackerOne {
    
    event LogSplitterCreated(address splitter);

    address public splitter;
    uint i;

    constructor() public {
    }

    function() public payable {

        if (i < 1) {
            i = i + 1;
            splitter.call.value(msg.value)();
        }

    }

    function createSplitter(address two) public payable {
        splitter = new Splitter(two);
        emit LogSplitterCreated(splitter);
    }
    
    function getBalance() public constant returns (uint) {
        return address(this).balance;
    }
    
}
