pragma circom 2.1.6;

include "circomlib/mimc.circom";
include "circomlib/bitify.circom";
include "circomlib/escalarmulany.circom";
include "circomlib/escalarmulfix.circom";

template GenPublicKey () {
    signal input privateKey;

    signal output publicKey[2];

    component privateKeyBits = Num2Bits(253);
    privateKeyBits.in <== privateKey;

    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];

    component mulFix = EscalarMulFix(253, BASE8);
    for (var i = 0; i < 253; i++) {
        mulFix.e[i] <== privateKeyBits.out[i];
    }

    publicKey[0] <== mulFix.out[0];
    publicKey[1] <== mulFix.out[1];
}

template ProofOfDivisibleBy2 () {
    signal input in;
    signal output out;

    signal intDiv <-- in \ 2;

    // in === intDiv * 2 + 1;
    in === intDiv * 2;

    out <== intDiv;
}

template ComputeHash () {
    signal input data;

    signal output hash;

    component hasher = MiMC7(91);
    hasher.x_in <== data;
    hasher.k <== 0;

    hash <== hasher.out;
}

template Encrypt () {
    signal input msg;
    signal input key;

    signal output hashedMsg;
    signal output encodedKey;

    component msgHasher = ComputeHash();
    msgHasher.data <== msg;
    hashedMsg <== msgHasher.hash;

    component encoder = MiMC7(91);
    encoder.x_in <== key;
    encoder.k <== hashedMsg;

    encodedKey <== msg + encoder.out;
}

template Decrypt () {
    signal input hashedMsg;
    signal input encodedKey;
    signal input key;

    signal output msg;

    component decoder = MiMC7(91);
    decoder.x_in <== key;
    decoder.k <== hashedMsg;

    msg <== encodedKey - decoder.out;
}

template ECDH () {
    signal input privateKey;
    signal input publicKey[2];

    signal output sharedKey;

    var N = 253;

    component privateKeyBits = Num2Bits(N);
    privateKeyBits.in <== privateKey;

    component mul = EscalarMulAny(N);
    mul.p[0] <== publicKey[0];
    mul.p[1] <== publicKey[1];

    for (var i = 0; i < N; i++) {
        mul.e[i] <== privateKeyBits.out[i];
    }

    sharedKey <== mul.out[0];
}

template Withdraw () {
    signal input data; // private
    signal input hashedData; // public

    signal input privateKey; // private
    signal input publicKey[2]; // public
    signal input hashedSharedKey; // public

    signal output encryptedData;

    // assertion proof
    signal intDivision <-- data \ 2;
    // fail when divisible by 2
    data === intDivision * 2 + 1;

    // useful when it's needed to prevent values which are divisible by 2
    // data === intDivision * 2;

    component ecdh = ECDH();
    ecdh.privateKey <== privateKey;
    ecdh.publicKey[0] <== publicKey[0];
    ecdh.publicKey[1] <== publicKey[1];

    signal sharedKey <== ecdh.sharedKey;

    component sharedKeyHasher = ComputeHash();
    sharedKeyHasher.data <== sharedKey;

    component encryptData = Encrypt();
    encryptData.msg <== data;
    encryptData.key <== sharedKey;

    // commitment proof
    sharedKeyHasher.hash === hashedSharedKey;
    encryptData.hashedMsg === hashedData;

    // encryption proof (?)
    encryptedData <== encryptData.encodedKey;
}

component main { public [ hashedData, publicKey, hashedSharedKey ] } = Withdraw ();

/* INPUT = {
    "data": "41",
    "hashedData": "18969817064755530001648236191567197193654869622285414953508373282382988504407",
    "privateKey": "1",
    "publicKey": ["10031262171927540148667355526369034398030886437092045105752248699557385197826", "633281375905621697187330766174974863687049529291089048651929454608812697683"],
    "hashedSharedKey": "21538517795935221596515646979118663327016331967877142786987099684751565012566"
} */

// component main = Decrypt();
// INPUT = {
//     "hashedMsg": "18969817064755530001648236191567197193654869622285414953508373282382988504407",
//     "encodedKey": "20064784761506752690120258634982972647531573759836815277586328886054816326574",
//     "key": "10031262171927540148667355526369034398030886437092045105752248699557385197826"
// }

// Credentials:
//
// === Alice
// PrivateKey: "1"
// PublicKey: ["5299619240641551281634865583518297030282874472190772894086521144482721001553", "16950150798460657717958625567821834550301663161624707787222815936182638968203"]
// SharedKey: "10031262171927540148667355526369034398030886437092045105752248699557385197826"
//
// === Bob
// PrivateKey: "2"
// PublicKey: ["10031262171927540148667355526369034398030886437092045105752248699557385197826", "633281375905621697187330766174974863687049529291089048651929454608812697683"]
// SharedKey: "10031262171927540148667355526369034398030886437092045105752248699557385197826"
//
// SharedKey hashed: "21538517795935221596515646979118663327016331967877142786987099684751565012566"
// Data: "43"
// Hashed data: "18969817064755530001648236191567197193654869622285414953508373282382988504407"
//
// Encrypted data: "20064784761506752690120258634982972647531573759836815277586328886054816326574"