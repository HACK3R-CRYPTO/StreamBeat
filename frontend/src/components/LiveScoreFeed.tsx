'use client';

import { useState, useEffect } from 'react';
import { subscribeToScores, ScoreEvent } from '@/lib/sds-client';
import { motion, AnimatePresence } from 'framer-motion';

export function LiveScoreFeed() {
  const [scores, setScores] = useState<ScoreEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToScores((score) => {
      setScores((prev) => [score, ...prev].slice(0, 10)); // Keep last 10
    });

    return unsubscribe;
  }, []);

  return (
    <div className="bg-black/20 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white">
        ⚡ Live Score Feed
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {scores.map((score, index) => (
            <motion.div
              key={`${score.player}-${score.timestamp}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex justify-between items-center p-2 bg-white/5 rounded border border-white/10"
            >
              <span className="text-sm text-white/80 font-mono">
                {score.player.slice(0, 6)}...{score.player.slice(-4)}
              </span>
              <span className="font-bold text-yellow-400">{score.score} pts</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {scores.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Waiting for live scores...</p>
        )}
      </div>
    </div>
  );
}
