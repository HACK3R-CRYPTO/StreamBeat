# StreamBeat Backend

Node.js backend for StreamBeat game. Validates scores. Prevents cheating. Submits scores to blockchain.

## What This Backend Does

You send game data from frontend. Backend calculates expected score. Backend validates score matches game data. Backend submits to contract if valid. Backend rejects invalid scores. Backend pays gas fees for submissions.

## Prerequisites

Install Node.js 18 or higher. Install npm. Have a wallet with SOMNI for gas fees. Deploy contracts first.

## Installation

Navigate to backend directory:

```bash
cd StreamBeat/backend
```

Install dependencies:

```bash
npm install
```

Create `.env` file:

```env
# Contract Addresses
REWARDS_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7

# Network Configuration
RPC_URL=https://dream-rpc.somnia.network

# Backend Wallet (pays gas for score submissions)
PRIVATE_KEY=0xyour_private_key_with_0x_prefix

# Server Configuration
PORT=3001
```

Important notes:
- Private key must include 0x prefix
- Backend wallet needs SOMNI for gas fees
- Get testnet tokens from Somnia Telegram
- Backend wallet address must be set as validator in rewards contract

## Development

Start development server:

```bash
npm start
```

Server runs on http://localhost:3001

## Production

Use process manager like PM2:

```bash
pm2 start server.js --name streambeat-backend
```

Or deploy to Vercel using `vercel.json` configuration.

## API Endpoints

### Submit Score

POST `/api/submit-score`

Submit game score for validation and on-chain submission.

Request body:
```json
{
  "playerAddress": "0x...",
  "scoreData": {
    "score": 1500,
    "gameTime": 30000,
    "perfect": 50,
    "good": 30,
    "miss": 10,
    "combo": 5
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "transactionHash": "0x..."
}
```

### Get Leaderboard

GET `/api/leaderboard`

Get current leaderboard from contract.

Response:
```json
{
  "success": true,
  "leaderboard": [
    {
      "player": "0x...",
      "score": 1500,
      "timestamp": 1234567890,
      "claimed": false
    }
  ]
}
```

### Health Check

GET `/health`

Check if server is running.

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

## Score Validation

Backend validates scores using two checks:

Check one: Score bounds. Score must be between 10 and 1000000.

Check two: Game time. Game time must be between 1000 and 60000 milliseconds.

If any check fails, score is rejected.

## Anti-Cheat System

Backend prevents cheating by validating scores before blockchain submission.

Players send game data to backend. Backend validates score bounds and game time. Backend submits to contract if valid. Backend rejects invalid submissions.

Contract only accepts submissions from backend wallet. Players submit scores for free. Backend pays gas fees.

## Gas Payment

Backend wallet pays gas fees for score submissions.

Testnet costs are low. Approximately 0.0001 SOMNI per submission.

Fund backend wallet with testnet tokens from Somnia Telegram.

## Contract Setup

After deploying contracts, set backend validator:

```bash
forge script script/SetBackendValidator.s.sol:SetBackendValidatorScript \
  --rpc-url https://dream-rpc.somnia.network \
  --broadcast
```

This allows backend wallet to submit scores.

## Project Structure

```
backend/
├── server.js
├── package.json
├── README.md
├── ANTI_CHEAT.md
├── get-wallet-address.js
├── vercel.json
└── Procfile
```

## Security

Backend includes security features:
- Input validation on all endpoints
- Score bounds validation prevents cheating
- Contract enforces backend-only submission
- CORS enabled for frontend access
- Error handling prevents crashes

## Troubleshooting

Server not starting:
- Check `.env` file has correct values
- Ensure Node.js version is 18 or higher
- Check port 3001 is available
- Verify dependencies installed: `npm install`

Score submission fails:
- Check backend wallet has SOMNI for gas
- Verify REWARDS_ADDRESS is correct
- Check backend validator is set in contract
- Verify RPC URL is correct

Validation fails:
- Check game data format matches expected structure
- Verify score meets minimum requirements (10 points)
- Check console logs for specific error
- Ensure game time is within valid range

Contract interaction fails:
- Check backend wallet has gas fees
- Verify contract address is correct
- Check network connectivity
- Ensure backend validator is set correctly

## Testing

Test score submission:

```bash
curl -X POST http://localhost:3001/api/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "0x...",
    "scoreData": {
      "score": 1500,
      "gameTime": 30000,
      "perfect": 50,
      "good": 30,
      "miss": 10,
      "combo": 5
    }
  }'
```

Test leaderboard:

```bash
curl http://localhost:3001/api/leaderboard
```

Test health check:

```bash
curl http://localhost:3001/health
```

## Support

For issues or questions:
- Somnia Documentation: https://docs.somnia.network
- Ethers.js Documentation: https://docs.ethers.org
- Node.js Documentation: https://nodejs.org/docs
