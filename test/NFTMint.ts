import { getCircomkit, ethers, expect, loadFixture } from "../setup";
// import { buildPoseidon, Poseidon } from "circomlibjs";
import { ZkProof } from "../src/types/zkProof";

const circomkit = getCircomkit();

describe("NFTMint", () => {

    // random password
    const password = 42n;
    // precomputed Poseidon hash of the password
    const passwordHash = 12326503012965816391338144612242952408728683609716147019497703475006801258307n;

    async function deploy() {

        const [ owner, user ] = await ethers.getSigners();

        const Verifier1Factory = await ethers.getContractFactory("contracts/NFTWithPassword/Groth16Verifier1.sol:Groth16Verifier");
        const verifier1 = await Verifier1Factory.connect(owner).deploy();

        const Verifier2Factory = await ethers.getContractFactory("contracts/NFTWithPassword/Groth16Verifier2.sol:Groth16Verifier");
        const verifier2 = await Verifier2Factory.connect(owner).deploy();

        const NFTWithPassword = await ethers.getContractFactory("NFTWithPassword");
        const nftWithPassword = await NFTWithPassword.connect(owner).deploy(
            verifier1.target,
            verifier2.target,
            passwordHash
        );

        return { nft: nftWithPassword, owner, user };
    }

    it("verify preimage", async () => {
        const wtnsTester = await circomkit.WitnessTester("verify_preimage", {
            "file": "VerifyNFTMint",
            "template": "VerifyPreimage"
        });

        await wtnsTester.expectPass({
            preimage: password,
            hash: passwordHash
        });

        await wtnsTester.expectFail({
            preimage: password,
            hash: passwordHash + 1n
        });
    });

    describe("v1", () => {

        let proofData: ZkProof;     

        before(async () => {
            const { user } = await loadFixture(deploy);
            const proofTester = await circomkit.ProofTester("verify_nft_mint_1");

            proofData = (await proofTester.prove({
                password,
                passwordHash,
                recipient: BigInt(user.address)
            })) as ZkProof;
        });

        it("should mint NFT", async () => {
            const { nft, user } = await loadFixture(deploy);

            const proof = proofData.proof;

            await nft.connect(user).mintWithPassword1(
                [ proof.pi_a[0], proof.pi_a[1] ],
                [
                    [ proof.pi_b[0][1], proof.pi_b[0][0] ],
                    [ proof.pi_b[1][1], proof.pi_b[1][0] ],
                ],
                [ proof.pi_c[0], proof.pi_c[1] ]
            );
            
            expect(await nft.ownerOf(0)).to.equal(user.address);
        });

        it("should not mint NFT if recipient doesn't match", async () => {
            const { nft, owner } = await loadFixture(deploy);

            const proof = proofData.proof;

            await expect(nft.connect(owner).mintWithPassword1(
                [ proof.pi_a[0], proof.pi_a[1] ],
                [
                    [ proof.pi_b[0][1], proof.pi_b[0][0] ],
                    [ proof.pi_b[1][1], proof.pi_b[1][0] ],
                ],
                [ proof.pi_c[0], proof.pi_c[1] ]
            )).to.be.revertedWith("Invalid proof");
        });
    });

    describe("v2", () => {
            
        let proofData: ZkProof;     

        before(async () => {
            const { user } = await loadFixture(deploy);
            const proofTester = await circomkit.ProofTester("verify_nft_mint_2");

            proofData = (await proofTester.prove({
                password,
                passwordHash,
                recipient: BigInt(user.address)
            })) as ZkProof;
        });

        it("should mint NFT", async () => {
            const { nft, user } = await loadFixture(deploy);

            const { proof, publicSignals } = proofData;

            const nullifier = publicSignals[0];

            await nft.connect(user).mintWithPassword2(
                [ proof.pi_a[0], proof.pi_a[1] ],
                [
                    [ proof.pi_b[0][1], proof.pi_b[0][0] ],
                    [ proof.pi_b[1][1], proof.pi_b[1][0] ],
                ],
                [ proof.pi_c[0], proof.pi_c[1] ],
                nullifier
            );
            
            expect(await nft.ownerOf(0)).to.equal(user.address);
        });

        it("should not mint NFT if recipient doesn't match", async () => {
            const { nft, owner } = await loadFixture(deploy);

            const { proof, publicSignals } = proofData;

            const nullifier = publicSignals[0];

            await expect(nft.connect(owner).mintWithPassword2(
                [ proof.pi_a[0], proof.pi_a[1] ],
                [
                    [ proof.pi_b[0][1], proof.pi_b[0][0] ],
                    [ proof.pi_b[1][1], proof.pi_b[1][0] ],
                ],
                [ proof.pi_c[0], proof.pi_c[1] ],
                nullifier
            )).to.be.revertedWith("Invalid proof");
        });
    });
});
