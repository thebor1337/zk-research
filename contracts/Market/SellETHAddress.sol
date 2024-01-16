// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[10] memory input
    ) external view returns (bool);
}

contract SellETHAddressContract {

    enum State {
        NotExists,
        Created,
        Released
    }

    struct Ask {
        State state;
        address addr;
        address buyer;
        uint256 price;
        uint256 sharedKeyCommitment;
        uint256 poseidonNonce;
        uint256[2] sellerPublicKey;
        uint256[2] buyerPublicKey;
        uint256[7] encryptedPrivateKey;
    }

    IVerifier immutable public verifier;

    mapping(uint256 => Ask) public asks;

    uint256 nextAskId;

    event AskCreated(uint256 indexed id, address indexed _address, address _seller, uint256 _price);
    event AskAccepted(uint256 indexed id, address _buyer);
    event AskDenied(uint256 indexed id);
    event AskReleased(uint256 indexed id);

    constructor(IVerifier _verifier) {
        verifier = _verifier;
    }
    
    function createAsk(
        address _address, 
        uint256 _price,
        uint256[2] calldata _publicKey
    ) external {
        uint256 _nextAskId = nextAskId++;

        Ask storage ask = asks[_nextAskId];

        ask.state = State.Created;
        ask.addr = _address;
        ask.price = _price;
        ask.sellerPublicKey = _publicKey;

        emit AskCreated(_nextAskId, _address, msg.sender, _price);
    }

    function acceptAsk(
        uint256 _askId, 
        uint256 _sharedKeyCommitment,
        uint256[2] calldata _publicKey
    ) external payable {
        Ask storage ask = asks[_askId];

        require(ask.state == State.Created, "Unexpected state");
        require(msg.value == ask.price, "Not enough assets");

        ask.buyer = msg.sender;
        ask.sharedKeyCommitment = _sharedKeyCommitment;
        ask.buyerPublicKey = _publicKey;

        emit AskAccepted(_askId, msg.sender);
    }

    function denyAsk(uint256 _askId) external {
        require(askExists(_askId), "Ask not found");

        Ask storage ask = asks[_askId];

        require(ask.buyer == msg.sender, "Not a buyer");

        ask.buyer = address(0);

        (bool success, ) = ask.buyer.call{value: ask.price}("");
        require(success, "Transfer failed");

        emit AskDenied(_askId);
    }

    function releaseAsk(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256 _askId,
        uint256[7] memory _encryptedPrivateKey,
        uint256 _poseidonNonce
    ) external {
        Ask storage ask = asks[_askId];

        require(ask.state == State.Created, "Unexpected state");
        require(ask.buyer != address(0), "Not accepted");

        ask.state = State.Released;

        (bool success, ) = msg.sender.call{value: ask.price}("");
        require(success, "Transfer failed");

        require(verifier.verifyProof(a, b, c, [
            uint256(uint160(ask.addr)),
            _encryptedPrivateKey[0],
            _encryptedPrivateKey[1],
            _encryptedPrivateKey[2],
            _encryptedPrivateKey[3],
            _encryptedPrivateKey[4],
            _encryptedPrivateKey[5],
            _encryptedPrivateKey[6],
            ask.sharedKeyCommitment,
            _poseidonNonce
        ]), "Invalid proof");

        ask.poseidonNonce = _poseidonNonce;
        ask.encryptedPrivateKey = _encryptedPrivateKey;

        emit AskReleased(_askId);
    }

    function getBuyerPublicKeyPoint(uint256 _askId) external view returns(uint256[2] memory) {
        Ask storage ask = asks[_askId];
        require(ask.state != State.NotExists, "Ask not exists");
        require(ask.buyer != address(0), "No buyer");
        return ask.buyerPublicKey;
    }

    function getSellerPublicKeyPoint(uint256 _askId) external view returns(uint256[2] memory) {
        Ask storage ask = asks[_askId];
        require(ask.state != State.NotExists, "Ask not exists");
        return ask.sellerPublicKey;
    }

    function getEncryptedData(uint256 _askId) external view returns(uint256[7] memory, uint256) {
        Ask storage ask = asks[_askId];
        require(ask.state == State.Released, "Not released yet");
        return (ask.encryptedPrivateKey, ask.poseidonNonce);
    }

    function askExists(uint256 _askId) public view returns (bool) {
        return asks[_askId].state != State.NotExists;
    }
}