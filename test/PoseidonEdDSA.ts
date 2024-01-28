import { getCircomkit, expect } from "../setup";
import { EdDSAPoseidon, derivePublicKey, deriveSecretScalar } from "@zk-kit/eddsa-poseidon";
import { Base8, mulPointEscalar, Point } from "@zk-kit/baby-jubjub";

const circomkit = getCircomkit();

describe("PoseidonEDDSA", () => {

    const privateKey = 42n;

    it("deriving public key", async () => {
        const pubKey = derivePublicKey(privateKey);

        const circuit = await circomkit.WitnessTester("eddsa_priv_to_pubkey", {
            file: "libs/eddsa/privToPubKey",
            template: "PrivToPubKey"
        });

        await circuit.expectPass({
            privKey: BigInt(deriveSecretScalar(privateKey))
        }, {
            pubKey: pubKey.map((x) => BigInt(x))
        })
    });

    describe("ECDH", () => {
        const privateKey1 = 42n;
        const privateKey2 = 43n;
    
        const secretScalar1 = BigInt(deriveSecretScalar(privateKey1));
        const secretScalar2 = BigInt(deriveSecretScalar(privateKey2));

        const pubKey1 = derivePublicKey(privateKey1).map((x) => BigInt(x)) as Point<bigint>;
        const pubKey2 = derivePublicKey(privateKey2).map((x) => BigInt(x)) as Point<bigint>;

        it("js", async () => {
            const sharedKey1 = mulPointEscalar(pubKey2, secretScalar1);
            const sharedKey2 = mulPointEscalar(pubKey1, secretScalar2);
    
            expect(sharedKey1[0]).to.equal(sharedKey2[0]);
            expect(sharedKey1[1]).to.equal(sharedKey2[1]);
        });

        it("circom", async () => {
            const sharedKey1 = mulPointEscalar(pubKey2, secretScalar1);

            const circuit = await circomkit.WitnessTester("ecdh", {
                file: "utils/ecdh",
                template: "ECDH"
            });

            await circuit.expectPass({
                publicKey: pubKey1,
                privateKey: secretScalar2
            }, {
                sharedKey: sharedKey1
            });
        });
    });
    
    describe("verifying signature", () => {

        const eddsa = new EdDSAPoseidon(privateKey)

        const message = 1337n;
        const signature = eddsa.signMessage(message)

        it("js", async () => {
            expect(eddsa.verifySignature(message, signature)).to.be.true;
        });

        it("circom", async () => {
            const circuit = await circomkit.WitnessTester("eddsa_verify", {
                file: "libs/eddsa/verifySignature",
                template: "EdDSAPoseidonVerifier"
            });
    
            await circuit.expectPass({
                Ax: BigInt(eddsa.publicKey[0]),
                Ay: BigInt(eddsa.publicKey[1]),
                R8x: BigInt(signature.R8[0]),
                R8y: BigInt(signature.R8[1]),
                S: BigInt(signature.S),
                M: BigInt(message)
            }, {
                valid: 1n
            })
        });
    });

});
