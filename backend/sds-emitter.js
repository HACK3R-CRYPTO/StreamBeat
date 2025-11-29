/**
 * Somnia Data Streams Event Emitter for StreamBeat Backend
 * 
 * Emits events through SDS when scores are submitted to enable real-time subscriptions
 */

const { SDK, SchemaEncoder, zeroBytes32 } = require('@somnia-chain/streams');
const { createPublicClient, createWalletClient, http, toHex, defineChain, keccak256, stringToHex, pad, hexToBytes, waitForTransactionReceipt } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// Somnia Testnet chain definition
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
    },
  },
  testnet: true,
});

// Event schema IDs
const EVENT_SCHEMA_IDS = {
  SCORE_SUBMITTED: "ScoreSubmitted",
  PRIZE_POOL_UPDATED: "PrizePoolUpdated",
  REWARDS_DISTRIBUTED: "RewardsDistributed",
};

// Score data schema
const SCORE_SCHEMA = "uint64 timestamp, address player, uint256 score";
const SCORE_SCHEMA_NAME = "streambeat_score";

// Event schema definition for registration
const EVENT_SCHEMA = {
  id: EVENT_SCHEMA_IDS.SCORE_SUBMITTED,
  params: [
    { name: "player", paramType: "address", isIndexed: true },
  ],
  eventTopic: "ScoreSubmitted(address indexed player)",
};

let sdkInstance = null;

/**
 * Initialize SDS SDK with wallet
 */
function initSDK(privateKey, rpcUrl) {
  if (sdkInstance) {
    return sdkInstance;
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(rpcUrl),
  });

  sdkInstance = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  return sdkInstance;
}

/**
 * Register score data schema (idempotent - safe to call multiple times)
 */
async function ensureScoreSchemaRegistered(sdk) {
  try {
    const schemaId = await sdk.streams.computeSchemaId(SCORE_SCHEMA);
    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);
    
    if (!isRegistered) {
      console.log('📝 Registering score data schema...');
      const txHash = await sdk.streams.registerDataSchemas(
        [{
          schemaName: SCORE_SCHEMA_NAME,
          schema: SCORE_SCHEMA,
          parentSchemaId: zeroBytes32,
        }],
        true // ignore if already registered
      );
      if (txHash) {
        console.log('✅ Score schema registered:', txHash);
      }
    }
  } catch (error) {
    console.warn('⚠️ Schema registration check failed (non-blocking):', error.message);
  }
}

/**
 * Register event schema (idempotent - safe to call multiple times)
 * Event schemas must be registered before they can be used in setAndEmitEvents
 */
async function ensureEventSchemaRegistered(sdk) {
  try {
    // Check if event schema is already registered
    try {
      const existingSchemas = await sdk.streams.getEventSchemasById([EVENT_SCHEMA.id]);
      if (existingSchemas && existingSchemas.length > 0 && existingSchemas[0] !== null) {
        console.log('✅ Event schema already registered');
        return; // Already registered
      }
    } catch (checkError) {
      // Schema not registered, continue to register
      console.log('📝 Event schema not found, will register...');
    }
    
    // Verify EVENT_SCHEMA is defined
    if (!EVENT_SCHEMA) {
      throw new Error('EVENT_SCHEMA is not defined');
    }
    if (!EVENT_SCHEMA.params) {
      throw new Error('EVENT_SCHEMA.params is not defined');
    }
    if (!EVENT_SCHEMA.eventTopic) {
      throw new Error('EVENT_SCHEMA.eventTopic is not defined');
    }

    // Register the event schema
    console.log('📝 Registering event schema: ScoreSubmitted...');
    
    // Verify EVENT_SCHEMA is defined
    if (!EVENT_SCHEMA) {
      throw new Error('EVENT_SCHEMA is not defined');
    }
    if (!EVENT_SCHEMA.params) {
      throw new Error('EVENT_SCHEMA.params is not defined');
    }
    if (!EVENT_SCHEMA.eventTopic) {
      throw new Error('EVENT_SCHEMA.eventTopic is not defined');
    }
    
    // SDK expects: [{ id: string, schema: { params: [...], eventTopic: string } }]
    // NOT: [ids], [schemas] as separate arrays
    const eventSchemaRegistration = {
      id: EVENT_SCHEMA.id,
      schema: {
        params: EVENT_SCHEMA.params,
        eventTopic: EVENT_SCHEMA.eventTopic,
      }
    };
    
    console.log('📝 Event schema to register:', JSON.stringify(eventSchemaRegistration, null, 2));
    
    // Try to register - the SDK expects a single array of { id, schema } objects
    let txHash;
    try {
      // Based on SDK source code, registerEventSchemas expects:
      // An array of objects with { id, schema: { params, eventTopic } }
      txHash = await sdk.streams.registerEventSchemas([eventSchemaRegistration]);
    } catch (regCallError) {
      console.error('❌ registerEventSchemas call error:', regCallError.message);
      console.error('   Error type:', regCallError.constructor.name);
      if (regCallError.stack) {
        console.error('   Stack:', regCallError.stack.split('\n').slice(0, 5).join('\n'));
      }
      throw regCallError;
    }
    
    if (!txHash) {
      throw new Error('Registration returned null');
    }
    
    if (txHash instanceof Error) {
      throw txHash;
    }
    
    console.log('✅ Event schema registration tx sent:', txHash);
    
    // Wait for transaction to be confirmed
    try {
      const publicClient = sdk.public;
      await waitForTransactionReceipt(publicClient, { hash: txHash, timeout: 30000 });
      console.log('✅ Event schema registration confirmed');
    } catch (waitError) {
      console.warn('⚠️ Could not wait for transaction confirmation:', waitError.message);
      // Continue anyway - transaction might still be processing
    }
  } catch (error) {
    // Log the full error for debugging
    console.error('❌ Event schema registration error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause.message);
    }
    
    // If it's already registered, that's fine
    if (error.message && (
      error.message.includes('already registered') || 
      error.message.includes('EventSchemaAlreadyRegistered')
    )) {
      console.log('✅ Event schema already registered (from error)');
      return;
    }
    throw error;
  }
}

