// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IHematTypes.sol";

/**
 * @title StakeManager
 * @dev Manages member stakes, penalties, and trust scores
 */
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
    event StakeSlashed(uint256 indexed groupId, address indexed member, uint256 amount);
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
    }
    
    /**
     * @dev Deposit stake for a member
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
        }
    }
    
    /**
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
    }
}