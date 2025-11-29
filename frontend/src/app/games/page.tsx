"use client";
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import IPhoneFrame from '@/components/iPhoneFrame';
import { useWallet } from '@/context/WalletContext';
import { useEffect, useState } from 'react';
import { getContract } from 'thirdweb';
import { client } from '@/client';
import { defineChain } from 'thirdweb';
import { readContract } from 'thirdweb';
import toast from 'react-hot-toast';
import { AddressDisplay } from '@/components/AddressDisplay';

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

const GEM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GEM_CONTRACT_ADDRESS || '0x699C19321188aB200194E8A2B6db19B43106E70F';

const gemContract = getContract({
  client,
  chain: somniaTestnet,
  address: GEM_CONTRACT_ADDRESS
});

export default function GamesPage() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  const [hasGem, setHasGem] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkGemOwnership();
  }, [account?.address]);

  const checkGemOwnership = async () => {
    if (!account?.address) {
      setIsChecking(false);
      return;
    }

    try {
      const balance = await readContract({
        contract: gemContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      });

      const hasGemNFT = Number(balance) > 0;
      setHasGem(hasGemNFT);
      
      if (!hasGemNFT) {
        toast.error('You need a StreamBeat Gem to play games!');
        setTimeout(() => router.push('/mint'), 2000);
      }
    } catch (error) {
      console.error('Error checking Gem ownership:', error);
      setHasGem(false);
    } finally {
      setIsChecking(false);
    }
  };

  const statusBarContent = (
    <>
      <AddressDisplay 
        address={account?.address} 
        isConnected={isConnected} 
      />
      <div className="status-bar-item text-white text-xs font-bold">9:41</div>
    </>
  );

  if (isChecking) {
    return (
      <IPhoneFrame backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" statusBarContent={statusBarContent}>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-lg">Checking Gem ownership...</div>
        </div>
      </IPhoneFrame>
    );
  }

  if (!hasGem) {
    return null; // Will redirect to /mint
  }

  return (
    <IPhoneFrame backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" statusBarContent={statusBarContent}>
      <div className="flex flex-col items-center justify-center h-full px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-black mb-2">
            <span className="text-yellow-400">Choose</span>
            <span className="text-white"> Game</span>
          </h1>
          <p className="text-white/60 text-sm">Select a game to play</p>
        </motion.div>

        {/* Game Cards */}
        <div className="w-full max-w-sm space-y-4">
          {/* Rhythm Game */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/play')}
            className="w-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 backdrop-blur-md border-2 border-yellow-400/50 rounded-2xl p-6 text-left hover:border-yellow-400 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎵</div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white mb-1">StreamBeat</h2>
                <p className="text-white/70 text-sm mb-2">Rhythm-based gameplay</p>
                <div className="flex items-center gap-2 text-yellow-400 text-xs">
                  <span>⚡</span>
                  <span>Tap glowing buttons</span>
                </div>
              </div>
              <div className="text-white/40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </motion.button>

          {/* Simon Game */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/simon-game')}
            className="w-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 backdrop-blur-md border-2 border-blue-400/50 rounded-2xl p-6 text-left hover:border-blue-400 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎮</div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white mb-1">Simon Game</h2>
                <p className="text-white/70 text-sm mb-2">Memory challenge</p>
                <div className="flex items-center gap-2 text-blue-400 text-xs">
                  <span>🧠</span>
                  <span>Remember sequences</span>
                </div>
              </div>
              <div className="text-white/40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex gap-4"
        >
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-white font-bold transition-all"
          >
            Leaderboard
          </button>
          <button
            onClick={() => router.push('/nfts')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-white font-bold transition-all"
          >
            My NFTs
          </button>
        </motion.div>
      </div>
    </IPhoneFrame>
  );
}

