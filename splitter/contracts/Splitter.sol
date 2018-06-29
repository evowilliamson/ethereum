pragma solidity ^0.4.24;

import "./Pausible.sol";
import "./SafeMath.sol";

/*
Splitter Contract. Anybody can donate mon
*/

contract Splitter is Pausible {

    using SafeMath for uint256;

    event ContractCreated(address owner);
    event MoneySplittedBy(address donator, uint256 amount);
    event MoneyWithdrawnBy(address beneficiary, uint256 amount);
    
    mapping(address => uint256) public balances;
    
    constructor() public {
        
        emit ContractCreated(owner);

    }

    /**
     * Function that the donator, who wants to split the money over the 
     * available beneficiaries, will call. 
     **/
    function split(address _firstBeneficiary, address _secondBeneficiary) 
            public payable onlyWhenActive {

        require(_firstBeneficiary != 0, "First beneficiariy addresses must be provided");
        require(_secondBeneficiary != 0, "Second beneficiariy addresses must be provided");
        require(msg.value > 0, "Value must be greater than 0");
        
        // Split the money over the benificiaries. 
        uint256 splittedAmount = msg.value.div(2);
        balances[_firstBeneficiary] = balances[_firstBeneficiary].add(splittedAmount);
        balances[_secondBeneficiary] = balances[_secondBeneficiary].add(splittedAmount);
        emit MoneySplittedBy(msg.sender, msg.value);

        // Give the remainder back to the sender
        
        uint256 totalAmountForBeneciaries = splittedAmount.mul(2);
        balances[msg.sender] = balances[msg.sender]
            .add(totalAmountForBeneciaries % splittedAmount);

    }

    /**
     * Fallback function which shouldn't be used to send money to the contract,
     * so don't make it payable and private
     **/
    function() public {
        
        revert("Not implemented");
        
    }
    
    /**
     * This function, called by a beneficiary, will withdraw the passed 
     * amount of money from the beneficiary balance.
     **/
    function withdraw(uint256 amount) 
        public payable onlyWhenActive {

        uint256 beforeBal = balances[msg.sender];
        require(amount <= beforeBal, "Not enough balance");
        balances[msg.sender] = beforeBal.sub(amount);
        emit MoneyWithdrawnBy(msg.sender, amount);
        msg.sender.transfer(amount);

    }
    
}
