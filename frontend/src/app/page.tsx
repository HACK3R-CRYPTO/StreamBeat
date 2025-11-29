"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import IPhoneFrame from '@/components/iPhoneFrame';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      router.replace('/wallet-connect');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleSkip = () => {
    setLoading(false);
    router.replace('/wallet-connect');
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
    <IPhoneFrame backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" statusBarContent={statusBarContent}>
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="text-7xl mb-4">🎵</div>
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">STREAM</span>
            <span className="text-white drop-shadow-md">BEAT</span>
          </h1>
          <p className="text-white/60 text-sm font-medium">
            Web3 Rhythm Game on Somnia
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 space-y-2"
        >
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-lg">⚡</span>
            <span>Real-time SDS Integration</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-lg">🎮</span>
            <span>Rhythm-based Gameplay</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-lg">🏆</span>
            <span>Compete on Leaderboards</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-lg">🎨</span>
            <span>Unlock NFT Rewards</span>
          </div>
        </motion.div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mb-8"
        >
          <div className="flex gap-2 justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className="w-3 h-3 bg-yellow-400 rounded-full"
              />
            ))}
          </div>
        </motion.div>

        {/* Tap to Start Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onClick={handleSkip}
          className="group relative px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="text-white font-bold tracking-wider uppercase flex items-center gap-2">
            Tap to Start
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:translate-x-1 transition-transform">
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </motion.button>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-auto pb-6 text-white/40 text-xs"
        >
          Powered by Somnia Data Streams
        </motion.div>
      </div>
    </IPhoneFrame>
  );
}
