// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InsurancePool
 * @dev Manages insurance premiums, claims, and payouts
 */
contract InsurancePool is Ownable, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");
    bytes32 public constant CLAIM_PROCESSOR_ROLE = keccak256("CLAIM_PROCESSOR_ROLE");
    
    enum ClaimStatus { SUBMITTED, APPROVED, REJECTED, PAID }
    
    struct Claim {
        address claimant;
        uint256 amount;
        uint256 groupId;
        string evidenceCID;
        ClaimStatus status;
        uint256 submittedAt;
        uint256 processedAt;
        uint256 approvals;
        mapping(address => bool) hasApproved;
    }
    
    // Events
    event PremiumCollected(uint256 indexed groupId, address indexed member, uint256 amount);
    event ClaimSubmitted(bytes32 indexed claimId, address indexed claimant, uint256 indexed groupId, uint256 amount, string evidenceCID);
    event ClaimApproved(bytes32 indexed claimId, address indexed approver);
    event ClaimRejected(bytes32 indexed claimId, string reason);
    event ClaimPaid(bytes32 indexed claimId, address indexed claimant, uint256 amount);
    event InsuranceClaimProcessed(bytes32 indexed claimId, bool approved, uint256 amount);
    event ReserveRatioUpdated(uint256 oldRatio, uint256 newRatio);
    
    // State variables
    IERC20 public immutable usdt;
    
    // Pool balances
    uint256 public totalPoolBalance;
    uint256 public totalReserves;
    uint256 public totalClaims;
    uint256 public totalPremiums;
    
    // Configuration
    uint256 public reserveRatio = 2000; // 20% in basis points
    uint256 public minReserveRatio = 1000; // 10%
    uint256 public maxReserveRatio = 5000; // 50%
    uint256 public constant CLAIM_APPROVAL_THRESHOLD = 2;
    
    // Group configurations
    mapping(uint256 => uint256) public groupPremiumRates; // groupId => premium rate in basis points
    mapping(uint256 => uint256) public groupPoolBalances; // groupId => pool balance
    mapping(uint256 => uint256) public groupClaimCooldown; // groupId => cooldown period
    mapping(uint256 => mapping(address => uint256)) public lastClaimTime; // groupId => member => timestamp
    
    // Claims
    mapping(bytes32 => Claim) public claims;
    mapping(uint256 => bytes32[]) public groupClaims; // groupId => claim IDs
    bytes32[] public allClaims;
    
    // Claim limits
    mapping(uint256 => uint256) public maxClaimAmount; // groupId => max claim amount
    mapping(uint256 => uint256) public dailyClaimLimit; // groupId => daily limit
    mapping(uint256 => uint256) public dailyClaimsUsed; // groupId => amount used today
    mapping(uint256 => uint256) public lastClaimDay; // groupId => last claim day
    
    constructor(address _usdt, address _admin) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(CLAIM_PROCESSOR_ROLE, _admin);
    }
    
    modifier onlyGroup() {
        require(hasRole(GROUP_ROLE, msg.sender), "InsurancePool: caller is not a group");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "InsurancePool: caller is not admin");
        _;
    }
    
    modifier onlyClaimProcessor() {
        require(hasRole(CLAIM_PROCESSOR_ROLE, msg.sender), "InsurancePool: caller is not claim processor");
        _;
    }
    
    /**
     * @dev Add a group contract
     */
    function addGroup(address group) external onlyAdmin {
        _grantRole(GROUP_ROLE, group);
    }
    
    /**
     * @dev Configure group insurance parameters
     */
    function configureGroup(
        uint256 groupId,
        uint256 premiumRate,
        uint256 maxClaim,
        uint256 dailyLimit,
        uint256 claimCooldown
    ) external onlyAdmin {
        groupPremiumRates[groupId] = premiumRate;
        maxClaimAmount[groupId] = maxClaim;
        dailyClaimLimit[groupId] = dailyLimit;
        groupClaimCooldown[groupId] = claimCooldown;
    }
    
    /**
     * @dev Collect premium from a member
     */
    function collectPremium(uint256 groupId, address member, uint256 amount) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "InsurancePool: amount must be greater than 0");
        
        usdt.safeTransferFrom(member, address(this), amount);
        
        groupPoolBalances[groupId] += amount;
        totalPoolBalance += amount;
        totalPremiums += amount;
        
        // Calculate reserves
        uint256 reserveAmount = (amount * reserveRatio) / 10000;
        totalReserves += reserveAmount;
        
        emit PremiumCollected(groupId, member, amount);
    }
    
    /**
     * @dev Submit an insurance claim
     */
    function submitClaim(
        uint256 groupId,
        address claimant,
        uint256 amount,
        string calldata evidenceCID
    ) external onlyGroup nonReentrant whenNotPaused returns (bytes32) {
        require(amount > 0, "InsurancePool: amount must be greater than 0");
        require(amount <= maxClaimAmount[groupId], "InsurancePool: amount exceeds maximum");
        require(_canMemberClaim(groupId, claimant), "InsurancePool: claim cooldown not met");
        
        // Check daily limits
        uint256 today = block.timestamp / 86400;
        if (lastClaimDay[groupId] != today) {
            dailyClaimsUsed[groupId] = 0;
            lastClaimDay[groupId] = today;
        }
        require(dailyClaimsUsed[groupId] + amount <= dailyClaimLimit[groupId], "InsurancePool: daily limit exceeded");
        
        bytes32 claimId = keccak256(abi.encodePacked(groupId, claimant, amount, evidenceCID, block.timestamp));
        
        Claim storage claim = claims[claimId];
        claim.claimant = claimant;
        claim.amount = amount;
        claim.groupId = groupId;
        claim.evidenceCID = evidenceCID;
        claim.status = ClaimStatus.SUBMITTED;
        claim.submittedAt = block.timestamp;
        
        groupClaims[groupId].push(claimId);
        allClaims.push(claimId);
        
        dailyClaimsUsed[groupId] += amount;
        lastClaimTime[groupId][claimant] = block.timestamp;
        
        emit ClaimSubmitted(claimId, claimant, groupId, amount, evidenceCID);
        
        return claimId;
    }
    
    /**
     * @dev Approve a claim
     */
    function approveClaim(bytes32 claimId) external onlyClaimProcessor {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.SUBMITTED, "InsurancePool: claim not in submitted status");
        require(!claim.hasApproved[msg.sender], "InsurancePool: already approved by this processor");
        
        claim.hasApproved[msg.sender] = true;
        claim.approvals++;
        
        emit ClaimApproved(claimId, msg.sender);
        
        if (claim.approvals >= CLAIM_APPROVAL_THRESHOLD) {
            _processClaim(claimId);
        }
    }
    
    /**
     * @dev Reject a claim
     */
    function rejectClaim(bytes32 claimId, string calldata reason) external onlyClaimProcessor {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.SUBMITTED, "InsurancePool: claim not in submitted status");
        
        claim.status = ClaimStatus.REJECTED;
        claim.processedAt = block.timestamp;
        
        emit ClaimRejected(claimId, reason);
        emit InsuranceClaimProcessed(claimId, false, 0);
    }
    
    /**
     * @dev Process an approved claim (internal)
     */
    function _processClaim(bytes32 claimId) internal {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.SUBMITTED, "InsurancePool: claim not in submitted status");
        
        uint256 availableBalance = groupPoolBalances[claim.groupId];
        require(availableBalance >= claim.amount, "InsurancePool: insufficient pool balance");
        
        claim.status = ClaimStatus.APPROVED;
        claim.processedAt = block.timestamp;
        
        // Execute payout
        _executePayout(claimId);
    }
    
    /**
     * @dev Execute payout for approved claim
     */
    function _executePayout(bytes32 claimId) internal {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.APPROVED, "InsurancePool: claim not approved");
        
        groupPoolBalances[claim.groupId] -= claim.amount;
        totalPoolBalance -= claim.amount;
        totalClaims += claim.amount;
        
        claim.status = ClaimStatus.PAID;
        
        usdt.safeTransfer(claim.claimant, claim.amount);
        
        emit ClaimPaid(claimId, claim.claimant, claim.amount);
        emit InsuranceClaimProcessed(claimId, true, claim.amount);
    }
    
    /**
     * @dev Set reserve ratio
     */
    function setReserveRatio(uint256 newRatio) external onlyAdmin {
        require(newRatio >= minReserveRatio && newRatio <= maxReserveRatio, "InsurancePool: invalid reserve ratio");
        uint256 oldRatio = reserveRatio;
        reserveRatio = newRatio;
        emit ReserveRatioUpdated(oldRatio, newRatio);
    }
    
    /**
     * @dev Get claim information
     */
    function getClaim(bytes32 claimId) external view returns (
        address claimant,
        uint256 amount,
        uint256 groupId,
        string memory evidenceCID,
        ClaimStatus status,
        uint256 submittedAt,
        uint256 processedAt
    ) {
        Claim storage claim = claims[claimId];
        return (
            claim.claimant,
            claim.amount,
            claim.groupId,
            claim.evidenceCID,
            claim.status,
            claim.submittedAt,
            claim.processedAt
        );
    }
    
    /**
     * @dev Get group claims
     */
    function getGroupClaims(uint256 groupId) external view returns (bytes32[] memory) {
        return groupClaims[groupId];
    }
    
    /**
     * @dev Get pool statistics
     */
    function getPoolStats() external view returns (
        uint256 totalBalance,
        uint256 totalRes,
        uint256 totalClaimsAmount,
        uint256 totalPrems
    ) {
        return (totalPoolBalance, totalReserves, totalClaims, totalPremiums);
    }
    
    /**
     * @dev Check if member can submit claim (internal)
     */
    function _canMemberClaim(uint256 groupId, address member) internal view returns (bool) {
        return block.timestamp >= lastClaimTime[groupId][member] + groupClaimCooldown[groupId];
    }
    
    /**
     * @dev Check if member can submit claim (external)
     */
    function canMemberClaim(uint256 groupId, address member) external view returns (bool) {
        return _canMemberClaim(groupId, member);
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
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
}