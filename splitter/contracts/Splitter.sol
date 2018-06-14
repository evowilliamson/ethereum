pragma solidity ^0.4.24;

/*
Splitter Contract. Anybody can send ether to the contract. Beneficiaries can
flexibly be added on-the-fly. At the moment that a beneficiary decides to withdraw, 
he/she will receive 1/nth of the total amount of ether available in the 
contract, where n being the number of beneficiaries. After that the beneficiary
has withdrawn the ether, he/she will be removed from the list of beneficiaries. After
all money has been withdrawn from the contract, the contract can be reused again by 
somebody sending money to it again.
*/
contract Splitter {

    /**
     * Only the owner can add new beneficiaries
     **/
    address owner;
    
    /**
     * Type definitition of a Beneficiary, an entity that is the recipient of
     * 1/nth part of the value of a splitter contract
     */
    struct Beneficiary {
        address id;
        string name;
    }

    /** Maintain a list of beneficiaries. A mapping would probably not be 
     * sufficient, as after a beneficiary has withdrawn ether from a contract
     * (and thus removed from the list of beneficiaries), he/she could decide
     * to register him/herself again to the still existing contract. With a
     * mapping you would probably have to implement a soft-delete. Of course
     * an array is more costly than using a mapping.
     **/
    Beneficiary[] beneficiaries;
    
    constructor() public {
        owner = msg.sender;
    }

    /**
     * This function will add a beneficiary to the array of beneficiaries. 
     * If the beneficiary is already present in the list, then the
     * transaction will be reverted. Only the owner can add new beneficiaries.
     **/
    function addBeneficiary(address beneficiary, string name) public {
        if (msg.sender != owner) {
            revert("Only owner can add beneficiaries");
        }
        if (isPresent(beneficiary)) {
            revert("Beneficiary already exists");
        }
        beneficiaries.push(Beneficiary(beneficiary, name));
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
     * Function that removes beneficiary by the index
     **/
    function removeBenificiaryByIndex(uint index) private {
        if (index >= beneficiaries.length) return;

        for (uint i = index; i < beneficiaries.length - 1; i++){
            beneficiaries[i] = beneficiaries[i + 1];
        }
        delete beneficiaries[beneficiaries.length - 1];
        beneficiaries.length--;
    }

    /**
     * This function returns a tuple of three arrays that represent
     * the addresses, the names and the amounts of the beneficiaries
     **/
    function getBeneficiaryInfo() public view returns (address[], bytes32[]) {

        bytes32[] memory names = new bytes32[](beneficiaries.length);        
        address[] memory addresses = new address[](beneficiaries.length);
        for (uint i = 0; i < beneficiaries.length; i++) {
            names[i] = stringToBytes32(beneficiaries[i].name);
            addresses[i] = beneficiaries[i].id;
        }
        
        return (addresses, names);

    }

    /**
     * Fallback function that a donater will call to send money to be splitted
     * over the available beneficiaries. Money can be sent at any time, before
     * or after beneficiaries have been added. More people can send money to 
     * the contract at any time. There is no further logic in this method
     * in order to not exceed the stipend gas limit.
     **/
    function() public payable {
    }
    
    /**
     * This function, called by a beneficiary, will withdraw the money
     * from the balance
     **/
    function withdraw() public payable {
        uint8 index = getIndex(msg.sender);
        uint8 numberOfBenefiaries = uint8(beneficiaries.length);
        if (index == uint8(-1)) {
            revert("Not a beneficiary or no beneficiaries");
        }
        // Remove the beneficiary before the transfer is done!
        removeBenificiaryByIndex(index);
        /** Note that numberOfBenefiaries cannot be 0 here, so div is ok probably.
         * Of course a beneficiary might do two withdraw at the same time...
         **/
        uint toBeTransferred = address(this).balance / numberOfBenefiaries;
        if (toBeTransferred == 0)
            revert("No funds available");
       msg.sender.transfer(toBeTransferred);

    }

    /**
     * This private function retrieves the index of the beneficiary that
     * is present in the list of beneficiaries. If not present, return -1
     **/
    function getIndex(address id) private view returns (uint8) {
        for (uint8 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i].id == id) {
                return i;
            }
        }
        return uint8(-1);
    }

    /**
     * This private function checks to see whether a beneficiary exists
     **/
    function isPresent(address id) private view returns (bool) {
        uint8 index = getIndex(id);
        if (index == uint8(-1)) {
            return false;
        }
        return true;
    }

    /** Although not needed, handy for testing in Remix
     **/
    function getBalance() public view returns (uint balance) {
        return address(this).balance;
        
    }

    /**
     * This function concatenates two strings 
     **/
    function strConcat(string firstString, string secondString) private pure returns (string) {
        bytes memory firstStringMem = bytes(firstString);
        bytes memory secondStringMem = bytes(secondString);
        string memory StringConcat = new string(firstStringMem.length + secondStringMem.length);
        bytes memory bytes_concat = bytes(StringConcat);
        uint k = 0;
        for (uint i = 0; i < firstStringMem.length; i++) bytes_concat[k++] = firstStringMem[i];
        for (i = 0; i < secondStringMem.length; i++) bytes_concat[k++] = secondStringMem[i];
        return string(bytes_concat);
    }    

    /**
     * Function that converts a string to a bytes32 data type 
     **/
    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
    
        assembly {
            result := mload(add(source, 32))
        }
    }

}
