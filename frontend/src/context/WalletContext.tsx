"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  useActiveAccount, 
  useActiveWallet, 
  useActiveWalletChain, 
  useSwitchActiveWalletChain,
  useDisconnect,
} from "thirdweb/react";
import { Wallet, Account } from "thirdweb/wallets";
import { defineChain } from "thirdweb";

// Define Somnia Testnet chain (Shannon)
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

interface WalletContextType {
  isConnected: boolean;
  account: Account | undefined;
  wallet: Wallet | undefined;
  disconnect: () => void;
  chainId: number | undefined;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { disconnect: disconnectWallet } = useDisconnect();
  
  const [isConnected, setIsConnected] = useState(false);

  // Update connection state based on account presence
  useEffect(() => {
    setIsConnected(!!account);
  }, [account]);

  // Auto-switch to Somnia Testnet if connected to wrong chain
  useEffect(() => {
    if (isConnected && activeChain && activeChain.id !== somniaTestnet.id) {
      console.log(`Wrong chain detected (${activeChain.id}). Switching to Somnia Testnet...`);
      switchChain(somniaTestnet).catch((err) => {
        console.error("Failed to switch chain:", err);
      });
    }
  }, [isConnected, activeChain, switchChain]);

  const handleDisconnect = () => {
    if (wallet) {
      disconnectWallet(wallet);
    }
  };

  return (
    <WalletContext.Provider value={{
      isConnected,
      account,
      wallet,
      disconnect: handleDisconnect,
      chainId: activeChain?.id
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
