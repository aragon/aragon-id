module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os'],
    skipFiles: [
        'IFIFSResolvingRegistrar.sol',
        'ens/IPublicResolver.sol',
        'interface/ApproveAndCallReceiver.sol',
        'misc/Migrations.sol',
        'zeppelin/ERC20.sol',
        'zeppelin/ERC20Basic.sol',
        'zeppelin/Ownable.sol',
        'test/',
    ]
}
