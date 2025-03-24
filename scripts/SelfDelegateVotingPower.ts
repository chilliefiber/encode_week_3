import { createPublicClient, createWalletClient, formatUnits, getContract, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/MyToken.sol/MyToken.json";
import process from 'process';
import * as dotenv from "dotenv";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const rpc = http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`);


// To call use
// npx ts-node --files ./scripts/SelfDelegateVotingPower.ts contract_address voter_account
async function delegateVotingPower() {

    /* Parsing arguments*/
    const parameters = process.argv.slice(2, 4);
    if (!parameters || parameters.length < 2)
        throw new Error("Usage: npx ts-node --files ./scripts/SelfDelegateVotingPower.ts contract_address PRIVATE_KEY_MINTER_NAME");
    const contractAddress = parameters[0] as `0x${string}`;
    if (!contractAddress) throw new Error("Contract address not provided");
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
        throw new Error("Invalid contract address");

    // obtaining the private key of the voter from the .env file
    const privateKeyName = parameters[1];
    const privateKey = process.env[privateKeyName] || "";

    if (!privateKey) {
        throw new Error(`Private key ${privateKeyName} not found in .env`);
    }
    // obtaining the account of the minter from its private key
    const voterAccount = privateKeyToAccount(`0x${privateKey}`);
    const voterClient = createWalletClient({
        account: voterAccount,
        chain: sepolia,
        transport: rpc,
    });

    // obtaining a public client
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: rpc,
    });

    // getting the contract of the MyToken smart contract, a

    const tokenContract = getContract({
        address: contractAddress,
        abi: abi,
        client: publicClient, 
      });


    // Check voting power of the delegator
    const votes = await tokenContract.read.getVotes([voterAccount.address]) as bigint;
    console.log(
        `Account: ${voterAccount.address
        } has ${votes.toString()} units of voting power before self delegating`
    );

    const delegateTx = await tokenContract.write.delegate([voterClient.account.address], {
        account: voterClient.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: delegateTx });
    console.log("Transaction hash of delegate:", delegateTx);
    const votesAfter = await tokenContract.read.getVotes([voterClient.account.address]) as bigint;
    console.log(
        `Account: ${voterClient.account.address
        } has ${votesAfter.toString()} units of voting power after self delegating`
    );
}
delegateVotingPower().catch((error: Error) => {
    console.error(error);
    process.exitCode = 1;
  });
  