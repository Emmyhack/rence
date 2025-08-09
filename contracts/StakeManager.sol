// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StakeManager
 * @dev Manages member stakes, penalties, and trust scores
 */
contract StakeManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Events
    event StakeDeposited(address indexed member, address indexed group, uint256 amount);
    event StakeWithdrawn(address indexed member, address indexed group, uint256 amount);
    event StakePenalized(address indexed member, address indexed group, uint256 amount, string reason);
    event TrustScoreUpdated(address indexed member, uint256 newScore);
    
    // State variables
    IERC20 public immutable usdt;
    
    // Member stakes per group
    mapping(address => mapping(address => uint256)) public memberStakes; // member => group => stake
    mapping(address => uint256) public totalStakes; // member => total stake across all groups
    
    // Trust scores (0-1000, where 1000 is perfect)
    mapping(address => uint256) public trustScores;
    
    // Penalty tracking
    mapping(address => uint256) public totalPenalties; // member => total penalties paid
    mapping(address => uint256) public missedPayments; // member => count of missed payments
    
    // Configuration
    uint256 public constant MIN_TRUST_SCORE = 0;
    uint256 public constant MAX_TRUST_SCORE = 1000;
    uint256 public constant DEFAULT_TRUST_SCORE = 500;
    uint256 public constant TRUST_SCORE_DECREASE = 100; // Points lost per missed payment
    uint256 public constant TRUST_SCORE_INCREASE = 10; // Points gained per successful cycle
    
    // Modifiers
    modifier onlyGroup() {
        require(isGroup(msg.sender), "Only groups can call this function");
        _;
    }
    
    modifier onlyGroupOrOwner() {
        require(isGroup(msg.sender) || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor(address _usdt) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
    }
    
    /**
     * @dev Deposit stake for a member
     */
    function depositStake(address member, address group, uint256 amount) external onlyGroup nonReentrant {
        require(amount > 0, "Stake amount must be greater than 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        memberStakes[member][group] += amount;
        totalStakes[member] += amount;
        
        emit StakeDeposited(member, group, amount);
    }
    
    /**
     * @dev Withdraw stake for a member
     */
    function withdrawStake(address member, address group, uint256 amount) external onlyGroup nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than 0");
        require(memberStakes[member][group] >= amount, "Insufficient stake");
        
        memberStakes[member][group] -= amount;
        totalStakes[member] -= amount;
        
        require(usdt.transfer(member, amount), "Transfer failed");
        
        emit StakeWithdrawn(member, group, amount);
    }
    
    /**
     * @dev Penalize stake for missed payment or default
     */
    function penalizeStake(address member, address group, uint256 amount, string memory reason) external onlyGroup {
        require(amount > 0, "Penalty amount must be greater than 0");
        require(memberStakes[member][group] >= amount, "Insufficient stake to penalize");
        
        memberStakes[member][group] -= amount;
        totalStakes[member] -= amount;
        totalPenalties[member] += amount;
        missedPayments[member]++;
        
        // Decrease trust score
        _decreaseTrustScore(member);
        
        emit StakePenalized(member, group, amount, reason);
    }
    
    /**
     * @dev Reward member for successful cycle completion
     */
    function rewardMember(address member) external onlyGroup {
        _increaseTrustScore(member);
    }
    
    /**
     * @dev Get member's stake for a specific group
     */
    function getMemberStake(address member, address group) external view returns (uint256) {
        return memberStakes[member][group];
    }
    
    /**
     * @dev Get member's total stake across all groups
     */
    function getTotalStake(address member) external view returns (uint256) {
        return totalStakes[member];
    }
    
    /**
     * @dev Get member's trust score
     */
    function getTrustScore(address member) external view returns (uint256) {
        return trustScores[member];
    }
    
    /**
     * @dev Get member's penalty history
     */
    function getMemberPenalties(address member) external view returns (uint256 totalPenalty, uint256 missedPaymentCount) {
        return (totalPenalties[member], missedPayments[member]);
    }
    
    /**
     * @dev Check if member has sufficient stake for a group
     */
    function hasSufficientStake(address member, address group, uint256 requiredAmount) external view returns (bool) {
        return memberStakes[member][group] >= requiredAmount;
    }
    
    /**
     * @dev Emergency withdraw all stakes (only owner)
     */
    function emergencyWithdrawStakes() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            require(usdt.transfer(owner(), balance), "Emergency transfer failed");
        }
    }
    
    /**
     * @dev Set trust score for a member (only owner)
     */
    function setTrustScore(address member, uint256 score) external onlyOwner {
        require(score >= MIN_TRUST_SCORE && score <= MAX_TRUST_SCORE, "Invalid trust score");
        trustScores[member] = score;
        emit TrustScoreUpdated(member, score);
    }
    
    /**
     * @dev Initialize trust score for a new member
     */
    function initializeTrustScore(address member) external onlyGroupOrOwner {
        if (trustScores[member] == 0) {
            trustScores[member] = DEFAULT_TRUST_SCORE;
            emit TrustScoreUpdated(member, DEFAULT_TRUST_SCORE);
        }
    }
    
    /**
     * @dev Decrease trust score for missed payment
     */
    function _decreaseTrustScore(address member) internal {
        uint256 currentScore = trustScores[member];
        if (currentScore == 0) {
            currentScore = DEFAULT_TRUST_SCORE;
        }
        
        uint256 newScore = currentScore > TRUST_SCORE_DECREASE ? 
            currentScore - TRUST_SCORE_DECREASE : MIN_TRUST_SCORE;
        
        trustScores[member] = newScore;
        emit TrustScoreUpdated(member, newScore);
    }
    
    /**
     * @dev Increase trust score for successful completion
     */
    function _increaseTrustScore(address member) internal {
        uint256 currentScore = trustScores[member];
        if (currentScore == 0) {
            currentScore = DEFAULT_TRUST_SCORE;
        }
        
        uint256 newScore = currentScore + TRUST_SCORE_INCREASE;
        if (newScore > MAX_TRUST_SCORE) {
            newScore = MAX_TRUST_SCORE;
        }
        
        trustScores[member] = newScore;
        emit TrustScoreUpdated(member, newScore);
    }
    
    /**
     * @dev Check if address is a registered group
     */
    function isGroup(address group) internal view returns (bool) {
        // This would be implemented with a mapping from factory
        // For now, we'll use a simple check
        return group != address(0);
    }
}