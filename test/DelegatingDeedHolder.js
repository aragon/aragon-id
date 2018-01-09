/* global it beforeEach assert web3 artifacts contract */
import { hash as namehash } from "eth-ens-namehash"
import { assertRevert } from "./helpers/assertThrow"
import { setupEns } from "./helpers/setupEns"

const Deed = artifacts.require("Deed")
const ENS = artifacts.require("ENS")
const FIFSRegistrar = artifacts.require("FIFSRegistrar")
const HashRegistrarSimplified = artifacts.require("Registrar")

const DelegatingDeedHolder = artifacts.require("DelegatingDeedHolder")

contract("DelegatingDeedHolder", (accounts) => {
    const OWNER = accounts[0]
    const NEW_HOLDER = accounts[1]

    // ENS related constants
    const TLD = "eth"
    const DOMAIN = "name"
    const SUBDOMAIN = "sub"
    const ROOT_NAMEHASH = namehash("")
    const TLD_NAMEHASH = namehash(TLD)
    const DOMAIN_NAMEHASH = namehash(`${DOMAIN}.${TLD}`)
    const SUBDOMAIN_NAMEHASH = namehash(`${SUBDOMAIN}.${DOMAIN}.${TLD}`)
    const TLD_REGISTRAR_LABEL = web3.sha3(TLD)
    const DOMAIN_REGISTRAR_LABEL = web3.sha3(DOMAIN)
    const SUBDOMAIN_REGISTRAR_LABEL = web3.sha3(SUBDOMAIN)

    let ens
    let registrar
    let domainRegistrar
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

        domainRegistrar = await FIFSRegistrar.new(ens.address, DOMAIN_NAMEHASH)

        // Setup deeds holder
        delegatingDeedHolder = await DelegatingDeedHolder.new(ens.address, TLD_NAMEHASH)

        // Transfer ownership of the deed to the deed holder
        await registrar.transfer(DOMAIN_REGISTRAR_LABEL, delegatingDeedHolder.address)
    })

    it("allows an owner to set a manager for the ENS node", async () => {
        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, domainRegistrar.address)
        assert.equal(domainRegistrar.address, await ens.owner.call(DOMAIN_NAMEHASH))
    })

    it("allows an owner to set a manager for the ENS node after transferring the held deed", async () => {
        await delegatingDeedHolder.transfer(DOMAIN_REGISTRAR_LABEL, NEW_HOLDER)

        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, domainRegistrar.address, { from: NEW_HOLDER })
        assert.equal(domainRegistrar.address, await ens.owner.call(DOMAIN_NAMEHASH))
    })

    it("only allows the manager to be set once", async () => {
        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, domainRegistrar.address)

        const newDomainRegistrar = await FIFSRegistrar.new(ens.address, namehash("new.eth"))
        await assertRevert(async () => {
            await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, newDomainRegistrar.address)
        })
    })

    it("allows the manager to manage subnodes", async () => {
        await delegatingDeedHolder.setManager(DOMAIN_REGISTRAR_LABEL, domainRegistrar.address)

        await domainRegistrar.register(SUBDOMAIN_REGISTRAR_LABEL, NEW_HOLDER)
        assert(NEW_HOLDER, await ens.owner(SUBDOMAIN_NAMEHASH))
    })
})
