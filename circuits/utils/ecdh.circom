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

    signal output sharedKey[2];

    component privateKeyBits = Num2Bits(253);
    privateKeyBits.in <== privateKey;

    component mul = EscalarMulAny(253);
    mul.p[0] <== publicKey[0];
    mul.p[1] <== publicKey[1];

    for (var i = 0; i < 253; i++) {
        mul.e[i] <== privateKeyBits.out[i];
    }

    sharedKey[0] <== mul.out[0];
    sharedKey[1] <== mul.out[1];
}