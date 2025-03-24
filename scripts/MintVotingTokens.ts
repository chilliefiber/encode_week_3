import { createPublicClient, createWalletClient, formatUnits, getContract, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/MyToken.sol/MyToken.json";
import process from 'process';
import * as dotenv from "dotenv";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY_DEPLOYER || "";
const rpc = http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`);


// To call use
// npx ts-node --files ./scripts/mintVotingTokens.ts contract_address voter_account
async function mintVotingTokens() {
    /* Create public client with API key and wallet client with private key of the deployer of the smart contract */
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: rpc,
    });
    const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
    const deployerClient = createWalletClient({
        account,
        chain: sepolia,
        transport: rpc,
    });
    
    /* Read the parameters from the command line and validate them */

    const parameters = process.argv.slice(2, 6);
    if (!parameters || parameters.length < 4)
        throw new Error("Usage: npx ts-node --files ./scripts/mintVotingTokens.ts contract_address minter_address number_of_tokens_to_mint PRIVATE_KEY_MINTER_NAME");
    const contractAddress = parameters[0] as `0x${string}`;
    if (!contractAddress) throw new Error("Contract address not provided");
    const newMinter = parameters[1] as `0x${string}`;
    if (!newMinter) throw new Error("New Minter address not provided");
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
        throw new Error("Invalid contract address");
    if (!/^0x[a-fA-F0-9]{40}$/.test(newMinter))
        throw new Error("Invalid new voter address");

    const tokens_to_mint = parameters[2];
    console.log("Contract address is " + contractAddress + "\n");
    console.log("New minter address is " + newMinter + "\n");
    console.log("Number of tokens to mint is " + tokens_to_mint);

    // obtaining the private key of the minter from the .env file
    const privateKeyName = parameters[3];
    const privateKey = process.env[privateKeyName] || "";

    if (!privateKey) {
        throw new Error(`Private key ${privateKeyName} not found in .env`);
    }

    // obtaining the account of the minter from its private key
    const minterAccount = privateKeyToAccount(`0x${privateKey}`);
    const minterClient = createWalletClient({
        account: minterAccount,
        chain: sepolia,
        transport: rpc,
    });

    // getting the contract of the MyToken smart contract. Note that
    // by default it is associated with the public client, so
    // for calling functions that write to the blockchain you
    // need to specify a client associated with an EOA like minterClient or deployerClient
    const tokenContract = getContract({
        address: contractAddress,
        abi: abi,
        client: publicClient, 
      });

    // getting the value of minter code, to use as an argument for grant role
    const minterCode = await tokenContract.read.MINTER_ROLE();

    // Giving role of minter to newMinter
    const roleTx = await tokenContract.write.grantRole(
        [minterCode, newMinter],
        { account: deployerClient.account }
    );
    console.log("Transaction hash:", roleTx);
    console.log("Waiting for confirmations...");
    await publicClient.waitForTransactionReceipt({ hash: roleTx });
    console.log("Transaction confirmed");
    console.log(`Minter Role: ${minterCode} given to address: ${newMinter}`);

    // obtaining the initial total supply (before minting new tokens)
    // and the decimals and symbols of the token we are working with
    // this is not strictly needed but is good for ilustration purposes
    const [symbol, decimals, initialTotalSupply] = await Promise.all([
        tokenContract.read.symbol(),
        tokenContract.read.decimals(),
        tokenContract.read.totalSupply(),
      ]);
    console.log("Initial total supply:", initialTotalSupply);

    // Grant tokens to newMinter
    const mintTx = await tokenContract.write.mint(
        [newMinter, parseEther(tokens_to_mint)],
        { account: minterClient.account }
    );
    console.log("Transaction hash:", mintTx);
    console.log("Waiting for confirmations...");
    await publicClient.waitForTransactionReceipt({ hash: mintTx });

    // Get balance of newMinter
    const newMinterBalance = await tokenContract.read.balanceOf([newMinter]) as bigint;
    console.log(`New minter converted Balance is ${formatUnits(newMinterBalance, decimals as number)} ${symbol}`);


    // Print new total supply
    const newTotalSupply = await tokenContract.read.totalSupply();
    console.log("New total supply:", newTotalSupply);

    process.exit();
}

mintVotingTokens().catch((error: Error) => {
    console.error(error);
    process.exitCode = 1;
  });
  