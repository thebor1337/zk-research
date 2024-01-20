pragma circom 2.0.0;

// Refer to: https://github.com/privacy-scaling-explorations/maci/blob/dev/circuits/circom/trees/incrementalMerkleTree.circom

include "circomlib/circuits/mux1.circom";

include "../poseidon/hasher.circom";

// recompute a merkle root from a leaf and a path
template MerkleTreeInclusionProof(n_levels) {
    signal input leaf;
    signal input path_index[n_levels];
    signal input path_elements[n_levels];

    signal output root;

    component hashers[n_levels];
    component mux[n_levels];

    signal levelHashes[n_levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < n_levels; i++) {
        // Should be 0 or 1
        path_index[i] * (1 - path_index[i]) === 0;

        hashers[i] = HashLeftRight();
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== path_elements[i];

        mux[i].c[1][0] <== path_elements[i];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== path_index[i];
        
        hashers[i].left <== mux[i].out[0];
        hashers[i].right <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].hash;
    }

    root <== levelHashes[n_levels];
}

// Ensures that a leaf exists within a merkletree with given `root`
template MerkleTreeLeafExists(levels){
    signal input leaf;

    signal input path_elements[levels];
    signal input path_index[levels];

    signal input root;

    signal computedRoot <== MerkleTreeInclusionProof(levels)(
        leaf <== leaf,
        path_index <== path_index,
        path_elements <== path_elements
    );

    root === computedRoot;
}

// Given a Merkle root and a list of leaves, check if the root is the
// correct result of inserting all the leaves into the tree (in the given
// order)
template MerkleTreeCheckRoot(levels) {
    // The total number of leaves
    var totalLeaves = 2 ** levels;

    // The number of HashLeftRight components which will be used to hash the
    // leaves
    var numLeafHashers = totalLeaves / 2;

    // The number of HashLeftRight components which will be used to hash the
    // output of the leaf hasher components
    var numIntermediateHashers = numLeafHashers - 1;

    // Inputs to the snark
    signal input leaves[totalLeaves];

    // The output
    signal output root;

    // The total number of hashers
    var numHashers = totalLeaves - 1;
    component hashers[numHashers];

    // Instantiate all hashers
    var i;
    for (i = 0; i < numHashers; i++) {
        hashers[i] = HashLeftRight();
    }

    // Wire the leaf values into the leaf hashers
    for (i = 0; i < numLeafHashers; i++){
        hashers[i].left <== leaves[i * 2];
        hashers[i].right <== leaves[i * 2 + 1];
    }

    // Wire the outputs of the leaf hashers to the intermediate hasher inputs
    var k = 0;
    for (i = numLeafHashers; i < numLeafHashers + numIntermediateHashers; i++) {
        hashers[i].left <== hashers[k * 2].hash;
        hashers[i].right <== hashers[k * 2 + 1].hash;
        k++;
    }

    // Wire the output of the final hash to this circuit's output
    root <== hashers[numHashers - 1].hash;
}