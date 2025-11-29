# StreamBeat Frontend

Next.js frontend for StreamBeat game. Connect wallet. Buy tokens. Mint Gems. Play games. Earn rewards. Real-time leaderboard updates powered by Somnia Data Streams.

## What This Frontend Does

You connect your wallet. You buy BEAT tokens. You mint Gem NFTs. You play games. You submit scores. You view leaderboard. You claim rewards. Leaderboard updates instantly without refreshing. Scores appear in real time. Prize pool updates live.

## Prerequisites

Install Node.js 18 or higher. Install npm or yarn. Have a wallet extension ready. Configure Somnia Testnet in your wallet.

## Installation

Navigate to frontend directory:

```bash
cd StreamBeat/frontend
```

Install dependencies:

```bash
npm install
```

Create `.env.local` file (optional):

```env
# Contract Addresses (Somnia Testnet)
NEXT_PUBLIC_BEAT_TOKEN_ADDRESS=0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f
NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS=0xa2054053Ded91cf7eCD51ea39756857A2F0a5284
NEXT_PUBLIC_GEM_CONTRACT_ADDRESS=0x699C19321188aB200194E8A2B6db19B43106E70F
NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_WS_URL=wss://dream-rpc.somnia.network/ws
```

**Note:** Contract addresses are also hardcoded in source files as a fallback, so the app works even without `.env.local`.

## Development

Start development server:

```bash
npm run dev
```

Visit http://localhost:3000 in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── wallet-connect/
│   │   ├── mint/
│   │   ├── games/
│   │   ├── play/
│   │   ├── simon-game/
│   │   ├── leaderboard/
│   │   └── nfts/
│   ├── components/
│   │   ├── iPhoneFrame.tsx
│   │   ├── AddressDisplay.tsx
│   │   ├── LiveScoreFeed.tsx
│   │   ├── PrizePoolTracker.tsx
│   │   └── Loading.tsx
│   ├── lib/
│   │   ├── sds-client.ts      # Somnia Data Streams subscriptions
│   │   └── sds-schemas.ts     # Event schema definitions
│   ├── config/
│   │   └── game.ts
│   ├── context/
│   │   └── WalletContext.tsx
│   └── client.ts
├── public/
│   └── sounds/
├── package.json
├── next.config.ts
└── README.md
```

## Contract Addresses

Current deployed contracts on Somnia Testnet:

BEAT Token: 0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f

Swap Contract: 0xa2054053Ded91cf7eCD51ea39756857A2F0a5284

Gem Contract: 0x699C19321188aB200194E8A2B6db19B43106E70F

Rewards Contract: 0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7

Update these in source files if contracts are redeployed.

## Somnia Data Streams Integration

StreamBeat uses Somnia Data Streams for real-time updates. Backend emits events via `setAndEmitEvents()` when scores are submitted. Frontend subscribes using `somniaStreamsEventId` for instant updates. Leaderboard updates instantly. Score feed shows recent submissions. Prize pool updates live. No polling. No refresh needed.

### Features

Real-time leaderboard updates without refreshing.

Live score feed shows last 10 submissions.

Prize pool tracker updates automatically.

Position tracking shows your rank changes.

### Implementation

SDS client (`src/lib/sds-client.ts`):
- Uses WebSocket transport (`wss://dream-rpc.somnia.network/ws`) for real-time subscriptions
- Subscribes to ScoreSubmitted events using `somniaStreamsEventId`
- Subscribes to RewardsDistributed events
- Subscribes to PrizePoolUpdated events
- Updates UI automatically when events occur
- Backend emits events via `setAndEmitEvents()` when scores are submitted
- SDK requires WebSocket transport type for subscriptions to work
- Frontend subscribes using only `somniaStreamsEventId` (no eventContractSource needed)

### Event Schema Registration (Optional)

Event schema registration is **optional** with our current implementation. The backend automatically registers event schemas when emitting events via `setAndEmitEvents()`. However, if you want to register schemas manually for discoverability, you can use the registration script:

**Registration script** (`backend/register-event-schema.js`):
```bash
# From backend directory
node register-event-schema.js
```

**Requirements:**
- `PRIVATE_KEY` in `.env` file (root directory)
- Wallet with SOMNI for gas fees
- Script registers `ScoreSubmitted`, `PrizePoolUpdated`, and `RewardsDistributed` event schemas

**Note:** This step is **not required** for SDS to work. The backend handles event schema registration automatically when emitting events.

Leaderboard (`src/app/leaderboard/page.tsx`):
- Uses subscribeToScores for real-time updates
- Refreshes automatically when new scores arrive
- Shows top 10 players with podium display
- Highlights your position

Live Score Feed (`src/components/LiveScoreFeed.tsx`):
- Displays last 10 score submissions
- Updates in real time
- Shows player address and score

Prize Pool Tracker (`src/components/PrizePoolTracker.tsx`):
- Shows current prize pool amount
- Updates when pool changes
- Displays in BEAT tokens