/**
 * Emit ScoreSubmitted event through SDS
 * Following Somnia-flow pattern: only register data schemas, use event IDs directly
 */
async function emitScoreSubmitted(playerAddress, score, timestamp, privateKey, rpcUrl) {
  try {
    const sdk = initSDK(privateKey, rpcUrl);
    
    // Register both data and event schemas
    await ensureScoreSchemaRegistered(sdk);
    
    // Register event schema (required before emitting)
    // Note: Event schemas should be registered once via script, not on every emission
    // For now, we'll try to register and if it fails, we'll skip emission
    let eventSchemaRegistered = false;
    try {
      await ensureEventSchemaRegistered(sdk);
      eventSchemaRegistered = true;
    } catch (regError) {
      console.error('❌ Failed to register event schema:', regError.message);
      console.error('   Stack:', regError.stack);
      // Don't try to emit if registration failed - it will definitely fail
      console.warn('⚠️ Skipping SDS event emission - event schema not registered');
      console.warn('   Run: node register-event-schema.js to register manually');
      return null;
    }
    
    // Compute schema ID
    const schemaId = await sdk.streams.computeSchemaId(SCORE_SCHEMA);
    
    // Encode score data
    const encoder = new SchemaEncoder(SCORE_SCHEMA);
    const encodedData = encoder.encodeData([
      { name: "timestamp", value: timestamp.toString(), type: "uint64" },
      { name: "player", value: playerAddress, type: "address" },
      { name: "score", value: score.toString(), type: "uint256" },
    ]);

    // Create a unique 32-byte data ID by hashing the score identifier
    const scoreIdString = `score_${playerAddress}_${timestamp}`;
    const dataId = keccak256(stringToHex(scoreIdString));

    // Pad address to 32 bytes for argumentTopics
    // Addresses are 20 bytes, need to pad to 32 bytes (left-pad with zeros)
    const addressBytes = hexToBytes(playerAddress.toLowerCase());
    const paddedAddress = pad(addressBytes, { size: 32 });
    const addressTopic = toHex(paddedAddress);

    // Emit event through SDS
    const txHash = await sdk.streams.setAndEmitEvents(
      [{ id: dataId, schemaId, data: encodedData }],
      [
        {
          id: EVENT_SCHEMA_IDS.SCORE_SUBMITTED,
          argumentTopics: [addressTopic],
          data: "0x",
        },
      ]
    );

    if (txHash && !(txHash instanceof Error)) {
      console.log(`📡 SDS event emitted: ScoreSubmitted for ${playerAddress}`);
      return txHash;
    } else {
      console.warn('⚠️ Failed to emit SDS event:', txHash);
      return null;
    }
  } catch (error) {
    console.error('❌ Error emitting SDS event:', error.message);
    // Don't throw - SDS emission failure shouldn't break score submission
    return null;
  }
}

module.exports = {
  emitScoreSubmitted,
  EVENT_SCHEMA_IDS,
};

