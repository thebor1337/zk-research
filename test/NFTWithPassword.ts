import { getCircomkit, ethers, expect, loadFixture } from "../setup";
import { buildMimc7, Mimc7 } from "circomlibjs";
import { ZkProof } from "../src/types/zkProof";

const circomkit = getCircomkit();

describe("NFTWithPassword", () => {

    // random password
    const password = 3n;
    // precomputed MiMC7 hash of the password
    const passwordHash = 10513607674170245577899825752483841247286555366379776940083295721103562343571n;

    async function deploy() {

        const [ owner, user ] = await ethers.getSigners();

        const VerifierFactory = await ethers.getContractFactory("contracts/NFTWithPassword/Groth16Verifier.sol:Groth16Verifier");
        const verifier = await VerifierFactory.connect(owner).deploy();

        const NFTWithPassword = await ethers.getContractFactory("NFTWithPassword");
        const nftWithPassword = await NFTWithPassword.connect(owner).deploy(
            verifier.target,
            passwordHash
        );

        return { nft: nftWithPassword, owner, user };
    }

    let mimc: Mimc7;

    before(async () => {
        mimc = await buildMimc7();
    });

    it("should calculate correct hash", async () => {
        const result = BigInt(mimc.F.toString(mimc.hash(password, 0)));
        expect(result).to.equal(passwordHash);
    });

    it("should check constraints correctly", async () => {
        const wtnsTester = await circomkit.WitnessTester("verify_nft_password", {
            "file": "VerifyNFTPassword",
            "template": "VerifyNFTPassword",
            "pubs": ["passwordHash", "recipient"],
            "params": []
        });

        await wtnsTester.expectPass({
            password,
            passwordHash,
            recipient: 1n
        });

        await wtnsTester.expectFail({
            password,
            passwordHash: passwordHash + 1n,
            recipient: 1n
        });
    });

    describe("minting", () => {
        let proofData: ZkProof;     

        before(async () => {
            const { user } = await loadFixture(deploy);
            const proofTester = await circomkit.ProofTester("verify_nft_password");

            proofData = (await proofTester.prove({
                password,
                passwordHash,
                recipient: BigInt(user.address)
            })) as ZkProof;
        });

        it("should mint NFT", async () => {
            const { nft, user } = await loadFixture(deploy);

            const proof = proofData.proof;

            await nft.connect(user).mintWithPassword(
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

            await expect(nft.connect(owner).mintWithPassword(
                [ proof.pi_a[0], proof.pi_a[1] ],
                [
                    [ proof.pi_b[0][1], proof.pi_b[0][0] ],
                    [ proof.pi_b[1][1], proof.pi_b[1][0] ],
                ],
                [ proof.pi_c[0], proof.pi_c[1] ]
            )).to.be.revertedWith("Invalid proof");
        });
    });
});
