import { MimcSponge } from "circomlibjs";

// keccak256("tornado") % FIELD_SIZE
const ZERO_VALUE = BigInt('21663839004416932945382355908790599225266501822907911457504978515578255421292')

function generateZeros(mimc: MimcSponge, levels: number) {
    let zeros = []
    zeros[0] = ZERO_VALUE
    for (let i = 1; i <= levels; i++)
        zeros[i] = calculateHash(mimc, zeros[i - 1], zeros[i - 1]);
    return zeros
}

export function calculateHash(mimc: MimcSponge, left: bigint, right: bigint) {
    return BigInt(mimc.F.toString(mimc.multiHash([left, right])));
}

export function calculateMerkleRootAndPath(mimc: MimcSponge, levels: number, elements: bigint[], element?: bigint) {
    const capacity = 2 ** levels
    if (elements.length > capacity) throw new Error('Tree is full')

    const zeros = generateZeros(mimc, levels);
    let layers = []
    layers[0] = elements.slice()
    for (let level = 1; level <= levels; level++) {
        layers[level] = []
        for (let i = 0; i < Math.ceil(layers[level - 1].length / 2); i++) {
            layers[level][i] = calculateHash(
                mimc,
                layers[level - 1][i * 2],
                i * 2 + 1 < layers[level - 1].length ? layers[level - 1][i * 2 + 1] : zeros[level - 1],
            )
        }
    }

    const root = layers[levels].length > 0 ? layers[levels][0] : zeros[levels - 1]

    let pathElements = []
    let pathIndices = []

    if (element) {
        const bne = BigInt(element)
        let index = layers[0].findIndex(e => BigInt(e) === bne);
        for (let level = 0; level < levels; level++) {
            pathIndices[level] = index % 2
            pathElements[level] = (index ^ 1) < layers[level].length ? layers[level][index ^ 1] : zeros[level]
            index >>= 1
        }
    }

    return {
        root,
        pathElements,
        pathIndices
    }
}
