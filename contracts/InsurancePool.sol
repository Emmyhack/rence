// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IHematTypes.sol";

/**
 * @title InsurancePool
 * @dev Manages insurance premiums, claims processing, and emergency payouts
 */
contract InsurancePool is ReentrancyGuard, Pausable, AccessControl, IHematTypes {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");
    bytes32 public constant CLAIM_PROCESSOR_ROLE = keccak256("CLAIM_PROCESSOR_ROLE");
    
    IERC20 public immutable usdtToken;
    
    // Insurance pool configuration
    uint256 public constant DEFAULT_INSURANCE_BPS = 200; // 2%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_RESERVE_RATIO = 1000; // 10% minimum reserve
    
    // Pool balances
    mapping(uint256 => uint256) public groupInsuranceBalance;
    mapping(uint256 => uint256) public groupTotalPremiums;
    mapping(uint256 => uint256) public groupTotalClaims;
    
    // Claims management
    mapping(uint256 => InsuranceClaim) public claims;
    mapping(uint256 => mapping(address => uint256[])) public memberClaims;
    uint256 public nextClaimId;
    
    // Claim limits and configuration
    mapping(uint256 => uint256) public groupClaimCapPerMember;
    mapping(uint256 => uint256) public groupClaimCooldown;
    mapping(uint256 => mapping(address => uint256)) public lastClaimTime;
    
    // Emergency configurations
    mapping(uint256 => bool) public emergencyModeEnabled;
    mapping(uint256 => uint256) public emergencyClaimCap;
    
    // Global pool stats
    uint256 public totalPoolBalance;
    uint256 public totalClaimsPaid;
    uint256 public reserveFund;
    
    // Events
    event PremiumDeposited(uint256 indexed groupId, address indexed member, uint256 amount);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed groupId, address indexed claimant, uint256 amount);
    event ClaimApproved(uint256 indexed claimId, uint256 payoutAmount);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event ClaimPaid(uint256 indexed claimId, address indexed recipient, uint256 amount);
    event EmergencyModeToggled(uint256 indexed groupId, bool enabled);
    event ReserveFundUpdated(uint256 oldAmount, uint256 newAmount);
    
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
    
    constructor(address _usdtToken, address _admin) {
        require(_usdtToken != address(0), "InsurancePool: invalid USDT token");
        require(_admin != address(0), "InsurancePool: invalid admin");
        
        usdtToken = IERC20(_usdtToken);
        nextClaimId = 1;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(CLAIM_PROCESSOR_ROLE, _admin);
    }
    
    /**
     * @dev Deposit insurance premium for a group
     * @param groupId Group identifier
     * @param member Member address
     * @param amount Premium amount
     */
    function depositPremium(
        uint256 groupId,
        address member,
        uint256 amount
    ) external onlyGroup nonReentrant whenNotPaused {
        require(amount > 0, "InsurancePool: invalid premium amount");
        
        usdtToken.safeTransferFrom(member, address(this), amount);
        
        groupInsuranceBalance[groupId] += amount;
        groupTotalPremiums[groupId] += amount;
        totalPoolBalance += amount;
        
        // Allocate 10% to reserve fund
        uint256 reserveAmount = (amount * MIN_RESERVE_RATIO) / BPS_DENOMINATOR;
        reserveFund += reserveAmount;
        
        emit PremiumDeposited(groupId, member, amount);
    }
    
    /**
     * @dev Submit an insurance claim
     * @param groupId Group identifier
     * @param amount Claim amount
     * @param evidenceCID IPFS hash of supporting evidence
     * @return claimId Generated claim ID
     */
    function submitClaim(
        uint256 groupId,
        uint256 amount,
        string calldata evidenceCID
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(amount > 0, "InsurancePool: invalid claim amount");
        require(bytes(evidenceCID).length > 0, "InsurancePool: evidence required");
        
        // Check claim cooldown
        require(
            block.timestamp >= lastClaimTime[groupId][msg.sender] + groupClaimCooldown[groupId],
            "InsurancePool: claim cooldown active"
        );
        
        // Check claim cap
        uint256 claimCap = groupClaimCapPerMember[groupId];
        if (claimCap > 0) {
            require(amount <= claimCap, "InsurancePool: exceeds claim cap");
        }
        
        // Check emergency mode limits
        if (emergencyModeEnabled[groupId] && emergencyClaimCap[groupId] > 0) {
            require(amount <= emergencyClaimCap[groupId], "InsurancePool: exceeds emergency cap");
        }
        
        uint256 claimId = nextClaimId++;
        
        claims[claimId] = InsuranceClaim({
            claimant: msg.sender,
            amount: amount,
            groupId: groupId,
            evidenceCID: evidenceCID,
            status: ClaimStatus.SUBMITTED,
            submittedAt: block.timestamp,
            processedAt: 0
        });
        
        memberClaims[groupId][msg.sender].push(claimId);
        lastClaimTime[groupId][msg.sender] = block.timestamp;
        
        emit ClaimSubmitted(claimId, groupId, msg.sender, amount);
        emit InsuranceClaimSubmitted(claimId, msg.sender, amount);
        
        return claimId;
    }
    
    /**
     * @dev Process an insurance claim (approve or reject)
     * @param claimId Claim identifier
     * @param approved Whether to approve the claim
     * @param payoutAmount Actual payout amount (can be less than requested)
     * @param reason Reason for rejection (if applicable)
     */
    function processClaim(
        uint256 claimId,
        bool approved,
        uint256 payoutAmount,
        string calldata reason
    ) external onlyClaimProcessor nonReentrant {
        InsuranceClaim storage claim = claims[claimId];
        require(claim.claimant != address(0), "InsurancePool: claim not found");
        require(claim.status == ClaimStatus.SUBMITTED, "InsurancePool: claim already processed");
        
        claim.processedAt = block.timestamp;
        
        if (approved) {
            require(payoutAmount > 0 && payoutAmount <= claim.amount, "InsurancePool: invalid payout amount");
            
            uint256 groupId = claim.groupId;
            require(groupInsuranceBalance[groupId] >= payoutAmount, "InsurancePool: insufficient group balance");
            
            claim.status = ClaimStatus.APPROVED;
            claim.amount = payoutAmount; // Update to actual payout amount
            
            emit ClaimApproved(claimId, payoutAmount);
            emit InsuranceClaimProcessed(claimId, true, payoutAmount);
            
        } else {
            claim.status = ClaimStatus.REJECTED;
            emit ClaimRejected(claimId, reason);
            emit InsuranceClaimProcessed(claimId, false, 0);
        }
    }
    
    /**
     * @dev Execute payout for approved claim
     * @param claimId Claim identifier
     */
    function executeClaimPayout(uint256 claimId) external nonReentrant whenNotPaused {
        InsuranceClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.APPROVED, "InsurancePool: claim not approved");
        
        uint256 groupId = claim.groupId;
        uint256 payoutAmount = claim.amount;
        
        require(groupInsuranceBalance[groupId] >= payoutAmount, "InsurancePool: insufficient balance");
        
        claim.status = ClaimStatus.PAID;
        groupInsuranceBalance[groupId] -= payoutAmount;
        groupTotalClaims[groupId] += payoutAmount;
        totalPoolBalance -= payoutAmount;
        totalClaimsPaid += payoutAmount;
        
        usdtToken.safeTransfer(claim.claimant, payoutAmount);
        
        emit ClaimPaid(claimId, claim.claimant, payoutAmount);
    }
    
    /**
     * @dev Cover shortfall from another group or system
     * @param fromGroupId Source group ID
     * @param toGroupId Target group ID
     * @param amount Amount to cover
     */
    function coverShortfall(
        uint256 fromGroupId,
        uint256 toGroupId,
        uint256 amount
    ) external onlyGroup nonReentrant {
        require(amount > 0, "InsurancePool: invalid amount");
        require(groupInsuranceBalance[fromGroupId] >= amount, "InsurancePool: insufficient source balance");
        
        groupInsuranceBalance[fromGroupId] -= amount;
        groupInsuranceBalance[toGroupId] += amount;
    }
    
    /**
     * @dev Emergency withdrawal from reserve fund
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address recipient,
        uint256 amount
    ) external onlyAdmin nonReentrant {
        require(recipient != address(0), "InsurancePool: invalid recipient");
        require(amount > 0 && amount <= reserveFund, "InsurancePool: invalid amount");
        
        reserveFund -= amount;
        totalPoolBalance -= amount;
        
        usdtToken.safeTransfer(recipient, amount);
    }
    
    /**
     * @dev Set group claim configuration
     * @param groupId Group identifier
     * @param claimCap Maximum claim amount per member
     * @param cooldown Cooldown period between claims
     */
    function setGroupClaimConfig(
        uint256 groupId,
        uint256 claimCap,
        uint256 cooldown
    ) external onlyAdmin {
        groupClaimCapPerMember[groupId] = claimCap;
        groupClaimCooldown[groupId] = cooldown;
    }
    
    /**
     * @dev Toggle emergency mode for a group
     * @param groupId Group identifier
     * @param enabled Whether to enable emergency mode
     * @param emergencyCap Emergency claim cap
     */
    function setEmergencyMode(
        uint256 groupId,
        bool enabled,
        uint256 emergencyCap
    ) external onlyAdmin {
        emergencyModeEnabled[groupId] = enabled;
        emergencyClaimCap[groupId] = emergencyCap;
        
        emit EmergencyModeToggled(groupId, enabled);
    }
    
    /**
     * @dev Add to reserve fund
     * @param amount Amount to add
     */
    function addToReserveFund(uint256 amount) external onlyAdmin {
        require(amount > 0, "InsurancePool: invalid amount");
        
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 oldReserve = reserveFund;
        reserveFund += amount;
        totalPoolBalance += amount;
        
        emit ReserveFundUpdated(oldReserve, reserveFund);
    }
    
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    // View functions
    function getGroupInsuranceBalance(uint256 groupId) external view returns (uint256) {
        return groupInsuranceBalance[groupId];
    }
    
    function getClaim(uint256 claimId) external view returns (InsuranceClaim memory) {
        return claims[claimId];
    }
    
    function getMemberClaims(uint256 groupId, address member) external view returns (uint256[] memory) {
        return memberClaims[groupId][member];
    }
    
    function getGroupStats(uint256 groupId) external view returns (
        uint256 balance,
        uint256 totalPremiums,
        uint256 totalClaims,
        bool emergencyMode
    ) {
        return (
            groupInsuranceBalance[groupId],
            groupTotalPremiums[groupId],
            groupTotalClaims[groupId],
            emergencyModeEnabled[groupId]
        );
    }
    
    function getPoolHealth() external view returns (
        uint256 totalBalance,
        uint256 reserve,
        uint256 utilizationRate
    ) {
        uint256 utilization = totalPoolBalance > 0 ? 
            (totalClaimsPaid * BPS_DENOMINATOR) / totalPoolBalance : 0;
            
        return (totalPoolBalance, reserveFund, utilization);
    }
    
    function canMemberClaim(uint256 groupId, address member) external view returns (bool) {
        return block.timestamp >= lastClaimTime[groupId][member] + groupClaimCooldown[groupId];
    }
}