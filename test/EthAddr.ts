import { getCircomkit, ethers, expect } from "../setup";

const circomkit = getCircomkit();

describe("EthAddr", () => {

    describe("Keys", () => {
        it("should derive public key from private key", async () => {

            const privateKey = "0x4e24c60cabe22c125b1634d025f295a27337facc5a788e3f1c5544801cccd8ec";
            const computedPublicAddress = "0x4d070e615042aDA49De9aa16Ac5E71A51a7b8A09";

            const wallet = new ethers.Wallet(privateKey);

            expect(wallet.address).to.eq(computedPublicAddress);

            const wtnsTester = await circomkit.WitnessTester("eth_addr", {
                file: "ecdsa/eth_addr",
                template: "PrivKeyToAddr",
                params: [64, 4]
            });

            let slicedPrivateKey = [];
            for (let i = 3; i >= 0; i--) {
                const slice = ethers.dataSlice(privateKey, i * 8, (i + 1) * 8);
                slicedPrivateKey.push(ethers.toBigInt(slice));
            }

            const wtns = await wtnsTester.calculateWitness({
                privkey: slicedPrivateKey
            });

            expect(wtns[1]).to.eq(ethers.toBigInt(wallet.address));
        });
    });
});
