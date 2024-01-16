import { getCircomkit, expect } from "../setup";
import { WitnessTester } from "circomkit";

const circomkit = getCircomkit();

describe("IsZero", () => {
	const circuit_file = "utils/isZero";

    let tester: WitnessTester;

    const getTester = async (circuit_name: string) => {
        return await circomkit.WitnessTester(circuit_name, {
            file: circuit_file,
            template: circuit_name,
            params: [],
        });
    };

    describe("original template", () => {
        beforeEach(async () => {
            tester = await getTester("IsZero");
        });

        it("should have 2 constraints", async () => {
            expect(await tester.getConstraintCount()).to.equal(2);
        });

        it("should have 4 witnesses", async () => {
            expect((await tester.calculateWitness({ in: [0] })).length).to.equal(4);
        });

        it("should match expected witness", async () => {
            expect(await tester.calculateWitness({ in: [0] })).to.deep.equal([
                1n, // 1
                1n, // out
                0n, // in
                0n, // inv of in
            ]);

            expect(await tester.calculateWitness({ in: [1] })).to.deep.equal([1n, 0n, 1n, 1n, ]);

            expect(await tester.calculateWitness({ in: [5] })).to.deep.equal([
                1n,
                0n,
                5n,
                8755297148735710088898562298102910035419345760166413737479281674630323398247n,
            ]);
        });

        it("should pass and have correct output", async () => {
            await tester.expectPass({ in: [0] }, { o: 1 });
            await tester.expectPass({ in: [1] }, { o: 0 });
            await tester.expectPass({ in: [5] }, { o: 0 });
        });

        it("cannot pass incorrect witnesses", async () => {
            const witnesses = [
                1n, // 1
                1n, // out (altered)
                5n, // in 
                0n // inv of in (altered)
            ];
            await tester.expectConstraintFail(witnesses);
        });
    });

    describe("underconstrained template", () => {
        beforeEach(async () => {
            tester = await getTester("IsZeroUnderconstrained");
        });

        it("should have 1 constraints", async () => {
            expect(await tester.getConstraintCount()).to.equal(1);
        });

        it("should have 4 witnesses", async () => {
            expect((await tester.calculateWitness({ in: [0] })).length).to.equal(4);
        });

        it("should pass and have correct output", async () => {
            await tester.expectPass({ in: [0] }, { o: 1 });
            await tester.expectPass({ in: [1] }, { o: 0 });
            await tester.expectPass({ in: [5] }, { o: 0 });
        });

        it("can pass incorrect witnesses", async () => {
            const witnesses = [
                1n, // 1
                1n, // out (altered)
                5n, // in 
                0n // inv of in (altered)
            ];
            await tester.expectConstraintPass(witnesses);
        });
    });
});
