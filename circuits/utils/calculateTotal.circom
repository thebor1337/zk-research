pragma circom 2.0.0;

// This circuit returns the sum of the inputs.
// n must be greater than 0.
template CalculateTotal(n) {
    signal input in[n];
    signal output out;

    signal sums[n];
    sums[0] <== in[0];

    for (var i = 1; i < n; i++) {
        sums[i] <== sums[i - 1] + in[i];
    }

    out <== sums[n - 1];
}