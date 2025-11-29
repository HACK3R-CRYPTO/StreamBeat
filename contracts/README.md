# StreamBeat Smart Contracts

Smart contracts for StreamBeat game. Deploy to Somnia. Test locally. Verify on explorer.

## What These Contracts Do

StreamBeatToken: ERC20 token for payments and rewards. Players use BEAT tokens to mint Gems. Top players earn BEAT rewards.

StreamBeatSwap: Buy BEAT tokens with SOMNI. Exchange rate set by owner. Mints tokens directly to buyers.

StreamBeatGem: ERC721 NFT contract. Players mint Gems to unlock games. One Gem costs 34 BEAT tokens.

StreamBeatRewards: Tracks scores. Distributes rewards. Leaderboard management. Prize pool distribution. Only backend wallet submits scores.

## Prerequisites

Install Foundry. Get SOMNI for gas fees. Have a wallet ready.

Foundry installation: https://book.getfoundry.sh/getting-started/installation

## Installation

Clone the repository. Navigate to contracts folder. Install dependencies.

```bash
git clone <repository-url>
cd StreamBeat/contracts
forge install
```

Build contracts:

```bash
forge build
```

Run tests:

```bash
forge test
```

All tests must pass before deployment.

## Configuration

Create a `.env` file in the contracts directory:

```
PRIVATE_KEY=0xyour_private_key_with_0x_prefix
TREASURY_ADDRESS=your_treasury_address
ETHERSCAN_API_KEY=your_etherscan_api_key
BACKEND_VALIDATOR_ADDRESS=your_backend_wallet_address
```

Important notes:
- Private key must include 0x prefix
- Treasury address receives initial 500M BEAT tokens
- Etherscan API key works for Somnia networks
- Backend validator address must match backend wallet

## Get Testnet Tokens

Get testnet tokens before deploying:

- Somnia Telegram: https://t.me/+XHq0F0JXMyhmMzM0

You need SOMNI for gas fees.

## Deployment

### Deploy All Contracts

Deploy everything to Somnia Testnet:

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://dream-rpc.somnia.network --broadcast --verify
```

This deploys all four contracts. Sets up relationships. Activates claim conditions. Verifies on explorer.

### Deploy Gem Contract Only

Deploy Gem contract with existing token:

```bash
forge script script/DeployGem.s.sol:DeployGemScript --rpc-url https://dream-rpc.somnia.network --broadcast --verify
```

This deploys Gem contract. Uses existing token address.

### Deploy Swap Contract Only

Deploy Swap contract with existing token:

```bash
forge script script/DeploySwap.s.sol:DeploySwapScript --rpc-url https://dream-rpc.somnia.network --broadcast --verify
```

This deploys Swap contract. Uses existing token address. Sets exchange rate.

### Set Swap Contract in Token

After deploying swap, set it in token contract:

```bash
forge script script/SetSwapContract.s.sol:SetSwapContractScript --rpc-url https://dream-rpc.somnia.network --broadcast
```

This allows swap contract to mint BEAT tokens.

### Set Backend Validator

After deploying rewards contract, set backend validator:

```bash
forge script script/SetBackendValidator.s.sol:SetBackendValidatorScript --rpc-url https://dream-rpc.somnia.network --broadcast
```

This allows backend wallet to submit scores.

### Deploy to Mainnet

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://mainnet-rpc.somnia.network --broadcast --verify
```

## Deployed Contracts

Somnia Testnet:

StreamBeatToken: 0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f

StreamBeatSwap: 0xa2054053Ded91cf7eCD51ea39756857A2F0a5284

StreamBeatGem: 0x699C19321188aB200194E8A2B6db19B43106E70F

StreamBeatRewards: 0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7

View contracts on Somnia Explorer: https://shannon-explorer.somnia.network/

## Usage

### Buy BEAT Tokens with SOMNI

Send SOMNI to swap contract. Receive BEAT tokens.

Exchange rate: 0.1 SOMNI equals 34 BEAT tokens. One SOMNI equals 340 BEAT tokens.

Minimum purchase: 0.001 SOMNI.

### Mint NFT Gems

Approve 34 BEAT tokens. Call claim function on Gem contract.

One Gem unlocks all games.

### Submit Scores

Backend calls submitScore function on rewards contract. Players send game data to backend. Backend validates score. Backend submits to contract.

Minimum score: 10 points.

### Claim Rewards

Top players call claimRewards function.

Reward distribution:
- First place: 40 percent of prize pool
- Second place: 25 percent of prize pool
- Third place: 15 percent of prize pool
- Places four through ten: 10 percent split among seven players
- Participation: 10 percent split among all eligible players

