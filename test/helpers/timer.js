/* global web3 */

function skipTime(seconds) {
    web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: new Date().getTime(),
    })

    // See: https://github.com/ethereumjs/testrpc/issues/336
    forceMine()
}

function forceMine() {
    web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
    })
}

module.exports = {
    forceMine,
    skipTime,
}
