const expectedExceptionPromise = require("../utils/expectedException");
const TollBoothHolder = artifacts.require("./TollBoothHolder.sol");

contract('TollBoothHolder', (accounts) => {

	let tollBoothHolderOwner1 = accounts[0];
	let tollBoothHolderOwner2 = accounts[1];

	let tollBooth1 = accounts[2];
	let tollBooth2 = accounts[3];

	let tollBoothHolder;

	beforeEach("create instance", () => 
		TollBoothHolder.new( { from: tollBoothHolderOwner1 } )
		.then( (instance) => tollBoothHolder = instance ));

	describe("simple positive toll booth holders maintenance and retrieval", () => {

		it("should allow the addition of a toll booth if the caller is the owner ", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogTollBoothAdded");
				assert.strictEqual(txObj.logs[0].args.sender, tollBoothHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.tollBooth, tollBooth1)}));

		it("should return true after adding a toll booth (ignoring state changes)", () => 
			tollBoothHolder.addTollBooth.call(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( (result) => assert.isTrue(result)));

		it("should return true when checking whether a previously added tool booth is a toll booth", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( () => tollBoothHolder.isTollBooth.call(tollBooth1, { from: tollBoothHolderOwner1 } ))
			.then( (result) => assert.isTrue(result)));

		it("should return false when checking whether a non-existing tool booth is a toll booth", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( () => tollBoothHolder.isTollBooth.call(tollBooth2, { from: tollBoothHolderOwner1 } ))
			.then( (result) => assert.isFalse(result)));

		it("should allow the removal of a previously added toll booth", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( () => tollBoothHolder.removeTollBooth(tollBooth1, { from: tollBoothHolderOwner1 } ))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogTollBoothRemoved");
				assert.strictEqual(txObj.logs[0].args.sender, tollBoothHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.tollBooth, tollBooth1)}));
			 
	});

	describe("simple negative toll booth holders maintenance and retrieval", () => {

		it("should not allow the addition of a toll booth if the caller is not the owner", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( () => expectedExceptionPromise(() => tollBoothHolder.addTollBooth(
				tollBooth1, { from: tollBoothHolderOwner2 }))));

		it("should not allow the addition of a the same toll booth twice", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( () => expectedExceptionPromise(() => tollBoothHolder.addTollBooth(
				tollBooth1, { from: tollBoothHolderOwner1 }))));

		it("should not allow the addition of a 0 address toll booth", () => 
			expectedExceptionPromise(() => tollBoothHolder.addTollBooth(
				0x0, { from: tollBoothHolderOwner1 })));

		it("should not allow the removal if the caller is not the owner", () => 
			tollBoothHolder.addTollBooth(tollBooth1, { from: tollBoothHolderOwner1 })
			.then( () => expectedExceptionPromise(() => tollBoothHolder.removeTollBooth(tollBooth1, 
				{ from: tollBoothHolderOwner2 }))));
					
		it("should not allow the removal of a non-existing toll booth", () => 
			expectedExceptionPromise(() => tollBoothHolder.removeTollBooth(tollBooth1, 
				{ from: tollBoothHolderOwner1 })));

		it("should not allow the removal of a 0 address toll booth", () => 
			expectedExceptionPromise(() => tollBoothHolder.removeTollBooth(0x0, 
				{ from: tollBoothHolderOwner1 })));
	
	});

});
