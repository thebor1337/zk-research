import { expect, ethers, loadFixture, getCircomkit, time } from "../setup";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ProofTester } from "circomkit";
import { buildMimcSponge, MimcSponge } from "circomlibjs";

import { calculateMerkleRootAndPath } from "../src/TornadoCash";
import { Tornado } from "../typechain-types";

const circomkit = getCircomkit();

describe("TornadoCash", function () {

	async function deploy() {
		const [user1, user2] = await ethers.getSigners();

		const MiMCHasherFactory = await ethers.getContractFactory("MiMCHasher");
		const MiMCSponge = await MiMCHasherFactory.deploy();

        const merkleTreeFactory = await ethers.getContractFactory("MerkleTreeMock");
        const merkleTree = await merkleTreeFactory.deploy(MiMCSponge.target);

		const Groth16VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
		const groth16Verifier = await Groth16VerifierFactory.deploy();

		const TornadoFactory = await ethers.getContractFactory("Tornado");
		const tornado = await TornadoFactory.deploy(
			ethers.parseEther("0.1"),
			MiMCSponge.target,
			groth16Verifier.target
		);

		return { hasher: MiMCSponge, verifier: groth16Verifier, merkleTree, tornado, user1, user2 };
	}

    let mimc: MimcSponge;

    before(async () => {
        mimc = await buildMimcSponge();
    });

	describe("MiMC", () => {
	    const inputs = [1n, 2n];
	    const output = 19814528709687996974327303300007262407299502847885145507292406548098437687919n;

		it("solidity", async () => {
			const { hasher } = await loadFixture(deploy);
	        const result = await hasher.MiMCSponge(inputs[0], inputs[1]);
	        expect(result[0]).to.equal(output);
		});

		it("circom", async () => {
			const tester = await circomkit.WitnessTester("Hasher", {
	            file: "TornadoCash/merkleTree",
	            template: "Hasher",
	            params: [],
	        });

			await tester.expectPass(
				{
					left: inputs[0],
					right: inputs[1],
				},
				{
					hash: output
				}
			);
		});

	    it("js", async () => {
	        expect(BigInt(mimc.F.toString(mimc.multiHash(inputs, 0n)))).to.eq(output);
	    });
	});

	describe("MekleTree", () => {
	    const elements = [1n, 2n, 3n];
	    const root = 13605252518346649016266481317890801910232739395710162921320863289825142055129n;

	    it("should compute correct root on JS", async () => {
	        const { root } = calculateMerkleRootAndPath(mimc, 10, elements);
	        expect(root).to.eq(root);
	    });

	    it("should store correct root in MerkleTree contract", async () => {
            const { merkleTree } = await loadFixture(deploy);

            for (let element of elements) {
                await merkleTree.insert(element);
            }

            expect(await merkleTree.roots(root)).to.be.true;
	    });

	    it("should compute and check correct root in circom", async () => {
	        const tester = await circomkit.WitnessTester("MerkleTreeChecker", {
	            file: "TornadoCash/merkleTree",
	            template: "MerkleTreeChecker",
	            params: [10],
	        });

	        const leaf = 3n;

	        const { root, pathElements, pathIndices } = calculateMerkleRootAndPath(mimc, 10, elements, leaf);

			await tester.expectPass({
	            leaf,
	            root,
	            pathElements,
	            pathIndices,
			});
	    });
	});

	describe("Circuits", () => {
		// random values
		const nullifier = 79609865366031567861578674626764032386330538527206727398496584449078941044n;
		const secret = 450839333939964326240825492957176224075338753532561378915623084725146762380n;

		// calculated values
		const commitment = 12376372110153219584238716743097879795573694509124460498178122523041751975192n;
		const nullifierHash = 18208172621231796641083354354338910082449021226871113027305263222293538190423n;

		it("should compute commitment", async () => {
			const commitmentTester = await circomkit.WitnessTester("CommitmentHasher", {
				file: "TornadoCash/commitmentHasher",
				template: "CommitmentHasher",
				params: [],
			});

			const wtns = await commitmentTester.calculateWitness({ nullifier, secret });

			expect(wtns[1]).to.eq(commitment);
			expect(wtns[2]).to.eq(nullifierHash);
		});

        describe("withdraw", () => {

            let proofTester: ProofTester;
            let root: bigint;
            let pathElements: bigint[];
            let pathIndices: number[];
            let proof: any;
            let publicSignals: string[];

            before(async () => {
                proofTester = await circomkit.ProofTester("Withdraw");

                // making merkle tree and proof for the commitment
                const merkleData = calculateMerkleRootAndPath(mimc, 10, [commitment], commitment);

                root = merkleData.root;
                pathElements = merkleData.pathElements;
                pathIndices = merkleData.pathIndices;

                // making correct proof
                const proofData = await proofTester.prove({
                    nullifier,
                    secret,
                    pathElements,
                    pathIndices,
                    root,
                    nullifierHash,
                    recipient: 1n,
                });

                proof = proofData.proof;
                publicSignals = proofData.publicSignals;
            });

            it("should pass withdraw", async () => {
                const wtnsTester = await circomkit.WitnessTester("Withdraw", {
                    file: "TornadoCash/withdraw",
                    template: "Withdraw",
                    params: [10],
                    pubs: ["root", "nullifierHash", "recipient"],
                });
    
                // checking constraints
                await wtnsTester.expectPass({
                    nullifier,
                    secret,
                    pathElements,
                    pathIndices,
                    root,
                    nullifierHash,
                    recipient: 1n,
                });
            });
    
            it("should verify withdraw proof", async () => {
                expect(await proofTester.verify(proof, publicSignals)).to.be.true;
            });
    
            it("shouldn't verify withdraw proof with different public signals", async () => {
                const fakeSignal = ethers.toBeHex(2n, 32)
    
                // fake root
                expect(await proofTester.verify(proof, [fakeSignal, publicSignals[1], publicSignals[2]])).to.be.false;
                // fake nullifierHash
                expect(await proofTester.verify(proof, [publicSignals[0], fakeSignal, publicSignals[2]])).to.be.false;
                // fake recipient
                expect(await proofTester.verify(proof, [publicSignals[0], publicSignals[1], fakeSignal])).to.be.false;
            });
        });
	});

	describe("Tornado", () => {

		// random values
		const nullifier = 79609865366031567861578674626764032386330538527206727398496584449078941044n;
		const secret = 450839333939964326240825492957176224075338753532561378915623084725146762380n;

		// calculated values
		const commitment = 12376372110153219584238716743097879795573694509124460498178122523041751975192n;
		const nullifierHash = 18208172621231796641083354354338910082449021226871113027305263222293538190423n;

        let tornado: Tornado;
        let elements: bigint[];
        let depositor: HardhatEthersSigner;
        let user: HardhatEthersSigner;
        let withdrawProver: ProofTester;

        before(async () => {
            const data = await loadFixture(deploy);

            tornado = data.tornado;
            depositor = data.user1;
            user = data.user2;
            withdrawProver = await circomkit.ProofTester("Withdraw");
        });

		it("should deposit", async () => {
			const tx = await tornado
				.connect(depositor)
				.deposit(commitment, { value: ethers.parseEther("0.1") });
			
            expect(tx)
				.to.emit(tornado, "Deposit")
				.withArgs(commitment, 0, await time.latestBlock());
			
            const { root } = calculateMerkleRootAndPath(mimc, 10, [commitment]);

			expect(await tornado.roots(root)).to.be.true;

			// more deposits to check root reconstruction later
			const fakeCommitments = [1n, 2n, 3n];
			for (let fakeCommitment of fakeCommitments) {
			    await tornado.connect(user).deposit(
                    fakeCommitment, 
                    { value: ethers.parseEther("0.1") }
                );
			}

			elements = [commitment, ...fakeCommitments];
		});

		it("should withdraw", async () => {
			const { root, pathElements, pathIndices } = calculateMerkleRootAndPath(mimc, 10, elements, commitment);

			expect(await tornado.roots(root)).to.be.true;

			const { proof } = (await withdrawProver.prove({
				nullifier,
				secret,
				pathElements,
				pathIndices,
				root,
				nullifierHash,
				recipient: BigInt(depositor.address),
			})) as { proof: { pi_a: [bigint, bigint], pi_b: [[bigint, bigint], [bigint, bigint]], pi_c: [bigint, bigint] }, publicSignals: string[] };

			const tx = await tornado.withdraw(
				[ proof.pi_a[0], proof.pi_a[1] ],
				[
					[ proof.pi_b[0][1], proof.pi_b[0][0] ],
					[ proof.pi_b[1][1], proof.pi_b[1][0] ],
				],
				[ proof.pi_c[0], proof.pi_c[1] ],
				root,
				nullifierHash,
				depositor.address
			);

            expect(tx)
                .to.emit(tornado, "Withdraw")
                .withArgs(depositor.address, nullifierHash);

            expect(await tornado.spentNullifiers(nullifierHash)).to.be.true;
		});
	});
});
