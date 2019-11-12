const expectedExceptionPromise = require("../utils/expectedException");
const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");
const Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");

contract('Regulator', (accounts) => {

	let regulatorOwner = accounts[0];
	let vehicle1 = accounts[1]
	let tollBoothOwner1 = accounts[2];
	let tollBoothOwner2 = accounts[3];

	const unregistered = 0;
	const motorbike = 1;
	const car = 2;
	const lorry = 3;

	const baseDeposit = 100;
	let regulator;

	beforeEach("create instance", () => 
		Regulator.new( { from: regulatorOwner } )
		.then( (instance) => regulator = instance ));

	describe("setting ang getting vehicle types", () => {

		it("should allow the registration of a vehicle if the caller is the owner", () => 
			regulator.setVehicleType(vehicle1, motorbike, { from: regulatorOwner })
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogVehicleTypeSet");
				assert.strictEqual(txObj.logs[0].args.sender, regulatorOwner);
				assert.strictEqual(txObj.logs[0].args.vehicle, vehicle1);
				assert.strictEqual(txObj.logs[0].args.vehicleType.toString(10), motorbike.toString(10))}));

		it("should allow the unregistration of a vehicle", () => 
			regulator.setVehicleType(vehicle1, motorbike, { from: regulatorOwner })
			.then( () => regulator.setVehicleType(vehicle1, unregistered, { from: regulatorOwner }))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogVehicleTypeSet");
				assert.strictEqual(txObj.logs[0].args.sender, regulatorOwner);
				assert.strictEqual(txObj.logs[0].args.vehicle, vehicle1);
				assert.strictEqual(txObj.logs[0].args.vehicleType.toString(10), unregistered.toString(10))}));

		it("should allow the registration of a vehicle with a different vehicle type "  + 
		    "(overwriting old registration)", () => 
			regulator.setVehicleType(vehicle1, motorbike, { from: regulatorOwner })
			.then( () => regulator.setVehicleType(vehicle1, car, { from: regulatorOwner }))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogVehicleTypeSet");
				assert.strictEqual(txObj.logs[0].args.sender, regulatorOwner);
				assert.strictEqual(txObj.logs[0].args.vehicle, vehicle1);
				assert.strictEqual(txObj.logs[0].args.vehicleType.toString(10), car.toString(10))}));

		it("should allow the registration of a vehicle with a different vehicle type "  + 
		   "(overwriting old registration)", () => 
			regulator.setVehicleType(vehicle1, car, { from: regulatorOwner })
			.then( () => regulator.getVehicleType.call(vehicle1, { from: regulatorOwner }))
			.then( (vehicleType) => assert.strictEqual(vehicleType.toString(10), car.toString(10))));
	
		it("should retrieve the correct vehicle type after registration of a vehicle", () => 
			regulator.setVehicleType(vehicle1, car, { from: regulatorOwner })
			.then( () => regulator.getVehicleType.call(vehicle1, { from: regulatorOwner }))
			.then( (vehicleType) => assert.strictEqual(vehicleType.toString(10), car.toString(10))));

		it("should retrieve the vehicle type of 'unregistered' after checking " + 
		    "registration of a unregistered vehicle", () => 
			regulator.getVehicleType.call(vehicle1, { from: regulatorOwner })
			.then( (vehicleType) => assert.strictEqual(vehicleType.toString(10), "0")));
			
		it("should retrieve true after registration of a vehicle", () => 
			regulator.setVehicleType.call(vehicle1, motorbike, { from: regulatorOwner })
			.then( (result) => assert.isTrue(result)));

		it("should not allow registration of a 0x address vehicle", () => 
			expectedExceptionPromise(() => regulator.setVehicleType(0x0, motorbike, { from: vehicle1 })));

		it("should not allow registration of a vehicle if the caller is not the owner", () => 
			expectedExceptionPromise(() => regulator.setVehicleType(vehicle1, motorbike, { from: vehicle1 })));

		it("should not allow registration of a vehicle that was already registered with same vehicle type", () => 
			regulator.setVehicleType(vehicle1, motorbike, { from: regulatorOwner })
			.then( () => expectedExceptionPromise(() => regulator.setVehicleType(vehicle1, motorbike, { from: vehicle1 }))));

	});

	describe("creating toll booth operators", () => {

		it("should allow the creation of a toll booth operator if the caller is the owner", () => 
			regulator.createNewOperator(tollBoothOwner1, baseDeposit, { from: regulatorOwner })
			.then( (txObj) => {
				assert.strictEqual(txObj.receipt.logs.length, 2);
				const logCreatedNewOperator = txObj.logs[1];

				// Get address of the newly created TollBoothOperator
				const createdTollBoothOperator = logCreatedNewOperator.args.newOperator;
				assert.strictEqual(logCreatedNewOperator.event, "LogTollBoothOperatorCreated");
				assert.strictEqual(logCreatedNewOperator.args.sender, regulatorOwner);
				assert.strictEqual(logCreatedNewOperator.args.owner, tollBoothOwner1);
				assert.strictEqual(logCreatedNewOperator.args.depositWeis.toString(10), baseDeposit.toString(10));

				const logSetOwner = txObj.logs[0];
				assert.strictEqual(logSetOwner.event, "LogOwnerSet");
				assert.strictEqual(logSetOwner.address, createdTollBoothOperator);
				assert.strictEqual(logSetOwner.args.previousOwner, regulator.address);
				assert.strictEqual(logSetOwner.args.newOwner, tollBoothOwner1)

				// Create instance of TollBoothOperator
				const tollBoothOperatorAt = TollBoothOperator.at(createdTollBoothOperator);

				return Promise.allNamed({
					createdTollBoothOperator: () => regulator.isOperator(createdTollBoothOperator),
					owner: () => tollBoothOperatorAt.getOwner(),
					paused: () => tollBoothOperatorAt.isPaused(),
					regulated: () => tollBoothOperatorAt.getRegulator(),
					baseDeposit: () => tollBoothOperatorAt.getDeposit()})})
			.then(results => {
				assert.isTrue(results.createdTollBoothOperator);
				assert.strictEqual(results.owner, tollBoothOwner1);
				assert.isTrue(results.paused);
				assert.strictEqual(results.regulated, regulator.address);
				assert.strictEqual(results.baseDeposit.toString(10), baseDeposit.toString(10))}));

		it("should not allow the creation of a toll booth operator if the caller is not the owner", () => 
			expectedExceptionPromise(() => regulator.createNewOperator(tollBoothOwner1, baseDeposit, { from: tollBoothOwner2 })));
	
		it("should not allow the creation of a toll booth operator new to be owner is the regulator owner", () => 
			expectedExceptionPromise(() => regulator.createNewOperator(regulatorOwner, baseDeposit, { from: regulatorOwner })));

	});

	describe("removing toll booth operators", () => {

		let tollBoothOperator;
		
		beforeEach("should allow the creation of a toll booth operator if the caller is the owner", () => 
			regulator.createNewOperator(tollBoothOwner1, baseDeposit, { from: regulatorOwner })
			.then( (txObj) => tollBoothOperator = TollBoothOperator.at(txObj.logs[1].args.newOperator)));
	
		it("should allow the removal of a toll booth operator if the caller is the owner", () => 
			regulator.removeOperator(tollBoothOperator.address, { from: regulatorOwner })
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogTollBoothOperatorRemoved");
				assert.strictEqual(txObj.logs[0].args.sender, regulatorOwner);
				assert.strictEqual(txObj.logs[0].args.operator, tollBoothOperator.address)}));

		it("should not allow the removal of a toll booth operator if the caller is not the owner", () => 
			expectedExceptionPromise(() => regulator.removeOperator(tollBoothOperator.address, { from: vehicle1 })));

		it("should not allow the removal of a unregistered toll booth operator", () => 
			expectedExceptionPromise(() => regulator.removeOperator(vehicle1, { from: regulatorOwner })));
			
	});

	describe("checking registered toll booth operators", () => {

		let tollBoothOperator;
		
		beforeEach("should allow the creation of a toll booth operator if the caller is the owner", () => 
			regulator.createNewOperator(tollBoothOwner1, baseDeposit, { from: regulatorOwner })
			.then( (txObj) => tollBoothOperator = TollBoothOperator.at(txObj.logs[1].args.newOperator)));
	
		it("should report as a registered toll booth operator, an operator that has been created before", () => 
			regulator.isOperator.call(tollBoothOperator.address, { from: regulatorOwner })
			.then( (result) => assert.isTrue(result)));

		it("should not report as a registered toll booth operator, an operator that has not been created before", () => 
			regulator.isOperator.call(vehicle1, { from: regulatorOwner })
			.then( (result) => assert.isFalse(result)));
			
	});

});
