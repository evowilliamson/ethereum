pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/LinkedListQueue.sol";

contract TestLinkedListQueue {

    using LinkedListQueue for LinkedListQueue.Meta;
    LinkedListQueue.Meta private self;

    function beforeEach() public {

        self.clear();

    }

    function testNoElements() public {

        bytes32 expected = bytes32(0);
        bytes32 result = self.poll();
        Assert.equal(result, expected, "not 0");

    }

    function testAddPoll() public {

        bytes32 first = bytes32(1);
        bytes32 second = bytes32(2);
        self.add(first);
        self.add(second);
        uint elementCount = 2;
        Assert.equal(self.getCount(), elementCount, "not 2 elements");
        bytes32 result;
        result = self.poll();
        Assert.equal(result, first, "not 1");
        elementCount = 1;
        result = self.poll();
        Assert.equal(result, second, "not 2");
        elementCount = 0;
        Assert.equal(self.getCount(), elementCount, "not 0 element");
        self.add(first);
        elementCount = 1;
        Assert.equal(self.getCount(), elementCount, "not 1 element");
        bytes32 peeked = self.peek();
        Assert.equal(peeked, first, "not 1");
        peeked = self.peekLast();
        Assert.equal(peeked, first, "not 1");

    }

    function testAddPollMany() public {

        uint i = 0;
        uint n = 50;
        for (i = 1; i <= n; i++) {
            self.add(bytes32(i));
        }
        bytes32 result;
        uint elementCount = n;
        Assert.equal(self.getCount(), elementCount, "not n elements");
        for (i = 1; i <= n; i++) {
            result = self.poll();
        }
        elementCount = 0;
        Assert.equal(self.getCount(), elementCount, "not 0 elements");
        bytes32 polledExpected = bytes32(n);
        Assert.equal(result, polledExpected, "not 50");
        elementCount = 0;
        Assert.equal(self.getCount(), elementCount, "not 0 elements");

    }

    function testAddPollManyAndThenAgainAddPollOnce() public {

        uint i = 0;
        uint n = 50;
        for (i = 1; i <= n; i++) {
            self.add(bytes32(i));
        }
        bytes32 result;
        for (i = 1; i <= n; i++) {
            result = self.poll();
        }

        bytes32 first = bytes32(1);
        self.add(first);
        result = self.poll();
        Assert.equal(result, first, "not 1");
        uint elementCount = 0;
        Assert.equal(self.getCount(), elementCount, "not 0 elements");

    }

    function testAddPeeks() public {

        bytes32 first = bytes32(1);
        self.add(first);
        bytes32 peeked = self.peek();
        peeked = self.peek();        
        peeked = self.peek();        
        uint elementCount = 1;
        Assert.equal(peeked, first, "not 1");
        Assert.equal(self.getCount(), elementCount, "not 1");

    }

    function testInsertAtHead() public {

        bytes32 second = bytes32(2);
        bytes32 third = bytes32(3);
        self.add(second);
        self.add(third);

        bytes32 first = bytes32(1);
        self.insertAtHead(first);
        uint elementCount = 3;
        Assert.equal(self.getCount(), elementCount, "not 3");
        bytes32 peeked = self.peek();
        Assert.equal(peeked, first, "not 1");
        peeked = self.peekAfter(first);
        Assert.equal(peeked, second, "not 2");
 
    }

    function testAddScenario() public {

        bytes32 zero = bytes32(0);
        bytes32 first = bytes32(1);
        bytes32 second = bytes32(2);
        bytes32 third = bytes32(3);

        self.add(first);
        self.add(second);
        self.add(third);

        uint elementCount = 3;
        Assert.equal(self.getCount(), elementCount, "not 3");

        bytes32 peeked = self.peekAfter(zero);
        Assert.equal(peeked, first, "not 1");
        peeked = self.peekAfter(first);
        Assert.equal(peeked, second, "not 2");        
        peeked = self.peekAfter(second);
        Assert.equal(peeked, third, "not 3");        
        peeked = self.peekAfter(third);
        Assert.equal(peeked, zero, "not 0");        

        bytes32 poppedFirst = self.poll();
        Assert.equal(poppedFirst, first, "not 1");
        bytes32 poppedSecond = self.poll();
        Assert.equal(poppedSecond, second, "not 2");
        bytes32 poppedThird = self.poll();
        Assert.equal(poppedThird, third, "not 3");
        bytes32 head = self.peek();
        Assert.equal(head, zero, "not zero");
        bytes32 tail = self.peekLast();
        Assert.equal(tail, zero, "not zero");

        self.add(first);
        self.add(second);
        self.add(third);

        poppedFirst = self.poll();
        Assert.equal(poppedFirst, first, "not 1");
        poppedSecond = self.poll();
        Assert.equal(poppedSecond, second, "not 2");
        poppedThird = self.poll();
        Assert.equal(poppedThird, third, "not 3");
        head = self.peek();
        Assert.equal(head, zero, "not zero");
        tail = self.peekLast();
        Assert.equal(tail, zero, "not zero");

        elementCount = 0;
        Assert.equal(self.getCount(), elementCount, "not 0");

    }

    function testAddRemove() public {

        bytes32 first = bytes32(1);
        bytes32 second = bytes32(2);
        bytes32 third = bytes32(3);
        bytes32 fourth = bytes32(4);
        bytes32 fifth = bytes32(5);
        bytes32 sixth = bytes32(6);

        self.add(first);
        self.add(second);
        self.add(third);
        self.add(fourth);
        self.add(fifth);
        self.add(sixth);
        
        uint elementCount = 6;
        Assert.equal(self.getCount(), elementCount, "not 6");


        self.remove(first);
        elementCount = 5;
        Assert.equal(self.getCount(), elementCount, "not 5");

        bytes32 peeked = self.peek();
        Assert.equal(peeked, second, "not 2");
        peeked = self.peekAfter(peeked);        
        Assert.equal(peeked, third, "not 3");
        peeked = self.peekLast();        
        Assert.equal(peeked, sixth, "not 6");

        self.remove(third);
        elementCount = 4;
        Assert.equal(self.getCount(), elementCount, "not 4");
        peeked = self.peekAfter(second);        
        Assert.equal(peeked, fourth, "not 4");

        self.remove(sixth);
        elementCount = 3;
        Assert.equal(self.getCount(), elementCount, "not 3");
        peeked = self.peekLast();        
        Assert.equal(peeked, fifth, "not 5");

        self.remove(second);
        self.remove(fourth);
        self.remove(fifth);
        elementCount = 0;
        Assert.equal(self.getCount(), elementCount, "not 0");

    }

}
