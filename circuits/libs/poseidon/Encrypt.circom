pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/comparators.circom";

include "./Poseidon.circom";

template PoseidonEncrypt(l) {
    var inputLength = computeLength(l);

    signal input message[inputLength];
    signal input nonce;
    signal input key[2];

    signal output encrypted[inputLength + 1];

    component iterations = PoseidonEncryptIterations(l);
    iterations.nonce <== nonce;
    iterations.key[0] <== key[0];
    iterations.key[1] <== key[1];

    for (var i = 0; i < inputLength; i ++) {
        iterations.plaintext[i] <== message[i];
    }

    for (var i = 0; i < inputLength + 1; i ++) {
        encrypted[i] <== iterations.encrypted[i];
    }
}

template PoseidonEncryptPadded(l) {
    var inputLength = computeLength(l);

    signal input message[l];
    signal input nonce;
    signal input key[2];

    signal output encrypted[inputLength + 1];

    signal inputs[inputLength];

    for (var i = 0; i < inputLength; i++) {
        inputs[i] <== (i < l) ? message[i] : 0;
    }

    component iterations = PoseidonEncryptIterations(l);
    iterations.nonce <== nonce;
    iterations.key[0] <== key[0];
    iterations.key[1] <== key[1];

    for (var i = 0; i < inputLength; i ++) {
        iterations.plaintext[i] <== inputs[i];
    }

    for (var i = 0; i < inputLength + 1; i ++) {
        encrypted[i] <== iterations.encrypted[i];
    }
}

template PoseidonEncryptIterations(l) {
    var encryptedLength = computeLength(l);

    signal input plaintext[encryptedLength];
    signal input nonce;
    signal input key[2];

    signal output encrypted[encryptedLength + 1];

    var two128 = 2 ** 128;

    // The nonce must be less than 2 ^ 128
    component lt = LessThan(252);
    lt.in[0] <== nonce;
    lt.in[1] <== two128;
    lt.out === 1;

    var n = encryptedLength \ 3;

    component states[n + 1];
    
    // Iterate Poseidon on the initial state
    states[0] = PoseidonPerm(4);
    states[0].inputs[0] <== 0;
    states[0].inputs[1] <== key[0];
    states[0].inputs[2] <== key[1];
    states[0].inputs[3] <== nonce + (l * two128);

    for (var i = 0; i < n; i ++) {
        // Iterate Poseidon on the state
        states[i + 1] = PoseidonPerm(4);
        states[i + 1].inputs[0] <== states[i].out[0];
        for (var j = 0; j < 3; j ++) {
            states[i + 1].inputs[j + 1] <== plaintext[i * 3 + j] + states[i].out[j + 1];
        }

        for (var j = 0; j < 3; j ++) {
            encrypted[i * 3 + j] <== states[i + 1].inputs[j + 1];
        }
    }

    encrypted[encryptedLength] <== states[n].out[1];
}
