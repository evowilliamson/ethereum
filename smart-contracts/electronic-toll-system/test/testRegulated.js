const expectedExceptionPromise = require("../utils/expectedException");
const Regulator = artifacts.require("./Regulator.sol");
const Regulated = artifacts.require("./Regulated.sol");

contract('Regulator', (accounts) => {

	let regulatorOwner1 = accounts[0];

	describe("constructor and getter", () => {

		let regulator1;
		let regulated;

		beforeEach("create instance", () => 
			Regulator.new( { from: regulatorOwner1 } )
			.then( (instance) => regulator1 = instance ));
	
		it("should allow the instantiation of regulated when regulator1 is not equal to 0x0", () => 
			Regulated.new(regulator1.address, { from: regulatorOwner1 } )
			.then( (instance) => { 
				regulated = instance;
			    return regulated.getRegulator.call( { from: regulatorOwner1 } )}) 
			.then( (_regulator) => {
				assert.strictEqual(_regulator, regulator1.address)}));

		it("should not allow the instantiation of regulated when regulator1 is  0x0", () => 
			expectedExceptionPromise( () => Regulated.new(0x0, { from: regulatorOwner1 } )));
			
	});

});
