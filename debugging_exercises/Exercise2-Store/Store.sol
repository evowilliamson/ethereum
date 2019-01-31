pragma solidity ^0.4.11;

interface WarehouseI {
    function setDeliveryAddress(string where) external;
    function ship(uint id, address customer) external returns (bool handled);
}

event ContractCreated(address _wallet, address _warehouse);
event ItemPurchased(address sender, value);

contract Store {
    address public wallet;
    WarehouseI public warehouse;

    function Store(address _wallet, address _warehouse) public {
        require(_wallet != 0x0);
        require(_warehouse != 0x0);
        emit ContractCreated(_wallet, _warehouse);
        wallet = _wallet;
        warehouse = WarehouseI(_warehouse);
    }

    function purchase(uint id) public payable returns (bool success) {
        if (warehouse.ship(id, msg.sender) && wallet.send(msg.value)) {
            emit ItemPurchased(msg.sender, msg.value);
            return true;
        }
        else {
            revert();
        }
    }

}    
