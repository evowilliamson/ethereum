pragma solidity ^0.4.21;

import "./SafeMath.sol";
import "./Owned.sol";

contract PiggyBank is Owned {
    
    using SafeMath for uint;

    uint public balance;

    event ContractCreated(uint value);
    event FundsSent(uint value);
    event ContractKilled(uint value);

    function PiggyBank() payable public {
        require(msg.value > 0);
        owner = msg.sender;
        emit ContractCreated(msg.value);
        balance = balance.add(msg.value);
    }

    function sendFunds() onlyWhenOwner public payable {
        require(msg.value > 0);
        emit FundsSent(msg.value);
        balance = balance.add(msg.value);
    }

    function() public {
        revert();
    }

    function kill() onlyWhenOwner public {
        emit ContractKilled(address(this).balance);
        /** Don't use the keccak256 to check whether the sender is the owner, use the onlyWhenOwner modifier */
        selfdestruct(owner);
    }
    
}