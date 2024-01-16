import type { Wallet } from "ethers";

import { SellETHAddressContract } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { getCircomkit, ethers, expect } from "../setup";
import { ZkProof } from "../src/types/zkProof";
import { concatHexData, sliceHexData, uncompressedPointToXYPoint, xyPointToUncompressedPoint } from "../src/utils";

const poseidon = require("../src/poseidon/poseidon.js");
const poseidonCipher = require("../src/poseidon/poseidonCipher.js");

const circomkit = getCircomkit();

describe("ETH address market", () => {

    it("should pass constraints", async () => {
        const sharedKey = [13n, 37n];
        const poseidonNonce = 42n;
        const acc = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)));

        const wtnsTester = await circomkit.WitnessTester("sell_eth_addr", {
            file: "market/ethAddrMarket",
            template: "SellETHAddress",
            params: [64, 4],
            pubs: ["sharedKey", "encryptedPrivateECDSAKey", "poseidonNonce"]
        });

        const slicedPrivateKey = sliceHexData(acc.privateKey, 4);

        const encryptedPrivateECDSAKey = poseidonCipher.encrypt(slicedPrivateKey, sharedKey, poseidonNonce);
        const sharedKeyHash = poseidon(sharedKey);

        await wtnsTester.expectPass({
            sharedKey,
            encryptedPrivateECDSAKey,
            sharedKeyHash,
            privateECDSAKey: slicedPrivateKey,
            poseidonNonce
        }, {
            address: ethers.toBigInt(acc.address)
        });
    });

    it("should compute shared key", async () => {
        const acc1 = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)));
        const acc2 = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)));

        const sharedKey1 = acc1.signingKey.computeSharedSecret(acc2.signingKey.publicKey);
        const sharedKey2 = acc2.signingKey.computeSharedSecret(acc1.signingKey.publicKey);

        expect(sharedKey1).to.equal(sharedKey2);
    });

    describe("Contract", () => {

        async function deploy() {

            const [ owner, user1, user2 ] = await ethers.getSigners();
    
            const Verifier = await ethers.getContractFactory("contracts/Market/ETHAddressGroth16Verifier.sol:Groth16Verifier");
            const verifier = await Verifier.connect(owner).deploy();
    
            const SellETHAddress = await ethers.getContractFactory("SellETHAddressContract");
            const sellETHAddress = await SellETHAddress.connect(owner).deploy(
                verifier.target
            );
    
            return { contract: sellETHAddress, user1, user2 };
        }

        type BuyerData = {
            ecdsa: Wallet;
            sharedKey: bigint[] | undefined;
        }

        type SellerData = {
            accountToSell: Wallet;
            ecdsa: Wallet;
            price: bigint;
            nonce: bigint;
        }

        let contract: SellETHAddressContract;
        let buyer: HardhatEthersSigner;
        let seller: HardhatEthersSigner;

        let askId: bigint;
        let sellerData: SellerData;
        let buyerData: BuyerData;

        before(async () => {
            const result = await deploy();

            contract = result.contract;
            buyer = result.user1;
            seller = result.user2;

            sellerData = {
                accountToSell: new ethers.Wallet("0x4e24c60cabe22c125b1634d025f295a27337facc5a788e3f1c5544801cccd8ec"),
                ecdsa: new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32))),
                price: ethers.parseEther("1"),
                nonce: 42n
            };

            buyerData = {
                ecdsa: new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32))),
                sharedKey: undefined
            };
        });

        it("seller should be ablt to create ask", async () => {
            const createTx = await contract.connect(seller).createAsk(
                sellerData.accountToSell.address,
                sellerData.price,
                uncompressedPointToXYPoint(sellerData.ecdsa.signingKey.publicKey)
            );

            const createReceipt = await createTx.wait();

            // @ts-ignore
            askId = createReceipt?.logs?.[0]?.args[0];

            expect(createTx).to.emit(contract, "AskCreated").withArgs(
                askId, 
                sellerData.accountToSell.address,
                seller.address,
                sellerData.price
            );
        });

        it("buyer should be able to accept ask", async () => {
            const ask = await contract.asks(askId);

            buyerData.sharedKey = uncompressedPointToXYPoint(
                buyerData.ecdsa.signingKey.computeSharedSecret(
                    xyPointToUncompressedPoint(
                        await contract.getSellerPublicKeyPoint(askId)
                    )
                )
            );

            const acceptTx = await contract.connect(buyer).acceptAsk(
                askId,
                poseidon(buyerData.sharedKey),
                uncompressedPointToXYPoint(buyerData.ecdsa.signingKey.publicKey),
                { value: ask.price }
            );

            expect(acceptTx).to.emit(contract, "AskAccepted").withArgs(askId, buyer.address);
        });

        it("seller should be ablt to release ask", async () => {
            const sharedKey = uncompressedPointToXYPoint(
                sellerData.ecdsa.signingKey.computeSharedSecret(
                    xyPointToUncompressedPoint(
                        await contract.getBuyerPublicKeyPoint(askId)
                    )
                )
            );
            
            const slicedPrivateKey = sliceHexData(sellerData.accountToSell.privateKey, 4);

            const encryptedPrivateKey = poseidonCipher.encrypt(
                slicedPrivateKey,
                sharedKey,
                sellerData.nonce
            );

            const input = {
                sharedKey,
                encryptedPrivateECDSAKey: encryptedPrivateKey,
                sharedKeyHash: poseidon(sharedKey),
                privateECDSAKey: slicedPrivateKey,
                poseidonNonce: sellerData.nonce
            };

            const circuit = await circomkit.ProofTester("sell_eth_addr");

            const { proof } = (await circuit.prove(input)) as ZkProof;

            const releaseTx = await contract.connect(seller).releaseAsk(
                [ proof.pi_a[0], proof.pi_a[1] ],
                [
                    [ proof.pi_b[0][1], proof.pi_b[0][0] ],
                    [ proof.pi_b[1][1], proof.pi_b[1][0] ],
                ],
                [ proof.pi_c[0], proof.pi_c[1] ],
                askId,
                input.encryptedPrivateECDSAKey,
                input.poseidonNonce
            );

            expect(releaseTx).to.changeEtherBalance(seller, sellerData.price);
            expect(releaseTx).to.emit(contract, "AskReleased").withArgs(askId);
        });

        it("buyer should be able to decrypt private key", async () => {
            const [ encryptedPrivateKey, poseidonNonce ] = await contract.getEncryptedData(askId);

            const decryptedSlicedPrivateKey = poseidonCipher.decrypt(
                encryptedPrivateKey,
                buyerData.sharedKey,
                poseidonNonce,
                4
            );

            const decryptedPrivateKey = concatHexData(decryptedSlicedPrivateKey);

            expect(decryptedPrivateKey).to.equal(sellerData.accountToSell.privateKey);
        });
    });
});
