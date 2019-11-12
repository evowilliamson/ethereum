require('babel-polyfill');
const expectedExceptionPromise = require("../utils/expectedException.js");
const BigNumber = require('bignumber.js');
const Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
Promise.allSeq = require("../utils/sequentialPromise.js");
const CreditService = artifacts.require("./CreditService.sol");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });

contract('CreditService', function(accounts) {

    let owner = accounts[0];
    let approver = accounts[1];
    let loaner1 = accounts[2];
    let loaner2 = accounts[3];
    let investor1 = accounts[4];
    let investor2 = accounts[5];

    let creditService;
    const loanAmount = 1000;
    const investAmount = 1000;

    const initial = 0;
    const rejected = 1;
    const approved = 2;
    const revoked = 3;

    const secretLoaner1 = web3.fromAscii("p1", 32);
    const secretLoaner2 = web3.fromAscii("p2", 32);
    const secretInvestor1 = web3.fromAscii("p3", 32);
    const secretInvestor2 = web3.fromAscii("p4", 32);

    const gasPrice = 1;

    let hashedKeyLoaner1;
    let hashedKeyLoaner2;
    let hashedKeyInvestor1;
    let hashedKeyInvestor2;

    function getGasUsedInWei(txObj) {
        return gasPrice * txObj.receipt.gasUsed;
      }

    beforeEach("Deploy", () => 
        CreditService.new( { from: owner })
            .then(instance => {
                creditService = instance;
                return Promise.allNamed({
                    loaner1: () => creditService.hashValueWithSender.call(secretLoaner1, { from: loaner1 }),
                    loaner2: () => creditService.hashValueWithSender.call(secretLoaner2, { from: loaner2 }), 
                    investor1: () => creditService.hashValueWithSender.call(secretInvestor1, { from: investor1 }), 
                    investor2: () => creditService.hashValueWithSender.call(secretInvestor2, { from: investor2 })})})
            .then(result => {
                hashedKeyLoaner1 = result.loaner1;
                hashedKeyLoaner2 = result.loaner2;
                hashedKeyInvestor1 = result.investor1;
                hashedKeyInvestor2 = result.investor2}))

    describe("Approver", () => {

        it("should be possible register an approver", () => 
            creditService.addApprover(approver, { from: owner })
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogApproverCreated");
                assert.strictEqual(logEntered.args.approver, approver)}));

        it("should be possible to register an approver", () => 
            creditService.addApprover(approver, { from: owner })
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogApproverCreated");
                assert.strictEqual(logEntered.args.approver, approver)}));

        it("should not be possible to register an approver twice", () => 
            creditService.addApprover(approver, { from: owner })
            .then( () => expectedExceptionPromise( () => 
                creditService.addApprover(approver, { from: owner }))));

    });

    describe("Loan requesting and revoking", () => {

        it("should be possible to request a loan", () => 
            creditService.addLoanRequest(hashedKeyLoaner1, loanAmount, { from: loaner1 })
            .then( (tx) => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogLoanRequestCreated");
                assert.strictEqual(logEntered.args.loaner, loaner1);
                assert.strictEqual(logEntered.args.hashedKey, hashedKeyLoaner1);
                return assert.strictEqual(logEntered.args.amount.toString(10), loanAmount.toString(10))})
            .then( () => creditService.getLoanRequestAmount(hashedKeyLoaner1))
            .then( (amount) => assert.strictEqual(amount.toString(10), loanAmount.toString(10))));

        it("should not be possible to request a 0 loan", () => 
            expectedExceptionPromise( () => 
                creditService.addLoanRequest(hashedKeyLoaner1, 0, { from: loaner1 })))

        it("should not be possible to request a loan twice with the same hash key", () =>
            creditService.addLoanRequest(hashedKeyLoaner1, loanAmount, { from: loaner1 }) 
            .then( () => expectedExceptionPromise( () => 
                creditService.addLoanRequest(hashedKeyLoaner1, 0, { from: loaner1 }))));
            
    });

    describe("Approving and rejecting requests", () => {

        beforeEach("Deploy", () => 
            creditService.addApprover(approver, { from: owner })
            .then( () => creditService.addLoanRequest(hashedKeyLoaner1, loanAmount, { from: loaner1 })));

        it("should be possible for an approver to approve a loan request", () => 
            creditService.approveLoan(hashedKeyLoaner1, { from: approver })
            .then( (tx) => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogLoanApproved");
                assert.strictEqual(logEntered.args.approver, approver);
                assert.strictEqual(logEntered.args.hashedKey, hashedKeyLoaner1);
                return assert.strictEqual(logEntered.args.amount.toString(10), investAmount.toString(10))})
            .then( () => creditService.getLoanRequestStatus(hashedKeyLoaner1))
            .then( (status) => assert.strictEqual(status.toString(10), approved.toString(10))));
            
        it("should not be possible to approve a loan request by a person who is not an approver", () => 
            expectedExceptionPromise( () => creditService.approveLoan(hashedKeyLoaner1, { from: loaner1 })));
    
    });

    describe("Investing", () => {

        it("should be possible for an investor to put in some money", () => 
            creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount })
            .then( (tx) => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogInvestmentCreated");
                assert.strictEqual(logEntered.args.investor, investor1);
                assert.strictEqual(logEntered.args.hashedKey, hashedKeyInvestor1);
                return assert.strictEqual(logEntered.args.amount.toString(10), investAmount.toString(10))})
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => assert.strictEqual(amount.toString(10), investAmount.toString(10)))
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => assert.strictEqual(amount.toString(10), investAmount.toString(10))));

        it("should not be possible to invest 0", () => 
            expectedExceptionPromise( () => 
                creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: 0 })));

        it("should not be possible to invest twice with the same hash key", () =>
            creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount })
            .then( () => expectedExceptionPromise( () => 
                creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount }))))
            
     });
     
     describe("Claiming a loan by one person, one investor available", () => {

        beforeEach("Deploy", () => 
            creditService.addApprover(approver, { from: owner }));

        let investAmount1;
        let loanAmount1;

        let gasUsed;
        let balanceBeforeClaim;

        investAmount1 = 1000;
        loanAmount1 = 1000;
        it("should be possible for a person to claim a loan after requesting one with availability of an investor", () => 
            creditService.addLoanRequest(hashedKeyLoaner1, loanAmount1, { from: loaner1 })
            .then( () => creditService.approveLoan(hashedKeyLoaner1, { from: approver }))
            .then( () => creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount1 }))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => {
                balanceBeforeClaim = balance;
                return creditService.claimLoan(secretLoaner1, { from: loaner1, gasPrice: gasPrice })})
            .then( (tx) => {
                gasUsed = getGasUsedInWei(tx);
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogLoanClaimed");
                assert.strictEqual(logEntered.args.loaner, loaner1);
                assert.strictEqual(logEntered.args.hashedKey, hashedKeyLoaner1);
                return assert.strictEqual(logEntered.args.amount.toString(10), loanAmount1.toString(10))})
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => {
                assert.strictEqual(
                    new BigNumber(balanceBeforeClaim).plus(new BigNumber(loanAmount1))
                        .minus(new BigNumber(gasUsed)).toString(10), balance.toString(10))}));

     });

     describe("Claiming loans by two people, one investor available", () => {

        beforeEach("Deploy", () => 
            creditService.addApprover(approver, { from: owner }));

        let investAmount1;
        let loanAmount1;

        investAmount1 = 3000;
        loanAmount1 = 1800;
        loanAmount2 = 1200;
        let balanceBeforeClaim1
        let balanceBeforeClaim2
        let gasUsed1
        let gasUsed2
        it("should be possible for two people to claim a loan after requesting one with availability of an investor", () => 
            creditService.addLoanRequest(hashedKeyLoaner1, loanAmount1, { from: loaner1 })
            .then( () => creditService.addLoanRequest(hashedKeyLoaner2, loanAmount2, { from: loaner2 }))
            .then( () => creditService.approveLoan(hashedKeyLoaner1, { from: approver }))
            .then( () => creditService.approveLoan(hashedKeyLoaner2, { from: approver }))
            .then( () => creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount1 }))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => { 
                balanceBeforeClaim1 = balance; 
                return web3.eth.getBalancePromise(loaner2)})
            .then( (balance) => { 
                balanceBeforeClaim2 = balance; 
                return creditService.claimLoan(secretLoaner1, { from: loaner1, gasPrice: gasPrice })})
            .then( (tx) => { 
                gasUsed1 = getGasUsedInWei(tx); 
                assert.strictEqual(tx.logs[0].args.amount.toString(10), loanAmount1.toString(10))})
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => 
                assert.strictEqual(amount.toString(10),
                new BigNumber(investAmount1).minus(new BigNumber(loanAmount1)).toString(10)))
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => {
                assert.strictEqual(amount.toString(10),
                new BigNumber(investAmount1).minus(new BigNumber(loanAmount1)).toString(10))
                return creditService.claimLoan(secretLoaner2, { from: loaner2, gasPrice: gasPrice })})
            .then( (tx) => {
                gasUsed2 = getGasUsedInWei(tx);
                return assert.strictEqual(tx.logs[0].args.amount.toString(10), loanAmount2.toString(10))})
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => {
                assert.strictEqual(
                    new BigNumber(balanceBeforeClaim1).plus(new BigNumber(loanAmount1))
                        .minus(new BigNumber(gasUsed1)).toString(10), balance.toString(10));
                return web3.eth.getBalancePromise(loaner2)})
            .then( (balance) => assert.strictEqual(
                    new BigNumber(balanceBeforeClaim2).plus(new BigNumber(loanAmount2))
                        .minus(new BigNumber(gasUsed2)).toString(10), balance.toString(10))));
                                    
     });

     describe("Claiming a loans by one person, two investors available", () => {

        beforeEach("Deploy", () => 
            creditService.addApprover(approver, { from: owner }));

        let investAmount1;
        let investAmount2;
        let loanAmount1;

        let gasUsed;
        let balanceBeforeClaim;

        investAmount1 = 1000;
        investAmount2 = 1000;
        loanAmount1 = 2000;
        it("should be possible for twp people to claim a loan after requesting one, with availability of two investor", () => 
            creditService.addLoanRequest(hashedKeyLoaner1, loanAmount1, { from: loaner1 })
            .then( () => creditService.approveLoan(hashedKeyLoaner1, { from: approver }))
            .then( () => creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount1 }))
            .then( () => creditService.addInvestment(hashedKeyInvestor2, { from: investor2, value: investAmount2 }))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => {
                balanceBeforeClaim = balance;
                return creditService.claimLoan(secretLoaner1, { from: loaner1, gasPrice: gasPrice })})
            .then( (tx) => {
                gasUsed = getGasUsedInWei(tx);
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogLoanClaimed");
                assert.strictEqual(logEntered.args.loaner, loaner1);
                assert.strictEqual(logEntered.args.hashedKey, hashedKeyLoaner1);
                return assert.strictEqual(logEntered.args.amount.toString(10), loanAmount1.toString(10))})
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => {
                assert.strictEqual(
                    new BigNumber(balanceBeforeClaim).plus(new BigNumber(loanAmount1))
                        .minus(new BigNumber(gasUsed)).toString(10), balance.toString(10))}));

     });

     describe("Claiming loans by two people, two investors available", () => {

        beforeEach("Deploy", () => 
            creditService.addApprover(approver, { from: owner }));

        let investAmount1;
        let loanAmount1;

        investAmount1 = 1500;
        investAmount2 = 1500;
        loanAmount1 = 1800;
        loanAmount2 = 1200;
        let balanceBeforeClaim1
        let balanceBeforeClaim2
        let gasUsed1
        let gasUsed2
        it("should be possible for two people to claim a loan after requesting one with availability of two investors", () => 
            creditService.addLoanRequest(hashedKeyLoaner1, loanAmount1, { from: loaner1 })
            .then( () => creditService.addLoanRequest(hashedKeyLoaner2, loanAmount2, { from: loaner2 }))
            .then( () => creditService.approveLoan(hashedKeyLoaner1, { from: approver }))
            .then( () => creditService.approveLoan(hashedKeyLoaner2, { from: approver }))
            .then( () => creditService.addInvestment(hashedKeyInvestor1, { from: investor1, value: investAmount1 }))
            .then( () => creditService.addInvestment(hashedKeyInvestor2, { from: investor2, value: investAmount2 }))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => { 
                balanceBeforeClaim1 = balance; 
                return web3.eth.getBalancePromise(loaner2)})
            .then( (balance) => { 
                balanceBeforeClaim2 = balance; 
                return creditService.claimLoan(secretLoaner1, { from: loaner1, gasPrice: gasPrice })})
            .then( (tx) => { 
                gasUsed1 = getGasUsedInWei(tx); 
                assert.strictEqual(tx.logs[0].args.amount.toString(10), loanAmount1.toString(10))})
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => 
                assert.strictEqual(amount.toString(10),
                new BigNumber(investAmount1).plus(BigNumber(investAmount2)).minus(new BigNumber(loanAmount1)).toString(10)))
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => {
                assert.strictEqual(amount.toString(10), "0");
                return creditService.claimLoan(secretLoaner2, { from: loaner2, gasPrice: gasPrice })})
            .then( (tx) => {
                gasUsed2 = getGasUsedInWei(tx);
                return assert.strictEqual(tx.logs[0].args.amount.toString(10), loanAmount2.toString(10))})
            .then( () => creditService.getTotalUnAllocatedInvestmentAmount())
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => creditService.getUnAllocatedInvestmentAmounts(hashedKeyInvestor1))
            .then( (amount) => assert.strictEqual(amount.toString(10), "0"))
            .then( () => web3.eth.getBalancePromise(loaner1))
            .then( (balance) => {
                assert.strictEqual(
                    new BigNumber(balanceBeforeClaim1).plus(new BigNumber(loanAmount1))
                        .minus(new BigNumber(gasUsed1)).toString(10), balance.toString(10));
                return web3.eth.getBalancePromise(loaner2)})
            .then( (balance) => assert.strictEqual(
                    new BigNumber(balanceBeforeClaim2).plus(new BigNumber(loanAmount2))
                        .minus(new BigNumber(gasUsed2)).toString(10), balance.toString(10))));
                                    
     });

});
