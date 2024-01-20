pragma circom 2.1.6;

include "./poseidon.circom";

template PoseidonHashT3() {
    var nInputs = 2;
    
    signal input inputs[nInputs];
    signal output out;

    out <== Poseidon(nInputs)(inputs);
}

template PoseidonHashT4() {
    var nInputs = 3;
    
    signal input inputs[nInputs];
    signal output out;

    out <== Poseidon(nInputs)(inputs);
}

template PoseidonHashT5() {
    var nInputs = 4;
    
    signal input inputs[nInputs];
    signal output out;

    out <== Poseidon(nInputs)(inputs);
}

template PoseidonHashT6() {
    var nInputs = 5;
    
    signal input inputs[nInputs];
    signal output out;

    out <== Poseidon(nInputs)(inputs);
}

template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    hash <== Poseidon(2)([left, right]);
}