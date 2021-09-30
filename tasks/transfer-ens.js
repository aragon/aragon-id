/**
 * WARNING: this script should be run with extreme caution because
 * it changes ownership of aragonid.eth temporary to allow transfering
 * of DAO ENS name to a new address
 *
 * This script must be run by the owner of root ENS domain (eth)
 * Since Aragon does not own 'eth' in Ethereum mainnet, this script will
 * not work there
 *
 * Usage:
 *    npx hardhat transfer-ens --ens {ensRegistry} --dao {daoName} --address {newAddress} --network {network}
 * where
 *    - ens is the address of ens registry
 *    - dao is the dao name, i.e. abc.aragonid.eth, use abc
 *    - address is the new address to transfer to
 *    - network is one of rinkeby, mumbai, matic as setup in ~/.aragon/<network>_key.json
 *
 * For example, on matic:
 *    npx hardhat transfer-ens --ens 0x3c70a0190d09f34519e6e218364451add21b7d4b --dao abc --address 0x123... --network matic
 *
 * To print the help message:
 *    npx hardhat help transfer-ens
 */

const ARAGON_ID = "aragonid";
const ENS_ABI = [
  "function owner(bytes32 node) public view returns(address)",
  "function setSubnodeOwner(bytes32,bytes32,address)",
  "function resolver(bytes32 _node) public view returns (address)",
];
const RESOLVER_ABI = ["function setAddr(bytes32 node, address addr)"];

const log = console.log;
function logError(...args) {
  console.error("\x1b[31m%s\x1b[0m", ...args);
}

task("transfer-ens", "Transfer a DAO name to a new address")
  .addParam("ens", "The ENS registry address")
  .addParam("dao", "The DAO name")
  .addParam("address", "The new address to transfer DAO name to")
  .setAction(
    async (
      { ens: ensRegistry, dao, address: newAddress },
      { ethers, network }
    ) => {
      const keccak256 = ethers.utils.id;
      const namehash = ethers.utils.namehash;
      const aragonIdName = `${ARAGON_ID}.eth`;
      let savedAragonIdOwner;
      let ens;

      async function changeOwner(ens, topDomain, label, owner) {
        try {
          const tx = await ens.setSubnodeOwner(
            namehash(topDomain),
            keccak256(label),
            owner
          );
          log(`Changing owner of ${label}.${topDomain} tx ${tx.hash}`);
          await tx.wait();
          log(` Changed owner of ${label}.${topDomain} to ${owner}`);
        } catch (err) {
          logError(
            `failed to changed ${label}.${topDomain} to ${owner}, 
            make sure you are owner of eth root domain, ${err.message}`
          );
          throw err;
        }
      }

      async function changeAddress(ens, domain, newAddr, signer) {
        const nodeHash = namehash(domain);
        const resolverAddress = ens.resolver(nodeHash);
        const resolver = new ethers.Contract(
          resolverAddress,
          RESOLVER_ABI,
          signer
        );
        const tx = await resolver.setAddr(nodeHash, newAddr);
        log(`Changing address of ${domain} tx ${tx.hash}`);
        await tx.wait();
        log(` Changed address of ${domain} to ${newAddr}`);
        return tx;
      }

      const isValidAddress = (addr) =>
        ethers.utils.isAddress(addr) && addr !== ethers.constants.AddressZero;

      if (!isValidAddress(newAddress)) {
        logError("Invalid address", newAddress);
        return;
      }

      if (network.name === "hardhat") {
        logError("missing mandatory argument --network");
        return;
      }

      try {
        const [signer] = await ethers.getSigners();
        ens = new ethers.Contract(ensRegistry, ENS_ABI, signer);
        const aragonIdOwner = await ens.owner(namehash(aragonIdName));
        log(`current ${aragonIdName} owner: ${aragonIdOwner}`);

        // change aragonid.eth owner to us so we can change subdomain
        await changeOwner(ens, "eth", ARAGON_ID, signer.address);

        // saved aragonid.eth owner to revert the change at the end of this script
        savedAragonIdOwner = aragonIdOwner;

        // change subdomain owner so we can change address
        await changeOwner(ens, `${aragonIdName}`, dao, signer.address);

        // change subdomain address to newAddress
        await changeAddress(ens, `${dao}.${aragonIdName}`, newAddress, signer);

        // transfer subdomain to newAddress
        await changeOwner(ens, `${aragonIdName}`, dao, newAddress);
      } catch (err) {
        logError(err.message);
      }

      // revert changes to aragonid.eth
      if (savedAragonIdOwner) {
        try {
          await changeOwner(ens, "eth", ARAGON_ID, savedAragonIdOwner);
        } catch (err) {
          logError(`failed to change aragonId back: ${err.message}`);
        }
      }
      log("Script ran successfully");
    }
  );
