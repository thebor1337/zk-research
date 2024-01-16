import { getCircomkit, expect } from "../setup";
import { buildBabyjub, BabyJub } from "circomlibjs";

const circomkit = getCircomkit();

describe("Encryption Example", () => {

    let jub: BabyJub;

    before(async () => {
        jub = await buildBabyjub();
    });

    function computePublicKey(privateKey: bigint) {
        const publicKeyPoint = jub.mulPointEscalar(jub.Base8, privateKey);
        return [
            BigInt(jub.F.toString(publicKeyPoint[0])),
            BigInt(jub.F.toString(publicKeyPoint[1]))
        ];
    };

    describe("Computing parameters", () => {

        function computePublicKey(privateKey: bigint) {
            const publicKeyPoint = jub.mulPointEscalar(jub.Base8, privateKey);
            return [
                BigInt(jub.F.toString(publicKeyPoint[0])),
                BigInt(jub.F.toString(publicKeyPoint[1]))
            ];
        };

        let jub: BabyJub;

        before(async () => {
            jub = await buildBabyjub();
        });

        it("should calculate correct public key", async () => {
            const privateKey = 5n;

            const wtnsTester = await circomkit.WitnessTester("gen_public_key", {
                file: "utils/genPubKey",
                template: "GenPublicKey"
            });

            const publicKey = computePublicKey(privateKey);

            await wtnsTester.expectPass({
                privateKey
            }, {
                publicKey: [
                    publicKey[0],
                    publicKey[1]
                ]
            });
        });

        it("should calculate correct shared secret", async () => {
            const privateKeys = [5n, 7n];
            const publicKeys = privateKeys.map(privateKey => computePublicKey(privateKey));

            const wtnsTester = await circomkit.WitnessTester("ecdh", {
                file: "utils/ecdh",
                template: "ECDH"
            });

            const sharedSecrets = await Promise.all(privateKeys.map(async (privateKey, idx) => {
                const wtns = await wtnsTester.calculateWitness({
                    privateKey,
                    publicKey: publicKeys[idx]
                });
                return wtns[1];
            }));

            expect(sharedSecrets[0]).to.equal(sharedSecrets[1]);
        });
    });

    describe("Scheme", () => {
        const privateKeys = [5n, 7n];
        const msg = 42n;

        let publicKeys: bigint[][];

        before(() => {
            publicKeys = privateKeys.map(privateKey => computePublicKey(privateKey));
        });

        it("should encrypt and decrypt correctly", async () => {
            const encryptionCircuit = await circomkit.WitnessTester("encryption", {
                file: "encryptionExample",
                template: "Encryption"
            });

            const decryptionCircuit = await circomkit.WitnessTester("decryption", {
                file: "encryptionExample",
                template: "Decryption"
            });

            const encryptionWtns = await encryptionCircuit.calculateWitness({
                privateKey: privateKeys[0],
                publicKey: publicKeys[1],
                msg
            });

            await decryptionCircuit.expectPass({
                privateKey: privateKeys[1],
                publicKey: publicKeys[0],
                hashedMsg: encryptionWtns[1],
                encodedKey: encryptionWtns[2]
            }, {
                msg
            });
        });
    });
});
