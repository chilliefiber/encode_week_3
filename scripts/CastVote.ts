import { createPublicClient, createWalletClient, formatUnits, getContract, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/TokenizedBallot.sol/TokenizedBallot.json";
import process from 'process';
import * as dotenv from "dotenv";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const rpc = http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`);


// To call use
// npx ts-node --files ./scripts/CastVote.ts contract_address voter_account
async function castVote() {

    /* Parsing arguments*/
    const parameters = process.argv.slice(2, 6);
    if (!parameters || parameters.length < 4)
        throw new Error("Usage: npx ts-node --files ./scripts/CastVote.ts tokenized_ballot_contract_address PRIVATE_KEY_VOTER_NAME proposal_index number_of_votes");
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

    const proposal_ix = BigInt(parameters[2]);
    const number_of_votes = parseEther(parameters[3]);

    // obtaining the account of the voter from its private key
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

    // getting the contract of the TokenizedBallot

    const tokenizedBallotContract = getContract({
        address: contractAddress,
        abi: abi,
        client: publicClient, 
      });

    // Check voting power available before voting. In a more robust script we would check
    // that we wouldn't try to vote with more than what we have
    const initialVotes = await tokenizedBallotContract.read.getRemainingVotingPower([voterClient.account.address]) as bigint;
    console.log(
        `Account: ${voterClient.account.address
        } has units of voting power: ${initialVotes.toString()} before voting`
    );

    // Cast vote

    const voteTx = await tokenizedBallotContract.write.vote([proposal_ix, number_of_votes], {
        account: voterClient.account,
    });
    console.log("Transaction hash of vote:", voteTx);
    console.log("Waiting for confirmations...");
    await publicClient.waitForTransactionReceipt({ hash: voteTx });
    console.log(`Account: ${voterClient.account.address} cast ${number_of_votes} votes for proposal: ${proposal_ix}`);

    // Check voting power available after voting
    const final = await tokenizedBallotContract.read.getRemainingVotingPower([voterClient.account.address]) as bigint;
    console.log(
        `Account: ${voterClient.account.address
        } has units of voting power: ${final.toString()} after voting`
    );
}

castVote().catch((error: Error) => {
    console.error(error);
    process.exitCode = 1;
  });
  