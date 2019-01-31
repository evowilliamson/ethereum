const expectedExceptionPromise = require("../utils/expectedException");
const MultiplierHolder = artifacts.require("./MultiplierHolder.sol");

contract('MultiplierHolder', (accounts) => {

	let multiplierHolderOwner1 = accounts[0];
	let multiplierHolderOwner2 = accounts[1];

	const unregistered = 0;
	const motorbike = 1;
	const car = 2;
	const lorry = 3;

	const multiplier = 5;
	const differentMultiplier = 10;

	let multiplierHolder;

	beforeEach("create instance", () => 
		MultiplierHolder.new( { from: multiplierHolderOwner1 } )
		.then( (instance) => multiplierHolder = instance ));

	describe("simple positive multiplier holders maintenance and retrieval", () => {

		it("should allow the setting of " + 
		   "a multiplier for a certain vehicle type if the caller is the owner", () => 
			multiplierHolder.setMultiplier(motorbike, multiplier, { from: multiplierHolderOwner1 })
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogMultiplierSet");
				assert.strictEqual(txObj.logs[0].args.sender, multiplierHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.vehicleType.toString(), motorbike.toString(10));
				assert.strictEqual(txObj.logs[0].args.multiplier.toString(), multiplier.toString(10))}));

		it("should allow the setting of " + 
		   "a multiplier for a certain vehicle type if multiplier for that vehicle type is not the same", () => 
			multiplierHolder.setMultiplier(car, multiplier, { from: multiplierHolderOwner1 })
			.then ( () => multiplierHolder.setMultiplier(car, differentMultiplier, { from: multiplierHolderOwner1 })));

		it("should allow the removing of a vehicle type from " + 
		   "the multiplier holder if that multiplier was previously set for that vehicle type", () => 
			multiplierHolder.setMultiplier(lorry, multiplier, { from: multiplierHolderOwner1 })
			.then ( () => multiplierHolder.setMultiplier(lorry, 0, { from: multiplierHolderOwner1 }))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogMultiplierSet");
				assert.strictEqual(txObj.logs[0].args.sender, multiplierHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.vehicleType.toString(), lorry.toString(10));
				assert.strictEqual(txObj.logs[0].args.multiplier.toString(), "0")})
			.then( () => multiplierHolder.getMultiplier.call(unregistered, { from: multiplierHolderOwner1 }))
			.then( (multiplier) => assert.strictEqual(multiplier.toString(), "0")))

		it("should allow the retrieval of " + 
		   "the multiplier for a certain vehicle typem which has been set previously", () => 
			multiplierHolder.setMultiplier(motorbike, multiplier, { from: multiplierHolderOwner1 })
			.then( () => multiplierHolder.getMultiplier.call(motorbike, { from: multiplierHolderOwner1 }))
			.then( (multiplier) => assert.strictEqual(multiplier.toString(), multiplier.toString(10))));

		it("should return true " + 
      		"after setting the multiplier for a certain vehicle type (ignoring state changes)", () => 
			multiplierHolder.setMultiplier.call(motorbike, multiplier, { from: multiplierHolderOwner1 })
			.then( (result) => assert.isTrue(result)));

		it("should retrieve a zero multiplier for an unknown vehicle type", () => 
			multiplierHolder.getMultiplier.call(car, { from: multiplierHolderOwner1 })
			.then( (multiplier) => assert.strictEqual(multiplier.toString(), "0")));
			 
	});

	describe("simple negative multiplier holders maintenance and retrieval", () => {

		it("should not allow the setting of " + 
		   "a multiplier for a certain vehicle type if the caller is not the owner", () => 
			expectedExceptionPromise(() => multiplierHolder.setMultiplier(motorbike, multiplier, 
				{ from: multiplierHolderOwner2 })));

		it("should not allow the setting of a multiplier of a  vehicle type 0", () => 
			expectedExceptionPromise(() => multiplierHolder.setMultiplier(unregistered, multiplier, 
				{ from: multiplierHolderOwner1 })));

		it("should not allow the setting of " + 
		   "a multiplier for a certain vehicle type if multiplier for that vehicle type is the same", () => 
			multiplierHolder.setMultiplier(car, multiplier, { from: multiplierHolderOwner1 })
			.then( () => expectedExceptionPromise( () => 
				multiplierHolder.setMultiplier(car, multiplier, { from: multiplierHolderOwner1 }))));

		it("should not allow the removing of a vehicle type from " + 
		   "the multiplier holder if that vehicle type does not exist", () => 
			expectedExceptionPromise( () => multiplierHolder.setMultiplier(car, 0, { from: multiplierHolderOwner1 })));
	 
	});

});
