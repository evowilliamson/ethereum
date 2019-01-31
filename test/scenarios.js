const Regulator = artifacts.require("./Regulator.sol")
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol")
const toBytes32 = require("../utils/toBytes32.js");
const BigNumber = require('bignumber.js');

contract('Scenarios', (accounts) => {

    const vehicle1 = accounts[0]
    const vehicle2 = accounts[1]
    const regulatorOwner = accounts[2]
    const booth1 = accounts[3]
    const booth2 = accounts[4]
    const tollBoothOperatorOwner = accounts[5]

    const vehicleType1 = 1;
    const multiplier = 1;
    const baseDeposit = 10

    const secret1 = toBytes32(1948);
    const secret2 = toBytes32(2001);

    let tollBoothOperator;
    let regulator;
    let keys = {}

	beforeEach("setup", () => {

        return Regulator.new({ from: regulatorOwner })
        .then(instance => regulator = instance)
        .then( () => regulator.setVehicleType(vehicle1, vehicleType1, { from: regulatorOwner }))
        .then( () => regulator.setVehicleType(vehicle2, vehicleType1, { from: regulatorOwner }))
        .then( () => regulator.createNewOperator(tollBoothOperatorOwner, baseDeposit, { from: regulatorOwner }))
        .then(tx => tollBoothOperator = TollBoothOperator.at(tx.logs[1].args.newOperator))
        .then( () => tollBoothOperator.setPaused(false, { from: tollBoothOperatorOwner }))
        .then( () => tollBoothOperator.addTollBooth(booth1, { from: tollBoothOperatorOwner }))
        .then( () => tollBoothOperator.addTollBooth(booth2, { from: tollBoothOperatorOwner }))
        .then( () => tollBoothOperator.setMultiplier(vehicleType1, multiplier, { from: tollBoothOperatorOwner }))
        .then( () => tollBoothOperator.hashSecret(secret1))
        .then(hash => keys[vehicle1] = {"hashed": hash, "clear": secret1})
        .then( () => tollBoothOperator.hashSecret(secret2))
        .then(hash => keys[vehicle2] = {"hashed": hash, "clear": secret2})});

    /**
     * Tests the enter and exit sequence of vehicle1. If routePrice is 0, there will be a pending payment, 
     * instead of a road exit.
     * @param {*} param0 
     */
    function testEnterExitVehicle({vehicle, routePrice, deposit, expectedRefund}) {

        return tollBoothOperator.enterRoad(booth1, keys[vehicle].hashed, { from: vehicle, value: deposit })
        .then(tx => testEventRoadEntered({vehicle: vehicle, log: tx.logs[0], deposit: deposit}))
        .then( () => tollBoothOperator.reportExitRoad(keys[vehicle].clear, { from: booth2 }))
        .then(tx => routePrice == 0 
            ? 
            testEventPendingPayment({vehicle: vehicle, log: tx.logs[0], 
                routePrice: routePrice, expectedRefund: expectedRefund}) 
            : 
            testEventRoadExited({vehicle: vehicle1, log: tx.logs[0], 
                routePrice: routePrice, deposit, expectedRefund: expectedRefund}))

    }

    /**
     * This function executes and tests the sequence of command of setting the route price by a 
     * toll booth owner, followed by a enter and exit road by a vehicle.
     * @param {*} param0 
     */
    function testSetRoutePriceEnterExitVehicle({vehicle, routePrice, deposit, expectedRefund}) {

        return routePrice != 0
            ?
            tollBoothOperator.setRoutePrice(booth1, booth2, routePrice, { from: tollBoothOperatorOwner })
            .then( tx => testEventRoutePriceSet({log: tx.logs[0], routePrice: routePrice}))
            .then( () => testEnterExitVehicle({vehicle: vehicle, routePrice: routePrice, deposit:deposit, 
                expectedRefund: expectedRefund}))
            :
            testEnterExitVehicle({vehicle: vehicle, routePrice: routePrice, deposit:deposit, 
                expectedRefund: expectedRefund})

    }

    /**
     * Test the event that was triggered because of a setRoutePrice call.
     * @param {*} param0 
     */
    function testEventRoutePriceSet({log, routePrice}) {

        assert.strictEqual(log.event, "LogRoutePriceSet");
        assert.strictEqual(log.args.sender, tollBoothOperatorOwner);
        assert.strictEqual(log.args.entryBooth, booth1);
        assert.strictEqual(log.args.exitBooth, booth2);
        return assert.strictEqual(log.args.priceWeis.toString(10), routePrice.toString(10))

    }

    /**
     * Test the event that was triggered because of an enterRoad call.
     * @param {*} param0 
     */
    function testEventRoadEntered({vehicle, log, deposit}) {

        assert.strictEqual(log.event, "LogRoadEntered");
        assert.strictEqual(log.args.vehicle, vehicle);
        assert.strictEqual(log.args.entryBooth, booth1);
        assert.strictEqual(log.args.exitSecretHashed, keys[vehicle].hashed);
        return assert.strictEqual(log.args.depositedWeis.toString(10), 
            new BigNumber(deposit).multipliedBy(new BigNumber(multiplier)).toString(10));

    }

    /**
     * Test the event that was triggered because of an exitRoad call, where
     * the vehicle exited the road, no pending payment being generated.
     * @param {*} param0 
     */
    function testEventRoadExited({vehicle, log, routePrice, deposit, expectedRefund}) {

        assert.strictEqual(log.event, "LogRoadExited");
        assert.strictEqual(log.args.exitBooth, booth2);
        assert.strictEqual(log.args.exitSecretHashed, keys[vehicle].hashed);
        if (deposit > routePrice) {
            assert.strictEqual(log.args.finalFee.toString(10), 
                new BigNumber(routePrice).multipliedBy(new BigNumber(multiplier)).toString(10));
        } 
        else {
            assert.strictEqual(log.args.finalFee.toString(10), 
                new BigNumber(deposit).multipliedBy(new BigNumber(multiplier)).toString(10));
        }
        return assert.strictEqual(log.args.refundWeis.toString(10), expectedRefund.toString(10));

    }

    /**
     * Test the event that was triggered because of a setRoutePrice or clearPendingPayments call
     * @param {*} param0 
     */
    function testEventPendingPayment({vehicle, log}) {

        assert.strictEqual(log.event, "LogPendingPayment");
        assert.strictEqual(log.args.exitSecretHashed, keys[vehicle].hashed);
        assert.strictEqual(log.args.entryBooth, booth1);
        return assert.strictEqual(log.args.exitBooth, booth2);

    }

    let tx;
    it("Scenario 1", () => testSetRoutePriceEnterExitVehicle({vehicle: vehicle1, routePrice: 10, deposit: 10, expectedRefund: 0}));
    it("Scenario 2", () => testSetRoutePriceEnterExitVehicle({vehicle: vehicle1, routePrice: 15, deposit: 10, expectedRefund: 0}));
    it("Scenario 3", () => testSetRoutePriceEnterExitVehicle({vehicle: vehicle1, routePrice:  6, deposit: 10, expectedRefund: 4}));
    it("Scenario 4", () => testSetRoutePriceEnterExitVehicle({vehicle: vehicle1, routePrice: 10, deposit: 14, expectedRefund: 4}));
    it("Scenario 5", () => testSetRoutePriceEnterExitVehicle({vehicle: vehicle1, routePrice:  0, deposit: 14})
        .then( ()    => tollBoothOperator.setRoutePrice(booth1, booth2, 11, { from: tollBoothOperatorOwner }))
        .then( txObj => {tx = txObj; testEventRoutePriceSet({log: tx.logs[0], routePrice: 11})})
        .then( ()    => testEventRoadExited({vehicle: vehicle1, log: tx.logs[1], routePrice: 11, deposit: 14, expectedRefund: 3})));
    it("Scenario 6", () => testSetRoutePriceEnterExitVehicle({vehicle: vehicle1, routePrice:  0, deposit: 14})
        .then( ()    => testSetRoutePriceEnterExitVehicle({vehicle: vehicle2, routePrice: 0, deposit: 10}))
        .then( ()    => tollBoothOperator.setRoutePrice(booth1, booth2, 6, { from: tollBoothOperatorOwner }))
        .then( txObj => {tx = txObj; testEventRoutePriceSet({log: tx.logs[0], routePrice: 6})})
        .then( ()    => testEventRoadExited({vehicle: vehicle1, log: tx.logs[1], routePrice: 6, deposit: 14, expectedRefund: 8}))
        .then( ()    => tollBoothOperator.clearSomePendingPayments(booth1, booth2, 1, { from: tollBoothOperatorOwner }))
        .then( (tx)  => testEventRoadExited({vehicle: vehicle2, log: tx.logs[0], routePrice: 6, deposit: 14, expectedRefund: 4}))
    );

})
