module.exports = {
    norpc: true,
    testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    skipFiles: [
        'Migrations.sol',
        'ens/AbstractENS.sol',
        'ens/ResolverInterface.sol',
        'interface/ApproveAndCallReceiver.sol',
        'zeppelin/ERC20.sol',
        'zeppelin/ERC20Basic.sol',
        'zeppelin/Ownable.sol',
    ],
    copyNodeModules: true,
}
