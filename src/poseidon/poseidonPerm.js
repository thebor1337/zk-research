const assert = require("assert");
const Scalar = require("ffjavascript").Scalar;
const ZqField = require("ffjavascript").ZqField;
const { unstringifyBigInts } = require("ffjavascript").utils;

// Prime 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
const F = new ZqField(Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617"));

// Parameters are generated by a reference script https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/generate_parameters_grain.sage
// Used like so: sage generate_parameters_grain.sage 1 0 254 2 8 56 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
const { C, M } = unstringifyBigInts(require("./poseidon_constants.json"));

// Using recommended parameters from whitepaper https://eprint.iacr.org/2019/458.pdf (table 2, table 8)
// Generated by https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/calc_round_numbers.py
// And rounded up to nearest integer that divides by t
const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63];

const pow5 = a => F.mul(a, F.square(F.square(a, a)));

function poseidonPerm(inputs) {
    assert(inputs.length > 0);
    assert(inputs.length < N_ROUNDS_P.length);

    const t = inputs.length;
    const nRoundsF = N_ROUNDS_F;
    const nRoundsP = N_ROUNDS_P[t - 2];

    let state = inputs.map(a => F.e(a));
    for (let r = 0; r < nRoundsF + nRoundsP; r++) {
        state = state.map((a, i) => F.add(a, C[t - 2][r * t + i]));

        if (r < nRoundsF / 2 || r >= nRoundsF / 2 + nRoundsP) {
            state = state.map(a => pow5(a));
        } else {
            state[0] = pow5(state[0]);
        }

        state = state.map((_, i) =>
            state.reduce((acc, a, j) => F.add(acc, F.mul(M[t - 2][i][j], a)), F.zero)
        );
    }
    return state.map((x) => F.normalize(x));
}

module.exports = poseidonPerm;