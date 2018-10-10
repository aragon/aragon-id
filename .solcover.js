module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os'],
    skipFiles: [
        'IFIFSResolvingRegistrar.sol',
        'ens/IPublicResolver.sol',
        'interface/ApproveAndCallReceiver.sol',
        'misc/Migrations.sol',
        'zeppelin/',
        'test/',
    ]
}
