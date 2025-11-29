"use client";
import { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { useWallet } from "@/context/WalletContext";
import { client } from "@/client";
import { defineChain, getContract } from "thirdweb";
import { ethers, formatEther, parseEther } from "ethers";
import { keccak256, toHex } from "viem";
import { motion } from "framer-motion";
import IPhoneFrame from "@/components/iPhoneFrame";
import Loading from "@/components/Loading";
import { useRouter } from 'next/navigation';
import { prepareContractCall, sendTransaction, waitForReceipt, readContract } from "thirdweb";

// Contract addresses on Somnia Testnet (deployed)
const BEAT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_BEAT_TOKEN_ADDRESS || "0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f";
const GEM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GEM_CONTRACT_ADDRESS || "0x699C19321188aB200194E8A2B6db19B43106E70F";
const SWAP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS || "0xa2054053Ded91cf7eCD51ea39756857A2F0a5284";
const PRICE_PER_GEM = BigInt("34000000000000000000"); // 34 BEAT tokens
const EXCHANGE_RATE = 340; // 1 SOMNI = 340 BEAT tokens (0.1 SOMNI = 34 BEAT)

// ERC20 ABI for BEAT token
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  }
];

// Gem Contract ABI
const GEM_ABI = [
  {
    inputs: [
      { name: "_receiver", type: "address" },
      { name: "_quantity", type: "uint256" },
      { name: "_currency", type: "address" },
      { name: "_pricePerToken", type: "uint256" },
      {
        components: [
          { name: "proof", type: "bytes32[]" },
          { name: "quantityLimitPerWallet", type: "uint256" },
          { name: "pricePerToken", type: "uint256" },
          { name: "currency", type: "address" }
        ],
        name: "_allowlistProof",
        type: "tuple"
      },
      { name: "_data", type: "bytes" }
    ],
    name: "claim",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "claimActive",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

// Swap Contract ABI
const SWAP_ABI = [
  {
    inputs: [],
    name: "buyTokens",
    outputs: "function"
  },
  {
    inputs: [{ name: "nativeAmount", type: "uint256" }],
    name: "calculateTokenAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

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

export default function MintPage() {
  const router = useRouter();
  const { isConnected, account, wallet } = useWallet();
  const [isMinted, setIsMinted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalInProgress, setApprovalInProgress] = useState(false);
  const [claimInProgress, setClaimInProgress] = useState(false);
  const [beatBalance, setBeatBalance] = useState<string>("0");
  const [somniBalance, setSomniBalance] = useState<string>("0");
  const [buyBeatAmount, setBuyBeatAmount] = useState<string>("34");
  const [buyBeatInProgress, setBuyBeatInProgress] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (wallet && account) {
      setIsLoading(false);
      checkBeatBalance();
      checkSomniBalance();
      checkGemBalance();
    } else {
      setIsLoading(false);
    }
  }, [wallet, account]);

  const formatBalance = (balanceWei: bigint | string): string => {
    const balanceStr = balanceWei.toString();
    const decimals = 18;
    
    if (balanceStr === "0") return "0.00";
    
    const padded = balanceStr.padStart(decimals + 1, "0");
    const integerPart = padded.slice(0, -decimals) || "0";
    const decimalPart = padded.slice(-decimals);
    const trimmedDecimal = decimalPart.replace(/0+$/, "");
    
    if (trimmedDecimal === "") {
      return `${integerPart}.00`;
    }
    
    const twoDecimals = trimmedDecimal.substring(0, 2).padEnd(2, "0");
    return `${integerPart}.${twoDecimals}`;
  };

  const checkBeatBalance = async () => {
    if (!account?.address) return;

    try {
      console.log("Checking BEAT balance from token address:", BEAT_TOKEN_ADDRESS);
      
      // First, verify contract exists by checking code
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const code = await provider.getCode(BEAT_TOKEN_ADDRESS);
      console.log("Contract code length:", code.length);
      
      if (code === "0x" || code.length <= 2) {
        console.error("❌ Contract does not exist at address:", BEAT_TOKEN_ADDRESS);
        console.error("The token contract may not be deployed or the address is incorrect.");
        toast.error("Token contract not found. Please verify contract address.");
        return;
      }
      
      console.log("✅ Contract exists, reading balance...");
      
      // Try using ethers directly (more reliable for balance checks)
      // Use full ERC20 ABI including all standard functions
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)"
      ];
      
      try {
        const tokenContractEthers = new ethers.Contract(BEAT_TOKEN_ADDRESS, erc20Abi, provider);
        
        // First verify it's the right contract by checking name/symbol
        console.log("Reading contract name and symbol...");
        const name = await tokenContractEthers.name();
        const symbol = await tokenContractEthers.symbol();
        const decimals = await tokenContractEthers.decimals();
        console.log("✅ Token verified - Name:", name, "Symbol:", symbol, "Decimals:", decimals);
        
        // Now read balance
        console.log("Reading balance for address:", account.address);
        const balance = await tokenContractEthers.balanceOf(account.address);
        console.log("Raw balance (wei):", balance.toString());
        const balanceFormatted = formatEther(balance);
        console.log("✅ BEAT balance (formatted):", balanceFormatted);
        setBeatBalance(balanceFormatted);
      } catch (ethersError: any) {
        console.error("❌ Ethers balance check failed:", ethersError);
        console.error("Error message:", ethersError?.message);
        console.error("Error code:", ethersError?.code);
        
        // If ethers fails, the contract might not exist or RPC is broken
        // Don't try thirdweb as it will also fail
        throw ethersError;
      }
    } catch (error: any) {
      console.error("Error checking BEAT balance:", error);
      // Don't set balance to 0 on error - keep previous value
      // This matches RhythmRush's approach
    }
  };

  const checkSomniBalance = async () => {
    if (!account?.address) return;
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(account.address);
      setSomniBalance(formatEther(balance));
    } catch (error) {
      console.error("Error checking SOMNI balance:", error);
    }
  };

  const checkGemBalance = async () => {
    if (!account?.address) return;

    try {
      const balance = await readContract({
        contract: gemContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      });
      
      if (Number(balance) > 0) {
        setIsMinted(true);
      }
    } catch (error) {
      console.error("Error checking Gem balance:", error);
    }
  };

  const handleBuyBeat = async () => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      const beatAmount = parseFloat(buyBeatAmount);
      if (isNaN(beatAmount) || beatAmount <= 0) {
        toast.error("Please enter a valid BEAT amount");
        return;
      }

      setBuyBeatInProgress(true);

      const swapContract = getContract({
        client,
        chain,
        address: SWAP_CONTRACT_ADDRESS,
      });

      const somniAmount = beatAmount / EXCHANGE_RATE;
      const minSomni = 0.001;
      
      if (somniAmount < minSomni) {
        toast.error(`Minimum purchase is ${(minSomni * EXCHANGE_RATE).toFixed(0)} BEAT (${minSomni} SOMNI)`);
        setBuyBeatInProgress(false);
        return;
      }

      if (parseFloat(somniBalance) < somniAmount) {
        toast.error(`Insufficient SOMNI balance. You need ${somniAmount.toFixed(4)} SOMNI`);
        setBuyBeatInProgress(false);
        return;
      }

      const somniAmountWei = parseEther(somniAmount.toFixed(18));
      
      const transaction = prepareContractCall({
        contract: swapContract,
        method: "function buyTokens() payable",
        params: [],
        value: BigInt(somniAmountWei.toString()),
      });

      toast.loading(`Buying ${beatAmount} BEAT tokens with SOMNI...`, { id: "buy-beat" });
      
      const { transactionHash } = await sendTransaction({
        account,
        transaction,
      });

      console.log("Transaction hash:", transactionHash);
      
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash,
      });
      
      console.log("Transaction receipt:", receipt);
      console.log("Transaction confirmed, checking balance...");
      
      // Debug: Check what address the transaction was sent to
      console.log("Transaction 'to' address:", receipt.to);
      console.log("Swap contract address:", SWAP_CONTRACT_ADDRESS);
      console.log("Match?", receipt.to?.toLowerCase() === SWAP_CONTRACT_ADDRESS.toLowerCase());
      
      // Debug: Check chain info
      console.log("Chain ID:", chain.id);
      console.log("Chain RPC:", chain.rpc);
      console.log("Chain name:", chain.name);
      
      // CRITICAL: Check if swap contract actually exists
      try {
        const provider = new ethers.JsonRpcProvider(chain.rpc);
        const swapCode = await provider.getCode(SWAP_CONTRACT_ADDRESS);
        console.log("Swap contract code length:", swapCode.length);
        if (swapCode === "0x" || swapCode.length <= 2) {
          console.error("❌ CRITICAL: Swap contract does NOT exist at:", SWAP_CONTRACT_ADDRESS);
          console.error("This means contracts were NOT deployed to Somnia Testnet!");
          toast.error("Contracts not deployed! Please deploy contracts first.");
        } else {
          console.log("✅ Swap contract exists");
        }
      } catch (e) {
        console.error("Error checking swap contract:", e);
      }
      
      // Check if tokens were actually minted by looking at events
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("Transaction logs:", receipt.logs);
        console.log("Number of logs:", receipt.logs.length);
        
        // Look for TokensPurchased event
        // Event signature: TokensPurchased(address indexed buyer, uint256 nativeAmount, uint256 tokenAmount)
        // Pre-computed keccak256("TokensPurchased(address,uint256,uint256)")
        const eventSignature = "0x8fafebcaf9d154343dad25669bfa277f4fbacd7ac6b0c4fed522580e040a0f33";
        console.log("Looking for event signature:", eventSignature);
        
        const matchingLogs = receipt.logs.filter((log: any) => {
          if (!log.topics || !log.topics[0]) return false;
          return log.topics[0].toLowerCase() === eventSignature.toLowerCase();
        });
        
        if (matchingLogs.length > 0) {
          console.log("✅ Found TokensPurchased event! Tokens were minted.");
          console.log("Event logs:", matchingLogs);
          
          // Try to decode the event to see token amount
          try {
            const eventLog = matchingLogs[0];
            if (eventLog.data) {
              console.log("Event data:", eventLog.data);
              // buyer is in topics[1], nativeAmount and tokenAmount are in data
              if (eventLog.topics && eventLog.topics[1]) {
                const buyer = "0x" + eventLog.topics[1].slice(-40);
                console.log("Buyer address from event:", buyer);
              }
            }
          } catch (e) {
            console.log("Could not decode event data:", e);
          }
        } else {
          console.warn("⚠️ No TokensPurchased event found in logs");
          console.log("Available event topics:", receipt.logs.map((log: any) => log.topics?.[0]));
        }
      } else {
        console.warn("⚠️ No logs in transaction receipt");
      }
      
      // Also check the transaction on explorer
      const explorerUrl = `https://shannon-explorer.somnia.network/tx/${transactionHash}`;
      console.log("View transaction on explorer:", explorerUrl);
      
      // Wait a bit longer before checking balance (RPC might need time to index)
      console.log("Waiting 3 seconds for RPC to index transaction...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success(`Successfully bought ${beatAmount} BEAT tokens! 🎉`, { id: "buy-beat" });
      
      // Refresh balances immediately after transaction (matches RhythmRush pattern)
      await Promise.all([checkBeatBalance(), checkSomniBalance()]);
      
      // Refresh again after 2 seconds (matches RhythmRush pattern)
      setTimeout(async () => {
        console.log("Refreshing balances after 2 seconds...");
        await checkBeatBalance();
        await checkSomniBalance();
      }, 2000);
      
      setBuyBeatAmount("34");
    } catch (error: any) {
      console.error("Error buying BEAT tokens:", error);
      toast.error(error?.message || "Failed to buy BEAT tokens", { id: "buy-beat" });
    } finally {
      setBuyBeatInProgress(false);
    }
  };

  const calculateSomniCost = (beatAmount: string): string => {
    const amount = parseFloat(beatAmount);
    if (isNaN(amount) || amount <= 0) return "0";
    return (amount / EXCHANGE_RATE).toFixed(4);
  };

  const handleMint = async () => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      const requiredAmount = PRICE_PER_GEM;

      const tokenContract = getContract({
        client,
        chain,
        address: BEAT_TOKEN_ADDRESS as `0x${string}`,
      });

      let balance: bigint;
      try {
        const balanceResult: any = await readContract({
          contract: tokenContract,
          method: "function balanceOf(address) view returns (uint256)",
          params: [account.address],
        });
        balance = typeof balanceResult === 'bigint' ? balanceResult : BigInt(String(balanceResult));
      } catch (error: any) {
        console.error("Error reading balance:", error);
        // If contract doesn't exist (zero data error), assume balance is 0
        if (error?.message?.includes("zero data") || error?.name === "AbiDecodingZeroDataError") {
          balance = BigInt(0);
        } else {
          toast.error("Failed to check BEAT balance. Please verify contract address.");
          return;
        }
      }

      if (balance < requiredAmount) {
        toast.error(`Insufficient BEAT balance. You need 34 BEAT tokens. Please buy tokens first.`);
        return;
      }

      let allowance: bigint;
      try {
        const allowanceResult: any = await readContract({
          contract: tokenContract,
          method: "function allowance(address, address) view returns (uint256)",
          params: [account.address, GEM_CONTRACT_ADDRESS],
        });
        allowance = typeof allowanceResult === 'bigint' ? allowanceResult : BigInt(String(allowanceResult));
      } catch (error: any) {
        console.error("Error reading allowance:", error);
        // If contract doesn't exist (zero data error), assume allowance is 0
        if (error?.message?.includes("zero data") || error?.name === "AbiDecodingZeroDataError") {
          allowance = BigInt(0);
        } else {
          toast.error("Failed to check token allowance. Please verify contract address.");
          return;
        }
      }

      if (allowance < requiredAmount) {
        setApprovalInProgress(true);
        
        const approveTx = prepareContractCall({
          contract: tokenContract,
          method: "function approve(address, uint256)",
          params: [GEM_CONTRACT_ADDRESS, requiredAmount],
        });

        const { transactionHash } = await sendTransaction({
          account,
          transaction: approveTx,
        });

        await waitForReceipt({
          client,
          chain,
          transactionHash,
        });

        setApprovalInProgress(false);
        toast.success("BEAT tokens approved!");
      }

      setClaimInProgress(true);
      
      const isClaimActive = await readContract({
        contract: gemContract,
        method: "function claimActive() view returns (bool)",
        params: [],
      });

      if (!isClaimActive) {
        throw new Error("Claim is not active.");
      }
      
      const claimTx = prepareContractCall({
        contract: gemContract,
        method: "function claim(address, uint256, address, uint256, (bytes32[], uint256, uint256, address), bytes) payable",
        params: [
          account.address,
          BigInt(1),
          BEAT_TOKEN_ADDRESS,
          PRICE_PER_GEM,
          [
            [],
            BigInt(0),
            BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"),
            "0x0000000000000000000000000000000000000000"
          ],
          "0x"
        ],
      });

      const { transactionHash: claimTxHash } = await sendTransaction({
        account,
        transaction: claimTx,
      });

      await waitForReceipt({
        client,
        chain,
        transactionHash: claimTxHash,
      });
      
      setTxHash(claimTxHash);
      setIsMinted(true);
      setClaimInProgress(false);

      toast.success("Gem minted successfully! 🎉", { duration: 3000 });

      await Promise.all([checkBeatBalance(), checkGemBalance()]);
      
      setTimeout(async () => {
        await checkBeatBalance();
        await checkGemBalance();
      }, 2000);

      // Redirect to games selection page after successful mint
      setTimeout(() => {
        router.push('/games');
      }, 3000);

    } catch (error: any) {
      console.error("Transaction error:", error);
      setApprovalInProgress(false);
      setClaimInProgress(false);
      toast.error(error?.message || "Transaction failed");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!isConnected) {
    return (
      <IPhoneFrame backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black">
        <div className="flex flex-col items-center justify-center h-full p-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 p-6 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-[0_0_30px_rgba(255,215,0,0.3)]"
          >
            <span className="text-6xl">💎</span>
          </motion.div>
          
          <h1 className="text-4xl font-black mb-2 text-center">
            <span className="text-yellow-400">MINT</span>
            <span className="text-white"> GEM</span>
          </h1>
          
          <p className="text-white/60 text-center mb-8 text-lg">
            Connect your wallet to mint Gems and start playing
          </p>

          <button
            onClick={() => router.push('/wallet-connect')}
            className="w-full bg-yellow-400 text-black px-6 py-4 rounded-xl font-bold text-xl hover:bg-yellow-300 transition shadow-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] flex items-center justify-center gap-2"
          >
            <span>Connect Wallet</span>
          </button>
        </div>
      </IPhoneFrame>
    );
  }

  const statusBarContent = (
    <>
      <div className="status-bar-item flex items-center gap-1">
        <div className="status-indicator bg-green-400 w-2 h-2 rounded-full"></div>
        <div className="text-xs font-bold text-white">StreamBeat</div>
      </div>
      <div className="status-bar-item text-white text-xs font-bold">9:41</div>
    </>
  );

  const totalCost = formatEther(PRICE_PER_GEM);

  return (
    <>
      {(approvalInProgress || claimInProgress) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-purple-900 to-black rounded-2xl p-8 flex flex-col items-center max-w-[90%] w-[400px] shadow-2xl border-2 border-yellow-400/30">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {approvalInProgress ? 'Approving BEAT Tokens' : 'Minting Your Gem'}
            </h2>
            <p className="text-white/80 text-center">
              {approvalInProgress 
                ? 'Please confirm the transaction in your wallet...'
                : 'Please wait while we mint your NFT Gem...'}
            </p>
          </div>
        </div>
      )}

      {isMinted && txHash && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center p-2 bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
          <div className="flex items-center justify-between w-full max-w-md px-4">
            <div className="flex items-center">
              <span className="text-white font-bold mr-2">✅ GEM SUCCESSFULLY MINTED!</span>
            </div>
            <a 
              href={`https://shannon-explorer.somnia.network/tx/${txHash}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white text-xs font-bold underline flex items-center hover:text-white/80"
            >
              <span>VIEW TX</span>
            </a>
          </div>
        </div>
      )}

      <IPhoneFrame backgroundClassName="bg-gradient-to-b from-purple-900 via-black to-black" statusBarContent={statusBarContent}>
        <div className="flex flex-col items-center justify-center h-full p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold">
                <span className="text-yellow-400">MINT</span>
                <span className="text-white"> GEM</span>
              </h1>
            </div>

            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl">
              {/* Balances */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">SOMNI Balance</span>
                  <span className="text-white font-mono font-bold">{parseFloat(somniBalance).toFixed(4)}</span>
                </div>
                <div 
                  className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={checkBeatBalance}
                >
                  <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                    BEAT Balance <span className="text-[8px]">↻</span>
                  </span>
                  <span className="text-yellow-400 font-mono font-bold">
                    {beatBalance ? parseFloat(beatBalance).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Buy BEAT Section - Only if needed */}
              {(() => {
                const balanceBN = beatBalance ? parseEther(beatBalance) : BigInt(0);
                const requiredBN = BigInt(PRICE_PER_GEM);
                return balanceBN < requiredBN;
              })() && (
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="number"
                      value={buyBeatAmount}
                      onChange={(e) => setBuyBeatAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl text-white font-bold text-center focus:outline-none focus:border-yellow-400/50 transition-colors"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">BEAT</span>
                  </div>

                  <div className="flex justify-center gap-2 mt-3">
                    {["34", "50", "100"].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBuyBeatAmount(amount)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-white/70 transition-colors"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>

                  <div className="text-center mt-3 mb-4">
                    <span className="text-xs text-white/40">
                      Cost: <span className="text-white/80 font-mono">{calculateSomniCost(buyBeatAmount)} SOMNI</span>
                    </span>
                  </div>

                  <button
                    onClick={handleBuyBeat}
                    disabled={buyBeatInProgress}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {buyBeatInProgress ? "Processing..." : `Buy ${buyBeatAmount} BEAT`}
                  </button>
                </div>
              )}

              {/* Mint Button */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/60 text-sm">Price</span>
                  <span className="text-yellow-400 font-bold text-lg">34 BEAT</span>
                </div>
                
                {isMinted ? (
                  <div className="space-y-4">
                    <div className="w-full bg-white/5 text-white/40 text-xs font-bold py-2 rounded-lg text-center border border-white/5 uppercase tracking-widest">
                      Gem Minted Successfully
                    </div>
                    <motion.button
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        ease: "easeInOut"
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/games')}
                      className="w-full bg-yellow-400 cursor-pointer text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] hover:bg-yellow-300 transition-all text-xl flex items-center justify-center gap-2"
                    >
                      PLAY GAME
                    </motion.button>
                  </div>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={approvalInProgress || claimInProgress}
                    className="w-full bg-yellow-400 cursor-pointer text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] hover:bg-yellow-300 transition-all text-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    MINT GEM
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </IPhoneFrame>
    </>
  );
}

