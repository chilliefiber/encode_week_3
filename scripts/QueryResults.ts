import { createPublicClient, getContract, hexToString, http } from "viem";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/TokenizedBallot.sol/TokenizedBallot.json";
import process from 'process';
import * as dotenv from "dotenv";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const rpc = http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`);

async function queryResults() {
    // obtaining a public client
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: rpc,
    });
    /* Parsing arguments*/
    const parameters = process.argv.slice(2, 3);
    if (!parameters || parameters.length < 1)
        throw new Error("Usage: npx ts-node --files ./scripts/SelfDelegateVotingPower.ts tokenized_ballot_contract_address");
    const contractAddress = parameters[0] as `0x${string}`;
    if (!contractAddress) throw new Error("Contract address not provided");
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
        throw new Error("Invalid contract address");
    const tokenizedBallotContract = getContract({
        address: contractAddress,
        abi: abi,
        client: publicClient, 
      });
    const winningProposalNumber = await tokenizedBallotContract.read.winningProposal() as bigint;
    const proposalNameBytes32 = await tokenizedBallotContract.read.winnerName() as `0x${string}`;

    const winningProposalName = hexToString(proposalNameBytes32, { size: 32 }).replace(/\0/g, '');

    console.log("winningProposalNumber is " + winningProposalNumber + " and proposal is " + winningProposalName);

}

queryResults().catch((error: Error) => {
    console.error(error);
    process.exitCode = 1;
  });
  