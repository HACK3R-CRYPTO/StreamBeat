// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StreamBeatGem
 * @dev ERC721 NFT contract for StreamBeat play-to-earn game
 * Compatible with Somnia network
 * NFTs are referred to as "GEMS" in the game
 */
contract StreamBeatGem is ERC721URIStorage, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Token price: 34 BEAT tokens per Gem
    uint256 public constant PRICE_PER_GEM = 34 * 10**18; // 34 BEAT tokens with 18 decimals
    
    // Maximum supply
    uint256 public maxSupply;
    
    // Current token ID counter
    uint256 private _tokenIdCounter;
    
    // Payment token address (StreamBeatToken - BEAT)
    address public paymentToken;
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Claim conditions
    bool public claimActive;
    uint256 public claimStartTime;
    
    // Treasury address to receive payments
    address public treasury;
    
    // Allowlist proof structure (for compatibility with Thirdweb)
    struct AllowlistProof {
        bytes32[] proof;
        uint256 quantityLimitPerWallet;
        uint256 pricePerToken;
        address currency;
    }
    
    // Events
    event TokensClaimed(
        uint256 indexed claimConditionIndex,
        address indexed claimer,
        address indexed receiver,
        uint256 startTokenId,
        uint256 quantityClaimed
    );
    
    event ClaimConditionsUpdated(
        bool active,
        uint256 startTime
    );

    /**
     * @dev Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _maxSupply Maximum number of NFTs that can be minted
     * @param _paymentToken Address of the payment token (BEAT)
     * @param _treasury Address to receive payment proceeds
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        address _paymentToken,
        address _treasury
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        require(_maxSupply > 0, "Max supply must be greater than 0");
        require(_paymentToken != address(0), "Payment token cannot be zero address");
        require(_treasury != address(0), "Treasury cannot be zero address");
        
        maxSupply = _maxSupply;
        paymentToken = _paymentToken;
        treasury = _treasury;
        _tokenIdCounter = 1; // Start token IDs at 1
        claimActive = false; // Start inactive, owner must activate
    }

    /**
     * @dev Claim Gems (NFTs) by paying with tokens
     * Matches Thirdweb ERC721 Drop claim function signature
     * @param _receiver Address to receive the Gems
     * @param _quantity Number of Gems to claim
     * @param _currency Payment token address (must match paymentToken)
     * @param _pricePerToken Price per token (must match PRICE_PER_GEM)
     */
    function claim(
        address _receiver,
        uint256 _quantity,
        address _currency,
        uint256 _pricePerToken,
        AllowlistProof memory,
        bytes memory
    ) external payable nonReentrant {
        require(claimActive, "Claim is not active");
        require(block.timestamp >= claimStartTime, "Claim has not started");
        require(_receiver != address(0), "Receiver cannot be zero address");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_tokenIdCounter + _quantity - 1 <= maxSupply, "Exceeds max supply");
        require(_currency == paymentToken, "Invalid payment token");
        require(_pricePerToken == PRICE_PER_GEM, "Invalid price");
        
        // Calculate total cost
        uint256 totalCost = PRICE_PER_GEM * _quantity;
        
        // Transfer payment tokens from caller to treasury
        IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, totalCost);
        
        // Mint NFTs
        uint256 startTokenId = _tokenIdCounter;
        for (uint256 i = 0; i < _quantity; i++) {
            _safeMint(_receiver, _tokenIdCounter);
            _tokenIdCounter++;
        }
        
        emit TokensClaimed(0, msg.sender, _receiver, startTokenId, _quantity);
    }

    /**
     * @dev Set claim conditions (only owner)
     * @param _active Whether claiming is active
     * @param _startTime When claiming can start
     */
    function setClaimConditions(bool _active, uint256 _startTime) external onlyOwner {
        claimActive = _active;
        claimStartTime = _startTime;
        emit ClaimConditionsUpdated(_active, _startTime);
    }

    /**
     * @dev Set base URI for token metadata
     * @param baseURI Base URI string
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Get the next token ID that will be minted
     */
    function nextTokenIdToMint() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Get total number of tokens minted
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    /**
     * @dev Get total claimed supply (for Thirdweb compatibility)
     */
    function getTotalClaimedSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    /**
     * @dev Get total supply (same as totalMinted for this contract)
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    /**
     * @dev Get active claim condition (simplified version)
     */
    function getActiveClaimConditionId() external view returns (uint256) {
        require(claimActive, "No active claim condition");
        return 0;
    }

    /**
     * @dev Get claim condition by ID (simplified version)
     */
    function getClaimConditionById(uint256) external view returns (
        uint256 startTimestamp,
        uint256 maxClaimableSupply,
        uint256 supplyClaimed,
        uint256 quantityLimitPerWallet,
        bytes32 merkleRoot,
        uint256 pricePerToken,
        address currency,
        string memory metadata
    ) {
        return (
            claimStartTime,
            maxSupply,
            _tokenIdCounter - 1,
            0, // No limit per wallet
            bytes32(0), // No merkle root
            PRICE_PER_GEM,
            paymentToken,
            ""
        );
    }

    /**
     * @dev Override base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Get token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, _toString(tokenId), ".json"))
            : "";
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Set payment token address
     * @param _paymentToken New payment token address
     */
    function setPaymentToken(address _paymentToken) external onlyOwner {
        require(_paymentToken != address(0), "Payment token cannot be zero address");
        paymentToken = _paymentToken;
    }

    /**
     * @dev Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;
    }

    /**
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
}

