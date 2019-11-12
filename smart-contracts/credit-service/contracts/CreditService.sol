pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./Queue.sol";

contract CreditService  {

    using SafeMath for uint;
    using Queue for Queue.Meta;
    
    enum LoanRequestStatus { Initial, Rejected, Approved, Claimed, Revoked } 
    
    struct LoanRequest {
        uint amount;
        LoanRequestStatus status;
    }
    
    struct Loan {
        bytes32 beneficiary;
        uint amount;
        
    }
    struct Investment {
        uint amount;
        Loan[] loans;
    }
    
    mapping(address => bool) public approvers;
    mapping(bytes32 => LoanRequest) public loanRequests;
    
    mapping(bytes32 => uint) public unAllocatedInvestmentAmounts;
    mapping(bytes32 => Investment) public investments;
    
    Queue.Meta public investors;
    
    uint public totalUnInvestedFunds;

    event LogApproverCreated(address indexed approver);
    event LogLoanRequestCreated(address  loaner, bytes32  hashedKey, uint amount);
    event LogInvestmentCreated(address indexed investor, bytes32 indexed hashedKey, uint amount);
    event LogLoanApproved(address indexed approver, bytes32 indexed hashedKey, uint amount);
    event LogLoanRejected(address indexed approver, bytes32 indexed hashedKey, uint amount);
    event LogLoanClaimed(address indexed loaner, bytes32 indexed hashedKey, uint amount);

    constructor() public {
    }
    
    function addLoanRequest(bytes32 hashedKey, uint amount) public {
        
        require(amount > 0, "Amount must be greater than 0");
        require(loanRequests[hashedKey].amount == 0x0, "Hashed key already used");
        loanRequests[hashedKey] = LoanRequest(amount, LoanRequestStatus.Initial);
        emit LogLoanRequestCreated(msg.sender, hashedKey, amount);

    }

    function approveLoan(bytes32 loanRequest) public {

        require(approvers[msg.sender] == true, "Approver not registered");
        require(loanRequests[loanRequest].amount != 0, "Loan request unknown");
        
        loanRequests[loanRequest].status = LoanRequestStatus.Approved;   
        emit LogLoanApproved(msg.sender, loanRequest, loanRequests[loanRequest].amount);

    }

    function rejectLoan(bytes32 loanRequest) public {

        require(approvers[msg.sender] == true, "Approver not registered");
        require(loanRequests[loanRequest].amount != 0, "Loan request unknown");
        
        loanRequests[loanRequest].status = LoanRequestStatus.Rejected;   
        emit LogLoanRejected(msg.sender, loanRequest, loanRequests[loanRequest].amount);

    }

    function addInvestment(bytes32 hashedKey) payable public {
        
        require(unAllocatedInvestmentAmounts[hashedKey] == 0x0, "Hashed key already used");
        require(msg.value > 0, "Value must be greater than 0");
        unAllocatedInvestmentAmounts[hashedKey] = msg.value;
        investors.add(hashedKey);
        totalUnInvestedFunds = totalUnInvestedFunds.add(msg.value);
        emit LogInvestmentCreated(msg.sender, hashedKey, msg.value);

    }

    function claimLoan(string secret) public {

        bytes32 hashedKey = hashValueWithSender(secret);
        require(loanRequests[hashedKey].amount != 0, "Loan request unknown");
        require(loanRequests[hashedKey].status == LoanRequestStatus.Approved, 
            "Loan not approved");
        
        loanRequests[hashedKey].status == LoanRequestStatus.Claimed;
        uint amountClaimed = 0;
        uint amountRequested = loanRequests[hashedKey].amount;

        bytes32 investor = investors.peek();
        while (amountClaimed != amountRequested && investor != 0x0) {
            uint investmentAmount = unAllocatedInvestmentAmounts[investor];
            if (investmentAmount != 0) { // revoked by investor {
                uint stillNeeded = amountRequested - amountClaimed;
                if (investmentAmount <= stillNeeded) {
                    /*
                     * The investor's amount is smaller than what the loaner requested,
                     * so take that investor's amount (remove from unallocated structure),
                     * and add the loan to the investor's administration, he would be
                     * interested in that in the future, in case the loaner doesn's pay
                     * the interest fees
                     */
                    amountClaimed = amountClaimed.add(investmentAmount);
                    unAllocatedInvestmentAmounts[investor] = 0; 
                    updateInvestment(hashedKey, investor, investmentAmount);
                    investors.remove(investor);
                }
                else {
                    /*
                     * loaner amount is smaller than the offered amount by the investor. 
                     * Take the amount of the investor, and more afterwards.
                     * So update the investor's amount
                     */
                    amountClaimed = amountClaimed.add(stillNeeded);
                    unAllocatedInvestmentAmounts[investor] = 
                        unAllocatedInvestmentAmounts[investor].sub(stillNeeded);
                    updateInvestment(hashedKey, investor, stillNeeded);
                }
            }
            investor = investors.peek();
        }
        
        if (amountClaimed != amountRequested) {
            revert("Not enough investments");
        }

        totalUnInvestedFunds = totalUnInvestedFunds.sub(amountClaimed);
        emit LogLoanClaimed(msg.sender, hashedKey, amountClaimed);
        msg.sender.transfer(amountClaimed);

    }

    function updateInvestment(
        bytes32 loanerHash, bytes32 investor, uint investmentAmount) internal {
        
        if (investments[investor].amount == 0x0) {
            investments[investor].loans.push(Loan({beneficiary: loanerHash, amount: investmentAmount}));
        }
        else {
            investments[investor].amount = 
                investments[investor].amount.add(investmentAmount);
            investments[investor].loans.push(Loan(loanerHash, investmentAmount));
        }

    }
    
    function revokeLoanRequest(string secret) public {
        
        bytes32 hashedKey = hashValueWithSender(secret);
        require(loanRequests[hashedKey].amount != 0x0, "Unknown loan request, wrong secret");
        require(loanRequests[hashedKey].status != LoanRequestStatus.Claimed, 
            "Already claimed");
        loanRequests[hashedKey].status = LoanRequestStatus.Revoked;

    }

    function revokeInvestment(string secret) public {
        
        bytes32 hashedKey = hashValueWithSender(secret);
        require(unAllocatedInvestmentAmounts[hashedKey] != 0x0, 
            "Unknown investor, Wrong secret");
        uint amount = unAllocatedInvestmentAmounts[hashedKey];
        unAllocatedInvestmentAmounts[hashedKey] = 0;
        totalUnInvestedFunds = totalUnInvestedFunds.sub(amount);
        msg.sender.transfer(amount);

    }

    function addApprover(address approver) public {
        
        require(approvers[approver] == false, "Approver already exists");
        approvers[approver] = true;
        emit LogApproverCreated(approver);

    }

    function hashValueWithSender(string value) view public returns (bytes32) {

        return keccak256(abi.encodePacked(value, msg.sender)); 
        
    }

    function getLoanRequestAmount(bytes32 hashedKey) public view returns (uint) {
        
        return loanRequests[hashedKey].amount;

    }

    function getLoanRequestStatus(bytes32 hashedKey) public view returns (uint) {
        
        return uint(loanRequests[hashedKey].status);

    }

    function getUnAllocatedInvestmentAmounts(bytes32 hashedKey) public view returns (uint) {

        return unAllocatedInvestmentAmounts[hashedKey];

    }

    function getTotalUnAllocatedInvestmentAmount() public view returns (uint) {

        return totalUnInvestedFunds;

    }


}    