pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/mimc.circom";

template VerifyNFTPassword() {
    signal input password;
    signal input passwordHash;
    signal input recipient;

    component mimc = MiMC7(91);
    mimc.x_in <== password;
    mimc.k <== 0;

    passwordHash === mimc.out;

    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}