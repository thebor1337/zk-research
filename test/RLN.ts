import { getCircomkit, ethers, expect } from "../setup";
import { getSignal } from "../src/utils";
import { type WitnessTester } from "circomkit";
import { poseidon1, poseidon2 } from "poseidon-lite";
import { IMT, type IMTMerkleProof } from "@zk-kit/imt";
import { F1Field, bufferToBigint } from "@zk-kit/utils";

const circomkit = getCircomkit();

const f1 = new F1Field(
	BigInt(
		"21888242871839275222246405745257275088548364400416034343698204186575808495617"
	)
);

describe("RLN", () => {
	const computeSignalHash = (signal: string) => {
		const converted = ethers.hexlify(ethers.toUtf8Bytes(signal));
		return BigInt(ethers.keccak256(converted)) >> BigInt(8);
	};

	const computeExternalNullifier = (epoch: bigint) => {
		return poseidon1([epoch]);
	};

	const computeIdentitySecretBy2Points = (
		x0: bigint,
		y0: bigint,
		x1: bigint,
		y1: bigint
	) => {
		return f1.div(f1.sub(f1.mul(y0, x1), f1.mul(y1, x0)), f1.sub(x1, x0));
	};

	const signalLimit = 2;
	const treeDepth = 2;
	const targetIdx = 2;

	const tree = new IMT(poseidon2, treeDepth, 0, 2);

	let identitySecrets: bigint[];
	let circuit: WitnessTester;
	let imtProof: IMTMerkleProof;

	before(async () => {
		identitySecrets = Array.from({ length: 2 ** treeDepth }, () => {
			return (
				bufferToBigint(Buffer.from(ethers.randomBytes(32))) >> BigInt(8)
			);
		});

		const identityCommitments = identitySecrets.map((secret) =>
			poseidon1([secret])
		);
		const rateCommitments = identityCommitments.map((identityCommitment) =>
			poseidon2([identityCommitment, signalLimit])
		);

		for (const rateCommitment of rateCommitments) {
			tree.insert(rateCommitment);
		}

		circuit = await circomkit.WitnessTester("rln", {
			file: "rln",
			template: "RLN",
			params: [treeDepth, 3],
		});

		imtProof = tree.createProof(targetIdx);
	});

	it("should compute a proof with correct root", async () => {
		const epochId = 1n;
		const signalId = 1;

		const msg = "hello world";

		await circuit.expectPass(
			{
				identitySecret: identitySecrets[targetIdx],
				signalLimit,
				signalId,
				pathElements: imtProof.siblings,
				pathIndices: imtProof.pathIndices,
				x: computeSignalHash(msg),
				externalNullifier: computeExternalNullifier(epochId),
			},
			{
				root: tree.root,
			}
		);
	});

	it("should fail if signalId >= signalLimit", async () => {
		const epochId = 1n;
		const signalId = signalLimit;

		const msg = "hello world";

		await circuit.expectFail({
			identitySecret: identitySecrets[targetIdx],
			signalLimit,
			signalId,
			pathElements: imtProof.siblings,
			pathIndices: imtProof.pathIndices,
			x: computeSignalHash(msg),
			externalNullifier: computeExternalNullifier(epochId),
		});
	});

	it("should follow the desired logic", async () => {
		const dataset = [
			{
				msg: "hello world",
				signalId: 0,
				epoch: 1n,
			},
			{
				msg: "hello world 2",
				signalId: 1,
				epoch: 1n,
			},
			{
				msg: "hello world 3",
				signalId: 0,
				epoch: 2n,
			},
			{
				msg: "hello world 4",
				signalId: 1,
				epoch: 2n,
			},
			{
				msg: "hello world 5",
				signalId: 1, // duplicated
				epoch: 2n,
			},
		];

		const expectedIdenticalNullifiersIdx = [3, 4];

		const x = [];
		const y = [];
		const nullifiers = [];

		for (const { msg, signalId, epoch } of dataset) {
			const externalNullifier = computeExternalNullifier(epoch);
			const signalHash = computeSignalHash(msg);

			const wtns = await circuit.calculateWitness({
				identitySecret: identitySecrets[targetIdx],
				signalLimit,
				signalId,
				pathElements: imtProof.siblings,
				pathIndices: imtProof.pathIndices,
				x: signalHash,
				externalNullifier,
			});

			x.push(signalHash);
			y.push(await getSignal(circuit, wtns, "y"));
			nullifiers.push(await getSignal(circuit, wtns, "nullifier"));
		}

        const identicalNullifiersIdx = [];

		for (let i = 0; i < nullifiers.length - 1; i++) {
			for (let j = i + 1; j < nullifiers.length; j++) {
				if (nullifiers[i] === nullifiers[j]) {
					identicalNullifiersIdx.push([i, j]);
				}
			}
		}

        // must be only 1 pair of identical nullifiers
		expect(identicalNullifiersIdx.length).to.equal(1);
		expect(identicalNullifiersIdx[0]).to.deep.equal(
			expectedIdenticalNullifiersIdx
		);

        // must be able to compute the secret based on x and y values of duplicated nullifiers
        expect(
			computeIdentitySecretBy2Points(
				x[expectedIdenticalNullifiersIdx[0]],
				y[expectedIdenticalNullifiersIdx[0]],
				x[expectedIdenticalNullifiersIdx[1]],
				y[expectedIdenticalNullifiersIdx[1]]
			)
		).to.equal(identitySecrets[targetIdx]);
	});
});
