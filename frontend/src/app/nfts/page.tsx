"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useWallet } from "@/context/WalletContext";
import { motion } from "framer-motion";
import IPhoneFrame from "@/components/iPhoneFrame";
import { getContract } from 'thirdweb';
import { client } from '@/client';
import { defineChain } from 'thirdweb';
import { readContract } from 'thirdweb';
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

export default function NFTsPage() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  const [nfts, setNfts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (account?.address) {
      fetchNFTs();
    } else {
      setIsLoading(false);
      setNfts([]);
    }
  }, [account?.address]);

  const fetchNFTs = async () => {
    if (!account?.address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get balance
      const balance = await readContract({
        contract: gemContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      });

      const balanceNum = Number(balance);
      console.log("Gem balance:", balanceNum);

      if (balanceNum === 0) {
        setNfts([]);
        setIsLoading(false);
        return;
      }

      // Get total minted to know the range
      const totalMinted = await readContract({
        contract: gemContract,
        method: "function totalMinted() view returns (uint256)",
        params: [],
      });

      const totalMintedNum = Number(totalMinted);
      console.log("Total minted:", totalMintedNum);

      // Fetch all token IDs owned by this address
      // We'll check each token ID (starting from 1)
      const ownedNFTs: any[] = [];
      
      for (let i = 1; i <= totalMintedNum; i++) {
        try {
          const owner = await readContract({
            contract: gemContract,
            method: "function ownerOf(uint256) view returns (address)",
            params: [BigInt(i)],
          });

          if (owner.toLowerCase() === account.address.toLowerCase()) {
            ownedNFTs.push({
              id: i,
              tokenId: i,
              name: 'StreamBeat Gem',
              owner: owner,
            });
          }
        } catch (error) {
          // Token doesn't exist or error, skip
          continue;
        }
      }

      console.log("Owned NFTs:", ownedNFTs);
      setNfts(ownedNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      setNfts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const statusBarContent = (
    <>
      <div className="status-bar-item flex items-center gap-1">
        <div className="status-indicator bg-green-400 w-2 h-2 rounded-full"></div>
        <div className="text-xs font-bold text-white">StreamBeat</div>
      </div>
      <div className="status-bar-item text-white text-xs font-bold">9:41</div>
    </>
  );

  return (
    <IPhoneFrame backgroundClassName="bg-black" statusBarContent={statusBarContent}>
      <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black text-white">
        {/* Header */}
        <div className="pt-2 px-6 pb-1 flex-shrink-0 z-10 bg-black/95 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-black tracking-tight">
                <span className="text-yellow-400 drop-shadow-md">MY</span>
                <span className="text-white drop-shadow-md"> NFTs</span>
              </h1>
              <p className="text-white/60 text-xs mt-0.5 font-medium">
                Your StreamBeat Collection
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <AddressDisplay address={account?.address} isConnected={isConnected} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 min-h-0 overflow-y-auto scrollbar-hide">
          {!account?.address ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-white/60 text-lg font-bold mb-4">Connect Wallet</p>
              <p className="text-white/40 text-sm text-center">
                Connect your wallet to view your NFTs
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent"></div>
            </div>
          ) : nfts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-6xl mb-4">💎</div>
              <p className="text-white/60 text-lg font-bold">No Gems yet</p>
              <p className="text-white/40 text-sm mt-2 text-center mb-4">
                Mint a StreamBeat Gem to play games!
              </p>
              <button
                onClick={() => router.push('/mint')}
                className="px-6 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
              >
                Mint Gem
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {nfts.map((nft, index) => (
                <motion.div
                  key={nft.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 rounded-xl border border-white/10 p-4"
                >
                  <div className="aspect-square bg-gradient-to-br from-yellow-400/20 to-purple-500/20 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-4xl">💎</span>
                  </div>
                  <p className="text-white font-bold text-sm">{nft.name || 'StreamBeat Gem'}</p>
                  <p className="text-white/40 text-xs mt-1">#{nft.tokenId || '0'}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 pb-6 pt-2 bg-black/95 backdrop-blur-sm z-20 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/games')}
              className="bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              GAMES
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              LEADERBOARD
            </button>
          </div>
        </div>
      </div>
    </IPhoneFrame>
  );
}
