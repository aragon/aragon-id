/* global it beforeEach assert web3 artifacts contract */
import { hash as namehash } from "eth-ens-namehash"
import { assertRevert } from "./helpers/assertThrow"
import { setupEns } from "./helpers/setupEns"

const Deed = artifacts.require("Deed")
const ENS = artifacts.require("ENS")
const HashRegistrarSimplified = artifacts.require("Registrar")
const PublicResolver = artifacts.require("PublicResolver")

const DelegatingDeedHolder = artifacts.require("DelegatingDeedHolder")

contract("DelegatingDeedHolder", (accounts) => {
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
    let resolver
    let delegatingDeedHolder

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

        resolver = await PublicResolver.new(ens.address)

        // Setup deeds holder
        delegatingDeedHolder = await DelegatingDeedHolder.new(ens.address, TLD_NAMEHASH)

        // Transfer ownership of the deed to the deed holder
        await registrar.transfer(DOMAIN_REGISTRAR_LABEL, delegatingDeedHolder.address)
    })

    it("allows an owner to set a manager for the ENS node", async () => {
        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, resolver.address)
        assert.equal(resolver.address, await ens.owner(DOMAIN_NAMEHASH))
    })

    it("allows an owner to set a manager for the ENS node after transfering the held deed", async () => {
        await delegatingDeedHolder.transfer(DOMAIN_REGISTRAR_LABEL, NEW_HOLDER)

        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, resolver.address, { from: NEW_HOLDER })
        assert.equal(resolver.address, await ens.owner(DOMAIN_NAMEHASH))
    })

    it("only allows the manager to be set once", async () => {
        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, resolver.address)

        const newResolver = await PublicResolver.new(ens.address)
        await assertRevert(async () => {
            await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, newResolver.address)
        })
    })
})
