pragma circom 2.0.0;

include "circomlib/circuits/mimcsponge.circom";

template Hasher() {
    signal input left;
    signal input right;

    signal output hash;

    component hasher = MiMCSponge(2, 220, 1);
    hasher.ins[0] <== left;
    hasher.ins[1] <== right;
    hasher.k <== 0;

    hash <== hasher.outs[0];
}

// s = 0 => [in[0], in[1]]
// s = 1 => [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    // s is binary
    s * (1 - s) === 0;

    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

template MerkleTreeChecker(treeLevels) {
    signal input leaf;
    // root to compare
    signal input root;

    // merkle proof
    signal input pathElements[treeLevels];
    // 0 - left, 1 - right
    signal input pathIndices[treeLevels];

    component selectors[treeLevels];
    component hashers[treeLevels];

    for (var i = 0; i < treeLevels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== (i == 0) ? leaf : hashers[i - 1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = Hasher();
        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }

    root === hashers[treeLevels - 1].hash;
}

// component main = MerkleTreeChecker(10)