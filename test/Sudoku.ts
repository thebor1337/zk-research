import { getCircomkit, ethers, expect } from "../setup";

const circomkit = getCircomkit();

describe("Sudoku", () => {

    const size = 9; // 9x9
    const subSize = 3; // sqrt(9) = 3

    const numBitsInSize = 4; // 2^4 = 16 > 9

    it("should check whether a value is in range", async () => {
        const wtnsTester = await circomkit.WitnessTester("Sudoku", {
            file: "Sudoku",
            template: "InRange",
            pubs: ["lower", "upper"],
            params: [numBitsInSize]
        });

        const lower = 1;
        const upper = size;

        await wtnsTester.expectPass({ value: 5, lower, upper }, { out: 1 });
        await wtnsTester.expectPass({ value: lower, lower, upper }, { out: 1 });
        await wtnsTester.expectPass({ value: upper, lower, upper }, { out: 1 });

        await wtnsTester.expectPass({ value: lower - 1, lower, upper }, { out: 0 });
        await wtnsTester.expectPass({ value: upper + 1, lower, upper }, { out: 0 });
    });

    it("should check whether a sequence does not contain duplicates", async () => {
        const wtnsTester = await circomkit.WitnessTester("ContainsOnlyUnique", {
            file: "Sudoku",
            template: "ContainsOnlyUnique",
            params: [size]
        });

        await wtnsTester.expectPass({ ins: [1,2,3,4,5,6,7,8,9] });
        await wtnsTester.expectPass({ ins: [3,7,1,9,8,6,2,5,4] });

        await wtnsTester.expectFail({ ins: [1,2,3,5,5,6,7,8,9] });
        await wtnsTester.expectFail({ ins: [9,6,3,5,5,2,7,8,1] });
    });

    describe("sudoku checker", () => {
        const dataset = [
            {
                question: [
                    [0, 0, 0, 2, 6, 0, 7, 0, 1],
                    [6, 8, 0, 0, 7, 0, 0, 9, 0],
                    [1, 9, 0, 0, 0, 4, 5, 0, 0],
                    [8, 2, 0, 1, 0, 0, 0, 4, 0],
                    [0, 0, 4, 6, 0, 2, 9, 0, 0],
                    [0, 5, 0, 0, 0, 3, 0, 2, 8],
                    [0, 0, 9, 3, 0, 0, 0, 7, 4],
                    [0, 4, 0, 0, 5, 0, 0, 3, 6],
                    [7, 0, 3, 0, 1, 8, 0, 0, 0]
                ],
                solution: [
                    [4, 3, 5, 2, 6, 9, 7, 8, 1],
                    [6, 8, 2, 5, 7, 1, 4, 9, 3],
                    [1, 9, 7, 8, 3, 4, 5, 6, 2],
                    [8, 2, 6, 1, 9, 5, 3, 4, 7],
                    [3, 7, 4, 6, 8, 2, 9, 1, 5],
                    [9, 5, 1, 7, 4, 3, 6, 2, 8],
                    [5, 1, 9, 3, 2, 6, 8, 7, 4],
                    [2, 4, 8, 9, 5, 7, 1, 3, 6],
                    [7, 6, 3, 4, 1, 8, 2, 5, 9]
                ],
            },
            {
                question: [
                    [0, 2, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 6, 0, 0, 0, 0, 3],
                    [0, 7, 4, 0, 8, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 3, 0, 0, 2],
                    [0, 8, 0, 0, 4, 0, 0, 1, 0],
                    [6, 0, 0, 5, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 1, 0, 7, 8, 0],
                    [5, 0, 0, 0, 0, 9, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 4, 0]
                ],
                solution: [
                    [1, 2, 6, 4, 3, 7, 9, 5, 8],
                    [8, 9, 5, 6, 2, 1, 4, 7, 3],
                    [3, 7, 4, 9, 8, 5, 1, 2, 6],
                    [4, 5, 7, 1, 9, 3, 8, 6, 2],
                    [9, 8, 3, 2, 4, 6, 5, 1, 7],
                    [6, 1, 2, 5, 7, 8, 3, 9, 4],
                    [2, 6, 9, 3, 1, 4, 7, 8, 5],
                    [5, 4, 8, 7, 6, 9, 2, 3, 1],
                    [7, 3, 1, 8, 5, 2, 6, 4, 9]
                ]
            }
        ];

        it("should check correctness of sudoku solution", async () => {
            const wtnsTester = await circomkit.WitnessTester("sudoku_9x9", {
                file: "Sudoku",
                template: "CheckSudoku",
                params: [size, subSize],
                pubs: ["question"]
            });
    
            for (const { question, solution } of dataset) {
                await wtnsTester.expectPass({ question, solution });

                const modifiedSolution = solution.map(row => row.slice());
                modifiedSolution[0][0] = (modifiedSolution[0][0] + 1) % size; // change one value to make it incorrect
                await wtnsTester.expectFail({ question, solution: modifiedSolution });
            }
        });

        it("should prove correctness of sudoku solution", async () => {
            const proofTester = await circomkit.ProofTester("sudoku_9x9");

            for (const { question, solution } of dataset) {
                const { proof, publicSignals } = await proofTester.prove({ question, solution });
                const questionFlattened = question.flatMap(row => row.flatMap(cell => cell.toString()));
                expect(publicSignals).to.deep.equal(questionFlattened);
                expect(await proofTester.verify(proof, questionFlattened)).to.be.true;
            }
        });
    });
});
