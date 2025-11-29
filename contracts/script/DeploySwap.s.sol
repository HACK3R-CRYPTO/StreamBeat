// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StreamBeatSwap} from "../src/StreamBeatSwap.sol";

contract DeploySwapScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        // Use already deployed token address (from latest deployment)
        address beatToken = 0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f;
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying StreamBeatSwap contract...");
        console.log("Using existing BEAT token:", beatToken);
        console.log("Treasury:", treasury);
        
        // Deploy Swap contract (constructor takes beatToken and treasury)
        StreamBeatSwap swap = new StreamBeatSwap(
            beatToken,  // BEAT token address
            treasury    // Treasury address
        );
        
        console.log("StreamBeatSwap deployed at:", address(swap));
        console.log("Exchange Rate:", swap.getExchangeRate(), "BEAT per 1 SOMNI");
        
        vm.stopBroadcast();
        
        console.log("\n=== Swap Deployment Summary ===");
        console.log("StreamBeatSwap:", address(swap));
        console.log("BEAT Token:", beatToken);
        console.log("Treasury:", treasury);
        console.log("Exchange Rate: 0.1 SOMNI = 34 BEAT tokens");
        console.log("Exchange Rate: 340 BEAT per 1 SOMNI");
        console.log("\nPlayers can now buy BEAT tokens with SOMNI!");
    }
}

