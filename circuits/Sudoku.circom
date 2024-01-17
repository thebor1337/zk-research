pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "circomlib/circuits/binsum.circom";

template InRange(nBits) {
    signal input value;
    signal input lower;
    signal input upper;

    signal output out;

    component lessEqThan = LessEqThan(nBits);
    lessEqThan.in[0] <== value;
    lessEqThan.in[1] <== upper;

    component greaterEqThan = GreaterEqThan(nBits);
    greaterEqThan.in[0] <== value;
    greaterEqThan.in[1] <== lower;

    out <== lessEqThan.out * greaterEqThan.out;
}

template ContainsOnlyUnique(size) {
    signal input ins[size];

    component isEqual[size][size];
    
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            isEqual[i][j] = IsEqual();
            isEqual[i][j].in[0] <== ins[i];
            isEqual[i][j].in[1] <== (i == j) ? 0 : ins[j];
            isEqual[i][j].out === 0;
        }
    }
}

template CheckSudoku(size, subSize) {
    assert(size == subSize ** 2);

    signal input question[size][size];
    signal input solution[size][size];

    component inRange[size][size];

    var sizeInBits = nbits(size);

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            inRange[i][j] = InRange(sizeInBits);
            inRange[i][j].value <== solution[i][j];
            inRange[i][j].lower <== 1;
            inRange[i][j].upper <== size;
            inRange[i][j].out === 1;
        }
    }

    component isZero[size][size];
    component isEqual[size][size];
    component checkConsistency[size][size];

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            isEqual[i][j] = IsEqual();
            isEqual[i][j].in[0] <== question[i][j];
            isEqual[i][j].in[1] <== solution[i][j];

            isZero[i][j] = IsZero();
            isZero[i][j].in <== question[i][j];
            
            checkConsistency[i][j] = OR();
            checkConsistency[i][j].a <== isEqual[i][j].out;
            checkConsistency[i][j].b <== isZero[i][j].out;

            checkConsistency[i][j].out === 1;
        }
    }

    component containsAllByRows[size];
    component containsAllByColumns[size];
    component containsAllBySquares[size];

    for (var i = 0; i < size; i++) {
        containsAllByRows[i] = ContainsOnlyUnique(size);
        containsAllByColumns[i] = ContainsOnlyUnique(size);
        containsAllBySquares[i] = ContainsOnlyUnique(size);
    }

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            containsAllByRows[i].ins[j] <== solution[i][j];
            containsAllByColumns[i].ins[j] <== solution[j][i];
        }
    }

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            containsAllBySquares[
                (i \ subSize) * subSize + (j \ subSize)
            ].ins[
                (i % subSize) * subSize + (j % subSize)
            ] <== solution[i][j];
        }
    }
}
