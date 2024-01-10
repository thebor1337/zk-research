pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";
include "../node_modules/circomlib/circuits/escalarmulfix.circom";

/// @notice Computes the public key from a private key for BabyJub curve
/// @param privateKey The private key
/// @return publicKey The public key (ec point) in the form [x, y]
template GenPublicKey () {
    signal input privateKey;

    signal output publicKey[2];

    component privateKeyBits = Num2Bits(253);
    privateKeyBits.in <== privateKey;

    // Generator point
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

/// @notice Encrypts a message using a key
/// @param msg The message to encrypt
/// @param key The key to encrypt the message with
/// @return hashedMsg The hashed message
/// @return encodedKey The encoded key (needed for decryption)
template Encrypt () {
    signal input msg;
    signal input key;

    signal output hashedMsg;
    signal output encodedKey;

    component mimc = MultiMiMC7(1, 91);
    mimc.in[0] <== msg;
    mimc.k <== 0;
    hashedMsg <== mimc.out;

    component encoder = MiMC7(91);
    encoder.x_in <== key;
    encoder.k <== hashedMsg;

    encodedKey <== msg + encoder.out;
}

/// @notice Decrypts a message using a key
/// @param hashedMsg The hashed message
/// @param encodedKey The encoded key
/// @param key The key that was used to encrypt the message
/// @return msg The decrypted message
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

/// @notice Computes the shared key between two parties
/// @param privateKey The private key of one of the parties
/// @param publicKey The public key (ec point) of the other party in the form [x, y]
/// @return sharedKey The shared key
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

    // Diffie-Helman shared key is the x coordinate of the result point
    sharedKey <== mul.out[0];
}

/// @notice Encrypts a message using a key, private key and public key
/// @param privateKey The private key of the sender
/// @param publicKey The public key (ec point) of the receiver in the form [x, y]
/// @param msg The message to encrypt
/// @return hashedMsg The hashed message
/// @return encodedKey The encoded key (needed for decryption)
template Encryption () {
    signal input privateKey;
    signal input publicKey[2]; // x, y

    signal input msg;

    signal output hashedMsg;
    signal output encodedKey;

    component ecdh = ECDH();
    ecdh.privateKey <== privateKey;
    ecdh.publicKey[0] <== publicKey[0];
    ecdh.publicKey[1] <== publicKey[1];

    component encrypt = Encrypt();
    encrypt.msg <== msg;
    encrypt.key <== ecdh.sharedKey;

    hashedMsg <== encrypt.hashedMsg;
    encodedKey <== encrypt.encodedKey;
}

/// @notice Decrypts a message using a key, private key and public key
/// @param privateKey The private key of the receiver
/// @param publicKey The public key (ec point) of the sender in the form [x, y]
/// @param hashedMsg The hashed message
/// @param encodedKey The encoded key
/// @return msg The decrypted message
template Decryption () {
    signal input privateKey;
    signal input publicKey[2];

    signal input hashedMsg;
    signal input encodedKey;

    signal output msg;

    component ecdh = ECDH();
    ecdh.privateKey <== privateKey;
    ecdh.publicKey[0] <== publicKey[0];
    ecdh.publicKey[1] <== publicKey[1];

    component decrypt = Decrypt();
    decrypt.hashedMsg <== hashedMsg;
    decrypt.encodedKey <== encodedKey;
    decrypt.key <== ecdh.sharedKey;

    msg <== decrypt.msg;
}
