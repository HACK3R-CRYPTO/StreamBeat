// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StreamBeatGem} from "../src/StreamBeatGem.sol";

contract DeployGemScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        // Use already deployed token address
        address beatToken = 0x0f764437ffBE1fcd0d0d276a164610422710B482;
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying StreamBeatGem NFT contract...");
        console.log("Using existing BEAT token:", beatToken);
        console.log("Treasury:", treasury);
        
        // Deploy NFT Gem contract
        StreamBeatGem gem = new StreamBeatGem(
            "StreamBeat Gem",
            "SBG",
            10000, // Max supply
            beatToken, // Use existing BEAT token for payment
            treasury
        );
        
        console.log("StreamBeatGem deployed at:", address(gem));
        
        // Activate claim
        gem.setClaimConditions(true, block.timestamp);
        console.log("Claim activated!");
        
        vm.stopBroadcast();
        
        console.log("\n=== Gem Deployment Summary ===");
        console.log("StreamBeatGem:", address(gem));
        console.log("Payment Token (BEAT):", beatToken);
        console.log("Treasury:", treasury);
        console.log("Max Supply: 10000");
        console.log("Price: 34 BEAT per Gem");
    }
}

