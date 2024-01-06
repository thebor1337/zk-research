// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) external view returns (bool);
}

contract NFTWithPassword is ERC721, Ownable {
    uint256 private _nextTokenId;

    uint256 public immutable passwordHash;
    IVerifier public immutable verifier;

    mapping(address => bool) public minted;

    constructor(
        IVerifier _verifier,
        uint256 _passwordHash
    )
        ERC721("MyToken", "MTK")
        Ownable(msg.sender)
    {
        verifier = _verifier;
        passwordHash = _passwordHash;
    }

    function mintWithPassword(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external {
        require(!minted[msg.sender], "Already minted");
        require(_verify(a, b, c, passwordHash, msg.sender), "Invalid proof");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }

    function _verify(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256 _passwordHash,
        address recipient
    ) internal view returns (bool) {
        return verifier.verifyProof(a, b, c, [_passwordHash, uint256(uint160(recipient))]);
    }
}