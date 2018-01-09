/* global artifacts assert beforeEach contract it web3 */
import { hash as namehash } from "eth-ens-namehash"
import { assertRevert } from "./helpers/assertThrow"
import { setupEns } from "./helpers/setupEns"

const Deed = artifacts.require("Deed")
const ENS = artifacts.require("ENS")
const HashRegistrarSimplified = artifacts.require("Registrar")
const MockAcceptingTransferRegistrar = artifacts.require("MockAcceptingTransferRegistrar")

const DeedHolder = artifacts.require("DeedHolder")

contract("DeedHolder", (accounts) => {
    const OWNER = accounts[0]
    const NEW_HOLDER = accounts[1]

    // ENS related constants
    const TLD = "eth"
    const DOMAIN = "name"
    const ROOT_NAMEHASH = namehash("")
    const TLD_NAMEHASH = namehash(TLD)
    const DOMAIN_NAMEHASH = namehash(`${DOMAIN}.${TLD}`)
    const TLD_REGISTRAR_LABEL = web3.sha3(TLD)
    const DOMAIN_REGISTRAR_LABEL = web3.sha3(DOMAIN)

    let ens
    let registrar
    let deedHolder

    beforeEach(async () => {
        const contracts = await setupEns(
            OWNER,
            { Deed, ENS, HashRegistrarSimplified },
            {
                domainNamehash: DOMAIN_NAMEHASH,
                domainRegistrarHash: DOMAIN_REGISTRAR_LABEL,
                rootNamehash: ROOT_NAMEHASH,
                tldNamehash: TLD_NAMEHASH,
                tldRegistrarHash: TLD_REGISTRAR_LABEL,
            }
        )
        ens = contracts.ens
        registrar = contracts.registrar

        // Setup deeds holder
        deedHolder = await DeedHolder.new(ens.address, TLD_NAMEHASH)

        // Transfer ownership of the deed to the deed holder
        await registrar.transfer(DOMAIN_REGISTRAR_LABEL, deedHolder.address)
    })

    it("can take ownership of a deed", async () => {
        const [, deedAddress] = await registrar.entries.call(DOMAIN_REGISTRAR_LABEL)
        const deed = Deed.at(deedAddress)

        assert.equal(deedHolder.address, await deed.owner.call())

        // The deed holder still declares the original owner as the owner of the deed
        assert.equal(OWNER, await deedHolder.owner.call(DOMAIN_REGISTRAR_LABEL))
    })

    it("takes ownership of the ENS node associated with the held deed", async () => {
        assert.equal(deedHolder.address, await ens.owner.call(DOMAIN_NAMEHASH))
    })

    it("reports the correct owner after initial transfer of ownership", async () => {
        assert.equal(OWNER, await deedHolder.owner.call(DOMAIN_REGISTRAR_LABEL))
    })

    it("allows an owner to transfer a held deed", async () => {
        const [, deedAddress] = await registrar.entries.call(DOMAIN_REGISTRAR_LABEL)
        const deed = Deed.at(deedAddress)

        await deedHolder.transfer(DOMAIN_REGISTRAR_LABEL, NEW_HOLDER)
        assert.equal(NEW_HOLDER, await deedHolder.owner.call(DOMAIN_REGISTRAR_LABEL))

        // Make sure it doesn't transfer the actual deed
        assert.equal(deedHolder.address, await deed.owner.call())
    })

    it("allows the owner to claim back a deed after the registrar upgrades", async () => {
        const [, deedAddress] = await registrar.entries.call(DOMAIN_REGISTRAR_LABEL)
        const deed = Deed.at(deedAddress)

        // Setup new .eth TLD registrar; this should take ownership of '.eth'
        const newRegistrar = await HashRegistrarSimplified.new(ens.address, TLD_NAMEHASH, 0)
        await ens.setSubnodeOwner(ROOT_NAMEHASH, TLD_REGISTRAR_LABEL, newRegistrar.address)
        assert.equal(newRegistrar.address, await ens.owner.call(TLD_NAMEHASH))

        // Claim the deed back
        await deedHolder.claim(DOMAIN_REGISTRAR_LABEL)
        assert.equal(OWNER, await deed.owner.call())
        assert.equal(OWNER, await deedHolder.owner.call(DOMAIN_REGISTRAR_LABEL))
    })

    it("should allow a claimed deed to be transferred to a new registrar", async () => {
        const [, deedAddress] = await registrar.entries.call(DOMAIN_REGISTRAR_LABEL)
        const deed = Deed.at(deedAddress)

        // Setup new .eth TLD registrar; this should take ownership of '.eth'
        const mockRegistrar = await MockAcceptingTransferRegistrar.new()
        await ens.setSubnodeOwner(ROOT_NAMEHASH, TLD_REGISTRAR_LABEL, mockRegistrar.address)
        assert.equal(mockRegistrar.address, await ens.owner(TLD_NAMEHASH))
        assert.isFalse(await mockRegistrar.acceptedTransfer(DOMAIN_REGISTRAR_LABEL))

        // Claim the deed back
        await deedHolder.claim(DOMAIN_REGISTRAR_LABEL)

        // Transfer the deed to the new registrar
        await registrar.transferRegistrars(DOMAIN_REGISTRAR_LABEL)
        assert.isTrue(await mockRegistrar.acceptedTransfer(DOMAIN_REGISTRAR_LABEL))
        assert.equal(mockRegistrar.address, await deed.registrar())

        // Make sure the deed's been removed from the old registrar
        assert.equal(0, (await registrar.entries(DOMAIN_REGISTRAR_LABEL))[1])
    })

    it("disallows the original owner from transferring the held deed via the registrar after taking ownership", async () => {
        await assertRevert(async () => {
            await registrar.transfer(DOMAIN_REGISTRAR_LABEL, NEW_HOLDER, { from: OWNER })
        })
    })

    it("disallows the original owner to manipulate the ENS node after taking ownership", async () => {
        await assertRevert(async () => {
            await ens.setOwner(DOMAIN_NAMEHASH, NEW_HOLDER, { from: OWNER })
        })
    })

    it("disallows the original owner from re-finalizing the auction after taking ownership", async () => {
        await assertRevert(async () => {
            await registrar.finalizeAuction(DOMAIN_REGISTRAR_LABEL, { from: OWNER })
        })
    })
})
