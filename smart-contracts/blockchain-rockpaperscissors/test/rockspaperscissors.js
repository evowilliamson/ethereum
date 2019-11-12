const RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
const BigNumber = require('bignumber.js');
const Promise = require('bluebird');
const Enum = require('enum');
const Sleep = require('sleep');

contract('rockPaperScissors', function(accounts) {

  Promise.promisifyAll(web3.eth, { suffix: "Promise" });
  
  const expectedExceptionPromise = require("./expected_exception_ganache_and_geth.js");  
  const gasPrice = 100000000;
  const moneyAtStake = 1000000000000000;
  const someMoreMoneyForExtraBalance = 100000000000000;
  const secondsToDeadline = 10;
  const secondsToDeadlineVeryClose = 2;

  const owner = accounts[0];
  const inviter = accounts[1];
  const invitee = accounts[2];
  
  const move = new Enum({"None": 0, "Rock": 1, "Paper": 2, "Scissors": 3, "SomeOtherInvalidMove": 4});
  const outcome = new Enum({"Tie" :0, "InviterWins": 1, "InviteeWins": 2});
  const passwordInviter = web3.fromAscii("p1", 32);
  
  let rockPaperScissors;
  let gameId;

  function getContractBalance() {
      return web3.eth.getBalancePromise(rockPaperScissors.address);
  }

  function getCommittedMoveHash(sender, plaintextMove, password) {
    return rockPaperScissors.getCommittedMoveHash.call(sender, plaintextMove, password, 
      {from: inviter, gasPrice: gasPrice});
  }

  function getPlayerBalance(address) {
    return rockPaperScissors.balances.call(address, {from: inviter, gasPrice: gasPrice});
  }

  function getProfit() {
    return rockPaperScissors.profit.call({from: owner, gasPrice: gasPrice});
  }

  function invite() {
    return rockPaperScissors.invite(invitee, secondsToDeadline, gameId,
      {from: inviter, value: moneyAtStake, gasPrice: gasPrice})    
  }

  function accept() {
    return rockPaperScissors.accept(gameId, move.Rock.value, 
      {from: invitee, gasPrice: gasPrice, value: moneyAtStake})
  }

  function cancel() {
    return rockPaperScissors.cancel(gameId, {from: inviter, gasPrice: gasPrice})
  }

  function deactivate() {
    return rockPaperScissors.deactivate({ from: owner })
  }

  function revealMove() {
    return rockPaperScissors.revealMove(move.Rock.value, passwordInviter, gameId, 
           {from: inviter, gasPrice: gasPrice})
  }

  beforeEach("should deploy a new instance", () =>
    RockPaperScissors.new({ from: owner })
      .then( (instance) => rockPaperScissors = instance)
      .then( () => getCommittedMoveHash(inviter, move.Rock.value, passwordInviter))
      .then( (committedMoveHash) => gameId = committedMoveHash)
  );

  describe("Determining outcome of game", () => {

    it("papers covers rock", () => 
      rockPaperScissors.determineOutcome.call(move.Paper.value, move.Rock.value, { from: owner, gasPrice: gasPrice})
      .then( (_outcome) => assert.strictEqual(_outcome.toString(10), outcome.InviterWins.value.toString(10)))
    );

    it("rock crushes scissors", () => 
      rockPaperScissors.determineOutcome.call(move.Rock.value, move.Scissors.value, { from: owner, gasPrice: gasPrice})
      .then( (_outcome) => assert.strictEqual(_outcome.toString(10), outcome.InviterWins.value.toString(10)))
    );

    it("scissors cut paper", () =>
      rockPaperScissors.determineOutcome.call(move.Scissors.value, move.Paper.value, { from: owner, gasPrice: gasPrice})
        .then( (_outcome) => assert.strictEqual(_outcome.toString(10), outcome.InviterWins.value.toString(10)))
    );

    it("scissors ties scissors", () => 
      rockPaperScissors.determineOutcome.call(move.Scissors.value, move.Scissors.value, { from: owner, gasPrice: gasPrice})
        .then( (_outcome) => assert.strictEqual(_outcome.toString(10), outcome.Tie.value.toString(10)))
    );

    it("rock ties rock", () =>
      rockPaperScissors.determineOutcome.call(move.Rock.value, move.Rock.value, { from: owner, gasPrice: gasPrice})
        .then( (_outcome) => assert.strictEqual(_outcome.toString(10), outcome.Tie.value.toString(10)))
    );

    it("paper ties paper", () =>
      rockPaperScissors.determineOutcome.call(move.Paper.value, move.Paper.value, { from: owner, gasPrice: gasPrice})
        .then( (_outcome) => assert.strictEqual(_outcome.toString(10), outcome.Tie.value.toString(10)))
    );

    it("should not allow invalid move for inviter", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.determineOutcome.call(move.None.value, move.Paper.value, { from: owner, gasPrice: gasPrice}))
    );

    it("should not allow some other invalid move for inviter", () =>
    expectedExceptionPromise( () =>
      rockPaperScissors.determineOutcome.call(move.SomeOtherInvalidMove.value, move.Paper.value, { from: owner, gasPrice: gasPrice}))
  );

    it("should not allow invalid move for invitee", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.determineOutcome.call(move.Paper.value, move.None.value, { from: owner, gasPrice: gasPrice}))
    );

    it("should not allow some other invalid move for invitee", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.determineOutcome.call(move.Paper.value, move.SomeOtherInvalidMove.value, { from: owner, gasPrice: gasPrice}))
    );

  });

  describe("Deactivate a contract", () => {

    it("should allow the deactivation of an active contract", () => 
      deactivate()
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "DeactivateContract");
          assert.strictEqual(txObj.logs[0].args.owner, owner);
        })
    );

    it("should allow the activation of an inactive contract", () =>
      deactivate()
        .then( () => rockPaperScissors.activate({ from: owner }))
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "ActivateContract");
          // Check that the owner really activated it, not somebody else
          assert.strictEqual(txObj.logs[0].args.owner, owner)
        })
    );

  });

  describe("Inviting to play a game", () => {

    it("should generate an error when trying invite on a deactivated contract", () =>
      deactivate()
        .then( () => expectedExceptionPromise( () => invite()))
    );

    it("should generate an error when trying invite oneself", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.invite(inviter, secondsToDeadline, gameId,
          {from: inviter, value: moneyAtStake, gasPrice: gasPrice}))
    );

    it("should generate an error when trying to invite somebody with address 0", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.invite(0, secondsToDeadline, gameId,
          {from: inviter, value: moneyAtStake, gasPrice: gasPrice}))
    );

    it("should generate an error when trying to invite somebody for an already finished game", () =>
      rockPaperScissors.invite(invitee, secondsToDeadline, gameId, 
        {from: inviter, value: moneyAtStake, gasPrice: gasPrice})
        .then( () => cancel())
        .then( () => expectedExceptionPromise( () =>
          rockPaperScissors.invite(invitee, secondsToDeadline, gameId,
            {from: inviter, value: moneyAtStake, gasPrice: gasPrice})))
    );

    it("should invite the invitee to play a game for " + moneyAtStake, () => {
      let contractBalanceBefore;
      let contractBalanceAfter;      
      let id;
      return getContractBalance()
        .then( (balance) => { 
          contractBalanceBefore = balance;
          return getContractBalance()})
        .then( () => invite())
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "GameCreated");
          assert.strictEqual(txObj.logs[0].args.id, gameId);
          assert.strictEqual(txObj.logs[0].args.inviter, inviter);
          assert.strictEqual(txObj.logs[0].args.invitee, invitee);
          assert.strictEqual(txObj.logs[0].args.amount.toString(10), moneyAtStake.toString(10));
          return getContractBalance() })
        .then( (balance) => {
          contractBalanceAfter = balance;
          assert.strictEqual(moneyAtStake.toString(10),
            new BigNumber(contractBalanceAfter).minus(contractBalanceBefore).toString(10), 
              moneyAtStake.toString(10) + " wasn't in the rockPaperScissors contract" + 
              contractBalanceAfter);
          return getPlayerBalance(inviter)})
        .then( (inviterBalanceAfter) =>
          assert.strictEqual(
            inviterBalanceAfter.toString(10), "0", 
              "Inviter balance should be 0, but is: " + inviterBalanceAfter.toString(10)));
    });

  });

  describe("Accepting a game", () => {

    beforeEach("invite for a game", () =>
      invite()
    );

    it("invitee should have some extra money in balance game after " + 
        "accepting the game with more money than necessary", () => 
      rockPaperScissors.accept(gameId, move.Rock.value, 
        {from: invitee, gasPrice: gasPrice, 
        value: new BigNumber(moneyAtStake).plus(someMoreMoneyForExtraBalance).toString(10)})
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "GameAccepted");
          assert.strictEqual(txObj.logs[0].args.id, gameId);
          assert.strictEqual(txObj.logs[0].args.inviter, inviter);
          assert.strictEqual(txObj.logs[0].args.invitee, invitee);
          return getPlayerBalance(invitee); })
        .then( (inviterBalanceAfter) => {
          assert.strictEqual(
            inviterBalanceAfter.toString(10), someMoreMoneyForExtraBalance.toString(10),
            "No extra balance left in balance after accepting the game");   
          return getContractBalance()})
        .then( (contractBalanceAfter) =>
          assert.strictEqual(
            contractBalanceAfter.toString(10),
            new BigNumber(moneyAtStake).multipliedBy(2).plus(someMoreMoneyForExtraBalance).toString(10),
            "Money in the contract is not twice the amount of the game plus the extra money"))
    );      

    it("should generate an error when inviter tries to accept the game", () =>
      cancel()
        .then( () => expectedExceptionPromise( () =>
            rockPaperScissors.accept(gameId, move.Rock.value, 
              {from: inviter, gasPrice: gasPrice, value: moneyAtStake.toString(10)})))
    );

    it("should generate an error when invitee tries to accept the game, " + 
       "but there is no balance in his/her acount in the contract", () =>
      cancel()
        .then( () => expectedExceptionPromise( () =>
            rockPaperScissors.accept(gameId, move.Rock.value, {from: invitee, gasPrice: gasPrice, value: 0})))
    );

    it("should generate an error when invitee tries to accept the game, " + 
       "after the deadline has passed", () =>
      cancel()
        .then( () => {
          Sleep.msleep(secondsToDeadlineVeryClose * 1001);          
          return expectedExceptionPromise( () =>
            rockPaperScissors.accept(gameId, move.Paper.value, 
              {from: invitee, gasPrice: gasPrice, value: moneyAtStake.toString(10)}))})
    );

  });

  describe("Revealing the plaintext move", () => {

    beforeEach("invite for a game and accept", () => 
      invite()
        .then( () => accept())
    );

    it("should be ok if inviter reveals the correct plaintext move", () =>
      revealMove()
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "GameFinished");
          assert.strictEqual(txObj.logs[0].args.id, gameId)}) // Paper covers Rock: invitee wins
    );       

    it("should not be ok if inviter reveals an incorrect plaintext move", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.revealMove(move.Paper.value, passwordInviter, gameId,  
          {from: inviter, gasPrice: gasPrice}))
    );       

    it("should not be ok if the invitee tries to reveal a plaintext move", () =>
      expectedExceptionPromise( () =>
        rockPaperScissors.revealMove(move.Paper.value, passwordInviter, gameId,  
          {from: invitee, gasPrice: gasPrice}))
    );       

  });

  describe("Cancelling a game", () => {

    beforeEach("invite for a game", () =>
      invite()
    );

    it("should allow cancel by inviter after inviting for a game without accepting", () =>
      cancel()
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "GameCancelled");
          assert.strictEqual(txObj.logs[0].args.id, gameId);
          assert.strictEqual(txObj.logs[0].args.byWhom, inviter)})
    );

    it("should allow cancel by invitee after inviting for a game without accepting", () =>
      rockPaperScissors.cancel(gameId, {from: invitee, gasPrice: gasPrice})
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "GameCancelled");
          assert.strictEqual(txObj.logs[0].args.id, gameId);
          assert.strictEqual(txObj.logs[0].args.byWhom, invitee)})
    );

    it("should allow cancel by invitee after inviting for a game after accepting by invitee", () =>
      accept()
        .then( (txObj) => rockPaperScissors.cancel(gameId, {from: invitee, gasPrice: gasPrice}))
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "GameCancelled");
          assert.strictEqual(txObj.logs[0].args.id, gameId);
          assert.strictEqual(txObj.logs[0].args.byWhom, invitee)})
    );

    it("should not allow cancel by inviter after inviting for a game after accepting by invitee", () =>
      accept()
        .then( () =>
          expectedExceptionPromise( () =>
            rockPaperScissors.cancel(gameId,
              {from: inviter, gasPrice: gasPrice}))));

  });

  describe("Withdrawig money from the game", () => {

    beforeEach("invite for a game and accept", () => 
      invite()
        .then( () => accept())
    );

    it("should allow a player to withdraw money from the game after accepting by invitee", () => 
      // First play a game
      revealMove()
        .then( () => getPlayerBalance(invitee))
        .then( (balance) => rockPaperScissors.withdraw(balance.toString(10),  
                            {from: invitee, gasPrice: gasPrice}))
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "FundsWithdrawn");
          assert.strictEqual(txObj.logs[0].args.player, invitee);
          return getPlayerBalance(invitee)})
        .then( (balance) =>
          assert.strictEqual(balance.toString(10), "0", "Balance is not 0 after withdrawal"))
    );

    it("should not allow player to withdraw money he/she doesn't have", () =>
      revealMove()
        .then( () => expectedExceptionPromise( () =>
            rockPaperScissors.withdraw(
              new BigNumber(moneyAtStake).multipliedBy(2).toString(10),  
              {from: invitee, gasPrice: gasPrice})))
    );

  });

  describe("Transferring profit", () => {

    beforeEach("invite for a game, accept, reveal move and deactivate the contract", () => 
      invite()
        .then( () => accept())
        .then( () => revealMove())
        .then( () => deactivate())
    );

    it("should allow the transferral of profit by profit benificiary", () =>
      rockPaperScissors.transferProfits({from: owner, gasPrice: gasPrice})
        .then( (txObj) => {
          assert.strictEqual(txObj.logs[0].event, "ProfitTransferred");
          assert.strictEqual(txObj.logs[0].args.toWhere, owner);
          return getProfit()})
        .then( (balance) => assert.strictEqual(balance.toString(10), "0"))
    );

    it("should not allow the transferral of profit by person other than profit benificiary", () =>
      expectedExceptionPromise( () => 
            rockPaperScissors.transferProfits({from: invitee, gasPrice: gasPrice}))
    );

  });

});
