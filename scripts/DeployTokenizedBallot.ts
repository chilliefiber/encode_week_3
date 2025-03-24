import { createPublicClient, http, createWalletClient, formatEther, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi, bytecode } from "../artifacts/contracts/TokenizedBallot.sol/TokenizedBallot.json";
import * as dotenv from "dotenv";
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY_DEPLOYER || "";

async function main() {
    /* Parsing arguments*/
    const parameters = process.argv.slice(2, 3);
    if (!parameters || parameters.length < 1)
        throw new Error("Usage: npx ts-node --files ./scripts/DeployTokenizedBallot.ts contract_address");
    const contractAddress = parameters[0] as `0x${string}`;
    if (!contractAddress) throw new Error("Contract address for MyToken not provided");
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
        throw new Error("Invalid contract address");

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
    });
    const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
    const deployer = createWalletClient({
        account,
        chain: sepolia,
        transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
    });
    console.log("Deployer address:", deployer.account.address);
    const balance = await publicClient.getBalance({
        address: deployer.account.address,
    });
    console.log(
        "Deployer balance:",
        formatEther(balance),
        deployer.chain.nativeCurrency.symbol
    );
    console.log("\nDeploying TokenizedBallot contract");
    const PROPOSALS = ["Proposal Number 0", "Proposal Number 1", "Proposal Number 2"];

    // Prepare constructor args
    const currentBlock = await publicClient.getBlockNumber();
    // 5 is just a number to make sure it's in the past
    const args = [
        PROPOSALS.map((prop) => toHex(prop, { size: 32 })),
        contractAddress,
        currentBlock - 5n,
    ];

    const hash = await deployer.deployContract({
        abi,
        bytecode: bytecode as `0x${string}`,
        args,
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("TokenizedBallot contract deployed to:", receipt.contractAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});