pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";
include "./utils/ecdh.circom";

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
