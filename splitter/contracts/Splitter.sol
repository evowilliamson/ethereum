pragma solidity ^0.4.24;

import "./Pausible.sol";

/*
Splitter Contract. When the contract is created, two beneficiaries are stored.
Afterwards, the splitter can send money to the contract. After the splitter
has sent the money, the beneficiaries can withdraw the money in one or more
withdrawals. At any moment the owner of the contract can kill the
contract. In that case, the money that is left in the contract is returned to the
splitter.
*/


contract Splitter is Pausible {

    mapping(address => uint) public balances;
    address public firstBeneficiary;
    address public secondBeneficiary;
    address sender;
    
    event ContractCreated(address owner);
    event MoneySplittedBy(address sender, uint amount);
    event MoneyWithdrawnBy(address beneficiary, uint amount);
    
    constructor() public {
        
        emit ContractCreated(owner);

    }

    function activate() public onlyOwner {

        super.activate(owner);

    }

    function deactivate() public onlyOwner {

        super.deactivate(owner);

    }

    /**
     * Function that the person, who wants to split the money over the 
     * available beneficiaries, will call. 
     **/
    function split(address _firstBeneficiary, address _secondBeneficiary) 
        public payable onlyWhenActive {

        require(_firstBeneficiary != 0, "First beneficiariy addresses must be provided");
        require(_secondBeneficiary != 0, "Second beneficiariy addresses must be provided");
        emit MoneySplittedBy(msg.sender, msg.value);
        
        firstBeneficiary = _firstBeneficiary;
        secondBeneficiary = _secondBeneficiary;
        sender = msg.sender;
        // think about catching odd number by ignoring the remainder
        uint splittedAmount = msg.value / 2;
        balances[firstBeneficiary] = splittedAmount;
        balances[secondBeneficiary] = (msg.value - splittedAmount);
        
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
    function withdraw(uint amount) public payable onlyWhenActive {

        require(amount <= balances[msg.sender], "Not enough balance");
        balances[msg.sender] -= amount;
        emit MoneyWithdrawnBy(msg.sender, amount);
        msg.sender.transfer(amount);

    }
 
}