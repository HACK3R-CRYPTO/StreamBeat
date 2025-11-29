// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./StreamBeatToken.sol";

/**
 * @title StreamBeatSwap
 * @dev Allows users to buy BEAT tokens with native currency (SOMNI)
 * Compatible with Somnia network
 */
contract StreamBeatSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // BEAT token address
    StreamBeatToken public beatToken;
    
    // Treasury address to receive native currency
    address public treasury;
    
    // Exchange rate: BEAT tokens per 1 native currency unit (with 18 decimals)
    // Example: 1000 * 10^18 means 1000 BEAT per 1 SOMNI
    uint256 public exchangeRate;
    
    // Minimum purchase amount (in native currency)
    uint256 public constant MIN_PURCHASE = 0.001 ether; // 0.001 SOMNI minimum
    
    // Events
    event TokensPurchased(
        address indexed buyer,
        uint256 nativeAmount,
        uint256 tokenAmount
    );
    
    event ExchangeRateUpdated(uint256 newRate);

    /**
     * @dev Constructor
     * @param _beatToken Address of the BEAT token
     * @param _treasury Address to receive native currency
     */
    constructor(
        address _beatToken,
        address _treasury
    ) Ownable(msg.sender) {
        require(_beatToken != address(0), "Token address cannot be zero");
        require(_treasury != address(0), "Treasury address cannot be zero");
        
        beatToken = StreamBeatToken(_beatToken);
        treasury = _treasury;
        // Exchange rate: 0.1 SOMNI = 34 BEAT tokens
        // So: 340 BEAT per 1 SOMNI
        exchangeRate = 340 * 10**18;
    }

    /**
     * @dev Buy BEAT tokens with native currency
     */
    function buyTokens() external payable nonReentrant {
        require(msg.value >= MIN_PURCHASE, "Amount below minimum purchase");
        require(msg.value > 0, "Must send native currency");
        
        // Calculate token amount: (nativeAmount * exchangeRate) / 1 ether
        uint256 tokenAmount = (msg.value * exchangeRate) / 1 ether;
        
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        // Transfer native currency to treasury
        (bool success, ) = payable(treasury).call{value: msg.value}("");
        require(success, "Transfer to treasury failed");
        
        // Mint tokens to buyer
        beatToken.mint(msg.sender, tokenAmount);
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    /**
     * @dev Get exchange rate
     * @return BEAT tokens per 1 native currency unit
     */
    function getExchangeRate() external view returns (uint256) {
        return exchangeRate;
    }

    /**
     * @dev Calculate how many tokens user will get for given native amount
     * @param nativeAmount Amount of native currency
     * @return Token amount user will receive
     */
    function calculateTokenAmount(uint256 nativeAmount) external view returns (uint256) {
        return (nativeAmount * exchangeRate) / 1 ether;
    }

    /**
     * @dev Set exchange rate (only owner)
     * @param _exchangeRate New exchange rate (BEAT per 1 native currency)
     */
    function setExchangeRate(uint256 _exchangeRate) external onlyOwner {
        require(_exchangeRate > 0, "Exchange rate must be greater than 0");
        exchangeRate = _exchangeRate;
        emit ExchangeRateUpdated(_exchangeRate);
    }

    /**
     * @dev Set treasury address (only owner)
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;
    }

    /**
     * @dev Emergency withdraw native currency (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(owner()).call{value: balance}("");
            require(success, "Emergency withdraw failed");
        }
    }

    /**
     * @dev Receive function to accept native currency
     */
    receive() external payable {
        require(msg.value >= MIN_PURCHASE, "Amount below minimum purchase");
        require(msg.value > 0, "Must send native currency");
        
        // Calculate token amount: (nativeAmount * exchangeRate) / 1 ether
        uint256 tokenAmount = (msg.value * exchangeRate) / 1 ether;
        
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        // Transfer native currency to treasury
        (bool success, ) = payable(treasury).call{value: msg.value}("");
        require(success, "Transfer to treasury failed");
        
        // Mint tokens to buyer
        beatToken.mint(msg.sender, tokenAmount);
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }
}

