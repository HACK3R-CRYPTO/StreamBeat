/**
 * Script to register StreamBeat event schema on Somnia Data Streams
 * 
 * Run this script once to register the event schema:
 * node backend/register-event-schema.js
 */

require('dotenv').config();
const { SDK } = require('@somnia-chain/streams');
const { createPublicClient, createWalletClient, http, defineChain } = require('viem');
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

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL || process.env.SOMNIA_RPC || 'https://dream-rpc.somnia.network';

  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not found in .env file");
    process.exit(1);
  }

  console.log("🚀 Registering StreamBeat event schema on Somnia Data Streams...");
  console.log("RPC URL:", rpcUrl);
  console.log("");

  try {
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

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    // SDK expects: [{ id: string, schema: { params: [...], eventTopic: string } }]
    const eventSchemaRegistration = {
      id: "ScoreSubmitted",
      schema: {
        params: [
          { name: "player", paramType: "address", isIndexed: true },
        ],
        eventTopic: "ScoreSubmitted(address indexed player)",
      }
    };

    console.log("📝 Registering event schema:", eventSchemaRegistration.id);
    console.log("📝 Schema:", JSON.stringify(eventSchemaRegistration, null, 2));

    // Register the event schema - SDK expects single array of { id, schema } objects
    const txHash = await sdk.streams.registerEventSchemas([eventSchemaRegistration]);

    if (txHash && !(txHash instanceof Error)) {
      console.log("✅ Event schema registered successfully!");
      console.log("Transaction hash:", txHash);
    } else if (txHash instanceof Error) {
      console.error("❌ Error:", txHash.message);
      process.exit(1);
    } else {
      console.log("ℹ️ Event schema may already be registered");
    }
  } catch (error) {
    console.error("❌ Error registering event schema:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

