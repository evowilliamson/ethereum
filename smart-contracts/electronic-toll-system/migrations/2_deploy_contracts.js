const TollBoothOperator = artifacts.require("./TollBoothOperator.sol")
const Regulator = artifacts.require("./Regulator.sol")
const LinkedListQueue = artifacts.require("./LinkedListQueue.sol")

module.exports = (deployer, network, accounts) => deployer.then( () => {
	const regulatorOwner = accounts[0];
	const tollBoothOperatorOwner = accounts[1];

	let tollBoothOperatorAt;

	return deployer.deploy(LinkedListQueue)
	.then( () => deployer.link(LinkedListQueue, Regulator))
	.then( () => deployer.link(LinkedListQueue, TollBoothOperator))
	.then( () => deployer.deploy(Regulator, { from: regulatorOwner }))
	.then( (regulator) => regulator.createNewOperator(tollBoothOperatorOwner, 100, { from: regulatorOwner }))
	.then( (txObj) => TollBoothOperator.at(txObj.logs[1].args.newOperator))
	.then( (instance) => {tollBoothOperatorAt = instance; tollBoothOperatorAt.setPaused(false, { from: tollBoothOperatorOwner })})
})
