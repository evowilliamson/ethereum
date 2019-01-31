pragma solidity ^0.4.10;

contract Splitter {
    address public one;
    address public two;

    constructor(address _two) public payable {
        if (msg.value > 0) revert();
        one = msg.sender;
        two = _two;
    }

    function () payable public {
        uint amount = address(this).balance / 3;
        require(one.call.value(amount)());
        require(two.call.value(amount)());
    }

}