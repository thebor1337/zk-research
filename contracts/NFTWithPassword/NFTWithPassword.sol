// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IVerifier1 {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) external view returns (bool);
}

interface IVerifier2 {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external view returns (bool);
}

contract NFTWithPassword is ERC721 {
    uint256 private _nextTokenId;

    uint256 public immutable passwordHash;
    IVerifier1 public immutable verifier1;
    IVerifier2 public immutable verifier2;

    mapping(uint256 => bool) spentNullifiers;

    mapping(address => bool) public minted;

    constructor(
        IVerifier1 _verifier1,
        IVerifier2 _verifier2,
        uint256 _passwordHash
    ) ERC721("MyToken", "MTK") {
        verifier1 = _verifier1;
        verifier2 = _verifier2;
        passwordHash = _passwordHash;
    }

    function mintWithPassword1(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external {
        require(!minted[msg.sender], "Already minted");
        require(
            verifier1.verifyProof(a, b, c, [passwordHash, uint256(uint160(msg.sender))]),
            "Invalid proof"
        );
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }

    function mintWithPassword2(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256 nullifier
    ) external {
        require(!spentNullifiers[nullifier], "Nullifier already spent");
        require(
            verifier2.verifyProof(a, b, c, [nullifier, passwordHash, uint256(uint160(msg.sender))]),
            "Invalid proof"
        );
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }
}