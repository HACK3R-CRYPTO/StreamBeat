// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StreamBeatRewards} from "../src/StreamBeatRewards.sol";
import {StreamBeatToken} from "../src/StreamBeatToken.sol";
import {StreamBeatGem} from "../src/StreamBeatGem.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Determine network
        uint256 chainId = block.chainid;
        
        console.log("Deploying StreamBeat contracts...");
        console.log("Chain ID:", chainId);
        console.log("Treasury:", treasury);
        
        // Step 1: Deploy StreamBeatToken (BEAT)
        StreamBeatToken beatToken = new StreamBeatToken(treasury);
        console.log("StreamBeatToken (BEAT) deployed at:", address(beatToken));
        
        // Step 2: Deploy NFT Gem contract (uses BEAT token for payment)
        StreamBeatGem gem = new StreamBeatGem(
            "StreamBeat Gem",
            "SBG",
            10000, // Max supply
            address(beatToken), // Use BEAT token for payment
            treasury
        );
        console.log("StreamBeatGem deployed at:", address(gem));
        
        // Step 3: Deploy Rewards contract (uses BEAT token for rewards)
        StreamBeatRewards rewards = new StreamBeatRewards(
            address(beatToken), // Use BEAT token for rewards
            10 // Minimum score threshold
        );
        console.log("StreamBeatRewards deployed at:", address(rewards));
        
        // Step 4: Set rewards contract in token (allows minting)
        beatToken.setRewardsContract(address(rewards));
        console.log("Rewards contract set in token");
        
        // Step 5: Activate claim
        gem.setClaimConditions(true, block.timestamp);
        console.log("Claim activated!");
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("StreamBeatToken (BEAT):", address(beatToken));
        console.log("Gem Contract:", address(gem));
        console.log("Rewards Contract:", address(rewards));
        console.log("Treasury:", treasury);
        console.log("\nToken Details:");
        console.log("  Name:", beatToken.name());
        console.log("  Symbol:", beatToken.symbol());
        console.log("  Total Supply:", beatToken.totalSupply());
        console.log("  Max Supply:", beatToken.MAX_SUPPLY());
        console.log("\nIMPORTANT: Update frontend with new contract addresses!");
    }
}
