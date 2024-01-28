import { getCircomkit } from "../setup";

import { poseidon3 } from "poseidon-lite";
import { EdDSAPoseidon, derivePublicKey, deriveSecretScalar } from "@zk-kit/eddsa-poseidon"
import { poseidonEncrypt } from "@zk-kit/poseidon-cipher";
import { type Point, mulPointEscalar } from "@zk-kit/baby-jubjub";

const circomkit = getCircomkit();

describe("PoseidonEdDSADecrypt", () => {
    it("should verify signature and decrypt message", async () => {
        const message = [1337n, 1338n, 1339n];

        const senderPrivateKey = 42n;
        const receiverPrivateKey = 43n;

        const senderPublicKey = derivePublicKey(senderPrivateKey).map((x) => BigInt(x)) as Point<bigint>;
        const receiverPublicKey = derivePublicKey(receiverPrivateKey).map((x) => BigInt(x)) as Point<bigint>;

        const senderSecretScalar = BigInt(deriveSecretScalar(senderPrivateKey));
        const receiverSecretScalar = BigInt(deriveSecretScalar(receiverPrivateKey));

        const senderEdDSA = new EdDSAPoseidon(senderPrivateKey);

        const messageHash = poseidon3(message);

        const signature = senderEdDSA.signMessage(messageHash);

        const sharedKey = mulPointEscalar(receiverPublicKey, senderSecretScalar);

        const ciphertext = poseidonEncrypt(
            [
                ...message, 
                BigInt(signature.R8[0]), 
                BigInt(signature.R8[1]), 
                BigInt(signature.S)
            ],
            sharedKey,
            0n
        );

        const circuit = await circomkit.WitnessTester("poseidon_eddsa_decrypt", {
            file: "poseidonEdDSADecrypt",
            template: "PoseidonEdDSADecrypt",
            params: [message.length]
        });

        await circuit.expectPass({
            ciphertext,
            senderPubKey: senderPublicKey,
            receiverPrivKey: receiverSecretScalar
        }, {
            message
        });
    });
});
