pragma solidity ^0.4.24;

import "./interfaces/TollBoothOperatorI.sol";
import "./Pausable.sol";
import "./DepositHolder.sol";
import "./TollBoothHolder.sol";
import "./MultiplierHolder.sol";
import "./RoutePriceHolder.sol";
import "./Regulated.sol";
import "./SafeMath.sol";
import "./LinkedListQueue.sol";

contract TollBoothOperator is TollBoothOperatorI, Pausable, DepositHolder, TollBoothHolder, 
                              MultiplierHolder, RoutePriceHolder, Regulated {

    using SafeMath for uint;
    using LinkedListQueue for LinkedListQueue.Meta;

    struct Trip {
        address vehicle;
        address entryBooth;
        uint depositedWeis; 
        /* depositedWeis will be set to zero after exiting the road. This way, it can be detected
         * later when exiting the road with the same exit secret hash. 
         * The trip cannot be deleted, as it would not possible to detect if a hash has already been used.
         * On entering the road, a check is made if the vehicle attribute is filled. If so, another
         * hash must be generated. 
         */
    }

    struct EntryExit {
        address vehicle;
        bool entry;
        bool exit;
    }
    
    /**
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @return the number of payments that are pending because the price for the
     * entry-exit pair was unknown.
     */
    function getPendingPaymentCount(address entryBooth, address exitBooth)
        view public returns (uint) {

        return pendingPaymentsCount[entryBooth][exitBooth];

    }

    uint collectableFees;
    mapping(bytes32 => Trip) trips;
    /* 
     * Use a Linked List data structure to assure constant inserts and retrievals 
     */
    mapping(address => mapping(address => LinkedListQueue.Meta)) pendingPayments;
    mapping(address => mapping(address => uint)) pendingPaymentsCount;
    /**
     * Also keep track if a vehicle already made an attemp to exit. If so, a subsequent
     * attempt to try exit again should be denied
     **/
    mapping(bytes32 => bool) exitAttempts; 

    constructor (bool paused, uint baseDeposit, address regulator) public
        Pausable(paused)
        DepositHolder(baseDeposit)
        Regulated(regulator) {

        require(baseDeposit > 0, "Base deposit must be greater than 0");
        require(regulator != 0x0, "Regulator address cannot be 0x0");

    }

    /**
     * Event emitted when a vehicle made the appropriate deposit to enter the road system.
     * @param vehicle The address of the vehicle that entered the road system.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that, when solved, allows the operator to pay itself.
     * @param depositedWeis The amount that was deposited as part of the entry.
     */
    event LogRoadEntered(
        address indexed vehicle, address indexed entryBooth, 
        bytes32 indexed exitSecretHashed, uint depositedWeis);

    /**
     * Event emitted when a vehicle exits a road system.
     * @param exitBooth The toll booth that saw the vehicle exit.
     * @param exitSecretHashed The hash of the secret given by the vehicle as it
     *     passed by the exit booth.
     * @param finalFee The toll charge effectively paid by the vehicle, and taken from the deposit.
     * @param refundWeis The amount refunded to the vehicle, i.e. deposit - charge.
     */
    event LogRoadExited(
        address indexed exitBooth, bytes32 indexed exitSecretHashed, 
        uint finalFee, uint refundWeis);

    /**
     * Event emitted when a vehicle used a route that has no known fee.
     * It is a signal for the oracle to provide a price for the entry / exit pair.
     * @param exitSecretHashed The hashed secret that was defined at the time of entry.
     * @param entryBooth The address of the booth the vehicle entered at.
     * @param exitBooth The address of the booth the vehicle exited at.
     */
    event LogPendingPayment(
        bytes32 indexed exitSecretHashed, address indexed entryBooth, 
        address indexed exitBooth);

    /**
     * Event emitted when the owner collects the fees.
     * @param owner The account that sent the request.
     * @param amount The amount collected.
     */
    event LogFeesCollected(address indexed owner, uint amount);

    /**
     * Don't allow the fall back function to be called
     */
    function() public {
        
        revert("Fallback function not callable");
        
    }

    /**
     * Called by the vehicle entering a road system.
     * Off-chain, the entry toll booth will open its gate after a successful deposit and a confirmation
     * of the vehicle identity.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the vehicle is not a registered vehicle.
     *     It should roll back when the vehicle is not allowed on this road system.
     *     It should roll back if `entryBooth` is not a tollBooth.
     *     It should roll back if less than deposit * multiplier was sent alongside.
     *     It should roll back if `exitSecretHashed` has previously been used by anyone to enter.
     *     It should be possible for a vehicle to enter "again" before it has exited from the 
     *       previous entry.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that when solved allows the operator to pay itself.
     * @return Whether the action was successful.
     * Emits LogRoadEntered with:
     *     The sender of the action.
     *     The address of the entry booth.
     *     The hashed secret used to deposit.
     *     The amount deposited by the vehicle.
     */
    function enterRoad(address entryBooth, bytes32 exitSecretHashed)
        whenNotPaused public payable returns (bool) {

        require(getRegulator().getVehicleType(msg.sender) != 0, "Vehicle is not registered");
        require(isTollBooth(entryBooth), "Entry booth is not a toll booth");
        require(msg.value >= (getDeposit() * getMultiplier(getRegulator().getVehicleType(msg.sender))), 
                "Send more than base deposit * multiplier");
        require(trips[exitSecretHashed].vehicle == 0x0, "Exit secret hash already used");

        trips[exitSecretHashed] = Trip(msg.sender, entryBooth, msg.value);

        emit LogRoadEntered(msg.sender, entryBooth, exitSecretHashed, msg.value);

        return true;
    }

    /**
     * Called by the exit booth.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the sender is not a toll booth.
     *     It should roll back when the vehicle is no longer a registered vehicle.
     *     It should roll back when the vehicle is no longer allowed on this road system.
     *     It should roll back if the exit is same as the entry.
     *     It should roll back if hashing the secret does not match a hashed one.
     *     It should roll back if the secret has already been reported on exit.
     * @param exitSecretClear The secret given by the vehicle as it passed by the exit booth. Passing a `0` secret is a valid input.
     * @return status:
     *   1: success, -> emits LogRoadExited with:
     *       The sender of the action.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     *   2: pending oracle -> emits LogPendingPayment with:
     *       The hashed secret corresponding to the vehicle trip.
     *       The entry booth of the vehicle trip.
     *       The exit booth of the vehicle trip.
     */
    function reportExitRoad(bytes32 exitSecretClear) 
        whenNotPaused
        public returns (uint) {

        bytes32 exitSecretHashed = hashSecret(exitSecretClear);
        address vehicle = trips[exitSecretHashed].vehicle;

        require(trips[exitSecretHashed].depositedWeis != 0 && 
                exitAttempts[exitSecretHashed] == false, 
                "Already exited with the exit secret hash or unknown hash");   
        require(isTollBooth(msg.sender), "Sender is not a toll booth");
        require(getRegulator().getVehicleType(vehicle) != 0, 
                "Vehicle is not registered anymore, not allowed on road anymore");
        require(msg.sender != trips[exitSecretHashed].entryBooth, 
                "Exit booth and entry booth are the same");
        require(vehicle != 0x0, "Clear secret does not match exit hash");

        address entryBooth = trips[exitSecretHashed].entryBooth;
        exitAttempts[exitSecretHashed] = true;
        if (getRoutePrice(entryBooth, msg.sender) == 0) {
            // Price is unknown, make a pending payment
            pendingPayments[entryBooth][msg.sender].add(exitSecretHashed);
            pendingPaymentsCount[entryBooth][msg.sender]++;
            emit LogPendingPayment(exitSecretHashed, entryBooth, msg.sender);
            return 2;
        }
        else {
            // Price is known, exit the vehicle
            exitVehicle(vehicle, msg.sender, exitSecretHashed);
            return 1;
        }

    }

    /**
     * Function that manages the action of exiting of the vehicle
     *
     * @param exitSecretHashed vehicle's exit secret hash
     * @param exitBooth the exit booth        
     */
    function exitVehicle(address vehicle, address exitBooth, bytes32 exitSecretHashed) 
        internal {

        uint deposit = trips[exitSecretHashed].depositedWeis;
        uint routePrice = getRoutePrice(trips[exitSecretHashed].entryBooth, exitBooth)
            .mul(getMultiplier(getRegulator().getVehicleType(vehicle))); // SafeMath mul
        uint refundWeis;
        uint finalFee;
        if (deposit > routePrice) {
            /*
             * SafeMath not necessary, cannot be smaller than 0, underflowing not possible
             */
            refundWeis = deposit - routePrice; 
            finalFee = routePrice;
        }
        else {
            finalFee = deposit;
        }

        /*
         * Exit, don't delete the trip, to detect later usage of the same hash. Instead,
         * set the depositedWeis to 0. This way, when entering the road again for the second 
         * time with the same hash, it is detected that vehicle address is filled, which is bad.
         * Also when exiting the road for the second time, the depositedWeis is 0, so 
         * it's good that that can be detected as well.
         */
        trips[exitSecretHashed].depositedWeis = 0;

        collectableFees = collectableFees.add(finalFee);  // SafeMath add, prevent overflows
        emit LogRoadExited(exitBooth, exitSecretHashed, finalFee, refundWeis);
        if (refundWeis > 0) {
            vehicle.transfer(refundWeis);
        }

    }

    /**
     * Can be called by anyone. In case more than 1 payment was pending when the oracle gave a price.
     *     It should roll back when the contract is in `true` paused state.
     *     It should roll back if booths are not really booths.
     *     It should roll back if there are fewer than `count` pending payments that are solvable.
     *     It should roll back if `count` is `0`.
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @param count the number of pending payments to clear for the exit booth.
     * @return Whether the action was successful.
     * Emits LogRoadExited as many times as count, each with:
     *       The address of the exit booth.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     */

    function clearSomePendingPayments(address entryBooth, address exitBooth, uint count)
        whenNotPaused public returns (bool) {

        require(isTollBooth(entryBooth), "Address passed is not an entry booth");
        require(isTollBooth(exitBooth), "Address passed is not an exit booth");
        require(count > 0, "Count must be greater than 0");

        /*
         * SafeMath not necessary in below for loop, i is bound between 0 and count,
         * no wrapping possible
         */

        uint16 clearedCount;
        bytes32 exitSecretHashed = pendingPayments[entryBooth][exitBooth].head;
        while (clearedCount < count && exitSecretHashed != 0x0) {
            if (isPendingPaymentSolvable(exitSecretHashed, entryBooth, exitBooth)) {
                /**
                 * Note that when called from setRoutePrice, there are two calls to 
                 * isPendingPaymentSolvable(). But when called from clearSomePendingPayments directly, 
                 * it should roll back in some circumstances. When called from setRoutePrice, it 
                 * should not roll back when no solvable pending payments are found. So from 
                 * setRoutePrice, a call to clearSomePendingPayments is not possible without first 
                 * checking whether the first pending payment is solvable. 
                 */
                exitVehicle(trips[exitSecretHashed].vehicle, exitBooth, exitSecretHashed);
                pendingPayments[entryBooth][exitBooth].poll();
                clearedCount++;
            }
            exitSecretHashed = pendingPayments[entryBooth][exitBooth].head;            
        }

        if (clearedCount == count) {
            pendingPaymentsCount[entryBooth][exitBooth] = pendingPaymentsCount[entryBooth][exitBooth] - clearedCount;
        }
        else {
            revert("Fewer solvable pending payments than count, or count given is 0");
        }

        return true;

    }

   /**
     * This function overrides the eponymous function of `RoutePriceHolderI`, to which it adds the following
     * functionality:
     *     - If relevant, it will release 1 pending payment for this route. As part of this payment
     *       release, it will emit the appropriate `LogRoadExited` event.
     *     - In the case where the next relevant pending payment, i.e. at the top of the FIFO, is not solvable,
     *       which can happen if, for instance the vehicle has had wrongly set values (such as type or multiplier)
     *       in the interim:
     *       - It should release 0 pending payment
     *       - It should not roll back the transaction
     *       - It should behave as if there had been no pending payment, apart from the higher gas consumed.
     *     - It should be possible to call it even when the contract is in the `true` paused state.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     * @return Whether the action was successful.
     * Emits LogRoadExited, if applicable, with:
     *       The address of the exit booth.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     */
    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis) 
        onlyWhenOwner public returns(bool) {

        // First execute the default behavior
        RoutePriceHolder.setRoutePrice(entryBooth, exitBooth, priceWeis);
        if (isPendingPaymentSolvable(pendingPayments[entryBooth][exitBooth].head, entryBooth, exitBooth)) {
            /**
                * Note: This function (setRoutePrice), should not roll back. Check before going into the 
                * clearSomePendingPayments function to prevent that roll back
                */
            clearSomePendingPayments(entryBooth, exitBooth, 1);
        }

        return true;

    }

    /**
     * This function checks the whether the vehicle that is found in the mapping entryBooth -> exitBooth, 
     * at the first slot, has the correct vehicle type and multiplier type (is solvable). It also checks
     * whether the route price is set.
     * @param exitSecretHashed The exit secret hash
     * @return Whether pending payment is solvable.
     */
    function isPendingPaymentSolvable(bytes32 exitSecretHashed, address entryBooth, address exitBooth) 
        internal view returns (bool) {

        if (getRoutePrice(entryBooth, exitBooth) == 0 || exitSecretHashed == 0x0) {
            return false;
        }
        else {
            uint vehicleType = getRegulator().getVehicleType(trips[exitSecretHashed].vehicle);
            if (vehicleType != 0 && getMultiplier(vehicleType) != 0) {
                return true;
            }
            else {
                return false;
            }
        }
        
    }

    /**
     * @return The amount that has been collected through successful payments. This is the current
     *   amount, it does not reflect historical fees. So this value goes back to zero after a call
     *   to `withdrawCollectedFees`.
     */
    function getCollectedFeesAmount() view public returns (uint) {

        return collectableFees;

    }

    /**
     * Called by the owner of the contract to withdraw all collected fees (not deposits) to date.
     *     It should roll back if any other address is calling this function.
     *     It should roll back if there is no fee to collect.
     *     It should roll back if the transfer failed.
     * @return success Whether the operation was successful.
     * Emits LogFeesCollected with:
     *     The sender of the action.
     *     The amount collected.
     */
    function withdrawCollectedFees()
        onlyWhenOwner public returns (bool) {

        require(collectableFees > 0, "No collectable fees");

        uint amountToWithDraw = collectableFees;
        collectableFees = 0;
        emit LogFeesCollected(owner, amountToWithDraw);
        msg.sender.transfer(amountToWithDraw);

        return true;

    }

    /**
     * This provides a single source of truth for the encoding algorithm.
     * It will be called:
     *     - by the vehicle prior to sending a deposit.
     *     - by the contract itself when submitted a clear password by a toll booth.
     * @param secret The secret to be hashed. Passing a `0` secret is a valid input.
     * @return the hashed secret.
     */
    function hashSecret(bytes32 secret) view public returns (bytes32) {

        return keccak256(secret); // Don't use the abi.encodePacked function, too much gas!
        
    }

    /**
     * @param exitSecretHashed The hashed secret used by the vehicle when entering the road.
     * @return The information pertaining to the entry of the vehicle.
     *     vehicle: the address of the vehicle that entered the system.
     *     entryBooth: the address of the booth the vehicle entered at.
     *     depositedWeis: how much the vehicle deposited when entering.
     * After the vehicle has exited, and the operator has been paid, `depositedWeis` should be returned as `0`.
     *     The `depositedWeis` should remain unchanged while there is a corresponding pending exit.
     * If no vehicles had ever entered with this hash, all values should be returned as `0`.
     */
    function getVehicleEntry(bytes32 exitSecretHashed) 
        view public returns(address, address, uint) {

        return (trips[exitSecretHashed].vehicle,
            trips[exitSecretHashed].entryBooth,
            trips[exitSecretHashed].depositedWeis
        );

    }

}
