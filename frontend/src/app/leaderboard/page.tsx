"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useWallet } from "@/context/WalletContext";
import { motion } from "framer-motion";
import IPhoneFrame from "@/components/iPhoneFrame";
import Loading from "@/components/Loading";
import { client } from "@/client";
import { defineChain, getContract } from "thirdweb";
import { readContract } from "thirdweb";
import { subscribeToScores, ScoreEvent } from '@/lib/sds-client';
import toast from 'react-hot-toast';
import { LiveScoreFeed } from '@/components/LiveScoreFeed';
import { PrizePoolTracker } from '@/components/PrizePoolTracker';
import { AddressDisplay } from '@/components/AddressDisplay';

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

interface LeaderboardEntry {
  player: string;
  score: number;
  timestamp: number;
  claimed: boolean;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<{rank: number, entry: LeaderboardEntry} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Real-time updates via SDS
    const unsubscribeScores = subscribeToScores((score) => {
      console.log('⚡ New score submitted:', score);
      
      // Refresh leaderboard when new score arrives
      fetchLeaderboard();
      
      // Optional: Show notification
      toast.success(`${score.player.slice(0, 6)}... scored ${score.score} points!`, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#333',
          color: '#fff',
          border: '1px solid #FFD700',
        },
        icon: '⚡',
      });
    });

    return () => {
      unsubscribeScores();
    };
  }, []);

  const rewardsContract = getContract({
    client,
    chain: somniaTestnet,
    address: REWARDS_CONTRACT_ADDRESS
  });

  const fetchLeaderboard = async () => {
    try {
      if (!REWARDS_CONTRACT_ADDRESS) {
        console.warn("No rewards contract address configured");
        setIsLoading(false);
        return;
      }

      console.log("Fetching leaderboard from contract:", REWARDS_CONTRACT_ADDRESS);
      
      // Try fetching from contract first
      try {
      const length = await readContract({
        contract: rewardsContract,
        method: "function getLeaderboardLength() view returns (uint256)",
        params: [],
      });
      
      const totalEntries = Number(length);
      console.log("Total leaderboard entries:", totalEntries);
      
      if (totalEntries > 0) {
          const fetchCount = Math.min(totalEntries, 100); // Limit to 100
          console.log("Fetching top", fetchCount, "players...");
        
          try {
        const players = await readContract({
          contract: rewardsContract,
          method: "function getTopPlayers(uint256) view returns ((address player, uint256 score, uint256 timestamp, bool claimed)[])",
          params: [BigInt(fetchCount)],
        });
          
            console.log("Raw players from contract:", players);
        
        // Format and normalize addresses
            // Handle BigInt values from contract
            const formattedPlayers = players.map((p: any) => {
              const score = typeof p.score === 'bigint' ? Number(p.score) : Number(p.score || 0);
              const timestamp = typeof p.timestamp === 'bigint' ? Number(p.timestamp) : Number(p.timestamp || 0);
              
              return {
                player: (p.player || '').toLowerCase(),
                score: score,
                timestamp: timestamp,
                claimed: p.claimed || false
              };
            });
            
            console.log("Formatted players:", formattedPlayers);
        
        // Deduplicate: Keep only the best score for each player
        const playerMap = new Map<string, LeaderboardEntry>();
        
        formattedPlayers.forEach((player: LeaderboardEntry) => {
          const normalizedAddress = player.player.toLowerCase();
          const existing = playerMap.get(normalizedAddress);
          
          if (!existing) {
            playerMap.set(normalizedAddress, player);
          } else if (player.score > existing.score) {
            playerMap.set(normalizedAddress, player);
          } else if (player.score === existing.score && player.timestamp > existing.timestamp) {
            playerMap.set(normalizedAddress, player);
          }
        });
        
        // Convert map to array and sort
        const allUniquePlayers = Array.from(playerMap.values())
          .sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            return b.timestamp - a.timestamp;
          });
        
            console.log("Formatted leaderboard:", allUniquePlayers);
            console.log("Setting topPlayers with:", allUniquePlayers.slice(0, 10));
            
        // Set top 10
            const top10 = allUniquePlayers.slice(0, 10);
            console.log("About to set topPlayers, current state length:", topPlayers.length);
            setTopPlayers(top10);
            console.log("topPlayers state should now have", top10.length, "players");
            console.log("top10 data:", JSON.stringify(top10, null, 2));

        // Find user rank
        if (account?.address) {
          const normalizedAccount = account.address.toLowerCase();
          const rankIndex = allUniquePlayers.findIndex(p => p.player.toLowerCase() === normalizedAccount);
          
          if (rankIndex !== -1) {
            setUserRank({
              rank: rankIndex + 1,
              entry: allUniquePlayers[rankIndex]
            });
          } else {
            setUserRank(null);
          }
        }
          } catch (getPlayersError: any) {
            console.error("Error calling getTopPlayers:", getPlayersError);
            console.error("Error details:", {
              message: getPlayersError.message,
              code: getPlayersError.code
            });
            setTopPlayers([]);
            setUserRank(null);
          }
        } else {
          console.log("Leaderboard is empty - no scores submitted yet");
          setTopPlayers([]);
          setUserRank(null);
        }
      } catch (contractError: any) {
        console.error("Error reading from contract:", contractError);
        console.error("Contract error details:", {
          message: contractError.message,
          code: contractError.code,
          data: contractError.data
        });
        
        // Fallback to backend API
        try {
          const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
          console.log("Trying backend API:", BACKEND_URL);
          const response = await fetch(`${BACKEND_URL}/api/leaderboard`);
          const data = await response.json();
          
          console.log("Backend API response:", data);
          
          if (data.leaderboard && data.leaderboard.length > 0) {
            const formattedPlayers = data.leaderboard.map((p: any) => ({
              player: p.player.toLowerCase(),
              score: p.score,
              timestamp: p.timestamp,
              claimed: p.claimed
            }));
            
            console.log("Setting players from backend:", formattedPlayers);
            setTopPlayers(formattedPlayers.slice(0, 10));
            
            if (account?.address) {
              const normalizedAccount = account.address.toLowerCase();
              const rankIndex = formattedPlayers.findIndex((p: LeaderboardEntry) => p.player.toLowerCase() === normalizedAccount);
              if (rankIndex !== -1) {
                setUserRank({
                  rank: rankIndex + 1,
                  entry: formattedPlayers[rankIndex]
                });
              }
            }
      } else {
            console.log("Backend returned empty leaderboard");
            setTopPlayers([]);
            setUserRank(null);
          }
        } catch (apiError: any) {
          console.error("Error fetching from backend API:", apiError);
          console.error("API error details:", {
            message: apiError.message,
            stack: apiError.stack
          });
        setTopPlayers([]);
        setUserRank(null);
      }
      }
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      setTopPlayers([]);
      setUserRank(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "N/A";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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

  return (
    <IPhoneFrame backgroundClassName="bg-black" statusBarContent={statusBarContent}>
      <div className="flex flex-col h-full max-h-full bg-gradient-to-b from-gray-900 to-black text-white relative">
        {/* Fixed Header */}
        <div className="pt-2 px-6 pb-1 flex-shrink-0 z-10 bg-black/95 backdrop-blur-sm border-b border-white/10">
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-yellow-400 drop-shadow-md">STREAM</span>
              <span className="text-white drop-shadow-md">BEAT</span>
            </h1>
            <p className="text-white/60 text-xs mt-0.5 font-medium">
              Powered by Somnia Data Streams
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-6 py-2 min-h-0 flex flex-col overflow-y-auto scrollbar-hide">
          
          <PrizePoolTracker />
          <LiveScoreFeed />

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent shadow-[0_0_15px_rgba(255,215,0,0.5)]"></div>
            </div>
          ) : topPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-white/60 text-lg font-bold">No scores yet</p>
              <p className="text-white/40 text-sm mt-2">Be the first to submit a score!</p>
              <p className="text-white/30 text-xs mt-4">Debug: isLoading={isLoading.toString()}, topPlayers.length={topPlayers.length}</p>
              <button
                onClick={() => {
                  console.log("Manual refresh triggered");
                  console.log("Current topPlayers:", topPlayers);
                  fetchLeaderboard();
                }}
                className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold hover:bg-yellow-300"
              >
                Refresh Leaderboard
              </button>
            </div>
          ) : (
            <>
              {/* Single Player Display (1-2 players) */}
              {topPlayers.length > 0 && topPlayers.length < 3 && (
                <div className="mb-4 mt-2">
                  <div className="space-y-3">
                    {topPlayers.map((player, index) => {
                      const isCurrentUser = account?.address?.toLowerCase() === player.player.toLowerCase();
                      const medal = index === 0 ? '👑' : index === 1 ? '🥈' : '🥉';
                      
                      return (
                        <motion.div
                          key={`${player.player}-${player.timestamp}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                            index === 0 
                              ? 'bg-gradient-to-br from-yellow-900/40 to-black border-yellow-400/50 shadow-[0_0_20px_rgba(255,215,0,0.2)]' 
                              : 'bg-white/5 border-white/20'
                          } ${isCurrentUser ? 'ring-2 ring-yellow-400' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-4xl">{medal}</div>
                            <div>
                              <p className={`text-lg font-black ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                {isCurrentUser ? "You" : formatAddress(player.player)}
                              </p>
                              <p className="text-xs text-white/60 font-mono mt-1">
                                {new Date(player.timestamp * 1000).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-black ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                              {player.score}
                            </p>
                            <p className="text-xs text-white/60">points</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Podium for Top 3 */}
              {topPlayers.length >= 3 && (
                <div className="mb-4 mt-2">
                  <div className="flex items-end justify-center gap-2" style={{ height: '160px' }}>
                    {/* 2nd Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col items-center relative z-10 w-[30%]"
                    >
                      <div className="mb-2 text-3xl">🥈</div>
                      <div className={`w-full flex flex-col items-center justify-end relative overflow-hidden h-[70%] rounded-t-xl bg-gray-800/80 border-t border-white/20 p-2 ${
                        account?.address?.toLowerCase() === topPlayers[1].player.toLowerCase() ? 'border-yellow-400 border-2' : ''
                      }`}>
                        <p className="text-[10px] truncate w-full text-center text-white/80">
                          {formatAddress(topPlayers[1].player)}
                        </p>
                        <p className="text-white font-black text-center mt-1 text-sm">
                          {topPlayers[1].score}
                        </p>
                      </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center relative z-20 w-[34%]"
                    >
                      <div className="mb-2 text-4xl drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">👑</div>
                      <div className={`w-full flex flex-col items-center justify-end relative overflow-hidden h-[100%] rounded-t-xl bg-gradient-to-b from-yellow-900/40 to-black border-t border-yellow-400/50 p-2 shadow-[0_0_20px_rgba(255,215,0,0.2)] ${
                        account?.address?.toLowerCase() === topPlayers[0].player.toLowerCase() ? 'border-yellow-400 border-2' : ''
                      }`}>
                        <p className="text-[11px] truncate w-full text-center text-yellow-400 font-bold">
                          {formatAddress(topPlayers[0].player)}
                        </p>
                        <p className="text-yellow-400 font-black text-center mt-1 text-xl">
                          {topPlayers[0].score}
                        </p>
                      </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center relative z-10 w-[30%]"
                    >
                      <div className="mb-2 text-3xl">🥉</div>
                      <div className={`w-full flex flex-col items-center justify-end relative overflow-hidden h-[50%] rounded-t-xl bg-orange-900/40 border-t border-orange-500/30 p-2 ${
                        account?.address?.toLowerCase() === topPlayers[2].player.toLowerCase() ? 'border-yellow-400 border-2' : ''
                      }`}>
                        <p className="text-[10px] truncate w-full text-center text-white/80">
                          {formatAddress(topPlayers[2].player)}
                        </p>
                        <p className="text-white font-black text-center mt-1 text-sm">
                          {topPlayers[2].score}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* List for Positions 4-10 */}
              <div className="space-y-2 pb-4">
                {topPlayers.slice(3).map((player, index) => {
                  const actualIndex = index + 4;
                  const isCurrentUser = account?.address?.toLowerCase() === player.player.toLowerCase();
                  
                  return (
                    <motion.div
                      key={`${player.player}-${player.timestamp}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-3 rounded-xl bg-white/5 border ${
                        isCurrentUser ? 'border-yellow-400 border-2 bg-yellow-400/10' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70">
                          {actualIndex}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${isCurrentUser ? 'text-yellow-400' : 'text-white'}`}>
                            {isCurrentUser ? "You" : formatAddress(player.player)}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono">
                            {new Date(player.timestamp * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-white">{player.score}</p>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 pb-6 pt-2 bg-black/95 backdrop-blur-sm z-20 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fetchLeaderboard()}
              className="col-span-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              REFRESH
            </button>
            <button
              onClick={() => router.push('/play')}
              className="bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              PLAY
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              HOME
            </button>
          </div>
        </div>
      </div>
    </IPhoneFrame>
  );
}
