import { getCircomkit, ethers, expect } from "../setup";

const poseidon = require("../src/poseidon/poseidon.js");
const poseidonCipher = require("../src/poseidon/poseidonCipher.js");

const circomkit = getCircomkit();

describe("Poseidon", () => {

    describe("Hash", () => {

        const vectors = [
            {
                inputs: [1, 2],
                output: ethers.toBigInt("0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a"),
                title: "sage poseidonperm_x5_254_3.sage"
            },
            {
                inputs: [1, 2, 3, 4],
                output: ethers.toBigInt("0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465"),
                title: "sage poseidonperm_x5_254_5.sage"
            }
        ]

        for (const vector of vectors) {
            describe(`Should match the reference implementation (${vector.title})`, () => {
                it("JS", () => {
                    const res = poseidon(vector.inputs);
                    expect(res).to.equal(vector.output);
                });
                
                it("Circom", async () => {
                    const wtnsTester = await circomkit.WitnessTester("poseidon", {
                        file: "./libs/poseidon/Poseidon",
                        template: "Poseidon",
                        params: [vector.inputs.length]
                    });
    
                    await wtnsTester.expectPass({ inputs: vector.inputs }, { out: vector.output });
                });
            });
        }
    });

    describe("Cipher", () => {
        const key = [13, 37];
        const nonce = 42;

        const messages = [
            [1],
            [1, 2],
            [1, 2, 3],
            [1, 2, 3, 4],
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 5, 6],
            [1, 2, 3, 4, 5, 6, 7]
        ]

        const getLength = (input: number[]) => {
            let length = input.length;
            while (length % 3 !== 0) {
                length++;
            }
            return length;
        };

        // const formatInput = (input: number[]) => {
        //     const result = [...input];
        //     while (result.length % 3 !== 0) {
        //         result.push(0);
        //     }
        //     return result;
        // };

        for (const message of messages) {
            describe(`${message.length} inputs`, () => {
                it("JS", () => {
                    const cipherData = poseidonCipher.encrypt(message, key, nonce);
                    const decodedData = poseidonCipher.decrypt(cipherData, key, nonce, message.length);
        
                    expect(decodedData).to.deep.equal(message);
                });
        
                it("Circom", async () => {
        
                    // const input = formatInput(message);
                    const length = getLength(message);
        
                    const encryptCircuit = await circomkit.WitnessTester("poseidon_encrypt_padded", {
                        file: "./libs/poseidon/Encrypt",
                        template: "PoseidonEncryptPadded",
                        params: [message.length]
                    });
        
                    const decryptCircuit = await circomkit.WitnessTester("poseidon_decrypt", {
                        file: "./libs/poseidon/Decrypt",
                        template: "PoseidonDecrypt",
                        params: [message.length]
                    });
        
                    const encryptWtns = await encryptCircuit.calculateWitness({ message, key, nonce });
                    const ciphertext = encryptWtns.slice(1, 1 + length + 1);
        
                    const decryptWtns = await decryptCircuit.calculateWitness({ ciphertext: ciphertext, key, nonce });
                    const decodedMessage = decryptWtns.slice(1, 1 + message.length);
        
                    expect(decodedMessage).to.deep.equal(message);
                });
            });
        }
    });

    it("Encrypt Check", async () => {
        const key = [13, 37];
        const nonce = 42;
        const message = [1, 2, 3, 4, 5, 6, 7];
        const fakeMessage = [1, 2, 3, 4, 5, 6, 8];

        const ciphertext = poseidonCipher.encrypt(message, key, nonce);

        const checkCircuit = await circomkit.WitnessTester("poseidon_decrypt_check", {
            file: "./libs/poseidon/Decrypt",
            template: "PoseidonEncryptCheck",
            params: [message.length]
        });

        await checkCircuit.expectPass({ ciphertext, message, key, nonce }, { out: 1 });
        await checkCircuit.expectPass({ ciphertext, message: fakeMessage, key, nonce }, { out: 0 });
    });
});