## Key Features

### Buy BEAT Tokens

Purchase BEAT tokens directly:
- SOMNI payment available for all wallets
- Point one SOMNI equals 34 BEAT tokens
- One SOMNI equals 340 BEAT tokens
- Select amount of BEAT tokens to buy
- See cost calculated automatically
- Quick buttons for common amounts
- Balance updates automatically after purchase

### Mint Gem

Requires exactly 34 BEAT tokens.

One Gem unlocks all games.

Automatic approval flow.

Balance checks prevent insufficient funds.

### Games

StreamBeat Rhythm Game:
- Thirty second rounds
- Tap glowing buttons in sync
- Perfect timing scores 10 points times combo multiplier
- Good timing scores 5 points times combo multiplier
- Combo multipliers go up to 50x
- Progressive difficulty speeds up over time
- Keyboard controls supported (1-4, arrows, WASD)
- Sound effects for feedback
- Particle effects on perfect hits
- Automatic score submission to backend

Simon Game:
- Watch button sequence flash brightly
- Repeat pattern correctly
- Score based on speed and sequences completed
- Game over on wrong answer
- Sequences get longer over time
- Automatic score submission to backend
- Prevents new game until score submitted

### Leaderboard

Podium display for top three players.

List view for positions four through ten.

Deduplicated by player address.

Shows best score per player.

Highlights your position.

Updates instantly without refreshing.

### NFTs

View your Gem NFTs in collection.

Shows all owned StreamBeat Gems.

Disconnect wallet from any page.

## Technology Stack

Framework: Next.js 15 (App Router)

Language: TypeScript

UI Library: React 18

Styling: Tailwind CSS

Animations: Framer Motion

Wallet: Thirdweb SDK

Blockchain: Ethers.js v6

Data Streams: @somnia-chain/streams

Notifications: React Hot Toast

Audio: Web Audio API

## Environment Variables

Create `.env.local` for custom configuration:

```env
# Contract Addresses (Somnia Testnet)
NEXT_PUBLIC_BEAT_TOKEN_ADDRESS=0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f
NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS=0xa2054053Ded91cf7eCD51ea39756857A2F0a5284
NEXT_PUBLIC_GEM_CONTRACT_ADDRESS=0x699C19321188aB200194E8A2B6db19B43106E70F
NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_WS_URL=wss://dream-rpc.somnia.network/ws
```

**Note:** Contract addresses are also hardcoded in the source files as a fallback, so the app works even without `.env.local`.

## Mobile Responsiveness

App uses iPhone frame on desktop. Removes frame on mobile devices for full-screen experience.

Mobile detection uses:
- Screen width (less than 768px)
- Touch device capabilities
- User agent detection

## Troubleshooting

Wallet not connecting:
- Ensure wallet extension is installed
- Check wallet is connected to Somnia Testnet network
- Refresh page and try again
- Check browser console for errors

Balance not updating:
- Click refresh button next to balance
- Check console for errors
- Verify contract addresses are correct
- Ensure you are on correct network

Games not loading:
- Check browser console for errors
- Ensure sounds folder exists in public directory
- Verify game components are imported correctly
- Check network requests in DevTools

Transaction fails:
- Check you have sufficient SOMNI for gas
- Verify contract addresses are correct
- Check browser console for error details
- Ensure you are on Somnia Testnet network

Score submission fails:
- Check backend server is running
- Verify backend URL is correct in `.env.local`
- Check browser console for error details
- Ensure backend has gas fees for submission

Leaderboard not updating:
- Check SDS connection in browser console
- Verify backend is submitting scores
- Check network tab for SDS subscriptions
- Refresh page if connection lost

SDS connection errors:
- Check WebSocket URL is correct: `wss://dream-rpc.somnia.network/ws`
- Verify `NEXT_PUBLIC_WS_URL` is set in `.env.local`
- Check browser console for WebSocket connection errors
- Ensure WebSocket transport is configured (required by SDK)
- SDS subscriptions require WebSocket transport for real-time updates

## Browser Support

Chrome or Edge (recommended)

Firefox

Safari

Mobile browsers (iOS Safari, Chrome Mobile)

## Contract Update Notes

When contracts are redeployed:

Update contract addresses in source files:
- `BEAT_TOKEN_ADDRESS`
- `SWAP_CONTRACT_ADDRESS`
- `GEM_CONTRACT_ADDRESS`
- `REWARDS_CONTRACT_ADDRESS`

Verify all contract interactions work:
- Buy BEAT tokens
- Mint Gem
- Submit scores
- View leaderboard

Test SDS integration:
- Leaderboard updates work
- Score feed displays correctly
- Prize pool tracker updates

## Support

For issues or questions:
- Somnia Documentation: https://docs.somnia.network
- SDS Documentation: https://datastreams.somnia.network
- Thirdweb Documentation: https://portal.thirdweb.com
- Next.js Documentation: https://nextjs.org/docs
