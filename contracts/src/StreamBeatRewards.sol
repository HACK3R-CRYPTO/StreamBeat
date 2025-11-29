// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./StreamBeatToken.sol";

/**
 * @title StreamBeatRewards
 * @dev Reward distribution contract for StreamBeat play-to-earn game
 * Handles score submissions, leaderboard tracking, and reward payouts
 * Uses StreamBeatToken (BEAT) for rewards
 * Compatible with Somnia network
 */
contract StreamBeatRewards is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Reward token (StreamBeatToken - BEAT)
    StreamBeatToken public rewardToken;
    
    // Prize pool amount
    uint256 public prizePool;
    
    // Minimum score to qualify for rewards
    uint256 public minScoreThreshold;
    
    // Backend validator address (only this address can submit scores)
    address public backendValidator;
    
    // Leaderboard entry structure
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        bool claimed;
    }
    
    // Mapping from player to their best score
    mapping(address => uint256) public playerScores;
    
    // Leaderboard entries
    LeaderboardEntry[] public leaderboard;
    
    // Maximum leaderboard size
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;
    
    // Reward distribution percentages
    uint256 public constant FIRST_PLACE_PERCENT = 40; // 40% of prize pool
    uint256 public constant SECOND_PLACE_PERCENT = 25; // 25% of prize pool
    uint256 public constant THIRD_PLACE_PERCENT = 15; // 15% of prize pool
    uint256 public constant TOP_10_PERCENT = 10; // 10% split among places 4-10
    uint256 public constant PARTICIPATION_PERCENT = 10; // 10% split among all participants
    
    // Events
    event ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp);
    event RewardsDistributed(address indexed player, uint256 amount);
    event PrizePoolUpdated(uint256 newAmount);
    event MinScoreThresholdUpdated(uint256 newThreshold);
    
    /**
     * @dev Constructor
     * @param _rewardToken Address of the StreamBeatToken (BEAT)
     * @param _minScoreThreshold Minimum score to qualify for rewards
     */
    constructor(
        address _rewardToken,
        uint256 _minScoreThreshold
    ) Ownable(msg.sender) {
        require(_rewardToken != address(0), "Reward token cannot be zero address");
        rewardToken = StreamBeatToken(_rewardToken);
        minScoreThreshold = _minScoreThreshold;
        // Backend validator will be set by owner after deployment
        backendValidator = address(0);
    }
    
    /**
     * @dev Modifier to ensure only backend validator can submit scores
     */
    modifier onlyBackendValidator() {
        require(backendValidator != address(0), "Backend validator not set");
        require(msg.sender == backendValidator, "Only backend validator can submit scores");
        _;
    }
    
    /**
     * @dev Set backend validator address (only owner)
     * @param _backendValidator Address of the backend validator wallet
     */
    function setBackendValidator(address _backendValidator) external onlyOwner {
        require(_backendValidator != address(0), "Backend validator cannot be zero address");
        backendValidator = _backendValidator;
    }
    
    /**
     * @dev Submit a game score (only backend validator can call this)
     * @param player Address of the player who achieved the score
     * @param score Player's validated score
     */
    function submitScore(address player, uint256 score) external onlyBackendValidator {
        require(player != address(0), "Player cannot be zero address");
        require(score >= minScoreThreshold, "Score below minimum threshold");
        
        // Update player's best score if this is higher
        if (score > playerScores[player]) {
            playerScores[player] = score;
        }
        
        // Add to leaderboard
        leaderboard.push(LeaderboardEntry({
            player: player,
            score: score,
            timestamp: block.timestamp,
            claimed: false
        }));
        
        // Keep only top MAX_LEADERBOARD_SIZE entries
        if (leaderboard.length > MAX_LEADERBOARD_SIZE) {
            // Sort and keep top entries (simplified - in production, use better sorting)
            _sortLeaderboard();
            // Remove lowest entries
            uint256 removeCount = leaderboard.length - MAX_LEADERBOARD_SIZE;
            for (uint256 i = 0; i < removeCount; i++) {
                leaderboard.pop();
            }
        }
        
        emit ScoreSubmitted(player, score, block.timestamp);
    }
    
    /**
     * @dev Claim rewards based on leaderboard position
     */
    function claimRewards() external nonReentrant {
        require(prizePool > 0, "No prize pool available");
        
        uint256 playerPosition = _getPlayerPosition(msg.sender);
        require(playerPosition > 0 && playerPosition <= leaderboard.length, "Not eligible for rewards");
        
        LeaderboardEntry storage entry = leaderboard[playerPosition - 1];
        require(!entry.claimed, "Rewards already claimed");
        require(entry.player == msg.sender, "Not your entry");
        
        uint256 rewardAmount = _calculateReward(playerPosition);
        require(rewardAmount > 0, "No reward available");
        require(rewardToken.balanceOf(address(this)) >= rewardAmount, "Insufficient contract balance");
        
        entry.claimed = true;
        
        // Mint tokens directly to player (more efficient than transfer)
        rewardToken.mint(msg.sender, rewardAmount);
        
        emit RewardsDistributed(msg.sender, rewardAmount);
    }
    
    /**
     * @dev Calculate reward amount based on position
     */
    function _calculateReward(uint256 position) internal view returns (uint256) {
        if (position == 1) {
            return (prizePool * FIRST_PLACE_PERCENT) / 100;
        } else if (position == 2) {
            return (prizePool * SECOND_PLACE_PERCENT) / 100;
        } else if (position == 3) {
            return (prizePool * THIRD_PLACE_PERCENT) / 100;
        } else if (position >= 4 && position <= 10) {
            return (prizePool * TOP_10_PERCENT) / (7 * 100); // Split among 7 positions
        } else {
            // Participation reward (split among all eligible players)
            uint256 eligiblePlayers = _countEligiblePlayers();
            if (eligiblePlayers > 0) {
                return (prizePool * PARTICIPATION_PERCENT) / (eligiblePlayers * 100);
            }
        }
        return 0;
    }
    
    /**
     * @dev Get player's position in leaderboard
     */
    function _getPlayerPosition(address player) internal returns (uint256) {
        _sortLeaderboard();
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                return i + 1;
            }
        }
        return 0;
    }
    
    /**
     * @dev Sort leaderboard by score (descending)
     */
    function _sortLeaderboard() internal {
        // Simple bubble sort (for small arrays)
        uint256 n = leaderboard.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (leaderboard[j].score < leaderboard[j + 1].score) {
                    LeaderboardEntry memory temp = leaderboard[j];
                    leaderboard[j] = leaderboard[j + 1];
                    leaderboard[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @dev Count eligible players for participation rewards
     */
    function _countEligiblePlayers() internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (!leaderboard[i].claimed && leaderboard[i].score >= minScoreThreshold) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Fund the prize pool (mint tokens to contract)
     */
    function fundPrizePool(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        // Mint tokens directly to this contract for prize pool
        rewardToken.mint(address(this), amount);
        prizePool += amount;
        emit PrizePoolUpdated(prizePool);
    }
    
    /**
     * @dev Fund prize pool from external source (transfer existing tokens)
     */
    function fundPrizePoolFromExternal(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        IERC20(address(rewardToken)).safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
        emit PrizePoolUpdated(prizePool);
    }
    
    /**
     * @dev Set minimum score threshold
     */
    function setMinScoreThreshold(uint256 _minScoreThreshold) external onlyOwner {
        minScoreThreshold = _minScoreThreshold;
        emit MinScoreThresholdUpdated(_minScoreThreshold);
    }
    
    /**
     * @dev Get top N players from leaderboard
     */
    function getTopPlayers(uint256 count) external view returns (LeaderboardEntry[] memory) {
        require(count > 0 && count <= leaderboard.length, "Invalid count");
        LeaderboardEntry[] memory topPlayers = new LeaderboardEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            topPlayers[i] = leaderboard[i];
        }
        return topPlayers;
    }
    
    /**
     * @dev Get leaderboard length
     */
    function getLeaderboardLength() external view returns (uint256) {
        return leaderboard.length;
    }
    
    /**
     * @dev Get player's best score (for backend verification)
     * @param player Address of the player
     * @return The player's highest score
     */
    function getPlayerScore(address player) external view returns (uint256) {
        return playerScores[player];
    }
    
    /**
     * @dev Get player's latest submission from leaderboard
     * @param player Address of the player
     * @return score The latest score, timestamp when submitted
     */
    function getPlayerLatestSubmission(address player) external view returns (uint256 score, uint256 timestamp) {
        // Find the most recent entry for this player
        for (uint256 i = leaderboard.length; i > 0; i--) {
            if (leaderboard[i - 1].player == player) {
                return (leaderboard[i - 1].score, leaderboard[i - 1].timestamp);
            }
        }
        return (0, 0);
    }
    
    /**
     * @dev Emergency withdraw (transfer tokens out)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        IERC20(address(rewardToken)).safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Set reward token address (only owner)
     */
    function setRewardToken(address _rewardToken) external onlyOwner {
        require(_rewardToken != address(0), "Reward token cannot be zero address");
        rewardToken = StreamBeatToken(_rewardToken);
    }
}
