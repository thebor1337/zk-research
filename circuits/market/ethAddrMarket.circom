pragma circom 2.1.6;

include "../libs/poseidon/Decrypt.circom";
include "../libs/ecdsa/eth_addr.circom";

// Verifies that a person:
// - knows the private key of provided ETH address
// - knows preimage of hashed shared key (knows shared key itself)
// - encrypted the private key with the shared key correctly
template SellETHAddress (n, k) {
    var ciphertextLength = 1 + computeLength(k);

    // private inputs
    signal input sharedKey[2];
    signal input privateECDSAKey[k];

    // public inputs
    signal input encryptedPrivateECDSAKey[ciphertextLength]; // encrypted by Poseidon
    signal input sharedKeyHash; // hashed by Poseidon(2)
    signal input poseidonNonce; // for decrypting encryptedPrivateECDSAKey

    // outputs
    signal output address;

    var i;

    // Proving that the shared key is correct.
    // Public hash of sharedKey must be derived from the private shareKey
    component hasher = Poseidon(2);
    hasher.inputs[0] <== sharedKey[0];
    hasher.inputs[1] <== sharedKey[1];

    sharedKeyHash === hasher.out;

    // Proving that the private key is correct.
    // The address must be derived from the private key
    component genAddr = PrivKeyToAddr(n, k);
    for (i = 0; i < k; i++) {
        genAddr.privkey[i] <== privateECDSAKey[i];
    }

    address <== genAddr.addr;

    // The encryption of the private key must be correct.
    // - Provided shared key were used to encrypt the private key
    // - Original private key were used to encrypt the private key
    component encryptCheck = PoseidonEncryptCheck(k);
    encryptCheck.nonce <== poseidonNonce;
    encryptCheck.key[0] <== sharedKey[0];
    encryptCheck.key[1] <== sharedKey[1];

    for (i = 0; i < ciphertextLength; i++) {
        encryptCheck.ciphertext[i] <== encryptedPrivateECDSAKey[i];
    }

    for (i = 0; i < k; i++) {
        encryptCheck.message[i] <== privateECDSAKey[i];
    }

    encryptCheck.out === 1;
}