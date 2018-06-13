pragma solidity ^0.4.24;


/*
Splitter Contract. Anybody can send money to the contract. The money 
that is sent to the contract is split over the available beneficiary. 
Beneficiary can be added on-the-fly. In order for anybody to send money, at 
least one beneficiary should exist. 
*/
contract Splitter {

    /**
     * Type definitition of a Beneficiary, an entity that is the recipient of
     * 1/nth part of the value of a splitter contract. After a beneficiary adds him/herself
     * to this contract, he/she can later send money and be a Beneficiary 
     * him/herself.
     */
    struct Beneficiary {
        address id;
        string name;
        uint amount;
    }

    Beneficiary[] beneficiaries;
    /**
     * When the number of beneficiaries is big, we might need to consider
     * using a mapping, as looping over de available beneficiaries by checking
     * whether a beneficiary already exists might be costly. A mapping would
     * be cheaper in that regard.
     ** /
    
    constructor() public {
    }

    /**
     * This function will add a beneficiary to the array of beneficiaries. 
     * If the beneficiary is already present in the list, then the
     * transaction will be reverted 
     **/
    function addBeneficiary(address id, string name) public {
        if (isAlreadyBeneficiary(id)) {
            revert("Already Beneficiary");
        }
        beneficiaries.push(Beneficiary(id, name, 0));
    }
    
    /**
     * This function calculates the total amount of money of all 
     * beneficiaries
     **/
    function getTotalBalance() public view returns (uint totalBalance) {
        
        uint tempBalance = 0;
        for (uint i = 0; i < beneficiaries.length; i++) {
            tempBalance += beneficiaries[i].amount;
        }
        return tempBalance;
        
    }

    /**
     * This function returns the names of all the beneficiaries seperated
     * by a comma
     **/
    function getBeneficiaryNames() public view returns (string names) {
        
        string memory temp_names = "";
        for (uint i = 0; i < beneficiaries.length; i++) {
            temp_names = strConcat(temp_names, beneficiaries[i].name);
            if ((i + 1) != beneficiaries.length) {
                temp_names = strConcat(temp_names, ",");
            }
        }
        return temp_names;

    }

    /**
     * This function returns a tuple of three arrays that represent
     * the addresses, the names and the amounts of the beneficiaries
     **/
    function getBeneficiaryInfo() public view returns (address[], bytes32[], uint[]) {

        uint[] memory amounts = new uint[](beneficiaries.length);        
        bytes32[] memory names = new bytes32[](beneficiaries.length);        
        address[] memory addresses = new address[](beneficiaries.length);
        for (uint i = 0; i < beneficiaries.length; i++) {
            names[i] = stringToBytes32(beneficiaries[i].name);
            amounts[i] = beneficiaries[i].amount;
            addresses[i] = beneficiaries[i].id;
        }
        
        return (addresses, names, amounts);

    }

    function split() public payable {
        assert(msg.value > 0);
        uint amountPerBeneficiary = msg.value / beneficiaries.length;
        for (uint i = 0; i < beneficiaries.length; i++) {
            beneficiaries[i].amount += amountPerBeneficiary;
        }
        
    }

    function isAlreadyBeneficiary(address id) private view returns (bool) {
    /**
     * This private function checks to see whether a beneficiary already 
     * exists
     **/
        for (uint i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i].id == id) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * This function concatenates two strings 
     **/
    function strConcat(string _a, string _b) internal pure returns (string) {
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        string memory string_concat = new string(_ba.length + _bb.length);
        bytes memory bytes_concat = bytes(string_concat);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) bytes_concat[k++] = _ba[i];
        for (i = 0; i < _bb.length; i++) bytes_concat[k++] = _bb[i];
        return string(bytes_concat);
    }    

    /**
     * Function that converts a string to a bytes32 data type 
     **/
    function stringToBytes32(string memory source) internal pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
    
        assembly {
            result := mload(add(source, 32))
        }
    }

}