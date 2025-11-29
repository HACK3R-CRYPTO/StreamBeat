'use client';

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, webSocket, defineChain } from 'viem';
import { EVENT_SCHEMA_IDS } from './sds-schemas';

// Somnia Shannon Testnet chain definition
const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Dream",
  network: "somnia-dream",
  nativeCurrency: {
    name: "STT",
    symbol: "STT",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network/ws"],
    },
    public: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network/ws"],
    },
  },
  testnet: true,
});

// WebSocket URL - SDK requires WebSocket transport for subscriptions
// Using the correct WebSocket endpoint: wss://dream-rpc.somnia.network/ws
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://dream-rpc.somnia.network/ws';

// Create public client with WebSocket transport (REQUIRED by SDK for subscriptions)
const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket(WS_URL, {
    reconnect: true,
  }),
});

// Initialize SDS SDK (only public client needed for subscriptions)
// Using 'as any' to match Somnia-flow's pattern
const sdk = new SDK({
  public: publicClient,
} as any);

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

/**
 * Subscribe to ScoreSubmitted events in real-time using SDS
 */
export function subscribeToScores(
  callback: (score: ScoreEvent) => void
): () => void {
  let unsubscribeFn: (() => void) | null = null;
  
  try {
    console.log('📡 Setting up SDS subscription for ScoreSubmitted...');
    
    // Create subscription - SDK requires WebSocket transport for real-time subscriptions
    // Using wss://dream-rpc.somnia.network/ws as the WebSocket endpoint
    let subscription: Promise<any>;
    
    try {
      subscription = sdk.streams.subscribe({
        somniaStreamsEventId: EVENT_SCHEMA_IDS.SCORE_SUBMITTED,
        ethCalls: [], // No additional calls needed
        onlyPushChanges: true,
        onData: (data: any) => {
          try {
            console.log('📨 Received SDS event for ScoreSubmitted:', data);
            
            // SDS subscription returns event log data
            // The event was emitted with argumentTopics containing the player address
            // Extract player address from event topics if available
            let playerAddress = '';
            
            // Check if this is an event log structure with topics
            if (data?.result?.topics && Array.isArray(data.result.topics)) {
              // topics[0] = event signature hash
              // topics[1] = indexed parameter (player address, padded to 32 bytes)
              const topics = data.result.topics;
              if (topics.length >= 2) {
                // Extract address from topic[1] (last 40 chars after 0x)
                const topicHex = topics[1].startsWith('0x') ? topics[1] : '0x' + topics[1];
                playerAddress = '0x' + topicHex.slice(-40).toLowerCase();
                console.log('✅ Extracted player address from event topic:', playerAddress);
              }
            }
            
            // Always trigger callback to refresh leaderboard
            // The actual score will be fetched from the contract
            callback({
              player: playerAddress || '',
              score: 0, // Will be fetched from contract
              timestamp: Math.floor(Date.now() / 1000),
            });
          } catch (error) {
            console.error('❌ Error processing score event:', error);
            // Still trigger callback to refresh leaderboard even on error
            callback({
              player: '',
              score: 0,
              timestamp: Math.floor(Date.now() / 1000),
            });
          }
        },
        onError: (error: any) => {
          // Log errors but don't break - WebSocket will retry
          if (error?.message) {
            console.warn('⚠️ SDS subscription error (will retry):', error.message);
          }
        },
      });
    } catch (subscribeError: any) {
      // Catch synchronous errors from subscribe() call
      console.warn('⚠️ SDS subscription not available:', subscribeError?.message || 'WebSocket connection failed');
      console.log('💡 Leaderboard will update via polling instead of real-time');
      return () => {}; // Return no-op unsubscribe
    }

    // Handle subscription promise
    subscription.then((sub) => {
      if (sub && !(sub instanceof Error)) {
        console.log('✅ SDS subscription active for ScoreSubmitted');
        unsubscribeFn = sub.unsubscribe;
      } else if (sub instanceof Error) {
        console.warn('⚠️ SDS subscription error:', sub.message);
        // Subscription failed, but leaderboard will still work via polling
        console.log('💡 Leaderboard will update via polling instead of real-time');
      } else {
        console.warn('⚠️ SDS subscription may not be active');
      }
    }).catch((err) => {
      console.warn('⚠️ Failed to establish SDS subscription:', err.message);
      console.log('💡 Leaderboard will still work via polling');
    });

    return () => {
      if (unsubscribeFn) {
        try {
          console.log('🔌 Unsubscribing from ScoreSubmitted');
          unsubscribeFn();
        } catch (error) {
          // Silently handle unsubscribe errors
        }
      }
    };
  } catch (error) {
    console.warn('⚠️ Error setting up score subscription:', error);
    console.log('💡 Leaderboard will still work via polling');
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * Subscribe to PrizePoolUpdated events
 */
export function subscribeToPrizePool(
  callback: (amount: bigint) => void
): () => void {
  try {
    const subscription = sdk.streams.subscribe({
      somniaStreamsEventId: EVENT_SCHEMA_IDS.PRIZE_POOL_UPDATED,
      ethCalls: [], // Could add call to get current prize pool
      onlyPushChanges: true,
      onData: (data: any) => {
        try {
          // Decode SDS event data
          const decoded = Array.isArray(data) ? data : [data];
          
          decoded.forEach((item) => {
            const fields = item.data || item;
            const newAmountField = fields.find((f: any) => f.name === "newAmount");
            
            if (newAmountField) {
              callback(BigInt(newAmountField.value || 0));
            }
          });
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
      subscription?.then((sub) => {
        if (sub && !(sub instanceof Error)) sub.unsubscribe();
      }).catch(console.error);
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
  try {
    const subscription = sdk.streams.subscribe({
      somniaStreamsEventId: EVENT_SCHEMA_IDS.REWARDS_DISTRIBUTED,
      ethCalls: [],
      onlyPushChanges: true,
      onData: (data: any) => {
        try {
          // Decode SDS event data
          const decoded = Array.isArray(data) ? data : [data];
          
          decoded.forEach((item) => {
            const fields = item.data || item;
            
            const playerField = fields.find((f: any) => f.name === "player");
            const amountField = fields.find((f: any) => f.name === "amount");
            
            if (playerField && amountField) {
              callback({
                player: (playerField.value || '').toLowerCase(),
                amount: BigInt(amountField.value || 0),
              });
            }
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
      subscription?.then((sub) => {
        if (sub && !(sub instanceof Error)) sub.unsubscribe();
      }).catch(console.error);
    };
  } catch (error) {
    console.error('Error setting up rewards subscription:', error);
    return () => {};
  }
}
