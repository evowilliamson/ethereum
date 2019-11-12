const expectedExceptionPromise = require("../utils/expectedException");
const DepositHolder = artifacts.require("./DepositHolder.sol");

contract('DepositHolder', (accounts) => {

	let depositHolderOwner1 = accounts[0];
	let depositHolderOwner2 = accounts[1];
	const initialAmount = 50;
	const updateAmount = 100;
	
	let depositHolder;

	beforeEach("create instance", () => 
		DepositHolder.new(initialAmount, { from: depositHolderOwner1 })
		.then( (instance) => depositHolder = instance ));

	describe("simple positive deposit holders maintainance and retrieval", () => {

		it("should allow the change of " + 
		   "amount of the deposit if the caller is the owner", () => 
			depositHolder.setDeposit(updateAmount, { from: depositHolderOwner1 })
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogDepositSet");
				assert.strictEqual(txObj.logs[0].args.sender, depositHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.depositWeis.toString(), updateAmount.toString(10))}));

		it("after  changing the amount, " + 
		   "retrieving the deposit amount should reflect the change", () => 
		   depositHolder.setDeposit(updateAmount, { from: depositHolderOwner1 })
		   .then( (txObj) => {
			   assert.strictEqual(txObj.logs[0].event, "LogDepositSet");
			   assert.strictEqual(txObj.logs[0].args.sender, depositHolderOwner1);
			   assert.strictEqual(txObj.logs[0].args.depositWeis.toString(10), updateAmount.toString(10));
			   return depositHolder.getDeposit.call( { from: depositHolderOwner1 })})
			.then( (amount) => assert.strictEqual(amount.toString(10), updateAmount.toString(10))));

		it("should retrieve true after setting the amount for a deposit (ignoring state changes)", () => 
			depositHolder.setDeposit.call(updateAmount, { from: depositHolderOwner1 })
			.then( (result) => assert.isTrue(result)));

	})

	describe("simple negative deposit holders maintainance and retrieval", () => {

		it("should not allow the change of " + 
		    "amount of the deposit if the caller is not the owner", () => 
			expectedExceptionPromise(
				() => depositHolder.setDeposit(updateAmount, 
					{ from: depositHolderOwner2})));
  
		it("should not allow the change of " + 
		   "amount of the deposit if the new amount is equal to the initial amount", () =>
			expectedExceptionPromise(
				() => depositHolder.setDeposit(initialAmount, 
					{ from: depositHolderOwner1})));

		it("should not allow the change of " + 
		   "amount of the deposit if new amount is 0", () => 
			expectedExceptionPromise(
				() => depositHolder.setDeposit(0, { from: depositHolderOwner1} )));

	});

});