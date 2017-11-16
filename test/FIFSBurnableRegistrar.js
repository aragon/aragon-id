/* global artifacts assert beforeEach contract it web3 */
import { hash as namehash } from "eth-ens-namehash"
import { assertRevert } from "./helpers/assertThrow"

const ENS = artifacts.require("ENS")
const MockApproveAndCallERC20 = artifacts.require("MockApproveAndCallERC20")
const PublicResolver = artifacts.require("PublicResolver")

const FIFSBurnableRegistrar = artifacts.require("FIFSBurnableRegistrar")

contract("FIFSBurnableRegistrar", (accounts) => {
    const OWNER = accounts[0]
    const OTHER_OWNER = accounts[1]
    const REGISTRAR_OWNER = accounts[2]
    const INITIAL_TOKENS = 10000000

    // ENS related constants
    const TLD = "eth"
    const DOMAIN = "name"
    const ROOT_NAMEHASH = namehash("")
    const TLD_NAMEHASH = namehash(TLD)
    const DOMAIN_NAMEHASH = namehash(`${DOMAIN}.${TLD}`)
    const TLD_REGISTRAR_HASH = web3.sha3(TLD)
    const DOMAIN_REGISTRAR_HASH = web3.sha3(DOMAIN)

    let ens
    let resolver
    let registrar
    let token

    beforeEach(async () => {
        // Setup token balances
        token = await MockApproveAndCallERC20.new()
        await token.mintToken(OWNER, INITIAL_TOKENS)
        await token.mintToken(OTHER_OWNER, INITIAL_TOKENS)

        // Setup new ENS instance
        ens = await ENS.new()
        resolver = await PublicResolver.new(ens.address)

        // Setup FIFSBurnableRegistrar
        registrar = await FIFSBurnableRegistrar.new(
            ens.address,
            resolver.address,
            TLD_NAMEHASH,
            token.address,
            0,
            REGISTRAR_OWNER
        )
        await ens.setSubnodeOwner(ROOT_NAMEHASH, TLD_REGISTRAR_HASH, registrar.address)
    })

    it("should allow the owner to change the burning cost", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost, { from: REGISTRAR_OWNER })

        assert.equal(newCost, await registrar.registrationCost())
    })

    it("should not allow anybody but the owner to change the burning cost", async () => {
        await assertRevert(async () => {
            await registrar.setRegistrationCost(100)
        })
    })

    it("should not allow direct registrations", async () => {
        await assertRevert(async () => {
            await registrar.register(DOMAIN_REGISTRAR_HASH, OWNER)
        })
    })

    it("should not allow direct registrations with resolvers", async () => {
        const newResolver = await PublicResolver.new(ens.address)

        await assertRevert(async () => {
            await registrar.registerWithResolver(DOMAIN_REGISTRAR_HASH, OWNER, newResolver.address)
        })
    })

    it("should allow all registrations when there's no cost", async () => {
        // Construct calldata for register(DOMAIN_REGISTRAR_HASH, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_HASH, OWNER)

        await token.approveAndCall(registrar.address, 100, calldata)
        assert.equal(OWNER, await ens.owner(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr(DOMAIN_NAMEHASH))

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balance(OWNER)).toNumber())
    })

    it("should allow all registrations with a resolver when there's no cost", async () => {
        const newResolver = await PublicResolver.new(ens.address)

        // Construct calldata for registerWithResolver(DOMAIN_REGISTRAR_HASH, OWNER, newResolver.address)
        const calldata = registrar.contract.registerWithResolver.getData(
            DOMAIN_REGISTRAR_HASH,
            OWNER,
            newResolver.address
        )

        await token.approveAndCall(registrar.address, 100, calldata)
        assert.equal(OWNER, await ens.owner(DOMAIN_NAMEHASH))
        assert.equal(newResolver.address, await ens.resolver(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await newResolver.addr(DOMAIN_NAMEHASH))

        // Make sure the default resolver isn't set
        assert.equal(0, await resolver.addr(DOMAIN_NAMEHASH))

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balance(OWNER)).toNumber())
    })

    it("should allow subdomain registrations when enough tokens are burned", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost, { from: REGISTRAR_OWNER })

        // Construct calldata for register(DOMAIN_REGISTRAR_HASH, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_HASH, OWNER)

        await token.approveAndCall(registrar.address, newCost, calldata)
        assert.equal(OWNER, await ens.owner(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr(DOMAIN_NAMEHASH))

        // Make sure tokens were burned
        assert.equal(INITIAL_TOKENS - newCost, (await token.balance(OWNER)).toNumber())
    })

    it("should not allow subdomain registrations when not enough tokens are burned", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost, { from: REGISTRAR_OWNER })

        // Construct calldata for register(DOMAIN_REGISTRAR_HASH, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_HASH, OWNER)

        await assertRevert(async () => {
            await token.approveAndCall(registrar.address, newCost - 5, calldata)
        })

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balance(OWNER)).toNumber())
    })
})
