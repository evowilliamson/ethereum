pragma solidity ^0.4.24;


/*
Splitter Contract. When the contract is created, two beneficiaries are stored.
Afterwards, the splitter can send money to the contract. After the splitter
has sent the money, the beneficiaries can withdraw the money in one or more
withdrawals. At any moment the owner of the contract can kill the
contract. In that case, the money that is left in the contract is returned to the
splitter.
*/
contract Splitter {

    mapping(address => uint) public balances;
    address firstBeneficiary;
    address secondBeneficiary;
    address owner;
    address splitter;
    
    event ContractCreated(address owner);
    event MoneySplittedBy(address splitter, uint amount);
    event MoneyWithdrawnBy(address beneficiary, uint amount);
    event ContractDestruct(uint amount);
    
    /**
     * Constructor that sets the owner
     **/
    constructor() public {
        
        owner = msg.sender;
        emit ContractCreated(owner);
        
    }

    /**
     * Function that the person, who wants to split the money over the 
     * available beneficiaries, will call. 
     **/
    function split(address _firstBeneficiary, address _secondBeneficiary) 
        public payable {

        require(_firstBeneficiary != 0 && _secondBeneficiary != 0, 
            "Two beneficiaries addresses must be provided");
        require(splitter == 0, "Contract already used to split");
        
        firstBeneficiary = _firstBeneficiary;
        secondBeneficiary = _secondBeneficiary;
        splitter = msg.sender;
        uint splittedAmount = msg.value / 2;
        balances[firstBeneficiary] = splittedAmount;
        balances[secondBeneficiary] = (msg.value - splittedAmount);
        emit MoneySplittedBy(msg.sender, msg.value);
        
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
    function withdraw(uint amount) public payable {

        require(amount <= balances[msg.sender], "Not enough balance");
        balances[msg.sender] -= amount;
        msg.sender.transfer(amount);
        emit MoneyWithdrawnBy(msg.sender, amount);

    }

    /** Although not needed, handy for testing in Remix.
     **/
    function getBalance() public view returns (uint balance) {
        
        return address(this).balance;
        
    }
    
    /**
     * The owner of the contract can decide at any moment to kill the contract
     ** and return the funds to the splitter.
     **/
    function destruct() public payable {
        
        require(msg.sender == owner, "Only the owner can destruct the contract");
        uint balanceLeft = address(this).balance;
        // Event before selfdestruct, otherwise no event will be logged.
        emit ContractDestruct(balanceLeft);
        selfdestruct(splitter);
        
    }
    
}
