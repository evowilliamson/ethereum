/* 
 * - No gas limits for local testing, no vagrant, low gas price
 */
const expectedExceptionPromise = require("../utils/expectedException.js");
require('babel-polyfill');
const BigNumber = require('bignumber.js');
const Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
Promise.allSeq = require("../utils/sequentialPromise.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");
const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });

contract('TollBoothOperator', function(accounts) {

    const price01 = randomIntIn(1, 10);
    const deposit0 = price01 + randomIntIn(1, 10);

    const unregistered = 0;
    const vehicleType0 = randomIntIn(1, 1000);
    const vehicleType1 = vehicleType0 + randomIntIn(1, 1000);
    const multiplier0 = randomIntIn(1, 1000);
    const multiplier1 = multiplier0 + randomIntIn(1, 1000);
    const tmpSecret = randomIntIn(1, 1000);
    const secret0 = toBytes32(tmpSecret);
    const secret1 = toBytes32(tmpSecret + randomIntIn(1, 1000));
    let hashed0, hashed1;
    const gasPrice = 5;

    let owner0 = accounts[0];
    let owner1 = accounts[1];
    let booth0 = accounts[2];
    let booth1 = accounts[3];
    let booth2 = accounts[4];
    let vehicle0 = accounts[5];
    let vehicle1 = accounts[6];

    let regulator
    let operator;

    describe("Deploy", function() {

        it("should be possible to deploy an active TollBoothOperator", () => {
            return TollBoothOperator.new(false, deposit0, owner0, { from: owner1, gasPrice: gasPrice })
            .then(operator => Promise.allNamed({
                    paused: () => operator.isPaused(),
                    regulator: () => operator.getRegulator(),
                    deposit: () => operator.getDeposit()}))
            .then(result => {
                assert.isFalse(result.paused);
                assert.strictEqual(result.regulator, owner0);
                assert.strictEqual(result.deposit.toString(), deposit0.toString(10))})});

        it("should be possible to deploy a paused TollBoothOperator", () => {
            return TollBoothOperator.new(true, deposit0, owner0, { from: owner1, gasPrice: gasPrice })
            .then(operator => operator.isPaused())
            .then( (result) => assert.isTrue(result))});
        
        it("should not be possible to deploy a TollBoothOperator with deposit of 0", function() {
            return expectedExceptionPromise(
                () => TollBoothOperator.new(false, 0, owner0, { from: owner1, gasPrice: gasPrice }));
        });

        it("should not be possible to deploy a TollBoothOperator with a regulator of 0 address", function() {
            return expectedExceptionPromise(
                () => TollBoothOperator.new(false, deposit0, 0x0, { from: owner1, gasPrice: gasPrice}));
        });

    });

    describe("Vehicle Operations", () => {

        beforeEach("should deploy regulator and operator", () => {
            return Regulator.new({ from: owner0 })
                .then(instance => regulator = instance)
                .then( () => regulator.setVehicleType(vehicle0, vehicleType0, { from: owner0, gasPrice: gasPrice }))
                .then( () => regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0, gasPrice: gasPrice }))
                .then( () => regulator.createNewOperator(owner1, deposit0, { from: owner0, gasPrice: gasPrice }))
                .then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
                .then( () => operator.addTollBooth(booth0, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.addTollBooth(booth1, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.addTollBooth(booth2, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.setMultiplier(vehicleType0, multiplier0, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.setMultiplier(vehicleType1, multiplier1, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.setRoutePrice(booth0, booth1, price01, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.setPaused(false, { from: owner1, gasPrice: gasPrice }))
                .then( () => operator.hashSecret(secret0, { gasPrice: gasPrice }))
                .then(hash => hashed0 = hash)
                .then( () => operator.hashSecret(secret1, { gasPrice: gasPrice }))
                .then(hash => hashed1 = hash)});

        describe("Entering the road - basic", () => {

            it("should be possible to enter road with more than required deposit", () => {
                return operator.enterRoad.call(booth0, hashed0, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice })
                .then(success => assert.isTrue(success))
                .then(() => operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice }))
                .then(tx => {
                    assert.strictEqual(tx.receipt.logs.length, 1);
                    assert.strictEqual(tx.logs.length, 1);
                    const logEntered = tx.logs[0];
                    assert.strictEqual(logEntered.event, "LogRoadEntered");
                    assert.strictEqual(logEntered.args.vehicle, vehicle0);
                    assert.strictEqual(logEntered.args.entryBooth, booth0);
                    assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
                    assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit0 * multiplier0) + 1);
                    return operator.getVehicleEntry(hashed0, { gasPrice: gasPrice });})
                .then(info => {
                    assert.strictEqual(info[0], vehicle0);
                    assert.strictEqual(info[1], booth0);
                    assert.strictEqual(info[2].toNumber(), (deposit0 * multiplier0) + 1);
                    return web3.eth.getBalancePromise(operator.address)})
                .then(balance => assert.strictEqual(balance.toNumber(), deposit0 * multiplier0 + 1))});

            it("should not be possible to enter road if paused", () =>
                operator.setPaused(true, { from: owner1 })
                    .then( () => 
                        expectedExceptionPromise( () => 
                            operator.enterRoad(
                                booth0, hashed0, { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice} ))));

            it("should not be possible to enter road if entry booth is not a toll booth", () =>
                expectedExceptionPromise( () => 
                    operator.enterRoad(
                        vehicle0, hashed0, { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice} )));

            it("should not be possible to enter road if vehicle is not registered", () =>
                expectedExceptionPromise( () => 
                    operator.enterRoad(
                        vehicle0, hashed0, { from: booth0, value: deposit0 * multiplier0, gasPrice: gasPrice} )));
                        
            it("should not be possible to enter road if not enough deposit", () =>
                expectedExceptionPromise( () => 
                    operator.enterRoad(
                        booth0, hashed0, { from: vehicle0, value: 0} )));

            it("should not be possible to enter road with a used exit hashed secret", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1 })
                .then( () => operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))
                .then( () => expectedExceptionPromise( () => 
                    operator.enterRoad(booth0, hashed0, 
                        { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice }))))

            it("should be possible to enter road again with different exit hashed secret", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice })
                .then( () => operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))
                .then( () => operator.enterRoad.call(booth0, hashed1, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice }))
                .then(success => assert.isTrue(success)));

            it("should be possible to enter road again without having exited, regardless of "  + 
               "entry booth", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice })
                .then( () => operator.enterRoad(booth0, hashed1, 
                    { from: vehicle0, value: (deposit0 * multiplier0) + 1, gasPrice: gasPrice }))
                .then(tx => assert.strictEqual(tx.logs[0].event, "LogRoadEntered")));
                    
        });

        describe("Exiting the road - basic", () => {

            it("should be possible to exit the road by providing correct clear text secret", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0 })
                .then( () => operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))
                .then(tx => {
                    assert.strictEqual(tx.receipt.logs.length, 1);
                    assert.strictEqual(tx.logs.length, 1);
                    const logExited = tx.logs[0];
                    assert.strictEqual(logExited.event, "LogRoadExited");
                    assert.strictEqual(logExited.args.exitBooth, booth1);
                    assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
                    assert.strictEqual(logExited.args.finalFee.toString(10), 
                        new BigNumber(price01).multipliedBy(new BigNumber(multiplier0)).toString(10));
                    assert.strictEqual(logExited.args.refundWeis.toString(10), 
                        (new BigNumber(deposit0).minus(new BigNumber(price01)).multipliedBy(
                            new BigNumber(multiplier0))).toString(10))}));

            it("should not be possible to exit when not providing the correct clear text secret", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice })
                .then( () => expectedExceptionPromise( () => 
                    operator.reportExitRoad(secret1, { from: booth1, gasPrice: gasPrice }))));

            it("should not be possible to exit when the contract is paused", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice })
                .then( () => operator.setPaused(true, { from: owner1, gasPrice: gasPrice }))
                .then( () => expectedExceptionPromise( () => 
                    operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))));

            it("should not be possible to exit at a booth that is not registered", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice })
                .then( () => expectedExceptionPromise( () => 
                    operator.reportExitRoad(secret0, { from: vehicle1, gasPrice: gasPrice }))));

            it("should not be possible to exit at a booth that is also the entry booth", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice })
                .then( () => expectedExceptionPromise( () => 
                    operator.reportExitRoad(secret0, { from: booth0, gasPrice: gasPrice }))));
                        
            it("should not be possible to exit the twice using the same exit secret hash", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice })
                .then( () => operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))
                .then( () => expectedExceptionPromise( () => 
                    operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))));

            it("should not be possible to exit when the vehicle is not registered anymore", () => 
                operator.enterRoad(booth0, hashed0, 
                    { from: vehicle0, value: deposit0 * multiplier0, gasPrice: gasPrice })
                .then( () => regulator.setVehicleType(vehicle0, unregistered, { from: owner0, gasPrice: gasPrice }))
                .then( () => expectedExceptionPromise( () => 
                    operator.reportExitRoad(secret0, { from: booth1, gasPrice: gasPrice }))));
                        
        });

        describe("Performance test", function() {

            const extraDeposit0 = deposit0 + randomIntIn(1, 1000);
                    
            beforeEach("should deploy regulator and operator", () => {
                return Regulator.new({ from: owner0 })
                    .then(instance => regulator = instance)
                    .then( () => regulator.setVehicleType(vehicle0, vehicleType0, { from: owner0, gasPrice: gasPrice }))
                    .then( () => regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0, gasPrice: gasPrice }))
                    .then( () => regulator.createNewOperator(owner1, deposit0, { from: owner0, gasPrice: gasPrice }))
                    .then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
                    .then( () => operator.addTollBooth(booth0, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.addTollBooth(booth1, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.addTollBooth(booth2, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setMultiplier(vehicleType0, multiplier0, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setMultiplier(vehicleType1, multiplier1, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setRoutePrice(booth0, booth1, price01, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setPaused(false, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.hashSecret(secret0, { gasPrice: gasPrice }))
                    .then(hash => hashed0 = hash)
                    .then( () => operator.hashSecret(secret1, { gasPrice: gasPrice }))
                    .then(hash => hashed1 = hash)});

            /**
             * https://sciencing.com/calculate-linearity-7560898.html
             * @param {*} xs 
             */
            function getS(xs) {

                const sum_xs = xs.reduce((a, b) => a + b, 0);
                const square_each_xs = xs.flatMap(x => [x * x]);
                const sum_square_each_xs = square_each_xs.reduce((a, b) => a + b, 0);
                const square_sum_xs = sum_xs * sum_xs;
                const square_sum_xs_div_n = square_sum_xs/xs.length;
                return sum_square_each_xs - square_sum_xs_div_n
                
            }

            /**
             * https://sciencing.com/calculate-linearity-7560898.html
             * @param {*} xs 
             * @param {*} ys 
             */
            function lineairity(xs, ys) {

                let sxy = xs.map( (x, i) => x * ys[i]).reduce((a, b) => a + b, 0) - 
                    xs.reduce((a, b) => a + b, 0) * ys.reduce((a, b) => a + b, 0) / xs.length;

                let mult_sqrts = Math.sqrt(getS(xs)) * Math.sqrt(getS(ys));
                return sxy / mult_sqrts;

            }

            function doPerformanceTest(n) {

                let totalGasUsed = 0;
                const enterExits = []
                for (let i = 0; i <= n; i++) {
                    enterExits.push(() => {
                        console.log("entryRoad/exitRoad: " + i);
                        return operator.hashSecret(toBytes32(i))
                        .then( (hash) => operator.enterRoad(booth0, hash, { from: vehicle0, value: extraDeposit0 * multiplier0, gasPrice: gasPrice }))
                        .then( (tx) => { 
                            totalGasUsed = totalGasUsed + tx.receipt.gasUsed; 
                            return operator.reportExitRoad(toBytes32(i), { from: booth2, gasPrice: gasPrice })})
                        .then( (tx) => totalGasUsed = totalGasUsed + tx.receipt.gasUsed)
                    });
                }      
                const clearSomes = []
                for (let i = 0; i <= n - 1; i++) {
                    clearSomes.push(() => {
                        console.log("clearSomes: " + i);
                        return operator.clearSomePendingPayments(booth0, booth2, 1, { from: owner0, gasPrice: gasPrice})
                        .then( (tx) => totalGasUsed = totalGasUsed + tx.receipt.gasUsed)
                    });
                }      

                return Regulator.new({ from: owner0 })
                    .then(instance => regulator = instance)
                    .then( () => regulator.setVehicleType(vehicle0, vehicleType0, { from: owner0, gasPrice: gasPrice }))
                    .then( () => regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0, gasPrice: gasPrice }))
                    .then( () => regulator.createNewOperator(owner1, deposit0, { from: owner0, gasPrice: gasPrice }))
                    .then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
                    .then( () => operator.addTollBooth(booth0, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.addTollBooth(booth1, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.addTollBooth(booth2, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setMultiplier(vehicleType0, multiplier0, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setMultiplier(vehicleType1, multiplier1, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setRoutePrice(booth0, booth1, price01, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.setPaused(false, { from: owner1, gasPrice: gasPrice }))
                    .then( () => operator.hashSecret(secret0, { gasPrice: gasPrice }))
                    .then(hash => hashed0 = hash)
                    .then( () => operator.hashSecret(secret1, { gasPrice: gasPrice }))
                    .then(hash => hashed1 = hash)
                .then( () => Promise.allSeq(enterExits))
                .then(txs => Promise.allSeq(txs.map((tx, i) => () => {
                    return console.log("Gas used until now entryRoad/exitRoad: " + i + tx);
                })))
                .then( () => operator.setRoutePrice(booth0, booth2, deposit0, { from: owner1, gasPrice: gasPrice }))
                .then(tx => {totalGasUsed = totalGasUsed + tx.receipt.gasUsed;  })
                .then( () => Promise.allSeq(clearSomes))
                .then(txs => Promise.allSeq(txs.map((tx, i) => () => {
                    return console.log("Gas used until now clearSomes: " + i + tx);
                })))
                .then(() => {
                    console.log("size: " + n.toString(10));
                    console.log("Gas used in total: " + totalGasUsed.toString(10));
                    console.log("Gas per entry/exit/clearsome: " + (totalGasUsed / n).toString(10));
                    return Promise.resolve((totalGasUsed / n));
                });
                
            }
            
            it("Multiple entryroad/exitRoad/clearSomePendingPayment combinations", () => {

                const tests = [];
                let n = 4
                let multiplier = 9;
                for (let i = 1; i <= n; i++) {
                    tests.push(() => doPerformanceTest(20 + (i * i * multiplier)));
                }      
                return Promise.allSeq(tests)
                .then( (coefficients) => {
                    let xs = Array.from({length: n}, (v, k) => k+1);
                    let ys = coefficients
                    console.log(xs);
                    console.log(ys);
                    console.log(lineairity(xs, ys));
                    let lin = Math.abs(lineairity(xs, ys));
                    let limit_lineairity = 0.925;
                    let avg = ys.reduce((a, b) => a + b) / ys.length;
                    let last = ys[ys.length - 1];
                    return assert.isTrue(lin > limit_lineairity && last < avg, "Linearity: " + lin.toString(10) + 
                        " must be greater than " + limit_lineairity + ". xs: " + xs.toString(10) + ", ys: " + ys.toString(10) + 
                        ". Last gas: " + last.toString(10) + ", avg gas: " + avg.toString(10) + ". Last gas must be smaller than avg gas")});
            })

        });

    });

});
