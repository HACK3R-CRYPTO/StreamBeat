"use client";
import { ConnectButton } from "thirdweb/react";
import { useRouter } from 'next/navigation';
import { client } from "@/client";
import { useEffect, useState } from "react";
import { defineChain } from "thirdweb/chains";
import { motion } from "framer-motion";
import IPhoneFrame from "@/components/iPhoneFrame";
import { useWallet } from "@/context/WalletContext";

export default function WalletConnect() {
  const router = useRouter();
  const { wallet } = useWallet();
  
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

  useEffect(() => {
    if (wallet) {
      router.replace('/mint');
    }
  }, [wallet, router]);

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
            Connect your wallet to start
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <p className="text-white text-lg mb-4 font-semibold">CONNECT YOUR WALLET</p>
          
          <div className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-2xl p-6 border border-white/20 transition-all">
            <ConnectButton
              client={client}
              chain={chain}
              connectButton={{
                style: {
                  width: '100%',
                  backgroundColor: '#FFD700',
                  color: '#000',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  padding: '12px 24px',
                }
              }}
              connectModal={{
                size: "compact",
                welcomeScreen: {
                  title: "Welcome to StreamBeat",
                  subtitle: "Connect your wallet to start playing",
                },
              }}
            />
          </div>

          <p className="text-white/60 text-sm mt-4">
            Connect to Somnia Testnet to play
          </p>
        </motion.div>
      </div>
    </IPhoneFrame>
  );
}

