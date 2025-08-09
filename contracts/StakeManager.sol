// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

<<<<<<< HEAD
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
=======
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IHematTypes.sol";
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071

/**
 * @title StakeManager
 * @dev Manages member stakes, penalties, and trust scores
 */
<<<<<<< HEAD
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
=======
contract StakeManager is ReentrancyGuard, AccessControl, IHematTypes {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");
    
    IERC20 public immutable usdtToken;
    
    // Constants
    uint256 public constant STAKE_PENALTY_BPS = 2000; // 20% penalty on default
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant INITIAL_TRUST_SCORE = 100;
    uint256 public constant MAX_TRUST_SCORE = 1000;
    
    // Member stakes and scores
    mapping(uint256 => mapping(address => uint256)) public memberStakes;
    mapping(uint256 => mapping(address => uint256)) public memberTrustScores;
    mapping(uint256 => mapping(address => uint256)) public memberPaymentHistory;
    mapping(uint256 => mapping(address => uint256)) public memberDefaultCount;
    mapping(uint256 => mapping(address => bool)) public memberBlacklist;
    
    // Group stake tracking
    mapping(uint256 => uint256) public totalGroupStakes;
    mapping(uint256 => uint256) public totalPenaltiesCollected;
    
    // Events
    event StakeDeposited(uint256 indexed groupId, address indexed member, uint256 amount);
    event StakeWithdrawn(uint256 indexed groupId, address indexed member, uint256 amount);
    // event StakeSlashed(uint256 indexed groupId, address indexed member, uint256 amount); // Defined in IHematTypes
    event TrustScoreUpdated(uint256 indexed groupId, address indexed member, uint256 oldScore, uint256 newScore);
    event MemberBlacklisted(uint256 indexed groupId, address indexed member);
    event MemberWhitelisted(uint256 indexed groupId, address indexed member);
    
    modifier onlyGroup() {
        require(hasRole(GROUP_ROLE, msg.sender), "StakeManager: caller is not a group");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "StakeManager: caller is not admin");
        _;
    }
    
    constructor(address _usdtToken, address _admin) {
        require(_usdtToken != address(0), "StakeManager: invalid USDT token");
        require(_admin != address(0), "StakeManager: invalid admin");
        
        usdtToken = IERC20(_usdtToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    }
    
    /**
     * @dev Deposit stake for a member
<<<<<<< HEAD
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
=======
     * @param groupId Group identifier
     * @param member Member address
     * @param amount Stake amount in USDT
     */
    function depositStake(
        uint256 groupId,
        address member,
        uint256 amount
    ) external onlyGroup nonReentrant {
        require(member != address(0), "StakeManager: invalid member");
        require(amount > 0, "StakeManager: invalid amount");
        require(!memberBlacklist[groupId][member], "StakeManager: member blacklisted");
        
        usdtToken.safeTransferFrom(member, address(this), amount);
        
        memberStakes[groupId][member] += amount;
        totalGroupStakes[groupId] += amount;
        
        // Initialize trust score if first stake
        if (memberTrustScores[groupId][member] == 0) {
            memberTrustScores[groupId][member] = INITIAL_TRUST_SCORE;
        }
        
        emit StakeDeposited(groupId, member, amount);
    }
    
    /**
     * @dev Withdraw stake for a member (after group completion)
     * @param groupId Group identifier
     * @param member Member address
     */
    function withdrawStake(
        uint256 groupId,
        address member
    ) external onlyGroup nonReentrant returns (uint256) {
        uint256 stakeAmount = memberStakes[groupId][member];
        require(stakeAmount > 0, "StakeManager: no stake to withdraw");
        
        memberStakes[groupId][member] = 0;
        totalGroupStakes[groupId] -= stakeAmount;
        
        usdtToken.safeTransfer(member, stakeAmount);
        
        emit StakeWithdrawn(groupId, member, stakeAmount);
        return stakeAmount;
    }
    
    /**
     * @dev Slash member stake for default
     * @param groupId Group identifier
     * @param member Member address
     * @param missedAmount Amount of missed payment
     * @return slashedAmount Amount actually slashed
     */
    function slashStake(
        uint256 groupId,
        address member,
        uint256 missedAmount
    ) external onlyGroup nonReentrant returns (uint256) {
        uint256 currentStake = memberStakes[groupId][member];
        require(currentStake > 0, "StakeManager: no stake to slash");
        
        // Calculate penalty (smaller of stake penalty or missed amount)
        uint256 penaltyAmount = (currentStake * STAKE_PENALTY_BPS) / BPS_DENOMINATOR;
        uint256 slashedAmount = penaltyAmount > missedAmount ? missedAmount : penaltyAmount;
        slashedAmount = slashedAmount > currentStake ? currentStake : slashedAmount;
        
        memberStakes[groupId][member] -= slashedAmount;
        totalGroupStakes[groupId] -= slashedAmount;
        totalPenaltiesCollected[groupId] += slashedAmount;
        
        // Update default count and trust score
        memberDefaultCount[groupId][member]++;
        _updateTrustScore(groupId, member, false);
        
        // Blacklist member if too many defaults
        if (memberDefaultCount[groupId][member] >= 3) {
            memberBlacklist[groupId][member] = true;
            emit MemberBlacklisted(groupId, member);
        }
        
        emit StakeSlashed(groupId, member, slashedAmount);
        return slashedAmount;
    }
    
    /**
     * @dev Record successful payment and update trust score
     * @param groupId Group identifier
     * @param member Member address
     */
    function recordSuccessfulPayment(
        uint256 groupId,
        address member
    ) external onlyGroup {
        memberPaymentHistory[groupId][member]++;
        _updateTrustScore(groupId, member, true);
    }
    
    /**
     * @dev Update member trust score
     * @param groupId Group identifier
     * @param member Member address
     * @param isPositive Whether the action was positive
     */
    function _updateTrustScore(
        uint256 groupId,
        address member,
        bool isPositive
    ) internal {
        uint256 currentScore = memberTrustScores[groupId][member];
        uint256 newScore;
        
        if (isPositive) {
            // Increase trust score by 10 points, cap at MAX_TRUST_SCORE
            newScore = currentScore + 10;
            if (newScore > MAX_TRUST_SCORE) {
                newScore = MAX_TRUST_SCORE;
            }
        } else {
            // Decrease trust score by 50 points, minimum 0
            if (currentScore >= 50) {
                newScore = currentScore - 50;
            } else {
                newScore = 0;
            }
        }
        
        if (newScore != currentScore) {
            memberTrustScores[groupId][member] = newScore;
            emit TrustScoreUpdated(groupId, member, currentScore, newScore);
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
        }
    }
    
    /**
<<<<<<< HEAD
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
=======
     * @dev Get penalty amount to be transferred to insurance pool
     * @param groupId Group identifier
     * @return amount Amount of penalties to transfer
     */
    function getPenaltyAmount(uint256 groupId) external view returns (uint256) {
        return totalPenaltiesCollected[groupId];
    }
    
    /**
     * @dev Transfer penalties to insurance pool
     * @param groupId Group identifier
     * @param insurancePool Insurance pool address
     */
    function transferPenaltiesToInsurance(
        uint256 groupId,
        address insurancePool
    ) external onlyGroup nonReentrant {
        uint256 amount = totalPenaltiesCollected[groupId];
        require(amount > 0, "StakeManager: no penalties to transfer");
        
        totalPenaltiesCollected[groupId] = 0;
        usdtToken.safeTransfer(insurancePool, amount);
    }
    
    /**
     * @dev Whitelist a blacklisted member (admin only)
     * @param groupId Group identifier
     * @param member Member address
     */
    function whitelistMember(
        uint256 groupId,
        address member
    ) external onlyAdmin {
        memberBlacklist[groupId][member] = false;
        emit MemberWhitelisted(groupId, member);
    }
    
    // View functions
    function getMemberStake(uint256 groupId, address member) external view returns (uint256) {
        return memberStakes[groupId][member];
    }
    
    function getMemberTrustScore(uint256 groupId, address member) external view returns (uint256) {
        return memberTrustScores[groupId][member];
    }
    
    function getMemberPaymentHistory(uint256 groupId, address member) external view returns (uint256) {
        return memberPaymentHistory[groupId][member];
    }
    
    function getMemberDefaultCount(uint256 groupId, address member) external view returns (uint256) {
        return memberDefaultCount[groupId][member];
    }
    
    function isMemberBlacklisted(uint256 groupId, address member) external view returns (bool) {
        return memberBlacklist[groupId][member];
    }
    
    function getTotalGroupStakes(uint256 groupId) external view returns (uint256) {
        return totalGroupStakes[groupId];
    }
    
    function canMemberJoin(uint256 groupId, address member) external view returns (bool) {
        return !memberBlacklist[groupId][member];
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    }
}