'use client';

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, http, defineChain } from 'viem';
import { keccak256, toHex } from 'viem';

// Somnia Shannon Testnet chain definition
const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: {
    name: "Somnia Test Token",
    symbol: "STT",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network"],
    },
  },
  testnet: true,
});

// RPC URL for Somnia Testnet
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://dream-rpc.somnia.network';

// Create public client with HTTP transport (SDS SDK handles subscriptions internally)
// Using HTTP like Somnia-flow does - WebSocket is not required for SDS subscriptions
const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(RPC_URL),
});

// Initialize SDS SDK (only public client needed for subscriptions)
// The SDK handles real-time subscriptions internally, no WebSocket needed
const sdk = new SDK({
  public: publicClient,
  // wallet client not needed for subscriptions
});

export interface ScoreEvent {
  player: string;
  score: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  player: string;
  score: number;
  timestamp: number;
  claimed: boolean;
}

// Event signatures for topic computation
const SCORE_SUBMITTED_SIGNATURE = 'ScoreSubmitted(address,uint256,uint256)';
const PRIZE_POOL_UPDATED_SIGNATURE = 'PrizePoolUpdated(uint256)';
const REWARDS_DISTRIBUTED_SIGNATURE = 'RewardsDistributed(address,uint256)';

// Compute event topic (keccak256 of event signature)
function getEventTopic(signature: string): `0x${string}` {
  return keccak256(toHex(signature));
}

/**
 * Subscribe to ScoreSubmitted events in real-time using SDS
 */
export function subscribeToScores(
  callback: (score: ScoreEvent) => void
): () => void {
  const rewardsContract = process.env.NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS as `0x${string}`;
  
  if (!rewardsContract) {
    console.warn('REWARDS_CONTRACT_ADDRESS not set');
    return () => {}; // Return no-op unsubscribe
  }

  try {
    const topic0 = getEventTopic(SCORE_SUBMITTED_SIGNATURE);
    
    const subscription = sdk.streams.subscribe({
      somniaStreamsEventId: null, // Using contract events, not Somnia Streams events
      eventContractSource: rewardsContract,
      topicOverrides: {
        topic0: topic0,
      },
      ethCalls: [], // No additional calls needed
      onData: (data: any) => {
        try {
          // Decode event data
          // data structure: { topics: [topic0, topic1, ...], data: '0x...' }
          // topic1 = player address (indexed)
          // data = score (uint256) + timestamp (uint256)
          
          const player = data.topics?.[1] || '0x0';
          const dataHex = data.data || '0x';
          
          // Decode: first 32 bytes = score, next 32 bytes = timestamp
          const score = BigInt(dataHex.slice(2, 66) || '0');
          const timestamp = BigInt('0x' + (dataHex.slice(66, 130) || '0'));
          
        callback({
            player: player.toLowerCase(),
            score: Number(score),
            timestamp: Number(timestamp),
          });
        } catch (error) {
          console.error('Error decoding score event:', error);
        }
      },
      onError: (error: any) => {
        // Silently handle WebSocket errors - SDS will retry automatically
        // Only log if it's not a WebSocket error
        if (error?.message && !error.message.includes('WebSocket')) {
          console.error('Error subscribing to scores:', error);
      }
      },
    });

    return () => {
      if (subscription) {
        subscription.then((sub) => {
          if (sub && typeof sub.unsubscribe === 'function') {
            sub.unsubscribe();
          }
        }).catch(() => {
          // Silently handle unsubscribe errors
        });
      }
    };
  } catch (error) {
    console.error('Error setting up score subscription:', error);
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * Subscribe to PrizePoolUpdated events
 */
export function subscribeToPrizePool(
  callback: (amount: bigint) => void
): () => void {
  const rewardsContract = process.env.NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS as `0x${string}`;
  
  if (!rewardsContract) {
    return () => {};
  }

  try {
    const topic0 = getEventTopic(PRIZE_POOL_UPDATED_SIGNATURE);
    
    const subscription = sdk.streams.subscribe({
      somniaStreamsEventId: null,
      eventContractSource: rewardsContract,
      topicOverrides: {
        topic0: topic0,
      },
      ethCalls: [], // Could add call to get current prize pool
      onData: (data: any) => {
        try {
          // Decode: data = newAmount (uint256)
          const dataHex = data.data || '0x';
          const amount = BigInt(dataHex.slice(2, 66) || '0');
          callback(amount);
        } catch (error) {
          console.error('Error decoding prize pool event:', error);
        }
      },
      onError: (error: any) => {
        // Silently handle WebSocket errors - SDS will retry automatically
        if (error?.message && !error.message.includes('WebSocket')) {
          console.error('Error subscribing to prize pool:', error);
      }
      },
    });

    return () => {
      subscription?.then((sub) => sub?.unsubscribe()).catch(console.error);
    };
  } catch (error) {
    console.error('Error setting up prize pool subscription:', error);
    return () => {};
  }
}

/**
 * Subscribe to RewardsDistributed events
 */
export function subscribeToRewards(
  callback: (reward: { player: string; amount: bigint }) => void
): () => void {
  const rewardsContract = process.env.NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS as `0x${string}`;
  
  if (!rewardsContract) {
    return () => {};
  }

  try {
    const topic0 = getEventTopic(REWARDS_DISTRIBUTED_SIGNATURE);
    
    const subscription = sdk.streams.subscribe({
      somniaStreamsEventId: null,
      eventContractSource: rewardsContract,
      topicOverrides: {
        topic0: topic0,
      },
      ethCalls: [],
      onData: (data: any) => {
        try {
          // Decode: topic1 = player address (indexed), data = amount (uint256)
          const player = data.topics?.[1] || '0x0';
          const dataHex = data.data || '0x';
          const amount = BigInt(dataHex.slice(2, 66) || '0');
          
        callback({
            player: player.toLowerCase(),
            amount: amount,
          });
        } catch (error) {
          console.error('Error decoding rewards event:', error);
        }
      },
      onError: (error: any) => {
        // Silently handle WebSocket errors - SDS will retry automatically
        if (error?.message && !error.message.includes('WebSocket')) {
          console.error('Error subscribing to rewards:', error);
      }
      },
    });

    return () => {
      subscription?.then((sub) => sub?.unsubscribe()).catch(console.error);
    };
  } catch (error) {
    console.error('Error setting up rewards subscription:', error);
    return () => {};
  }
}
