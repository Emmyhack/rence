// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InsurancePool
 * @dev Manages insurance premiums, claims, and payouts
 */
contract InsurancePool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Events
    event PremiumCollected(address indexed group, address indexed member, uint256 amount);
    event ClaimSubmitted(address indexed member, address indexed group, uint256 amount, string evidenceCID);
    event ClaimApproved(address indexed member, address indexed group, uint256 amount);
    event ClaimDenied(address indexed member, address indexed group, uint256 amount, string reason);
    event EmergencyPayout(address indexed member, uint256 amount);
    
    // State variables
    IERC20 public immutable usdt;
    
    // Insurance pool balance
    uint256 public totalPremiums;
    uint256 public totalClaimsPaid;
    uint256 public totalClaimsDenied;
    
    // Claims tracking
    mapping(bytes32 => Claim) public claims;
    mapping(address => uint256) public memberClaims; // member => total claims paid
    mapping(address => uint256) public groupPremiums; // group => total premiums collected
    
    // Configuration
    uint256 public constant INSURANCE_BPS = 200; // 2% of contributions
    uint256 public constant MAX_CLAIM_PER_MEMBER = 1000 * 10**6; // 1000 USDT (assuming 6 decimals)
    uint256 public constant MAX_CLAIM_PER_PERIOD = 10000 * 10**6; // 10000 USDT per period
    uint256 public constant MIN_RESERVE_THRESHOLD = 1000 * 10**6; // 1000 USDT minimum reserve
    uint256 public constant CLAIM_APPROVAL_THRESHOLD = 2; // Number of approvals needed
    
    // Claim structure
    struct Claim {
        address member;
        address group;
        uint256 amount;
        string evidenceCID;
        uint256 timestamp;
        ClaimStatus status;
        uint256 approvals;
        mapping(address => bool) approvedBy;
    }
    
    enum ClaimStatus {
        PENDING,
        APPROVED,
        DENIED,
        PAID
    }
    
    // Modifiers
    modifier onlyGroup() {
        require(isGroup(msg.sender), "Only groups can call this function");
        _;
    }
    
    modifier onlyApprover() {
        require(isApprover(msg.sender), "Only approvers can call this function");
        _;
    }
    
    modifier validClaim(bytes32 claimId) {
        require(claims[claimId].timestamp > 0, "Claim does not exist");
        _;
    }
    
    constructor(address _usdt) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
    }
    
    /**
     * @dev Collect insurance premium from contribution
     */
    function collectPremium(address group, address member, uint256 contributionAmount) external onlyGroup nonReentrant whenNotPaused {
        uint256 premiumAmount = (contributionAmount * INSURANCE_BPS) / 10000;
        require(premiumAmount > 0, "Premium amount must be greater than 0");
        require(usdt.transferFrom(msg.sender, address(this), premiumAmount), "Premium transfer failed");
        
        totalPremiums += premiumAmount;
        groupPremiums[group] += premiumAmount;
        
        emit PremiumCollected(group, member, premiumAmount);
    }
    
    /**
     * @dev Submit a claim for insurance payout
     */
    function submitClaim(
        address group,
        uint256 amount,
        string memory evidenceCID
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Claim amount must be greater than 0");
        require(amount <= MAX_CLAIM_PER_MEMBER, "Claim amount exceeds maximum");
        require(bytes(evidenceCID).length > 0, "Evidence CID is required");
        
        // Check if member has sufficient premium history
        require(groupPremiums[group] > 0, "No premium history for this group");
        
        // Check if claim period limit is not exceeded
        require(totalClaimsPaid + amount <= MAX_CLAIM_PER_PERIOD, "Period claim limit exceeded");
        
        bytes32 claimId = keccak256(abi.encodePacked(msg.sender, group, amount, evidenceCID, block.timestamp));
        require(claims[claimId].timestamp == 0, "Claim already exists");
        
        Claim storage claim = claims[claimId];
        claim.member = msg.sender;
        claim.group = group;
        claim.amount = amount;
        claim.evidenceCID = evidenceCID;
        claim.timestamp = block.timestamp;
        claim.status = ClaimStatus.PENDING;
        claim.approvals = 0;
        
        emit ClaimSubmitted(msg.sender, group, amount, evidenceCID);
    }
    
    /**
     * @dev Approve a claim (only approvers)
     */
    function approveClaim(bytes32 claimId) external onlyApprover validClaim(claimId) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Claim is not pending");
        require(!claim.approvedBy[msg.sender], "Already approved by this approver");
        
        claim.approvedBy[msg.sender] = true;
        claim.approvals++;
        
        if (claim.approvals >= CLAIM_APPROVAL_THRESHOLD) {
            _processClaim(claimId);
        }
    }
    
    /**
     * @dev Deny a claim (only approvers)
     */
    function denyClaim(bytes32 claimId, string memory reason) external onlyApprover validClaim(claimId) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Claim is not pending");
        
        claim.status = ClaimStatus.DENIED;
        totalClaimsDenied += claim.amount;
        
        emit ClaimDenied(claim.member, claim.group, claim.amount, reason);
    }
    
    /**
     * @dev Emergency payout for verified emergencies
     */
    function emergencyPayout(address member, uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        require(amount > 0, "Payout amount must be greater than 0");
        require(amount <= MAX_CLAIM_PER_MEMBER, "Payout amount exceeds maximum");
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient insurance pool balance");
        
        require(usdt.transfer(member, amount), "Emergency payout transfer failed");
        
        totalClaimsPaid += amount;
        memberClaims[member] += amount;
        
        emit EmergencyPayout(member, amount);
    }
    
    /**
     * @dev Get claim details
     */
    function getClaim(bytes32 claimId) external view returns (
        address member,
        address group,
        uint256 amount,
        string memory evidenceCID,
        uint256 timestamp,
        ClaimStatus status,
        uint256 approvals
    ) {
        Claim storage claim = claims[claimId];
        return (
            claim.member,
            claim.group,
            claim.amount,
            claim.evidenceCID,
            claim.timestamp,
            claim.status,
            claim.approvals
        );
    }
    
    /**
     * @dev Check if address is approved for a claim
     */
    function isClaimApprovedBy(bytes32 claimId, address approver) external view validClaim(claimId) returns (bool) {
        return claims[claimId].approvedBy[approver];
    }
    
    /**
     * @dev Get insurance pool statistics
     */
    function getPoolStats() external view returns (
        uint256 _totalPremium,
        uint256 _totalClaimsPaid,
        uint256 _totalClaimsDenied,
        uint256 currentBalance,
        uint256 availableForClaims
    ) {
        currentBalance = usdt.balanceOf(address(this));
        availableForClaims = currentBalance > MIN_RESERVE_THRESHOLD ? 
            currentBalance - MIN_RESERVE_THRESHOLD : 0;
        
        return (totalPremiums, totalClaimsPaid, totalClaimsDenied, currentBalance, availableForClaims);
    }
    
    /**
     * @dev Get member's claim history
     */
    function getMemberClaims(address member) external view returns (uint256) {
        return memberClaims[member];
    }
    
    /**
     * @dev Get group's premium history
     */
    function getGroupPremiums(address group) external view returns (uint256) {
        return groupPremiums[group];
    }
    
    /**
     * @dev Pause insurance pool (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause insurance pool (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw all funds (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            require(usdt.transfer(owner(), balance), "Emergency transfer failed");
        }
    }
    
    /**
     * @dev Process approved claim
     */
    function _processClaim(bytes32 claimId) internal {
        Claim storage claim = claims[claimId];
        
        // Check if pool has sufficient funds
        uint256 poolBalance = usdt.balanceOf(address(this));
        require(poolBalance >= claim.amount, "Insufficient insurance pool balance");
        
        // Check reserve threshold
        require(poolBalance - claim.amount >= MIN_RESERVE_THRESHOLD, "Would violate minimum reserve");
        
        claim.status = ClaimStatus.APPROVED;
        
        // Transfer payout
        require(usdt.transfer(claim.member, claim.amount), "Claim payout transfer failed");
        
        totalClaimsPaid += claim.amount;
        memberClaims[claim.member] += claim.amount;
        
        emit ClaimApproved(claim.member, claim.group, claim.amount);
    }
    
    /**
     * @dev Check if address is a registered group
     */
    function isGroup(address group) internal view returns (bool) {
        // This would be implemented with a mapping from factory
        // For now, we'll use a simple check
        return group != address(0);
    }
    
    /**
     * @dev Check if address is an approved claim approver
     */
    function isApprover(address approver) internal view returns (bool) {
        // This would be implemented with a mapping of approved approvers
        // For now, we'll use owner as the only approver
        return approver == owner();
    }
}