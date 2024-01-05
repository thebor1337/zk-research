import { getCircomkit } from "../setup";

const circomkit = getCircomkit({ verbose: true });

async function main() {
    await circomkit.compile("Withdraw", {
        file: "TornadoCash/withdraw",
	    template: "Withdraw",
	    params: [10],
	    pubs: ["root", "nullifierHash", "recipient"]
    });
    await circomkit.contract("Withdraw");
}

main();
