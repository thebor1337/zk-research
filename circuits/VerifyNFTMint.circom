pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template VerifyPreimage() {
    signal input preimage;
    signal input hash;

    component hasher = Poseidon(1);
    hasher.inputs[0] <== preimage;

    hasher.out === hash;
}

template VerifyNFTMint1() {
    signal input password;
    signal input passwordHash;
    signal input recipient;

    component checkPassword = VerifyPreimage();
    checkPassword.preimage <== password;
    checkPassword.hash <== passwordHash;

    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

template VerifyNFTMint2() {
    signal input password;
    signal input passwordHash;
    signal input recipient;

    signal output nullifier;

    component checkPassword = VerifyPreimage();
    checkPassword.preimage <== password;
    checkPassword.hash <== passwordHash;

    component genNullifier = Poseidon(2);
    genNullifier.inputs[0] <== passwordHash;
    genNullifier.inputs[1] <== recipient;

    nullifier <== genNullifier.out;
}