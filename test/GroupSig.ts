import { getCircomkit, ethers } from "../setup";
import { calculateMerkleRootAndPath } from "../src/TornadoCash";
import { buildMimcSponge, MimcSponge } from "circomlibjs";

const circomkit = getCircomkit();

describe("GroupSig", () => {

    // random private key
    const privateKey = 3n;
    // precomputed public key for the private key
    const publicKey = 1743099819111304389935436812860643626273764393569908358129740724793677458352n;

    let mimc: MimcSponge;

    before(async () => {
        mimc = await buildMimcSponge();
    });

    describe("Keys", () => {
        it("should generate public key", async () => {
            const wtnsTester = await circomkit.WitnessTester("PubKeyGen", {
                file: "GroupSig",
                template: "PubKeyGen"
            });
    
            await wtnsTester.expectPass({
                privateKey
            }, {
                pubKey: publicKey
            });
        });
    
        it("should verify public key", async () => {
            const wtnsTester = await circomkit.WitnessTester("PubKeyVerify", {
                file: "GroupSig",
                template: "PubKeyVerify",
                pubs: ["pubKey"]
            });
    
            await wtnsTester.expectPass({
                privateKey,
                pubKey: publicKey
            });
        });
    });

	describe("Signatures", () => {

        // message
        const msgText = "hello world";
        const msgHash = ethers.keccak256(ethers.toUtf8Bytes(msgText));

        // precomputed signature for the message
        const msgSignature = 12348768862275432504706846382161928658682464987217973622154237585723675287316n;

        it("should sign message", async () => {
            // public keys of group members
            const groupMembers = [1n, 2n, publicKey, 4n, 5n];
    
            const { root, pathElements, pathIndices } = calculateMerkleRootAndPath(mimc, 4, groupMembers, publicKey);
    
            const wtnsTester = await circomkit.WitnessTester("SignMessage", {
                file: "GroupSig",
                template: "SignMessage",
                params: [4],
                pubs: ["msgHash", "root", "pathIndices", "pathElements"]
            });

            await wtnsTester.expectPass({
                privateKey,
                msgHash: BigInt(msgHash),
                root,
                pathElements,
                pathIndices
            }, {
                msgSignature
            });
        });

        it("should reveal identity", async () => {
            const wtnsTester = await circomkit.WitnessTester("RevealIdentity", {
                file: "GroupSig",
                template: "RevealIdentity",
                pubs: ["msgHash", "msgSignature", "pubKey"]
            });

            await wtnsTester.expectPass({
                privateKey,
                pubKey: publicKey,
                msgHash: BigInt(msgHash),
                msgSignature
            });
        });
    });
});
