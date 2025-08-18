// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StakeManager
 * @dev Manages member stakes, penalties, and trust scores
 */
contract StakeManager is Ownable, ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");
    
    // Events
    event StakeDeposited(uint256 indexed groupId, address indexed member, uint256 amount);
    event StakeWithdrawn(uint256 indexed groupId, address indexed member, uint256 amount);
    event StakePenalized(uint256 indexed groupId, address indexed member, uint256 amount, string reason);
    event TrustScoreUpdated(uint256 indexed groupId, address indexed member, uint256 oldScore, uint256 newScore);
    event MemberBlacklisted(uint256 indexed groupId, address indexed member, string reason);
    event MemberWhitelisted(uint256 indexed groupId, address indexed member);
    
    // State variables
    IERC20 public immutable usdt;
    
    // Member stakes per group
    mapping(uint256 => mapping(address => uint256)) public memberStakes; // groupId => member => stake
    mapping(address => uint256) public totalStakes; // member => total stake across all groups
    
    // Trust scores
    mapping(uint256 => mapping(address => uint256)) public memberTrustScores; // groupId => member => score
    mapping(address => uint256) public globalTrustScores; // member => global score
    
    // Blacklist
    mapping(uint256 => mapping(address => bool)) public memberBlacklist; // groupId => member => blacklisted
    mapping(address => bool) public globalBlacklist; // member => globally blacklisted
    
    // Payment history
    mapping(uint256 => mapping(address => uint256)) public memberDefaultCount; // groupId => member => defaults
    mapping(uint256 => mapping(address => uint256)) public memberPaymentHistory; // groupId => member => payments
    
    // Insurance pool address for penalty transfers
    address public insurancePool;
    
    constructor(address _usdt, address _admin) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    modifier onlyGroup() {
        require(hasRole(GROUP_ROLE, msg.sender), "StakeManager: caller is not a group");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "StakeManager: caller is not admin");
        _;
    }
    
    /**
     * @dev Set insurance pool address
     */
    function setInsurancePool(address _insurancePool) external onlyAdmin {
        insurancePool = _insurancePool;
    }
    
    /**
     * @dev Add a group contract
     */
    function addGroup(address group) external onlyAdmin {
        _grantRole(GROUP_ROLE, group);
    }
    
    /**
     * @dev Remove a group contract
     */
    function removeGroup(address group) external onlyAdmin {
        _revokeRole(GROUP_ROLE, group);
    }
    
    /**
     * @dev Deposit stake for a member
     * @param groupId Group identifier
     * @param member Member address
     * @param amount Stake amount
     */
    function depositStake(uint256 groupId, address member, uint256 amount) external onlyGroup nonReentrant {
        require(amount > 0, "StakeManager: amount must be greater than 0");
        require(!memberBlacklist[groupId][member], "StakeManager: member is blacklisted");
        
        usdt.safeTransferFrom(member, address(this), amount);
        
        memberStakes[groupId][member] += amount;
        totalStakes[member] += amount;
        
        // Initialize trust score if first stake
        if (memberTrustScores[groupId][member] == 0) {
            memberTrustScores[groupId][member] = 100; // Base trust score
        }
        
        emit StakeDeposited(groupId, member, amount);
    }
    
    /**
     * @dev Withdraw stake for a member
     * @param groupId Group identifier
     * @param member Member address
     * @param amount Amount to withdraw
     */
    function withdrawStake(uint256 groupId, address member, uint256 amount) external onlyGroup nonReentrant {
        require(memberStakes[groupId][member] >= amount, "StakeManager: insufficient stake");
        
        memberStakes[groupId][member] -= amount;
        totalStakes[member] -= amount;
        
        usdt.safeTransfer(member, amount);
        
        emit StakeWithdrawn(groupId, member, amount);
    }
    
    /**
     * @dev Penalize a member's stake
     * @param groupId Group identifier
     * @param member Member address
     * @param amount Penalty amount
     * @param reason Reason for penalty
     */
    function penalizeStake(uint256 groupId, address member, uint256 amount, string calldata reason) external onlyGroup nonReentrant {
        require(memberStakes[groupId][member] >= amount, "StakeManager: insufficient stake for penalty");
        
        memberStakes[groupId][member] -= amount;
        totalStakes[member] -= amount;
        
        // Transfer penalty to insurance pool if set
        if (insurancePool != address(0)) {
            usdt.safeTransfer(insurancePool, amount);
        }
        
        // Update trust score (decrease)
        uint256 currentScore = memberTrustScores[groupId][member];
        uint256 penalty = (amount * 10) / 1e6; // 10 points per USDT penalty
        uint256 newScore = currentScore > penalty ? currentScore - penalty : 0;
        memberTrustScores[groupId][member] = newScore;
        
        // Update default count
        memberDefaultCount[groupId][member]++;
        
        emit StakePenalized(groupId, member, amount, reason);
        emit TrustScoreUpdated(groupId, member, currentScore, newScore);
    }
    
    /**
     * @dev Update trust score for successful payment
     * @param groupId Group identifier
     * @param member Member address
     */
    function updateTrustScoreForPayment(uint256 groupId, address member) external onlyGroup {
        uint256 currentScore = memberTrustScores[groupId][member];
        uint256 newScore = currentScore < 1000 ? currentScore + 1 : 1000; // Max 1000
        
        if (newScore != currentScore) {
            memberTrustScores[groupId][member] = newScore;
            memberPaymentHistory[groupId][member]++;
            emit TrustScoreUpdated(groupId, member, currentScore, newScore);
        }
    }
    
    /**
     * @dev Blacklist a member
     * @param groupId Group identifier
     * @param member Member address
     * @param reason Reason for blacklisting
     */
    function blacklistMember(uint256 groupId, address member, string calldata reason) external onlyGroup {
        memberBlacklist[groupId][member] = true;
        emit MemberBlacklisted(groupId, member, reason);
    }
    
    /**
     * @dev Whitelist a member (remove from blacklist)
     * @param groupId Group identifier
     * @param member Member address
     */
    function whitelistMember(uint256 groupId, address member) external onlyAdmin {
        memberBlacklist[groupId][member] = false;
        emit MemberWhitelisted(groupId, member);
    }
    
    /**
     * @dev Get member stake info
     * @param groupId Group identifier
     * @param member Member address
     */
    function getMemberStakeInfo(uint256 groupId, address member) external view returns (
        uint256 stakeAmount,
        uint256 trustScore,
        uint256 defaultCount,
        uint256 paymentHistory,
        bool isBlacklisted
    ) {
        return (
            memberStakes[groupId][member],
            memberTrustScores[groupId][member],
            memberDefaultCount[groupId][member],
            memberPaymentHistory[groupId][member],
            memberBlacklist[groupId][member]
        );
    }
    
    /**
     * @dev Check if member can join group
     * @param groupId Group identifier
     * @param member Member address
     */
    function canMemberJoin(uint256 groupId, address member) external view returns (bool) {
        return !memberBlacklist[groupId][member] && !globalBlacklist[member];
    }
    
    /**
     * @dev Get penalty amount to be transferred to insurance pool
     * @param groupId Group identifier
     * @param member Member address
     * @param missedPayments Number of missed payments
     */
    function calculatePenalty(uint256 groupId, address member, uint256 missedPayments) external view returns (uint256) {
        uint256 baseStake = memberStakes[groupId][member];
        uint256 penaltyRate = 5; // 5% per missed payment
        uint256 totalPenaltyRate = missedPayments * penaltyRate;
        
        if (totalPenaltyRate > 50) {
            totalPenaltyRate = 50; // Max 50% penalty
        }
        
        return (baseStake * totalPenaltyRate) / 100;
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            usdt.safeTransfer(owner(), balance);
        }
    }
}