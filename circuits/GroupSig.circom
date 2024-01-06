pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/mimcsponge.circom";
include "./utils/merkleTree.circom";

template PubKeyGen () {
    signal input privateKey;
    signal output pubKey;

    component pkGen = MiMCSponge(1, 220, 1);
    pkGen.ins[0] <== privateKey;
    pkGen.k <== 0;

    pubKey <== pkGen.outs[0];
}

template PubKeyVerify () {
    signal input privateKey;
    signal input pubKey;

    component pkGen = PubKeyGen();
    pkGen.privateKey <== privateKey;

    pkGen.pubKey === pubKey;
}

template SignMessage (nLevels) {
    signal input privateKey;

    signal input msgHash;
    signal input root;
    signal input pathElements[nLevels];
    signal input pathIndices[nLevels];

    signal output msgSignature;

    component pkGen = PubKeyGen();
    pkGen.privateKey <== privateKey;

    component merkleTree = MerkleTreeChecker(nLevels);
    merkleTree.leaf <== pkGen.pubKey;
    merkleTree.root <== root;
    merkleTree.pathElements <== pathElements;
    merkleTree.pathIndices <== pathIndices;

    component sigGen = MiMCSponge(2, 220, 1);
    sigGen.ins[0] <== msgHash;
    sigGen.ins[1] <== pkGen.pubKey;
    sigGen.k <== 0;

    msgSignature <== sigGen.outs[0];    
}

template RevealIdentity () {
    signal input privateKey;

    signal input pubKey;
    signal input msgHash;
    signal input msgSignature;

    component pkGen = PubKeyGen();
    pkGen.privateKey <== privateKey;

    pkGen.pubKey === pubKey;

    component sigGen = MiMCSponge(2, 220, 1);
    sigGen.ins[0] <== msgHash;
    sigGen.ins[1] <== pubKey;
    sigGen.k <== 0;

    msgSignature === sigGen.outs[0];  
}
