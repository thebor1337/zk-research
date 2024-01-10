pragma circom 2.1.6;

template IsZero() {
    signal input in;
    signal output o;

    signal inv;

    inv <-- (in == 0) ? 0 : 1 / in;
    o <== -inv * in + 1;
    in * o === 0;
}

template IsZeroUnderconstrained() {
    signal input in;
    signal output o;

    signal inv;

    inv <-- (in == 0) ? 0 : 1 / in;
    o <== -inv * in + 1;

    // make it underconstrained intentionally
    // o * inv === 0;
}
