pragma circom 2.1.6;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/escalarmulany.circom";

/// @notice Computes the shared key between two parties
/// @param privateKey The private key of one of the parties
/// @param publicKey The public key (ec point) of the other party in the form [x, y]
/// @return sharedKey The shared key
template ECDH () {
    signal input privateKey;
    signal input publicKey[2];

    signal output sharedKey;

    var N = 253;

    component privateKeyBits = Num2Bits(N);
    privateKeyBits.in <== privateKey;

    component mul = EscalarMulAny(N);
    mul.p[0] <== publicKey[0];
    mul.p[1] <== publicKey[1];

    for (var i = 0; i < N; i++) {
        mul.e[i] <== privateKeyBits.out[i];
    }

    // Diffie-Helman shared key is the x coordinate of the result point
    sharedKey <== mul.out[0];
}