"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useWallet } from "@/context/WalletContext";
import toast from 'react-hot-toast';
import IPhoneFrame from "@/components/iPhoneFrame";
import { motion } from "framer-motion";
import { AddressDisplay } from '@/components/AddressDisplay';
import { SIMON_GAME_CONFIG } from "@/config/game";
import { client } from "@/client";
import { defineChain, getContract } from "thirdweb";
import { readContract } from "thirdweb";
import { ConnectButton } from "thirdweb/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const GEM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GEM_CONTRACT_ADDRESS || "0x699C19321188aB200194E8A2B6db19B43106E70F";

const chain = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  rpc: "https://dream-rpc.somnia.network",
  nativeCurrency: {
    name: "SOMNI",
    symbol: "SOMNI",
    decimals: 18
  }
});

const gemContract = getContract({
  client: client,
  chain: chain,
  address: GEM_CONTRACT_ADDRESS
});

const BUTTON_COLORS = ["red", "blue", "green", "yellow"];
const BUTTON_COLORS_HEX = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
};

export default function SimonGamePage() {
  const router = useRouter();
  const { account, isConnected, wallet } = useWallet();
  const [isMinted, setIsMinted] = useState(false);
  const [gemBalance, setGemBalance] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gamePattern, setGamePattern] = useState<string[]>([]);
  const [userPattern, setUserPattern] = useState<string[]>([]);
  const [sequencesCompleted, setSequencesCompleted] = useState(0);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  
  const scoreRef = useRef<number>(0);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const sequenceTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Initialize audio files
  useEffect(() => {
    BUTTON_COLORS.forEach(color => {
      const audio = new Audio(`/sounds/${color}.mp3`);
      audio.preload = 'auto';
      audioRefs.current[color] = audio;
    });
    const wrongAudio = new Audio('/sounds/wrong.mp3');
    wrongAudio.preload = 'auto';
    audioRefs.current['wrong'] = wrongAudio;
  }, []);

  // Check Gem ownership
  useEffect(() => {
    if (wallet && account?.address) {
      checkGemBalance();
    } else {
      setIsMinted(false);
      setGemBalance(0);
    }
  }, [account?.address, isConnected]);

  const checkGemBalance = async () => {
    if (!account?.address) {
      setIsMinted(false);
      setGemBalance(0);
      return;
    }

    setIsChecking(true);
    try {
      const balance = await readContract({
        contract: gemContract,
        method: "function balanceOf(address owner) view returns (uint256)",
        params: [account.address]
      });
      const balanceNum = Number(balance);
      setGemBalance(balanceNum);
      setIsMinted(balanceNum > 0);
    } catch (error) {
      console.error("Error checking Gem balance:", error);
      toast.error("Failed to check Gem balance. Please refresh the page.");
    } finally {
      setIsChecking(false);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      sequenceTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const playSound = (color: string) => {
    const audio = audioRefs.current[color];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Silently fail - game continues without sound
      });
    }
  };

  const showSequence = (pattern: string[]) => {
    if (pattern.length === 0) return;
    
    setIsShowingSequence(true);
    setUserPattern([]); // Reset user pattern
    
    // Flash each button ONE AT A TIME using setTimeout chaining
    pattern.forEach((color, index) => {
      const timeout = setTimeout(() => {
        const button = document.getElementById(color);
        
        if (button) {
          // Force remove any existing classes that might interfere
          button.classList.remove('pressed');
          button.classList.remove('opacity-50');
          
          // Make button flash VERY brightly and visibly (like RhythmRush)
          button.style.cssText = `
            opacity: 0.2 !important;
            filter: brightness(5) saturate(2) !important;
            transform: scale(1.2) !important;
            box-shadow: 0 0 50px white, 0 0 80px rgba(255,255,255,1), inset 0 0 30px rgba(255,255,255,0.8) !important;
            z-index: 100 !important;
            transition: all 150ms ease-in-out !important;
          `;
          playSound(color);
          
          // Flash back to normal after visible flash
          setTimeout(() => {
            if (button) {
              // Restore normal styles
              button.style.cssText = `
                opacity: 1 !important;
                filter: brightness(1) saturate(1) !important;
                transform: scale(1) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
                z-index: 1 !important;
                transition: all 150ms ease-in-out !important;
              `;
              
              // Re-add opacity class if sequence is still showing
              if (isShowingSequence) {
                button.classList.add('opacity-50');
              }
            }
          }, SIMON_GAME_CONFIG.FLASH_DURATION);
        }
      }, index * SIMON_GAME_CONFIG.SEQUENCE_DELAY); 
      
      sequenceTimeoutsRef.current.push(timeout);
    });
    
    // Allow user input after entire sequence is shown
    const finalTimeout = setTimeout(() => {
      setIsShowingSequence(false);
    }, pattern.length * SIMON_GAME_CONFIG.SEQUENCE_DELAY + SIMON_GAME_CONFIG.INITIAL_DELAY);
    sequenceTimeoutsRef.current.push(finalTimeout);
  };

  const nextSequence = () => {
    const randomColor = BUTTON_COLORS[Math.floor(Math.random() * BUTTON_COLORS.length)];
    const newPattern = [...gamePattern, randomColor];
    setGamePattern(newPattern);

    setTimeout(() => {
      showSequence(newPattern);
    }, 100);
  };

  const checkAnswer = (currentUserPattern: string[]) => {
    const currentIndex = currentUserPattern.length - 1;
    
    if (gamePattern[currentIndex] === currentUserPattern[currentIndex]) {
      if (currentUserPattern.length === gamePattern.length) {
        const newSequences = sequencesCompleted + 1;
        setSequencesCompleted(newSequences);
        
        const timeElapsed = Date.now() - startTime;
        const speedBonus = Math.max(0, Math.floor((60000 - timeElapsed) / SIMON_GAME_CONFIG.SPEED_BONUS_DIVISOR));
        const newScore = newSequences * SIMON_GAME_CONFIG.BASE_SCORE_PER_SEQUENCE + speedBonus;
        
        scoreRef.current = newScore;
        setScore(newScore);
        
        setTimeout(() => {
          nextSequence();
        }, 500);
      }
    } else {
      handleGameOver();
    }
  };

  const handleGameOver = () => {
    playSound('wrong');
    setGameOver(true);
    setGameActive(false);
    setIsShowingSequence(false);
    
    sequenceTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    sequenceTimeoutsRef.current = [];
    
    setTimeout(() => {
      submitScoreToBlockchain(scoreRef.current);
    }, 1500);
  };

  const animateButton = (color: string) => {
    const button = document.getElementById(color);
    if (button) {
      button.classList.add('pressed');
      setTimeout(() => {
        button.classList.remove('pressed');
      }, 150);
    }
  };

  const handleButtonClick = (color: string) => {
    if (!gameActive || isShowingSequence || gameOver) return;

    const newUserPattern = [...userPattern, color];
    setUserPattern(newUserPattern);
    
    playSound(color);
    animateButton(color);
    
    // Check answer immediately
    checkAnswer(newUserPattern);
  };

  const startGame = () => {
    if (!account?.address) {
      toast.error('Please connect your wallet first', {
        duration: 3000
      });
      router.push('/wallet-connect');
      return;
    }

    if (!isMinted) {
      toast.error('You need to mint a Gem before playing', {
        duration: 3000
      });
      router.push('/games');
      return;
    }

    setGamePattern([]);
    setUserPattern([]);
    setSequencesCompleted(0);
    setScore(0);
    setGameOver(false);
    setGameActive(true);
    setIsShowingSequence(false);
    setStartTime(Date.now());
    scoreRef.current = 0;
    
    sequenceTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    sequenceTimeoutsRef.current = [];
    
    nextSequence();
  };

  const submitScoreToBlockchain = async (finalScore: number) => {
    setIsSubmitting(true);
    
    if (!account?.address) {
      toast.error('Please connect your wallet');
      setIsSubmitting(false);
      return;
    }

    try {
      toast.loading('Submitting score...', { id: 'submit-score' });
      
      const response = await fetch(`${BACKEND_URL}/api/submit-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: account.address,
          scoreData: {
            score: finalScore,
            gameTime: Date.now() - startTime,
            combo: sequencesCompleted,
            perfect: sequencesCompleted,
            good: 0,
            miss: gameOver ? 1 : 0,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Score submitted: ${finalScore} points!`, { id: 'submit-score' });
        setTimeout(() => router.push('/leaderboard'), 2000);
      } else {
        toast.error(data.error || 'Failed to submit score', { id: 'submit-score' });
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score. Check backend connection.', { id: 'submit-score' });
    } finally {
      setIsSubmitting(false);
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

  // Show wallet connect if not connected
  if (!isConnected || !account) {
    return (
      <IPhoneFrame 
        backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" 
        statusBarContent={statusBarContent}
      >
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="text-7xl mb-4">🎵</div>
          <h1 className="text-4xl font-black tracking-tight mb-4">
            <span className="text-yellow-400">STREAM</span>
            <span className="text-white">BEAT</span>
          </h1>
          <p className="text-white/80 mb-6">Connect your wallet to play</p>
          <ConnectButton
            client={client}
            chain={chain}
            connectButton={{
              style: {
                backgroundColor: '#FFD700',
                color: '#000',
                fontWeight: 'bold',
                borderRadius: '12px',
                padding: '12px 24px',
              }
            }}
          />
          <button
            onClick={() => router.push('/wallet-connect')}
            className="mt-4 text-white/60 text-sm underline"
          >
            Go to wallet connect
          </button>
        </div>
      </IPhoneFrame>
    );
  }

  // Show mint page if no Gem
  if (!isMinted && !isChecking) {
    return (
      <IPhoneFrame 
        backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" 
        statusBarContent={statusBarContent}
      >
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="text-7xl mb-4">💎</div>
          <h1 className="text-4xl font-black tracking-tight mb-4">
            <span className="text-yellow-400">MINT A GEM</span>
          </h1>
          <p className="text-white/80 mb-6">You need a Gem NFT to play</p>
          <button
            onClick={() => router.push('/games')}
            className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Go to Mint Page
          </button>
        </div>
      </IPhoneFrame>
    );
  }

  // Show loading while checking
  if (isChecking) {
    return (
      <IPhoneFrame 
        backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" 
        statusBarContent={statusBarContent}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-7xl mb-4 animate-pulse">💎</div>
          <p className="text-white/80">Checking Gem balance...</p>
        </div>
      </IPhoneFrame>
    );
  }

  return (
    <IPhoneFrame 
      backgroundClassName="bg-gradient-to-br from-[#011F3F] to-[#001122]" 
      statusBarContent={statusBarContent}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
        <h1 
          className="text-white font-black mb-2 text-center"
          style={{ 
            fontSize: 'clamp(18px, 4vw, 24px)',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {gameOver 
            ? `Game Over!` 
            : gameActive 
              ? isShowingSequence 
                ? `Watch...` 
                : `Your Turn!` 
              : 'Simon Game'}
        </h1>

        {gameActive && (
          <div className="text-yellow-400 font-bold mb-2" style={{ fontSize: 'clamp(14px, 3.5vw, 18px)' }}>
            Score: {score} | Sequences: {sequencesCompleted}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 max-w-[320px] w-full mb-4">
          {BUTTON_COLORS.map((color) => (
            <motion.button
              key={color}
              id={color}
              onClick={() => handleButtonClick(color)}
              disabled={!gameActive || isShowingSequence || gameOver}
              whileHover={gameActive && !isShowingSequence && !gameOver ? { scale: 1.05 } : {}}
              whileTap={gameActive && !isShowingSequence && !gameOver ? { scale: 0.95 } : {}}
              className={`
                aspect-square rounded-3xl border-4 border-black
                ${color === 'red' ? 'bg-red-500' : ''}
                ${color === 'blue' ? 'bg-blue-500' : ''}
                ${color === 'green' ? 'bg-green-500' : ''}
                ${color === 'yellow' ? 'bg-yellow-400' : ''}
                ${!gameActive || gameOver ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}
              `}
              style={{
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                position: 'relative',
                zIndex: 1,
                transition: 'opacity 200ms ease-in-out, filter 200ms ease-in-out',
              }}
            />
          ))}
        </div>

        {isShowingSequence && (
          <div className="text-white/90 mb-2 text-center font-bold" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
            Watch the sequence...
          </div>
        )}
        {gameActive && !isShowingSequence && !gameOver && (
          <div className="text-green-400 mb-2 text-center font-bold" style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}>
            Repeat the sequence!
          </div>
        )}

        {!gameActive && !gameOver && (
          <div className="mt-4 text-white/80 text-center px-4" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)' }}>
            <p className="mb-1">Watch the sequence flash</p>
            <p>Repeat it as fast as you can!</p>
            <p className="mt-2 text-yellow-400">Score = Sequences × 10 + Speed Bonus</p>
          </div>
        )}

        <div className="mt-4 w-full max-w-[320px]">
          {!gameActive && !gameOver && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              className="w-full bg-yellow-400 text-black font-black py-3 rounded-xl shadow-lg"
              style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}
            >
              START GAME
            </motion.button>
          )}
          
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center w-full"
            >
              <p className="text-red-400 font-black mb-2" style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>
                Game Over!
              </p>
              <p className="text-white mb-2" style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>
                Final Score: {score} points
              </p>
              <p className="text-white/80 mb-4 text-sm">
                Sequences Completed: {sequencesCompleted}
              </p>
              
              {isSubmitting ? (
                <div className="mb-4">
                  <p className="text-yellow-400 text-sm mb-2 font-bold">Submitting score...</p>
                </div>
              ) : (
                <div className="space-y-3 w-full">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setGameOver(false);
                      setGameActive(false);
                      setScore(0);
                      setSequencesCompleted(0);
                      setUserPattern([]);
                      setGamePattern([]);
                      setStartTime(0);
                    }}
                    className="w-full bg-yellow-400 text-black font-black py-3 rounded-xl shadow-lg"
                    style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}
                  >
                    PLAY AGAIN
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/games')}
                    className="w-full bg-white/10 text-white font-bold py-3 rounded-xl border border-white/20 hover:bg-white/20"
                    style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}
                  >
                    Back to Games
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <style jsx>{`
        .pressed {
          opacity: 0.5 !important;
          transform: scale(0.95);
          box-shadow: 0 0 20px white !important;
        }
        button[id] {
          transition: opacity 200ms ease-in-out, filter 200ms ease-in-out;
        }
      `}</style>
    </IPhoneFrame>
  );
}

