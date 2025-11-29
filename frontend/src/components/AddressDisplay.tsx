'use client';

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AddressDisplayProps {
  address?: string;
  isConnected: boolean;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  isConnected,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!", {
        icon: '📋',
        style: {
          borderRadius: '12px',
          background: '#333',
          color: '#fff',
        },
      });
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-2 py-1.5 rounded-full
          bg-black/20 backdrop-blur-md border border-white/10
          hover:bg-black/30 hover:border-white/20 transition-all duration-200
          group
        `}
      >
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
        
        <div className="flex flex-col items-start justify-center h-full">
          <span className="text-white text-xs font-mono font-medium tracking-wide leading-none">
            {isConnected && address ? 
              `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 
              "Connect"
            }
          </span>
        </div>

        {isConnected && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/40 group-hover:text-white/80"
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 w-56 z-50"
          >
            <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/50">
              <div className="p-1">
                <button
                  onClick={handleCopy}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 group"
                >
                  <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 text-white/60 group-hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Copy Address</span>
                    <span className="text-[10px] text-white/40">Click to copy to clipboard</span>
                  </div>
                </button>
                
                <div className="h-px bg-white/5 my-1 mx-2" />
                
                <DisconnectButton onClose={() => setIsOpen(false)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DisconnectButton = ({ onClose }: { onClose: () => void }) => {
  const { disconnect, wallet } = useWallet();

  const onDisconnect = () => {
    if (wallet) {
      disconnect();
      toast.success("Wallet disconnected", {
        icon: '👋',
        style: {
          borderRadius: '12px',
          background: '#333',
          color: '#fff',
        },
      });
      onClose();
    }
  };

  return (
    <button
      onClick={onDisconnect}
      className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-3 group"
    >
      <div className="p-1.5 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 text-red-400 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-medium">Disconnect</span>
        <span className="text-[10px] text-red-400/60">Sign out of your wallet</span>
      </div>
    </button>
  );
};

