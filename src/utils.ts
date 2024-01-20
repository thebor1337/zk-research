import { ethers } from "../setup";
import { type WitnessTester } from "circomkit";

const sliceHexData = (hexData: string, parts: number, reverse?: boolean) => {
	if (!hexData.startsWith("0x"))
		throw new Error("`hexData` must start with `0x`");
	const hexLength = hexData.length - 2;
	if (hexLength % parts !== 0)
		throw new Error("`hexData` length must be divisible by `parts`");
	if (reverse === undefined) reverse = true;

	const bytesPerPart = hexLength / parts / 2;

	let slicedData = [];
	for (let i = parts - 1; i >= 0; i--) {
		const slice = ethers.dataSlice(
			hexData,
			i * bytesPerPart,
			(i + 1) * bytesPerPart
		);
		slicedData.push(ethers.toBigInt(slice));
	}
	return slicedData;
};

const concatHexData = (hexData: bigint[], reversed?: boolean): string => {
	if (reversed === undefined) reversed = true;
	if (reversed) hexData = hexData.reverse();
	return "0x" + hexData.map((x) => ethers.toBeHex(x).slice(2)).join("");
};

const uncompressedPointToXYPoint = (publicKey: string): [bigint, bigint] => {
	const x = ethers.toBigInt("0x" + publicKey.slice(4, 4 + 64));
	const y = ethers.toBigInt("0x" + publicKey.slice(4 + 64));
	return [x, y];
};

const xyPointToUncompressedPoint = (point: [bigint, bigint]): string => {
	const x = point[0].toString(16).padStart(64, "0");
	const y = point[1].toString(16).padStart(64, "0");
	return "0x04" + x + y;
};

// https://github.com/privacy-scaling-explorations/maci/blob/dev/circuits/ts/__tests__/utils/utils.ts#L37
const getSignal = async (tester: WitnessTester, witness: bigint[], name: string): Promise<bigint> => {
    const prefix = "main";
    // E.g. the full name of the signal "root" is "main.root"
    // You can look up the signal names using `circuit.getDecoratedOutput(witness))`
    const signalFullName = `${prefix}.${name}`;
  
    const out = await tester.readWitness(witness, [signalFullName]);
    return BigInt(out[signalFullName]);
};

export {
	sliceHexData,
	concatHexData,
	uncompressedPointToXYPoint,
	xyPointToUncompressedPoint,
    getSignal
};
