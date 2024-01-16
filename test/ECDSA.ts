import { getCircomkit, ethers, expect } from "../setup";
import { sliceHexData } from "../src/utils";

const circomkit = getCircomkit();

describe("ECDSA", () => {

    it("should derive public key from private key", async () => {

        const privateKey = "0x4e24c60cabe22c125b1634d025f295a27337facc5a788e3f1c5544801cccd8ec";
        const computedPublicAddress = "0x4d070e615042aDA49De9aa16Ac5E71A51a7b8A09";

        const wallet = new ethers.Wallet(privateKey);

        expect(wallet.address).to.eq(computedPublicAddress);

        const wtnsTester = await circomkit.WitnessTester("eth_addr", {
            file: "libs/ecdsa/eth_addr",
            template: "PrivKeyToAddr",
            params: [64, 4]
        });

        const slicedPrivateKey = sliceHexData(privateKey, 4);

        await wtnsTester.expectPass({
            privkey: slicedPrivateKey
        }, {
            addr: ethers.toBigInt(wallet.address)
        });
    });
});
