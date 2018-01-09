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
    const BURN_ADDRESS = "0xdead"
    const INITIAL_TOKENS = 10000000

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
    let token

    beforeEach(async () => {
        // Setup token.balances.calls
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
            0
        )
        await ens.setSubnodeOwner(ROOT_NAMEHASH, TLD_REGISTRAR_LABEL, registrar.address)
    })

    it("should allow the owner to change the burning cost", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        assert.equal(newCost, await registrar.registrationCost.call())
    })

    it("should not allow anybody but the owner to change the burning cost", async () => {
        await assertRevert(async () => {
            await registrar.setRegistrationCost(100, { from: OTHER_OWNER })
        })
    })

    it("should allow the owner to change the burning token", async () => {
        const newToken = await MockApproveAndCallERC20.new()
        await registrar.setBurningToken(newToken.address)

        assert.equal(newToken.address, await registrar.burningToken())
    })

    it("should not allow anybody but the owner to change the burning token", async () => {
        const newToken = await MockApproveAndCallERC20.new()

        await assertRevert(async () => {
            await registrar.setBurningToken(newToken.address, { from: OTHER_OWNER })
        })
    })

    it("should allow direct registrations when there's no cost", async () => {
        await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)

        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
    })

    it("should allow direct registrations with resolvers when there's no cost", async () => {
        const newResolver = await PublicResolver.new(ens.address)

        await registrar.registerWithResolver(DOMAIN_REGISTRAR_LABEL, OWNER, newResolver.address)
        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(newResolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await newResolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure the default resolver isn't set
        assert.equal(0, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
    })

    it("should allow approve and call registrations when there's no cost", async () => {
        // Construct calldata for register(DOMAIN_REGISTRAR_LABEL, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_LABEL, OWNER)

        await token.approveAndCall(registrar.address, 100, calldata)
        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
    })

    it("should allow approve and call registrations with a resolver when there's no cost", async () => {
        const newResolver = await PublicResolver.new(ens.address)

        // Construct calldata for registerWithResolver(DOMAIN_REGISTRAR_LABEL, OWNER, newResolver.address)
        const calldata = registrar.contract.registerWithResolver.getData(
            DOMAIN_REGISTRAR_LABEL,
            OWNER,
            newResolver.address
        )

        await token.approveAndCall(registrar.address, 100, calldata)
        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(newResolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await newResolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure the default resolver isn't set
        assert.equal(0, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
    })

    it("should allow direct registrations when enough tokens are burned", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        await token.approve(registrar.address, newCost)
        await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)

        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure tokens were burned
        assert.equal(INITIAL_TOKENS - newCost, (await token.balances.call(OWNER)).toNumber())
        assert.equal(newCost, (await token.balances.call(BURN_ADDRESS)).toNumber())
    })

    it("should allow approve and call registrations when enough tokens are burned", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        // Construct calldata for register(DOMAIN_REGISTRAR_LABEL, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_LABEL, OWNER)

        await token.approveAndCall(registrar.address, newCost, calldata)
        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure tokens were burned
        assert.equal(INITIAL_TOKENS - newCost, (await token.balances.call(OWNER)).toNumber())
        assert.equal(newCost, (await token.balances.call(BURN_ADDRESS)).toNumber())
    })

    it("should still allow registrations after changing the token", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        // Set up new token and set it as the burnt token
        const newToken = await MockApproveAndCallERC20.new()
        await newToken.mintToken(OWNER, INITIAL_TOKENS)
        await registrar.setBurningToken(newToken.address)

        await newToken.approve(registrar.address, newCost)
        await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)

        assert.equal(OWNER, await ens.owner.call(DOMAIN_NAMEHASH))
        assert.equal(resolver.address, await ens.resolver.call(DOMAIN_NAMEHASH))
        assert.equal(OWNER, await resolver.addr.call(DOMAIN_NAMEHASH))

        // Make sure new tokens were burned
        assert.equal(INITIAL_TOKENS - newCost, (await newToken.balances.call(OWNER)).toNumber())
        assert.equal(newCost, (await newToken.balances.call(BURN_ADDRESS)).toNumber())

        // Make sure old tokens weren't burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
        assert.equal(0, (await token.balances.call(BURN_ADDRESS)).toNumber())
    })

    it("should not allow direct registrations when not enough tokens are burned", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        await token.approve(registrar.address, newCost - 5)
        await assertRevert(async () => {
            await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)
        })

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
    })

    it("should not allow approve and call registrations when not enough tokens are burned", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        // Construct calldata for register(DOMAIN_REGISTRAR_LABEL, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_LABEL, OWNER)

        await assertRevert(async () => {
            await token.approveAndCall(registrar.address, newCost - 5, calldata)
        })

        // Make sure no tokens were burned
        assert.equal(INITIAL_TOKENS, (await token.balances.call(OWNER)).toNumber())
    })

    it("should only burn the required amount via direct registration and no more", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        await token.approve(registrar.address, newCost * 10)
        await registrar.register(DOMAIN_REGISTRAR_LABEL, OWNER)

        // Make sure only required amount of tokens were burned
        assert.equal(INITIAL_TOKENS - newCost, (await token.balances.call(OWNER)).toNumber())
        assert.equal(newCost, (await token.balances.call(BURN_ADDRESS)).toNumber())
    })

    it("should only burn the required amount via approve and call registration and no more", async () => {
        const newCost = 100
        await registrar.setRegistrationCost(newCost)

        // Construct calldata for register(DOMAIN_REGISTRAR_LABEL, OWNER)
        const calldata = registrar.contract.register.getData(DOMAIN_REGISTRAR_LABEL, OWNER)

        await token.approveAndCall(registrar.address, newCost * 10, calldata)

        // Make sure only required amount of tokens were burned
        assert.equal(INITIAL_TOKENS - newCost, (await token.balances.call(OWNER)).toNumber())
        assert.equal(newCost, (await token.balances.call(BURN_ADDRESS)).toNumber())
    })
})
