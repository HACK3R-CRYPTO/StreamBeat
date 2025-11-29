// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StreamBeatToken} from "../src/StreamBeatToken.sol";

contract SetSwapContractScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Use already deployed contracts (from latest deployment)
        address beatToken = 0x62B2bf3eCC252E3De0405AD18dAcAcfbc7C6028f;
        address swapContract = 0xa2054053Ded91cf7eCD51ea39756857A2F0a5284;
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting swap contract in BEAT token...");
        console.log("BEAT Token:", beatToken);
        console.log("Swap Contract:", swapContract);
        
        StreamBeatToken token = StreamBeatToken(beatToken);
        token.setSwapContract(swapContract);
        
        console.log("Swap contract set successfully!");
        console.log("Swap contract can now mint BEAT tokens when players buy");
        
        vm.stopBroadcast();
    }
}

