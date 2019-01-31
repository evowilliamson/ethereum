pragma solidity ^0.4.24;

import "./interfaces/RoutePriceHolderI.sol";
import "./TollBoothHolder.sol";

contract RoutePriceHolder is RoutePriceHolderI, TollBoothHolder {

    /**
	 * This could also have been done by hashing both toll booths and use the hash
	 * as a key to the route price. But that is less gas optimized. According to the yellow paper,
	 * appendix H:  Gsha3 30 Paid for each SHA3 operation.
     *              Gsha3word 6 Paid for each word (rounded up) for input data to a SHA3 operation
     * After testing it seems a lot more expensive to use the hashed approach. Check the next gist: 
	 * https://gist.github.com/51dd22941b2ddee2ee068fe217bd6fee, so use a mapping to a mapping to a uint
	 */
    mapping(address => mapping(address => uint)) routeToPrices;

    /**
     * Event emitted when a new price has been set on a route.
     * @param sender The account that ran the action.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     */
    event LogRoutePriceSet(address indexed sender, address indexed entryBooth,
        address indexed exitBooth, uint priceWeis);

    constructor() public {
    }

    /**
     * Called by the owner of the RoutePriceHolder.
     *     It can be used to update the price of a route, including to zero.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if one of the booths is not a registered booth.
     *     It should roll back if entry and exit booths are the same.
     *     It should roll back if either booth is a 0x address.
     *     It should roll back if there is no change in price.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     * @return Whether the action was successful.
     * Emits LogPriceSet with:
     *     The sender of the action.
     *     The address of the entry booth.
     *     The address of the exit booth.
     *     The new price of the route.
     */
    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis)
        onlyWhenOwner public returns (bool success) {

        require(isTollBooth(entryBooth), "Entry booth is not registered");
        require(isTollBooth(exitBooth), "Exit booth is not registered");
        require(entryBooth != exitBooth, "Entry and exit booth cannot be the same");
        require(entryBooth != 0x0, "Entry booth cannot be 0x address");
        require(exitBooth != 0x0,  "Entry booth cannot be 0x address");
        require(routeToPrices[entryBooth][exitBooth] != priceWeis, "No change in price");

        routeToPrices[entryBooth][exitBooth] = priceWeis;

        emit LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);

        return true;

    }

    /**
     * @param entryBooth The address of the entry booth of the route. It should accept a 0 address.
     * @param exitBooth The address of the exit booth of the route. It should accept a 0 address.
     * @return priceWeis The price in weis of the route.
     *     If the route is not known or if any address is not a booth it should return 0.
     *     If the route is invalid, it should return 0.
     */
    function getRoutePrice(address entryBooth, address exitBooth)
        view public returns (uint)	{

        return routeToPrices[entryBooth][exitBooth];

    }

}
