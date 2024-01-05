pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/pedersen.circom";

template CommitmentHasher() {
    signal input nullifier;
    signal input secret;

    signal output commitment;
    signal output nullifierHash;

    // Pedersen(nullifier | secret)
    component commitmentHasher = Pedersen(496);
    // Pedersen(nullifier)
    component nullifierHasher = Pedersen(248);
    
    component nullifierBits = Num2Bits(248);
    nullifierBits.in <== nullifier;
    
    component secretBits = Num2Bits(248);
    secretBits.in <== secret;

    for (var i = 0; i < 248; i++) {
        nullifierHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i + 248] <== secretBits.out[i];
    }

    commitment <== commitmentHasher.out[0];
    nullifierHash <== nullifierHasher.out[0];
}
