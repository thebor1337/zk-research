pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/comparators.circom";

include "../../utils/calculateTotal.circom";
include "./poseidon.circom";

template PoseidonDecrypt(l) {
    var decryptedLength = computeLength(l);

    signal input ciphertext[decryptedLength + 1];
    signal input nonce;
    signal input key[2];

    signal output decrypted[decryptedLength];

    component iterations = PoseidonDecryptIterations(l);
    iterations.nonce <== nonce;
    iterations.key[0] <== key[0];
    iterations.key[1] <== key[1];

    for (var i = 0; i < decryptedLength + 1; i ++) {
        iterations.ciphertext[i] <== ciphertext[i];
    }

    // Check the last ciphertext element
    iterations.decryptedLast === ciphertext[decryptedLength];

    for (var i = 0; i < decryptedLength; i ++) {
        decrypted[i] <== iterations.decrypted[i];
    }

    // If length > 3, check if the last (3 - (l mod 3)) elements of the message
    // are 0
    if (l % 3 > 0) {
        if (l % 3 == 2) {
            decrypted[decryptedLength - 1] === 0;
        } else if (l % 3 == 2) {
            decrypted[decryptedLength - 1] === 0;
            decrypted[decryptedLength - 2] === 0;
        }
    }
}

// Decrypt a ciphertext without checking if the last ciphertext element or
// whether the last 3 - (l mod 3) elements are 0. This is useful in
// applications where you do not want an invalid decryption to prevent the
// generation of a proof.
template PoseidonDecryptWithoutCheck(l) {
    var decryptedLength = computeLength(l);

    signal input ciphertext[decryptedLength + 1];
    signal input nonce;
    signal input key[2];
    signal output decrypted[decryptedLength];

    component iterations = PoseidonDecryptIterations(l);
    iterations.nonce <== nonce;
    iterations.key[0] <== key[0];
    iterations.key[1] <== key[1];
    for (var i = 0; i < decryptedLength + 1; i ++) {
        iterations.ciphertext[i] <== ciphertext[i];
    }

    for (var i = 0; i < decryptedLength; i ++) {
        decrypted[i] <== iterations.decrypted[i];
    }
}

template PoseidonDecryptIterations(l) {
    var decryptedLength = l;
    while (decryptedLength % 3 != 0) {
        decryptedLength += 1;
    }
    // e.g. if l == 4, decryptedLength == 6

    signal input ciphertext[decryptedLength + 1];
    signal input nonce;
    signal input key[2];

    signal output decrypted[decryptedLength];
    signal output decryptedLast;

    var two128 = 2 ** 128;

    // The nonce must be less than 2 ^ 128
    component lt = LessThan(252);
    lt.in[0] <== nonce;
    lt.in[1] <== two128;
    lt.out === 1;

    var n = (decryptedLength + 1) \ 3;

    component states[n + 1];

    // Iterate Poseidon on the initial state
    states[0] = PoseidonPerm(4);
    states[0].inputs[0] <== 0;
    states[0].inputs[1] <== key[0];
    states[0].inputs[2] <== key[1];
    states[0].inputs[3] <== nonce + (l * two128);

    for (var i = 0; i < n; i ++) {
        // Release three elements of the message
        for (var j = 0; j < 3; j ++) {
            decrypted[i * 3 + j] <== ciphertext[i * 3 + j] - states[i].out[j + 1];
        }

        // Iterate Poseidon on the state
        states[i + 1] = PoseidonPerm(4);
        states[i + 1].inputs[0] <== states[i].out[0];
        for (var j = 0; j < 3; j ++) {
            states[i + 1].inputs[j + 1] <== ciphertext[i * 3 + j];
        }
    }

    decryptedLast <== states[n].out[1];
}

// Modified:
// Checks ciphertext is correctly generated using input values, returns 1 if true
// Note to self: message length (l) is always fixed in my use case
template PoseidonEncryptCheck(l) {
    var encryptedLength = computeLength(l) + 1;

    // public inputs
    signal input nonce;
    signal input ciphertext[encryptedLength];

    // private inputs, where hash(input) are public
    signal input message[l];
    signal input key[2];

    // Returns 1 or 0
    signal output out;

    component pd = PoseidonDecrypt(l);
    pd.nonce <== nonce;
    pd.key[0] <== key[0];
    pd.key[1] <== key[1];

    for (var i = 0; i < encryptedLength ; i++) {
        pd.ciphertext[i] <== ciphertext[i];
    }
    
    component calcTotal = CalculateTotal(l);
    component eqs[l];

    for (var i = 0; i < l; i++) {
        eqs[i] = IsEqual();
        eqs[i].in[0] <== message[i];
        eqs[i].in[1] <== pd.decrypted[i];
        calcTotal.in[i] <== eqs[i].out;
    }

    component o = IsEqual();
    o.in[0] <== calcTotal.out;
    o.in[1] <== l;
    
    out <== o.out;
}