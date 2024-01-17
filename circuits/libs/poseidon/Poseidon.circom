pragma circom 2.0.0;

include "./poseidonConstants.circom";

// e.g. l = 4; length = 6
function computeLength(l) {
    var length = l;
    while (length % 3 != 0) {
        length += 1;
    }
    return length;
}

template Sigma() {
    signal input in;
    signal output out;

    signal in2;
    signal in4;

    in2 <== in*in;
    in4 <== in2*in2;

    out <== in4*in;
}

template Ark(t, C, r) {
    signal input in[t];
    signal output out[t];

    for (var i=0; i<t; i++) {
        out[i] <== in[i] + C[i + r];
    }
}

template Mix(t, M) {
    signal input in[t];
    signal output out[t];

    var lc;
    for (var i=0; i<t; i++) {
        lc = 0;
        for (var j=0; j<t; j++) {
            lc += M[i][j]*in[j];
        }
        out[i] <== lc;
    }
}

template Poseidon(nInputs) {
    signal input inputs[nInputs];
    signal output out;

    component strategy = PoseidonPerm(nInputs + 1);
    strategy.inputs[0] <== 0;
    for (var i = 0; i < nInputs; i ++) {
        strategy.inputs[i + 1] <== inputs[i];
    }
    out <== strategy.out[0];
}

template PoseidonPerm(t) {
    // Using recommended parameters from whitepaper https://eprint.iacr.org/2019/458.pdf (table 2, table 8)
    // Generated by https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/calc_round_numbers.py
    // And rounded up to nearest integer that divides by t
    var N_ROUNDS_P[16] = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];
    var nRoundsF = 8;
    var nRoundsP = N_ROUNDS_P[t - 2];
    var C[t*(nRoundsF + nRoundsP)] = POSEIDON_C(t);
    var M[t][t] = POSEIDON_M(t);

    signal input inputs[t];
    signal output out[t];

    component ark[nRoundsF + nRoundsP];
    component sigmaF[nRoundsF][t];
    component sigmaP[nRoundsP];
    component mix[nRoundsF + nRoundsP];

    var k;

    for (var i=0; i<nRoundsF + nRoundsP; i++) {
        ark[i] = Ark(t, C, t*i);
        for (var j=0; j<t; j++) {
            if (i==0) {
                ark[i].in[j] <== inputs[j];
            } else {
                ark[i].in[j] <== mix[i-1].out[j];
            }
        }

        if (i < nRoundsF/2 || i >= nRoundsP + nRoundsF/2) {
            k = i < nRoundsF/2 ? i : i - nRoundsP;
            mix[i] = Mix(t, M);
            for (var j=0; j<t; j++) {
                sigmaF[k][j] = Sigma();
                sigmaF[k][j].in <== ark[i].out[j];
                mix[i].in[j] <== sigmaF[k][j].out;
            }
        } else {
            k = i - nRoundsF/2;
            mix[i] = Mix(t, M);
            sigmaP[k] = Sigma();
            sigmaP[k].in <== ark[i].out[0];
            mix[i].in[0] <== sigmaP[k].out;
            for (var j=1; j<t; j++) {
                mix[i].in[j] <== ark[i].out[j];
            }
        }
    }

    // Output the final state.
    for (var i = 0; i < t; i ++) {
        out[i] <== mix[nRoundsF + nRoundsP -1].out[i];
    }
}