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
    address public firstBeneficiary;
    address public secondBeneficiary;
    address owner;
    address sender;
    bool active = false;
    
    event ContractCreated(address owner);
    event MoneySplittedBy(address sender, uint amount);
    event MoneyWithdrawnBy(address beneficiary, uint amount);
    event ContractDestruct(uint amount);
    event ActivateContract();
    event DeactivateContract();
    
    /**
     * Constructor that sets the owner
     **/
    constructor() public {
        
        emit ContractCreated(owner);
        owner = msg.sender;
        activate();

    }

    function activate() public onlyOwner {
        if (!active) {
            emit ActivateContract();
            active = true;
        }
    }

    function deactivate() public onlyOwner {
        if (active) {
            emit DeactivateContract();
            active = false;
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can do this");
        _;
    }

    modifier onlyWhenActive() {
        require(active, "Contract is not active");
        _;
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