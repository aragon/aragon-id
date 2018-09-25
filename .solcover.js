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
        'test/ens/ENS.sol',
        'test/ens/FIFSRegistrar.sol',
        'test/ens/PublicResolver.sol',
        'test/ens/Registrar.sol',
        'test/mocks/MockAcceptingTransferRegistrar.sol',
        'test/mocks/MockApproveAndCallERC20.sol',
        'test/mocks/MockResolver.sol',
    ]
}
