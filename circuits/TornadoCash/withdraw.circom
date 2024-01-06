pragma circom 2.0.0;

include "commitmentHasher.circom";
include "../utils/merkleTree.circom";

template Withdraw(treeLevels) {
    signal input nullifier;
    signal input secret;

    // merkle proof for the commitment
    signal input pathElements[treeLevels];
    // 0 - left, 1 - right
    signal input pathIndices[treeLevels];

    signal input root; // public
    signal input nullifierHash; // public
    signal input recipient; // public

    component commitmentHasher = CommitmentHasher();
    commitmentHasher.nullifier <== nullifier;
    commitmentHasher.secret <== secret;

    // checks whether the provided commitment matches the one derived from the secret and nullifier inputs
    nullifierHash === commitmentHasher.nullifierHash;

    component merkleTreeChecker = MerkleTreeChecker(treeLevels);
    merkleTreeChecker.leaf <== commitmentHasher.commitment;
    merkleTreeChecker.root <== root;

    for (var i = 0; i < treeLevels; i++) {
        merkleTreeChecker.pathElements[i] <== pathElements[i];
        merkleTreeChecker.pathIndices[i] <== pathIndices[i];
    }

    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}