### Fund Prize Pool

Owner calls fundPrizePool function.

Mints BEAT tokens directly to contract.

### Set Backend Validator

Owner calls setBackendValidator function.

Sets wallet address that submits scores. Only this address submits scores. Prevents cheating.

## Exchange Rates

SOMNI to BEAT: 0.1 SOMNI equals 34 BEAT tokens. One SOMNI equals 340 BEAT tokens.

Gem price: 34 BEAT tokens per Gem.

## Testing

Run all tests:

```bash
forge test
```

Run with detailed output:

```bash
forge test -vvv
```

Run specific test:

```bash
forge test --match-test testMintGem
```

## Frontend Integration

### Connect to Somnia Network

```typescript
import { defineChain } from "thirdweb/chains";

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  rpc: "https://dream-rpc.somnia.network",
  nativeCurrency: {
    name: "SOMNI",
    symbol: "SOMNI",
    decimals: 18
  }
});
```

### Get Contract Instance

```typescript
import { getContract } from "thirdweb/react";

const gemContract = getContract({
  client: client,
  chain: somniaTestnet,
  address: "0x699C19321188aB200194E8A2B6db19B43106E70F"
});
```

### Buy BEAT Tokens with SOMNI

```typescript
import { ethers } from "ethers";

const swapAddress = "0xa2054053Ded91cf7eCD51ea39756857A2F0a5284";
const swapABI = [
  {
    inputs: [],
    name: "buyTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
];

const provider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network");
const signer = await provider.getSigner();
const swapContract = new ethers.Contract(swapAddress, swapABI, signer);

const somniAmount = ethers.parseEther("0.1");
const tx = await swapContract.buyTokens({
  value: somniAmount,
  gasLimit: 200000
});
await tx.wait();
```

### Mint a Gem

```typescript
await beatToken.write("approve", {
  args: [gemContractAddress, BigInt(34 * 10**18)]
});

await gemContract.write("claim", {
  args: [
    userAddress,
    1,
    beatTokenAddress,
    BigInt(34 * 10**18),
    { proof: [], quantityLimitPerWallet: 0, pricePerToken: 0, currency: "0x0000000000000000000000000000000000000000" },
    "0x"
  ]
});
```

## Network Configuration

Somnia Testnet:
- Chain ID: 50312
- RPC: https://dream-rpc.somnia.network
- Explorer: https://shannon-explorer.somnia.network/

Somnia Mainnet:
- Chain ID: TBD
- RPC: TBD
- Explorer: TBD

## Contract Verification

Contracts verify automatically during deployment using Etherscan API key.

Verification works on Somnia networks.

Manual verification:

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_PATH>:<CONTRACT_NAME> \
  --chain-id 50312 \
  --verifier etherscan \
  --verifier-url https://shannon-explorer.somnia.network/api \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args <ARGS>
```

## Project Structure

```
contracts/
├── src/
│   ├── StreamBeatToken.sol
│   ├── StreamBeatSwap.sol
│   ├── StreamBeatGem.sol
│   └── StreamBeatRewards.sol
├── test/
│   └── Counter.t.sol
├── script/
│   ├── Deploy.s.sol
│   ├── DeployGem.s.sol
│   ├── DeploySwap.s.sol
│   ├── SetSwapContract.s.sol
│   └── SetBackendValidator.s.sol
├── foundry.toml
└── README.md
```

## Security

Contracts include security features:
- ReentrancyGuard prevents reentrancy attacks
- SafeERC20 handles token transfers safely
- Input validation on all functions
- Owner-only functions protected
- Supply limits enforced
- Backend validator prevents direct score submissions

## Troubleshooting

Deployment fails:
- Check `.env` file has correct values
- Ensure you have enough SOMNI for gas fees
- Verify network connectivity
- Check contract compilation: `forge build`

Verification fails:
- Ensure `ETHERSCAN_API_KEY` is set in `.env`
- Check API key is valid
- Wait a few minutes after deployment before verification
- Try manual verification on explorer

Tests fail:
- Run `forge clean` and rebuild
- Check Solidity version matches (0.8.24)
- Verify dependencies installed: `forge install`

## Contract Update Notes

After deploying new contracts:
- Update Gem contract payment token address
- Set swap contract in token contract
- Set backend validator in rewards contract
- Update frontend with new contract addresses
- Verify all contracts on explorer
- Test full flow: buy BEAT, mint Gem, play, submit score

## Support

For issues or questions:
- Somnia Documentation: https://docs.somnia.network
- Foundry Book: https://book.getfoundry.sh
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts
