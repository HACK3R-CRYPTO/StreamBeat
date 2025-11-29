// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StreamBeatToken
 * @dev ERC20 token for StreamBeat play-to-earn game
 * Used for game rewards, payments, and in-game economy
 * Compatible with Somnia network
 */
contract StreamBeatToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    
    // Maximum supply: 1 billion tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Rewards contract address (can mint tokens)
    address public rewardsContract;
    
    // Swap contract address (can mint tokens)
    address public swapContract;
    
    // Treasury address
    address public treasury;
    
    // Events
    event RewardsContractUpdated(address indexed oldContract, address indexed newContract);
    event SwapContractUpdated(address indexed oldContract, address indexed newContract);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokensMinted(address indexed to, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _treasury Treasury address to receive initial supply
     */
    constructor(
        address _treasury
    ) ERC20("StreamBeat Token", "BEAT") Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;
        
        // Mint initial supply to treasury (50% of max supply)
        uint256 initialSupply = MAX_SUPPLY / 2;
        _mint(treasury, initialSupply);
    }
    
    /**
     * @dev Mint tokens (only by rewards contract, swap contract, or owner)
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(
            msg.sender == rewardsContract || msg.sender == swapContract || msg.sender == owner(),
            "Only rewards contract, swap contract, or owner can mint"
        );
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Set rewards contract address (only owner)
     * @param _rewardsContract New rewards contract address
     */
    function setRewardsContract(address _rewardsContract) external onlyOwner {
        require(_rewardsContract != address(0), "Rewards contract cannot be zero address");
        address oldContract = rewardsContract;
        rewardsContract = _rewardsContract;
        emit RewardsContractUpdated(oldContract, _rewardsContract);
    }
    
    /**
     * @dev Set swap contract address (only owner)
     * @param _swapContract New swap contract address
     */
    function setSwapContract(address _swapContract) external onlyOwner {
        require(_swapContract != address(0), "Swap contract cannot be zero address");
        address oldContract = swapContract;
        swapContract = _swapContract;
        emit SwapContractUpdated(oldContract, _swapContract);
    }
    
    /**
     * @dev Set treasury address (only owner)
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury cannot be zero address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @dev Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override required by Solidity
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
    
    /**
     * @dev Get remaining mintable supply
     */
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
