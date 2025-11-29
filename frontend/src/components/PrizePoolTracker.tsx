'use client';

import { useState, useEffect } from 'react';
import { subscribeToPrizePool } from '@/lib/sds-client';
import { readContract } from 'thirdweb';
import { getContract } from 'thirdweb';
import { client } from '@/client';
import { defineChain } from 'thirdweb/chains';

// Somnia Shannon Testnet
const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  rpc: "https://dream-rpc.somnia.network",
  nativeCurrency: {
    name: "Somnia Test Token",
    symbol: "STT",
    decimals: 18
  },
  testnet: true,
});

const REWARDS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS || '0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7';

export function PrizePoolTracker() {
  const [prizePool, setPrizePool] = useState<bigint>(BigInt(0));
  const [isUpdating, setIsUpdating] = useState(false);

  // Initial fetch
  useEffect(() => {
    if (REWARDS_CONTRACT_ADDRESS) {
      fetchPrizePool();
    }
  }, []);

  // Real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToPrizePool((amount) => {
      setPrizePool(amount);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 1000);
    });

    return unsubscribe;
  }, []);

  const fetchPrizePool = async () => {
    try {
      if (!REWARDS_CONTRACT_ADDRESS) return;

      const contract = getContract({
        client,
        chain: somniaTestnet,
        address: REWARDS_CONTRACT_ADDRESS,
      });

      const pool = await readContract({
        contract,
        method: 'function prizePool() view returns (uint256)',
        params: [],
      });

      setPrizePool(BigInt(pool.toString()));
    } catch (error) {
      console.error('Error fetching prize pool:', error);
    }
  };

  const formatTokens = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(2);
  };

  return (
    <div className={`bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 mb-4 transition-all duration-300 border border-white/10 ${isUpdating ? 'scale-105 border-yellow-400/50 shadow-[0_0_15px_rgba(255,215,0,0.3)]' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Prize Pool</p>
          <p className="text-2xl font-black text-white drop-shadow-md">
            💰 {formatTokens(prizePool)} <span className="text-sm font-normal text-white/60">BEAT</span>
          </p>
        </div>
        {isUpdating && (
          <div className="animate-pulse text-green-400 font-bold flex items-center gap-1">
            <span className="text-xl">⚡</span> Live
          </div>
        )}
      </div>
    </div>
  );
}
