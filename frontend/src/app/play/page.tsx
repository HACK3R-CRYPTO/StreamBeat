"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useWallet } from "@/context/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import IPhoneFrame from "@/components/iPhoneFrame";
import toast from 'react-hot-toast';
import { AddressDisplay } from '@/components/AddressDisplay';
import { RHYTHM_GAME_CONFIG } from "@/config/game";
import { client } from "@/client";
import { defineChain, getContract } from "thirdweb";
import { readContract } from "thirdweb";
import { ConnectButton } from "thirdweb/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const GEM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GEM_CONTRACT_ADDRESS || "0x699C19321188aB200194E8A2B6db19B43106E70F";

// Somnia Testnet
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

export default function PlayPage() {
  const router = useRouter();
  const { account, isConnected, wallet } = useWallet();
  const [isMinted, setIsMinted] = useState(false);
  const [gemBalance, setGemBalance] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [progress, setProgress] = useState(0);
  const [currentTarget, setCurrentTarget] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"perfect" | "good" | "miss" | "">("");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const targetStartTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const toneGeneratorsRef = useRef<{ [key: string]: () => void }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const particleIdRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const buttons = [1, 2, 3, 4];
  const buttonColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'];
  const buttonPositions = [
    { x: 0.2, y: 0.7 },
    { x: 0.4, y: 0.7 },
    { x: 0.6, y: 0.7 },
    { x: 0.8, y: 0.7 },
  ];

  // Initialize audio - matching RhythmRush structure
  useEffect(() => {
    // Map buttons to color sounds (matching RhythmRush)
    const buttonSoundMap: { [key: number]: string } = {
      1: 'red',
      2: 'blue', 
      3: 'green',
      4: 'yellow'
    };
    
    buttons.forEach((beat) => {
      const audio = new Audio();
      audio.src = `/sounds/${buttonSoundMap[beat]}.mp3`;
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioRefs.current[`button${beat}`] = audio;
    });
    
    // Feedback sounds - using tones as fallback (matching RhythmRush)
    const missAudio = new Audio('/sounds/wrong.mp3');
    missAudio.preload = 'auto';
    missAudio.volume = 0.5;
    audioRefs.current['miss'] = missAudio;
    
    // Initialize audio context for tone generation
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
          console.log('Audio context not available');
        }
      }
      return audioContextRef.current;
    };
    
    const generateTone = (frequency: number, duration: number = 0.1) => {
      return () => {
        try {
          const ctx = initAudioContext();
          if (!ctx) return;
          
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
          
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
          // Silently fail if audio not available
        }
      };
    };
    
    toneGeneratorsRef.current['tone1'] = generateTone(440);
    toneGeneratorsRef.current['tone2'] = generateTone(523.25);
    toneGeneratorsRef.current['tone3'] = generateTone(659.25);
    toneGeneratorsRef.current['tone4'] = generateTone(783.99);
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

  // Particle animation
  useEffect(() => {
    if (!gameActive || particles.length === 0) return;

    const animate = () => {
      setParticles((prev) => {
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 1,
            vy: p.vy + 0.2, // gravity
          }))
          .filter((p) => p.life > 0);
      });
    };

    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [gameActive, particles.length]);

  // Create particles
  const createParticles = (x: number, y: number, color: string, count: number = 10) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        color,
        life: 30,
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
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
    setScore(0);
    setCombo(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    setPerfectCount(0);
    setGoodCount(0);
    setMissCount(0);
    setGameActive(true);
    setTimeRemaining(30);
    setCurrentTarget(1);
    setFeedback("");
    setFeedbackType("");
    setParticles([]);
    startTimeRef.current = Date.now();
    targetStartTimeRef.current = Date.now();

    // Beat interval with progressive difficulty
    let beatSpeed = RHYTHM_GAME_CONFIG.BEAT_INTERVAL;
    beatIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Speed up every 10 seconds
      if (elapsed > 10000 && elapsed < 20000) {
        beatSpeed = RHYTHM_GAME_CONFIG.BEAT_INTERVAL * 0.85;
      } else if (elapsed > 20000) {
        beatSpeed = RHYTHM_GAME_CONFIG.BEAT_INTERVAL * 0.7;
      }

      setCurrentTarget((prev) => {
        const next = (prev % 4) + 1;
        targetStartTimeRef.current = Date.now();
        playSound(`button${next}`);
        return next;
      });
    }, beatSpeed);

    // Game timer
    gameTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, Math.ceil((RHYTHM_GAME_CONFIG.DURATION - elapsed) / 1000));
      const progressPercent = Math.min((elapsed / RHYTHM_GAME_CONFIG.DURATION) * 100, 100);
      
      setTimeRemaining(remaining);
      setProgress(progressPercent);

      if (elapsed >= RHYTHM_GAME_CONFIG.DURATION) {
        endGame();
      }
    }, 100);
  };

  const endGame = async () => {
    setGameActive(false);
    setProgress(100);
    if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    
    const finalScore = scoreRef.current;
    const MAX_REASONABLE_SCORE = 2000;
    if (finalScore > MAX_REASONABLE_SCORE) {
      toast.error("Invalid score detected. Please play again.");
      return;
    }
    
    if (!account?.address) {
      toast.error('Please connect your wallet');
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
            gameTime: RHYTHM_GAME_CONFIG.DURATION,
            combo: comboRef.current,
            perfect: perfectCount,
            good: goodCount,
            miss: missCount,
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
    }
  };

  const playSound = (soundName: string) => {
    try {
      const audio = audioRefs.current[soundName];
      if (audio && typeof audio.play === 'function') {
        // Try to play audio file
        audio.currentTime = 0;
        audio.play().catch(() => {
          // If file doesn't exist or fails, try tone fallback
          const buttonNum = soundName.replace('button', '');
          if (buttonNum && toneGeneratorsRef.current[`tone${buttonNum}`]) {
            const toneFunc = toneGeneratorsRef.current[`tone${buttonNum}`];
            if (typeof toneFunc === 'function') {
              toneFunc();
            }
          }
        });
      } else {
        // Fallback to tone if audio file not found
        const buttonNum = soundName.replace('button', '');
        if (buttonNum && toneGeneratorsRef.current[`tone${buttonNum}`]) {
          const toneFunc = toneGeneratorsRef.current[`tone${buttonNum}`];
          if (typeof toneFunc === 'function') {
            toneFunc();
          }
        }
      }
    } catch (e) {
      // Silently fail if audio not available
    }
  };

  const handleButtonClick = useCallback((clickedBeat: number, event?: React.MouseEvent | React.TouchEvent) => {
    if (!gameActive) return;

    playSound(`button${clickedBeat}`);

    const timeSinceTargetStart = Date.now() - targetStartTimeRef.current;
    const buttonIndex = clickedBeat - 1;
    const buttonX = buttonPositions[buttonIndex].x * (window.innerWidth || 420);
    const buttonY = buttonPositions[buttonIndex].y * (window.innerHeight || 860);
    
    if (clickedBeat === currentTarget) {
      if (timeSinceTargetStart <= RHYTHM_GAME_CONFIG.PERFECT_WINDOW) {
        // Perfect! Use tone for feedback
        const buttonNum = clickedBeat.toString();
        if (toneGeneratorsRef.current[`tone${buttonNum}`]) {
          toneGeneratorsRef.current[`tone${buttonNum}`]();
        }
        const baseScore = RHYTHM_GAME_CONFIG.PERFECT_SCORE;
        const comboMultiplier = 1 + (comboRef.current * 0.1);
        const scoreGain = Math.floor(baseScore * comboMultiplier);
        
        setScore((prev) => {
          const newScore = prev + scoreGain;
          scoreRef.current = newScore;
          return newScore;
        });
        
        setCombo((prev) => {
          const newCombo = Math.min(prev + 1, RHYTHM_GAME_CONFIG.MAX_COMBO);
          comboRef.current = newCombo;
          return newCombo;
        });
        
        setPerfectCount((prev) => prev + 1);
        setFeedback(`Perfect! +${scoreGain} 🔥`);
        setFeedbackType("perfect");
        createParticles(buttonX, buttonY, '#00FF00', 15);
      } else if (timeSinceTargetStart <= RHYTHM_GAME_CONFIG.GOOD_WINDOW) {
        // Good - Use tone for feedback
        const buttonNum = clickedBeat.toString();
        if (toneGeneratorsRef.current[`tone${buttonNum}`]) {
          toneGeneratorsRef.current[`tone${buttonNum}`]();
        }
        const baseScore = RHYTHM_GAME_CONFIG.GOOD_SCORE;
        const comboMultiplier = 1 + (comboRef.current * 0.05);
        const scoreGain = Math.floor(baseScore * comboMultiplier);
        
        setScore((prev) => {
          const newScore = prev + scoreGain;
          scoreRef.current = newScore;
          return newScore;
        });
        
        setCombo((prev) => {
          const newCombo = Math.min(prev + 1, RHYTHM_GAME_CONFIG.MAX_COMBO);
          comboRef.current = newCombo;
          return newCombo;
        });
        
        setGoodCount((prev) => prev + 1);
        setFeedback(`Good! +${scoreGain}`);
        setFeedbackType("good");
        createParticles(buttonX, buttonY, '#FFD700', 8);
      } else {
        // Too late
        playSound('miss'); // Uses wrong.mp3
        setCombo(0);
        comboRef.current = 0;
        setMissCount((prev) => prev + 1);
        setFeedback("Too late! Tap faster!");
        setFeedbackType("miss");
        createParticles(buttonX, buttonY, '#FF0000', 5);
      }
    } else {
      // Wrong button
      playSound('miss'); // Uses wrong.mp3
      setCombo(0);
      comboRef.current = 0;
      setMissCount((prev) => prev + 1);
      setFeedback("Miss! Tap the glowing button!");
      setFeedbackType("miss");
      createParticles(buttonX, buttonY, '#FF0000', 5);
    }

    setTimeout(() => {
      setFeedback("");
      setFeedbackType("");
    }, 800);
  }, [gameActive, currentTarget, comboRef]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameActive) return;

      const key = event.key;
      let buttonNumber: number | null = null;
      
      if (key === '1' || key === 'ArrowLeft' || key === 'a' || key === 'A') {
        buttonNumber = 1;
      } else if (key === '2' || key === 'ArrowUp' || key === 'w' || key === 'W') {
        buttonNumber = 2;
      } else if (key === '3' || key === 'ArrowRight' || key === 'd' || key === 'D') {
        buttonNumber = 3;
      } else if (key === '4' || key === 'ArrowDown' || key === 's' || key === 'S') {
        buttonNumber = 4;
      }

      if (buttonNumber !== null) {
        event.preventDefault();
        handleButtonClick(buttonNumber);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameActive, handleButtonClick]);

  useEffect(() => {
    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, []);

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
      backgroundClassName="bg-gradient-to-br from-purple-900 via-black to-black" 
      statusBarContent={statusBarContent}
    >
      <div className="w-full h-full flex flex-col pt-12 pb-8 px-4 justify-between relative overflow-hidden">
        {/* Particle Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{ width: '100%', height: '100%' }}
        />
        
        {/* Render particles */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <AnimatePresence>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 10px ${particle.color}`,
                }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                  opacity: particle.life / 30,
                  scale: particle.life / 30,
                  x: particle.vx,
                  y: particle.vy,
                }}
                exit={{ opacity: 0 }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Header */}
        <div className="w-full text-center flex-shrink-0 relative z-20">
          <h1 className="font-black text-white drop-shadow-lg mb-2 text-2xl">
            🎵 STREAMBEAT 🎵
          </h1>
          
          <div className="mb-4">
            <div className="font-black text-yellow-400 drop-shadow-lg text-5xl mb-1">
              {score}
            </div>
            {combo > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-orange-400 font-bold text-lg"
              >
                {combo}x COMBO! 🔥
              </motion.div>
            )}
            <div className="text-yellow-400 text-lg">
              {timeRemaining}s
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/20 rounded-full mx-auto overflow-hidden w-[85%] max-w-[320px] h-2 mb-4">
            <motion.div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Target Display */}
          <motion.div
            key={currentTarget}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.2 }}
            className="font-black text-white drop-shadow-lg text-3xl mt-2"
          >
            Tap {currentTarget}!
          </motion.div>
        </div>

        {/* Buttons Section */}
        <div className="w-full flex-shrink-0 px-2 relative z-20">
          <div className="grid grid-cols-4 gap-3 mx-auto max-w-[360px]">
            {buttons.map((beat) => (
              <motion.button
                key={beat}
                whileHover={{ scale: gameActive ? 1.05 : 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleButtonClick(beat, e)}
                onTouchStart={(e) => handleButtonClick(beat, e)}
                className={`
                  aspect-square rounded-full border-4
                  flex items-center justify-center font-black text-white text-xl
                  transition-all duration-75 w-full shadow-lg
                  ${beat === currentTarget 
                    ? 'animate-pulse scale-105' 
                    : 'bg-white/10 border-white/20 hover:bg-white/20'
                  }
                  ${feedbackType === "perfect" && beat === currentTarget ? "bg-green-500 border-green-500 scale-110" : ""}
                  ${feedbackType === "miss" && beat === currentTarget ? "bg-red-500 border-red-500" : ""}
                `}
                style={{
                  backgroundColor: beat === currentTarget && !feedbackType 
                    ? buttonColors[beat - 1] 
                    : feedbackType === "perfect" && beat === currentTarget
                    ? '#10b981'
                    : feedbackType === "miss" && beat === currentTarget
                    ? '#ef4444'
                    : undefined,
                  borderColor: beat === currentTarget && !feedbackType 
                    ? buttonColors[beat - 1] 
                    : feedbackType === "perfect" && beat === currentTarget
                    ? '#10b981'
                    : feedbackType === "miss" && beat === currentTarget
                    ? '#ef4444'
                    : undefined,
                  boxShadow: beat === currentTarget && !feedbackType 
                    ? `0 0 30px ${buttonColors[beat - 1]}` 
                    : feedbackType === "perfect" && beat === currentTarget
                    ? '0 0 30px #10b981'
                    : feedbackType === "miss" && beat === currentTarget
                    ? '0 0 30px #ef4444'
                    : undefined,
                }}
              >
                {beat}
              </motion.button>
            ))}
          </div>

          {/* Feedback */}
          <div className="h-8 mt-4 flex items-center justify-center">
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center font-black text-lg ${
                  feedbackType === "perfect" ? "text-green-400" :
                  feedbackType === "good" ? "text-yellow-400" :
                  "text-red-400"
                }`}
              >
                {feedback}
              </motion.div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="w-full flex-shrink-0 px-4 relative z-20">
          {!gameActive ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              className="w-full mx-auto bg-yellow-400 text-black font-black rounded-xl shadow-lg py-4 text-lg max-w-[340px] block"
            >
              START GAME
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={endGame}
              className="w-full mx-auto bg-white/20 text-white font-bold rounded-xl shadow-lg py-4 text-lg max-w-[340px] block backdrop-blur-sm border border-white/10"
            >
              END GAME
            </motion.button>
          )}

          {/* Instructions */}
          {!gameActive && score === 0 && (
            <div className="text-white/90 text-center mx-auto leading-relaxed mt-4 text-xs max-w-[360px]">
              <p><span className="text-yellow-400 font-bold">How to Play:</span></p>
              <p className="mt-1">Tap the <span className="text-yellow-400 font-bold">glowing button</span>!</p>
              <p className="mt-1">Perfect (0-400ms) = 10 pts × combo</p>
              <p className="mt-1">Good (400-700ms) = 5 pts × combo</p>
              <p className="mt-2 pt-2 border-t border-white/20">
                <span className="text-yellow-400 font-bold">Controls:</span> 1-4, Arrows, or WASD
              </p>
            </div>
          )}
        </div>
      </div>
    </IPhoneFrame>
  );
}
