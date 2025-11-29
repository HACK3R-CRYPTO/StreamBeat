/**
 * Somnia Data Streams Event Schemas for StreamBeat
 * 
 * These event schemas define the structure of events that can be subscribed to
 * via Somnia Data Streams for real-time updates.
 */

// Event schema IDs for subscriptions
export const EVENT_SCHEMA_IDS = {
  SCORE_SUBMITTED: "ScoreSubmitted",
  PRIZE_POOL_UPDATED: "PrizePoolUpdated",
  REWARDS_DISTRIBUTED: "RewardsDistributed",
} as const;

// Event schema definitions matching our contract events
export const EVENT_SCHEMAS = [
  {
    params: [
      { name: "player", paramType: "address", isIndexed: true },
      { name: "score", paramType: "uint256", isIndexed: false },
      { name: "timestamp", paramType: "uint256", isIndexed: false },
    ],
    eventTopic: "ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp)",
  },
  {
    params: [
      { name: "newAmount", paramType: "uint256", isIndexed: false },
    ],
    eventTopic: "PrizePoolUpdated(uint256 newAmount)",
  },
  {
    params: [
      { name: "player", paramType: "address", isIndexed: true },
      { name: "amount", paramType: "uint256", isIndexed: false },
    ],
    eventTopic: "RewardsDistributed(address indexed player, uint256 amount)",
  },
];
