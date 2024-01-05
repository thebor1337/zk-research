// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../MerkleTree.sol";

contract MerkleTreeMock is MerkleTree {
    constructor(IHasher _hasher) MerkleTree(_hasher) {}

    function insert(uint256 leaf) external returns (uint256 index) {
        return _insert(leaf);
    }
}
