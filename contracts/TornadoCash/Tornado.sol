// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IHasher.sol";
import "./interfaces/IVerifier.sol";
import "./MerkleTree.sol";

contract Tornado is MerkleTree {
    IVerifier immutable public verifier;

    uint256 public immutable denomination;

    mapping(uint256 => bool) public commitments;
    mapping(uint256 => bool) public spentNullifiers;

    event Deposit(uint256 _commitment, uint256 _leafIndex, uint256 timestamp);
    event Withdraw(address _recipient, uint256 _nullifierHash);

    constructor(uint256 _denomination, IHasher _hasher, IVerifier _verifier) MerkleTree(_hasher) {
        denomination = _denomination;
        verifier = _verifier;
    }

    function deposit(uint256 _commitment) external payable {
        require(msg.value == denomination, "Incorrect deposit amount");
        require(!commitments[_commitment], "Commitment already exists");

        commitments[_commitment] = true;

        uint256 leafIndex = _insert(_commitment);

        emit Deposit(_commitment, leafIndex, block.timestamp);
    }

    function withdraw(
        uint256[2] calldata _pA, 
        uint256[2][2] calldata _pB, 
        uint256[2] calldata _pC,
        uint256 _root,
        uint256 _nullifierHash,
        address _recipient
    ) external {
        require(roots[_root], "Incorrect root");
        require(!spentNullifiers[_nullifierHash], "Nullifier already spent");

        require(
            verifier.verifyProof(
                _pA, _pB, _pC, 
                [
                    uint256(_root), 
                    uint256(_nullifierHash), 
                    uint256(uint160(_recipient))
                ]
            ), 
            "Invalid proof"
        );

        spentNullifiers[_nullifierHash] = true;

        (bool success, ) = _recipient.call{value: denomination}("");
        require(success, "Transfer failed");
    }
}
