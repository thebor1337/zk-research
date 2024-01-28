pragma circom 2.1.6;

// circomlib imports
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/escalarmulfix.circom";

// convert a private key to a public key
// @note the basepoint is the base point of the baby jubjub curve
template PrivToPubKey() {
    // Needs to be hashed, and then pruned before supplying it to the circuit
    signal input privKey;
    signal output pubKey[2];

    // convert the private key to bits
    signal privKeyBits[253] <== Num2Bits(253)(privKey);

    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];

    // perform scalar multiplication with the basepoint
    pubKey <== EscalarMulFix(253, BASE8)(privKeyBits);
}