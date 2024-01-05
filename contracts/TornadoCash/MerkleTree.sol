// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IHasher.sol";

contract MerkleTree {
    uint8 public constant numLevels = 10;

    IHasher public immutable hasher;

    mapping(uint256 => bool) public roots;
    mapping(uint256 => uint256) public levelHashes;

    uint256 public nextLeafIndex;

    constructor(IHasher _hasher) {
        hasher = _hasher;
    }

    function _hashLeftRight(
        uint256 _left,
        uint256 _right
    ) internal view returns (uint256 xL) {
        (xL, ) = hasher.MiMCSponge(_left, _right);
        return xL;
    }

    function _insert(uint256 _leaf) internal returns (uint256 index) {
        uint256 currentLevelHash = _leaf;

        uint256 _nextLeafIndex = nextLeafIndex;
        uint256 currentLeafIndex = _nextLeafIndex;

        uint256 left;
        uint256 right;

        for (uint8 i = 0; i < numLevels; i++) {
            if (currentLeafIndex % 2 == 0) {
                left = currentLevelHash;
                right = zeros(i);
                levelHashes[i] = currentLevelHash;
            } else {
                left = levelHashes[i];
                right = currentLevelHash;
            }

            currentLevelHash = _hashLeftRight(left, right);
            currentLeafIndex /= 2;
        }

        roots[currentLevelHash] = true;
        nextLeafIndex = _nextLeafIndex + 1;
        return _nextLeafIndex;
    }

    /// @dev The zero hash at level 0 is `keccak256(tordando) % FIELD_SIZE`
    /// Next zero hashes are computed as `MiMCSponge(zeros[i - 1], zeros[i - 1])`
    /// @param i The level: [0, `numLevels`)
    /// @return The zero hash at the given level `i`
    function zeros(uint256 i) public pure returns (uint256) {
        if (i == 0)
            return 0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c;
        else if (i == 1)
            return 0x256a6135777eee2fd26f54b8b7037a25439d5235caee224154186d2b8a52e31d;
        else if (i == 2)
            return 0x1151949895e82ab19924de92c40a3d6f7bcb60d92b00504b8199613683f0c200;
        else if (i == 3)
            return 0x20121ee811489ff8d61f09fb89e313f14959a0f28bb428a20dba6b0b068b3bdb;
        else if (i == 4)
            return 0x0a89ca6ffa14cc462cfedb842c30ed221a50a3d6bf022a6a57dc82ab24c157c9;
        else if (i == 5)
            return 0x24ca05c2b5cd42e890d6be94c68d0689f4f21c9cec9c0f13fe41d566dfb54959;
        else if (i == 6)
            return 0x1ccb97c932565a92c60156bdba2d08f3bf1377464e025cee765679e604a7315c;
        else if (i == 7)
            return 0x19156fbd7d1a8bf5cba8909367de1b624534ebab4f0f79e003bccdd1b182bdb4;
        else if (i == 8)
            return 0x261af8c1f0912e465744641409f622d466c3920ac6e5ff37e36604cb11dfff80;
        else if (i == 9)
            return 0x0058459724ff6ca5a1652fcbc3e82b93895cf08e975b19beab3f54c217d1c007;
        else 
            revert("Index out of bounds");
    }
}
