// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StreamBeatRewards} from "../src/StreamBeatRewards.sol";

contract SetBackendValidatorScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Backend validator address (same as deployer for testing)
        address backendValidator = 0xd2df53D9791e98Db221842Dd085F4144014BBE2a;
        
        // Use already deployed rewards contract (from latest deployment)
        address rewardsContract = 0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7;
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting backend validator in StreamBeatRewards contract...");
        console.log("Rewards Contract:", rewardsContract);
        console.log("Backend Validator:", backendValidator);
        
        StreamBeatRewards rewards = StreamBeatRewards(rewardsContract);
        rewards.setBackendValidator(backendValidator);
        
        console.log("Backend validator set successfully!");
        console.log("Only this address can submit scores to the contract");
        
        vm.stopBroadcast();
    }
}

