pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/escalarmulfix.circom";

/// @notice Computes the public key from a private key for BabyJub curve
/// @param privateKey The private key
/// @return publicKey The public key (ec point) in the form [x, y]
template GenPublicKey () {
    signal input privateKey;

    signal output publicKey[2];

    component privateKeyBits = Num2Bits(253);
    privateKeyBits.in <== privateKey;

    // Generator point
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];

    component mulFix = EscalarMulFix(253, BASE8);
    for (var i = 0; i < 253; i++) {
        mulFix.e[i] <== privateKeyBits.out[i];
    }

    publicKey[0] <== mulFix.out[0];
    publicKey[1] <== mulFix.out[1];
}