module.exports.errTypes = {
    revert            : "revert",
    outOfGas          : "out of gas",
    invalidJump       : "invalid JUMP",
    invalidOpcode     : "invalid opcode",
    stackOverflow     : "stack overflow",
    stackUnderflow    : "stack underflow",
    staticStateChange : "static state change"
}

const VM_PREFIX = "VM Exception while processing transaction: ";
const ATTEMPTED_PREFIX = "Attempting to run transaction which calls a contract function, but recipient address";

module.exports.tryCatch = async function(promise, errType) {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        assert(error, "Expected an error but did not get one");
        assert(error.message.startsWith(VM_PREFIX + errType) || error.message.startsWith(ATTEMPTED_PREFIX), "Unexpected error: " + error.message + "' instead");
    }
};

