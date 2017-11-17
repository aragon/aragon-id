/* global artifacts assert beforeEach contract it web3 */
import { hash as namehash } from "eth-ens-namehash"
import { assertRevert } from "./helpers/assertThrow"

const ENS = artifacts.require("ENS")
const MockResolver = artifacts.require("MockResolver")
const PublicResolver = artifacts.require("PublicResolver")

const FIFSResolvingRegistrar = artifacts.require("FIFSResolvingRegistrar")

contract("FIFSResolvingRegistrar", (accounts) => {
    const OWNER = accounts[0]
    const OTHER_HOLDER = accounts[1]

    // ENS related constants
    const TLD = "eth"
    const DOMAIN = "name"
    const ROOT_NAMEHASH = namehash("")
    const TLD_NAMEHASH = namehash(TLD)
    const DOMAIN_NAMEHASH = namehash(`${DOMAIN}.${TLD}`)
    const TLD_REGISTRAR_LABEL = web3.sha3(TLD)
    const DOMAIN_REGISTRAR_LABEL = web3.sha3(DOMAIN)

    let ens
    let resolver
    let registrar

    beforeEach(async () => {
        // Setup new ENS instance
        ens = await ENS.new()
        resolver = await PublicResolver.new(ens.address)

        // Setup FIFSResolvingRegistrar
        registrar = await FIFSResolvingRegistrar.new(ens.address, resolver.address, TLD_NAMEHASH)
        await ens.setSubnodeOwner(ROOT_NAMEHASH, TLD_REGISTRAR_LABEL, registrar.address)
    })

    it("should be able to register subdomains", async () => {
        await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)
        assert.equal(OWNER, await ens.owner(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr(DOMAIN_NAMEHASH))
    })

    it("should be able to register subdomains with their own addr resolver", async () => {
        const newResolver = await PublicResolver.new(ens.address)

        await registrar.registerWithResolver(DOMAIN_REGISTRAR_LABEL, OWNER, newResolver.address)
        assert.equal(OWNER, await ens.owner(DOMAIN_NAMEHASH))
        assert.equal(newResolver.address, await ens.resolver(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await newResolver.addr(DOMAIN_NAMEHASH))

        // Make sure the default resolver isn't set
        assert.equal(0, await resolver.addr(DOMAIN_NAMEHASH))
    })

    it("should be able to register subdomains with their own non-addr resolver", async () => {
        const mockResolver = await MockResolver.new()

        await registrar.registerWithResolver(DOMAIN_REGISTRAR_LABEL, OWNER, mockResolver.address)
        assert.equal(OWNER, await ens.owner(DOMAIN_NAMEHASH))
        assert.equal(mockResolver.address, await ens.resolver(DOMAIN_NAMEHASH))
        assert.throws(() => {
            // Just show that mockResolver doesn't have an `addr()` function, so no async/await
            mockResolver.addr(DOMAIN_NAMEHASH)
        })
    })

    it("should not be able to register subdomains with no resolver", async () => {
        await assertRevert(async () => {
            await registrar.registerWithResolver(DOMAIN_REGISTRAR_LABEL, OWNER, 0)
        })
    })

    it("should not be able to re-register subdomains", async () => {
        await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)
        await assertRevert(async () => {
            await registrar.register(DOMAIN_REGISTRAR_LABEL, OTHER_HOLDER)
        })
    })
})
