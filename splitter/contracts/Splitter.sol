pragma solidity ^0.4.24;

import "./Pausible.sol";

/*
Splitter Contract. Anybody can donate mon
*/


contract Splitter is Pausible {

    mapping(address => uint) public balances;
    address public firstBeneficiary;
    address public secondBeneficiary;

    event ContractCreated(address owner);
    event MoneySplittedBy(address donator, uint amount);
    event MoneyWithdrawnBy(address beneficiary, uint amount);
    
    /**
     ** Groups together a donator and the beneficiary via a mapping.
     */
    struct Group {
        bool exists;
        /**
         * https://ethereum.stackexchange.com/questions/871/what-is-the-zero-empty-or-null-value-of-a-struct?rq=1
         */
        address firstBeneficiary;
        address secondBeneficiary;
        mapping(address => uint) beneficiaryBalances;
        uint donatorBalance;
        /** With many different donators within the same contract, we would like
         *  to keep track of the balance of the donator 
         **/
    }
    
    /** Map a donator's address to the Group
     **/
    mapping(address => Group) public groups;
    
    modifier donatorExists(address donator) {
        require(groups[donator].exists == true, "donator not known");
        _;
    }
    
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
     * Function that the donator, who wants to split the money over the 
     * available beneficiaries, will call. 
     **/
    function split(address _firstBeneficiary, address _secondBeneficiary) 
        public payable onlyWhenActive {

        address donator = msg.sender;
        require(_firstBeneficiary != 0, "First beneficiariy addresses must be provided");
        require(_secondBeneficiary != 0, "Second beneficiariy addresses must be provided");
        
        if (groups[donator].exists == true) {
            /** In this case, the sender already setup a split (sub)contract.
             *  So, if he/she decideds to send more money to be splitted, 
             *  in that case, the beneficiaries must be the same. **/
             require 
                (groups[donator].firstBeneficiary == _firstBeneficiary &&
                 groups[donator].secondBeneficiary == _secondBeneficiary,
                 "if donating again, beneficiaries must be the same");
        }
        
        emit MoneySplittedBy(donator, msg.value);
        
        groups[donator].firstBeneficiary = _firstBeneficiary;
        groups[donator].secondBeneficiary = _secondBeneficiary;
        groups[donator].exists = true;
        
        // think about catching odd number by ignoring the remainder
        uint splittedAmount = msg.value / 2;
        groups[donator].beneficiaryBalances[_firstBeneficiary] =
            groups[donator].beneficiaryBalances[_firstBeneficiary] + splittedAmount;
        groups[donator].beneficiaryBalances[_secondBeneficiary] =
            groups[donator].beneficiaryBalances[_secondBeneficiary] + 
                (msg.value - splittedAmount);
        groups[donator].donatorBalance = groups[donator].donatorBalance + msg.value;
        
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
     * amount of money from the beneficiary balance. The person who withdraws,
     * has to identify the donator by providing the address of the donator.
     **/
    function withdraw(address donator, uint amount) 
        public payable onlyWhenActive donatorExists(donator) {

        require(amount <= groups[donator].beneficiaryBalances[msg.sender], 
            "Not enough balance");
        groups[donator].beneficiaryBalances[msg.sender] =
            groups[donator].beneficiaryBalances[msg.sender] - amount;
        groups[donator].donatorBalance = 
            groups[donator].donatorBalance - amount;
        emit MoneyWithdrawnBy(msg.sender, amount);
        msg.sender.transfer(amount);

    }
    
    /**
     * This function returns the balance of the donator. We need to have a
     * function like this because with more donators, it gets messy
     **/
    function getDonatorBalance() 
        view public donatorExists(msg.sender) returns (uint) {
        return groups[msg.sender].donatorBalance;
    }
 
    /**
     * This function returns the balance of the beneficiary in the group
     * identified by the address of the donator.
     **/
    function getBenificiaryBalance(address donator) 
        public view donatorExists(donator) returns (uint) {
        return groups[donator].beneficiaryBalances[msg.sender];
    }
    
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

}