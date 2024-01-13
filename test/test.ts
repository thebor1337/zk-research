import { expect } from "../setup";

const poseidonPerm = require("../src/poseidon/poseidonPerm.js");
const poseidon = require("../src/poseidon/poseidon.js");
const poseidonCipher = require("../src/poseidon/poseidonCipher.js");

describe("Poseidon Circuit test", function () {
    it("Should match the reference implementation", async () => {
        const res2 = poseidon([1,2]);
        expect("115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a").to.eq(res2.toString(16));
    });

    it("Should match the reference implementation", async () => {
        const res2 = poseidon([1,2,3,4]);
        expect("299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465").to.eq(res2.toString(16));
    });

    it("cipher", async () => {
        const msg = [105, 23];
        const key = [5, 10];
        const ciphertext = poseidonCipher.encrypt(msg, key, 0);

        console.log(ciphertext);

        const decrypted = poseidonCipher.decrypt(ciphertext, key, 0, msg.length);

        console.log(decrypted);
    });
});