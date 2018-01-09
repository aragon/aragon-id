/* global assert web3 */
import { skipTime } from "./timer"

const DAY_SECONDS = 24 * 60 * 60

module.exports = {
    setupEns: async (account, ensArtifacts, hashes) => {
        /**************************************************
         *                                                *
         * Replicate the currently deployed ENS instance  *
         * and register 'name.eth'                        *
         *                                                *
         **************************************************/

        const { Deed, ENS, HashRegistrarSimplified } = ensArtifacts
        const {
            domainNamehash,
            domainRegistrarHash,
            rootNamehash,
            tldNamehash,
            tldRegistrarHash,
        } = hashes

        // Setup new ENS instance
        const ens = await ENS.new()

        // Setup .eth TLD
        const registrar = await HashRegistrarSimplified.new(ens.address, tldNamehash, 0)
        await ens.setSubnodeOwner(rootNamehash, tldRegistrarHash, registrar.address)

        // Skip 8 weeks so registrar is fully active and all domains are available
        skipTime(8 * 7 * DAY_SECONDS)

        // Setup new .eth domain
        await registrar.startAuction(domainRegistrarHash, { gas: 100000 })
        const bid = await registrar.shaBid.call(
            domainRegistrarHash,
            account,
            web3.toWei(1, "ether"),
            web3.sha3("secret")
        )
        await registrar.newBid(bid, {
            from: account,
            value: web3.toWei(2, "ether"),
            gas: 1000000
        })
        // Skip three days and reveal
        skipTime(3 * DAY_SECONDS)
        await registrar.unsealBid(domainRegistrarHash, web3.toWei(1, "ether"), web3.sha3("secret"), {
            from: account,
            gas: 500000
        })
        // Skip two days and finalize
        skipTime(2 * DAY_SECONDS)
        await registrar.finalizeAuction(domainRegistrarHash, { from: account, gas: 500000 })

        // We should be the owners of 'name.eth' now...
        const [, deedAddress] = await registrar.entries.call(domainRegistrarHash)
        const deed = Deed.at(deedAddress)
        assert.equal(account, await deed.owner.call())
        assert.equal(account, await ens.owner.call(domainNamehash))

        return { ens, registrar }
    }
}
