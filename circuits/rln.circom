pragma circom 2.1.6;

// Refer to: https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

include "./libs/poseidon/poseidon.circom";
include "./libs/trees/incrementalMerkleTree.circom";

// N is the maximum number of bits the input might have
// Checks if the input is in the range [0, limit)
template RangeCheck(nBits) {
    assert(nBits < 253);

    signal input in;
    signal input limit;

    // Checks if the input has desired number of bits
    _ <== Num2Bits(nBits)(in);

    signal lt <== LessThan(nBits)([in, limit]);
    
    lt === 1;
}

template RLN (treeDepth, nBits) {
    // Private inputs
    signal input identitySecret;
    signal input signalLimit;
    signal input signalId;
    signal input pathElements[treeDepth];
    signal input pathIndices[treeDepth];

    // Public inputs
    signal input x;
    signal input externalNullifier;

    // Outputs
    signal output root;
    signal output nullifier; 
    signal output y;

    // Computing user's commitment that's supposed to be in the Merkle Tree
    signal identityCommitment <== Poseidon(1)([identitySecret]);
    signal rateCommitment <== Poseidon(2)([identityCommitment, signalLimit]);

    // Proof of membership
    // @note Check if the rateCommitment of a user is in the Merkle Tree
    root <== MerkleTreeInclusionProof(treeDepth)(
        leaf <== rateCommitment,
        path_elements <== pathElements,
        path_index <== pathIndices
    );

    // Proof that the limit is not exceeded
    // @note Check if the signalId is in the range [0, signalLimit)
    RangeCheck(nBits)(
        in <== signalId,
        limit <== signalLimit
    );

    // Shamir Secret Sharing
    signal a1 <== Poseidon(3)([identitySecret, externalNullifier, signalId]);
    // y = a0 + a1 * x
    y <== identitySecret + a1 * x;

    // Computing nullifier
    // @note If the computed nullifier has been already used before,
    // it means that the user has already used the signalId during the current epoch (encoded inside the externalNullifier)
    // So other users are able to detect duplicated nullifiers and reveal the identitySecret
    nullifier <== Poseidon(1)([a1]);
}