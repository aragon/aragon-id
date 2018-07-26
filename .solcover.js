module.exports = {
    norpc: true,
    testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    skipFiles: [
        'IFIFSResolvingRegistrar.sol',
        'ens/IPublicResolver.sol',
        'interface/ApproveAndCallReceiver.sol',
        'misc/Migrations.sol',
        'zeppelin/ERC20.sol',
        'zeppelin/ERC20Basic.sol',
        'zeppelin/Ownable.sol',
    ],
    copyNodeModules: true,
}
