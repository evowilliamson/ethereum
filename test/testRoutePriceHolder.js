const expectedExceptionPromise = require("../utils/expectedException");
const RoutePriceHolder = artifacts.require("./RoutePriceHolder.sol");

contract('RoutePriceHolder', (accounts) => {

	let tollBooth1 = accounts[0];
	let tollBooth2 = accounts[1];

	let routePriceHolderOwner1 = accounts[2];
	let routePriceHolderOwner2 = accounts[3];

	let routePrice1 = 100;
	let routePrice2 = 200;

	let routePriceHolder;

	beforeEach("create instance", () => 
		RoutePriceHolder.new( { from: routePriceHolderOwner1 } )
		.then( (instance) => routePriceHolder = instance ));

	describe("simple positive route price holders maintenance and retrieval", () => {

		it("should allow the setting of " + 
		   "a route price for a registered entry and exit booth if the caller is the owner", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogRoutePriceSet");
				assert.strictEqual(txObj.logs[0].args.sender, routePriceHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.entryBooth, tollBooth1);
				assert.strictEqual(txObj.logs[0].args.exitBooth, tollBooth2);
				assert.strictEqual(txObj.logs[0].args.priceWeis.toString(10), routePrice1.toString(10))}));

		it("should allow the setting of " + 
		   "a route price for a registered entry and exit booth twice when price is not the same", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice2.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogRoutePriceSet");
				assert.strictEqual(txObj.logs[0].args.sender, routePriceHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.entryBooth, tollBooth1);
				assert.strictEqual(txObj.logs[0].args.exitBooth, tollBooth2);
				assert.strictEqual(txObj.logs[0].args.priceWeis.toString(10), routePrice2.toString(10))}));

		it("should allow the setting of " + 
		   "a route price for a registered entry and exit booth and also the reverse path", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth2, tollBooth1, routePrice2.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( (txObj) => {
				assert.strictEqual(txObj.logs[0].event, "LogRoutePriceSet");
				assert.strictEqual(txObj.logs[0].args.sender, routePriceHolderOwner1);
				assert.strictEqual(txObj.logs[0].args.entryBooth, tollBooth2);
				assert.strictEqual(txObj.logs[0].args.exitBooth, tollBooth1);
				assert.strictEqual(txObj.logs[0].args.priceWeis.toString(10), routePrice2.toString(10))}));

		it("should allow the setting of " + 
		   "a route price for a registered entry and exit booth and give back true on success " + 
		   "(ignore state changes)", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice.call(tollBooth1, tollBooth2, routePrice1.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( (result) => assert.isTrue(result)));

		it("should allow the retrieval of a the correct route price for an added route", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.getRoutePrice.call(tollBooth1, tollBooth2, { from: routePriceHolderOwner1 }))
			.then( (price) => assert.strictEqual(price.toString(10), routePrice1.toString(10))));

		it("should allow the retrieval of a 0 price for a non-existing route", () => 
			routePriceHolder.getRoutePrice.call(tollBooth1, tollBooth2, { from: routePriceHolderOwner1 })
			.then( (price) => assert.strictEqual(price.toString(10), "0")));

		it("should allow the retrieval of 0 price for a reverse route (which is not registered)", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
				{ from: routePriceHolderOwner1 }))
			.then( () => routePriceHolder.getRoutePrice.call(tollBooth2, tollBooth1, { from: routePriceHolderOwner1 }))
			.then( (price) => assert.strictEqual(price.toString(10), "0")));
			
	});

	describe("simple positive multiplier holders maintenance and retrieval", () => {

		it("should not allow the setting of " + 
		   "a route price for a registered entry and exit booth if the caller is not the owner", () => 
		   routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
		   .then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
		   .then( () => expectedExceptionPromise(() => 
				routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
					{ from: routePriceHolderOwner2 }))));

		it("should not allow the setting of " + 
     	   "a route price for a unregistered entry booth and a registered exit booth ", () => 
			routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 })
			.then( () => expectedExceptionPromise(() => 
				routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
					{ from: routePriceHolderOwner1 }))));

		it("should not allow the setting of " + 
		   "a route price for a registered entry booth and a unregistered exit booth ", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => expectedExceptionPromise(() => 
				routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
					{ from: routePriceHolderOwner1 }))));

		it("should not allow the setting of " + 
		   "a route price for a unregistered entry booth and a unregistered exit booth ", () => 
			expectedExceptionPromise(() => 
				routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
					{ from: routePriceHolderOwner1 })));

		it("should not allow the setting of " + 
		   "a route price for a registered entry and exit booth if the price is the same", () => 
		routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
		.then( () => routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 }))
		.then( () => routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
			{ from: routePriceHolderOwner1 }))
		.then( () => expectedExceptionPromise(() => 
				routePriceHolder.setRoutePrice(tollBooth1, tollBooth2, routePrice1.toString(10), 
					{ from: routePriceHolderOwner1 }))));

		it("should not allow the setting of " + 
		   "a route price for a registered entry booth and a 0x0 exit booth", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => expectedExceptionPromise(() => 
					routePriceHolder.setRoutePrice(tollBooth1, 0x0, routePrice1.toString(10), 
						{ from: routePriceHolderOwner1 }))));

		it("should not allow the setting of " + 
		   "a route price for a registered exit booth and a 0x0 entry booth", () => 
			routePriceHolder.addTollBooth(tollBooth2, { from: routePriceHolderOwner1 })
			.then( () => expectedExceptionPromise(() => 
					routePriceHolder.setRoutePrice(0x0, tollBooth2, routePrice1.toString(10), 
						{ from: routePriceHolderOwner1 }))));

		it("should not allow the setting of " + 
		   "a route price for a where both toll booths are the same", () => 
			routePriceHolder.addTollBooth(tollBooth1, { from: routePriceHolderOwner1 })
			.then( () => expectedExceptionPromise(() => 
					routePriceHolder.setRoutePrice(tollBooth1, tollBooth1, routePrice1.toString(10), 
						{ from: routePriceHolderOwner1 }))));
									 
	});

});
