pragma circom 2.1.6;

include "./libs/eddsa/privToPubKey.circom";
include "./libs/eddsa/verifySignature.circom";
include "./libs/poseidon/poseidon.circom";
include "./libs/poseidon/decrypt.circom";
include "./utils/ecdh.circom";

// Takes encrypted message with length `l` combined with EdDSA signature (message[0:l], R8x, R8y, S), 
// sender's public key, receiver's private key
// Returns original message with length `l`
template PoseidonEdDSADecrypt(l) {
    var encodedLength = l + 3;
    var decryptedLength = computeLength(encodedLength);
    var ciphertextLength = decryptedLength + 1;

    signal input ciphertext[ciphertextLength];
    signal input senderPubKey[2];
    signal input receiverPrivKey;

    signal output message[l];

    var i;

    signal sharedKey[2] <== ECDH()(
        privateKey <== receiverPrivKey,
        publicKey <== senderPubKey
    );

    signal decrypted[decryptedLength] <== PoseidonDecrypt(encodedLength)(
        ciphertext <== ciphertext,
        nonce <== 0,
        key <== sharedKey
    );

    component messageHasher = Poseidon(l);
    for (i = 0; i < l; i++) {
        messageHasher.inputs[i] <== decrypted[i];
    }

    signal signatureValid <== EdDSAPoseidonVerifier()(
        Ax <== senderPubKey[0],
        Ay <== senderPubKey[1],
        R8x <== decrypted[l],
        R8y <== decrypted[l + 1],
        S <== decrypted[l + 2],
        M <== messageHasher.out
    );

    signatureValid === 1;

    for (i = 0; i < l; i++) {
        message[i] <== decrypted[i];
    }
}
