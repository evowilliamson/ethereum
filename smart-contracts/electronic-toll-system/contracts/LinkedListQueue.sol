pragma solidity ^0.4.24;

/**
 * Library that implements a linked-list queue (FIFO) of bytes32 elements. 
 * Terminology taken from: https://docs.oracle.com/javase/8/docs/api/java/util/Queue.html#add-E-
 */
library LinkedListQueue {

    struct Meta {
        
        mapping (bytes32 => bytes32) nodes;
        bytes32 head;
        bytes32 tail;

    }   

    /**
     * Adding an element to the tail of the queue
     */
    function add(Meta storage queue, bytes32 entry) internal {

        if (queue.head == 0x0) {
            queue.head = entry;
        }
        else {
            queue.nodes[queue.tail] = entry;
        }
        queue.tail = entry;

    }

    /**
     * Return and remove an element from the head of the queue
     */
    function poll(Meta storage queue) public returns (bytes32) {
        
        bytes32 element = queue.head;
        queue.head = queue.nodes[queue.head];
        /**
          * Clear the next pointer, to not leave state. Future additions might use the same element
          */
        queue.nodes[element] = 0x0; 
        /**
         * Set tail in case head was set to 0x0
         */
        if (queue.head == 0x0) {
            queue.tail = 0x0;
        }
        return element;
        
    }

    function remove(Meta storage self, bytes32 element) public {
        
        bytes32 r = self.head;
        bytes32 previous = self.head;
        while (r != 0x0 && r != element) {
            previous = r;
            r = self.nodes[r];
        }

        if (r == 0x0) {
            return;
        }

        if (r == self.head) {
            self.head = self.nodes[r];
        }
        else {
            self.nodes[previous] = self.nodes[r];
        }

        if (self.nodes[r] == 0x0) {
            self.tail = previous;
        }

    }    

    /**
     * Inserts an element at the head
     */
    function insertAtHead(Meta storage self, bytes32 element) public {

        self.nodes[element] = self.head;
        self.head = element;

    }

    /**
     * Gets the head of the list, without removing the element
     */
    function peek(Meta storage self) public view returns (bytes32) {
        
        return self.head;
        
    }

    /**
     * Gets the tail of the list, without removing the element
     */
    function peekLast(Meta storage self) public view returns (bytes32) {
        
        return self.tail;

    }
    

    /**
     * Gets the element after the passed element, without removing the element
     */
    function peekAfter(Meta storage self, bytes32 element) public view returns (bytes32) {

        if (self.head == 0x0) {
            return 0x0;
        }
        else if (element != 0x0) {
            return self.nodes[element];
        }
        else {
            return self.head;
        }
        
    }

    /**
     * Due to gas-reasons, count management is not there, it's also not necessary. 
     * So getting the count is going to be expensive. Better to maintain it at the caller
     */
    function getCount(Meta storage self) public view returns (uint) {
        
        uint count = 0;
        bytes32 r = self.head;
        while (r != 0x0) {
            r = self.nodes[r];
            count++;
        }

        return count;
        
    }


    /**
     * Clear the head and the tail of the queue. Like erasing the queue
     */
    function clear(Meta storage self) public {

        self.head = 0x0;
        self.tail = 0x0;

    }

}    
