// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IThriftModel.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematGroup
 * @dev Main contract for managing individual thrift groups
 */
contract HematGroup is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Events
    event MemberJoined(address indexed member, uint256 stakeAmount);
    event MemberLeft(address indexed member);
    event ContributionMade(address indexed member, uint256 amount);
    event PayoutClaimed(address indexed member, uint256 amount);
    event CycleCompleted(uint256 cycleNumber);
    event DefaultEnforced(address indexed member, uint256 penaltyAmount);
    event YieldDistributed(uint256 amount);
    

    
    enum GroupStatus {
        ACTIVE,
        PAUSED,
        COMPLETED,
        CANCELLED
    }
    
    // State variables
    IERC20 public immutable usdt;
    EscrowVault public escrowVault;
    StakeManager public stakeManager;
    InsurancePool public insurancePool;
    address public creator;
    
    // Group configuration
    IThriftModel.ThriftModel public model;
    uint256 public contributionAmount;
    uint256 public cycleInterval;
    uint256 public groupSize;
    address[] public payoutOrder;
    bool public insuranceEnabled;
    uint256 public stakeRequired;
    uint256 public lockDuration;
    uint256 public earlyWithdrawalPenaltyBps;
    
    // Group state
    GroupStatus public status;
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberIndex;
    mapping(address => uint256) public lastContribution;
    mapping(address => bool) public hasReceivedPayout;
    
    // Cycle tracking
    uint256 public currentCycle;
    uint256 public cycleStartTime;
    uint256 public nextPayoutTime;
    uint256 public currentPayoutIndex;
    
    // Fixed savings specific
    uint256 public maturityTime;
    mapping(address => uint256) public memberDeposits;
    mapping(address => bool) public hasWithdrawn;
    
    // Emergency pool specific
    mapping(address => uint256) public emergencyClaims;
    mapping(address => uint256) public claimCapPerMember;
    
    // Configuration
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1% platform fee
    uint256 public constant DEFAULT_GRACE_PERIOD = 2 days;
    uint256 public constant MAX_GROUP_SIZE = 50;
    
    // Modifiers
    modifier onlyMember() {
        require(isMember[msg.sender], "Only members can call this function");
        _;
    }
    
    modifier onlyCreator() {
        require(msg.sender == owner(), "Only creator can call this function");
        _;
    }
    
    modifier groupActive() {
        require(status == GroupStatus.ACTIVE, "Group is not active");
        _;
    }
    
    modifier cycleNotCompleted() {
        require(currentCycle < groupSize, "All cycles completed");
        _;
    }
    

    
    constructor(
        address _factory,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool,
        IThriftModel.ThriftModel _model,
        uint256 _contributionAmount,
        uint256 _cycleInterval,
        uint256 _groupSize,
        address[] memory _payoutOrder,
        bool _insuranceEnabled,
        uint256 _stakeRequired,
        uint256 _lockDuration,
        uint256 _earlyWithdrawalPenaltyBps,
        address _creator
    ) Ownable(_creator) {
        usdt = IERC20(0x0000000000000000000000000000000000000000); // Will be set by factory
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
        
        model = _model;
        contributionAmount = _contributionAmount;
        cycleInterval = _cycleInterval;
        groupSize = _groupSize;
        payoutOrder = _payoutOrder;
        insuranceEnabled = _insuranceEnabled;
        stakeRequired = _stakeRequired;
        lockDuration = _lockDuration;
        earlyWithdrawalPenaltyBps = _earlyWithdrawalPenaltyBps;
        
        status = GroupStatus.ACTIVE;
        currentCycle = 0;
        cycleStartTime = block.timestamp;
        nextPayoutTime = block.timestamp + cycleInterval;
        currentPayoutIndex = 0;
        
        if (model == IThriftModel.ThriftModel.FIXED_SAVINGS) {
            maturityTime = block.timestamp + lockDuration;
        }
        
        // Set creator
        creator = _creator;
    }
    
    /**
     * @dev Join the thrift group
     */
    function joinGroup() external nonReentrant whenNotPaused groupActive {
        require(!isMember[msg.sender], "Already a member");
        require(members.length < groupSize, "Group is full");
        require(usdt.balanceOf(msg.sender) >= contributionAmount, "Insufficient USDT balance");
        
        // Add member
        members.push(msg.sender);
        isMember[msg.sender] = true;
        memberIndex[msg.sender] = members.length - 1;
        
        // Handle stake requirement
        if (stakeRequired > 0) {
            require(usdt.transferFrom(msg.sender, address(this), stakeRequired), "Stake transfer failed");
            stakeManager.depositStake(msg.sender, address(this), stakeRequired);
        }
        
        // Initialize trust score
        stakeManager.initializeTrustScore(msg.sender);
        
        emit MemberJoined(msg.sender, stakeRequired);
    }
    
    /**
     * @dev Make a contribution to the group
     */
    function makeContribution() external nonReentrant whenNotPaused groupActive onlyMember cycleNotCompleted {
        require(block.timestamp >= nextPayoutTime - cycleInterval, "Too early to contribute");
        require(block.timestamp <= nextPayoutTime + DEFAULT_GRACE_PERIOD, "Contribution period ended");
        require(lastContribution[msg.sender] < currentCycle, "Already contributed this cycle");
        require(usdt.balanceOf(msg.sender) >= contributionAmount, "Insufficient USDT balance");
        
        // Transfer contribution
        require(usdt.transferFrom(msg.sender, address(this), contributionAmount), "Contribution transfer failed");
        
        // Calculate fees and insurance
        uint256 platformFee = (contributionAmount * PLATFORM_FEE_BPS) / 10000;
        uint256 insuranceAmount = 0;
        
        if (insuranceEnabled) {
            insuranceAmount = (contributionAmount * 200) / 10000; // 2% insurance
            insurancePool.collectPremium(address(this), msg.sender, contributionAmount);
        }
        
        uint256 netContribution = contributionAmount - platformFee - insuranceAmount;
        
        // Deposit to escrow vault
        escrowVault.deposit(address(this), msg.sender, netContribution);
        
        lastContribution[msg.sender] = currentCycle;
        
        emit ContributionMade(msg.sender, contributionAmount);
        
        // Check if all members have contributed
        if (_allMembersContributed()) {
            _completeCycle();
        }
    }
    
    /**
     * @dev Claim payout (for rotational model)
     */
    function claimPayout() external nonReentrant whenNotPaused groupActive onlyMember {
        require(model == IThriftModel.ThriftModel.ROTATIONAL, "Only for rotational model");
        require(currentPayoutIndex < payoutOrder.length, "No more payouts");
        require(payoutOrder[currentPayoutIndex] == msg.sender, "Not your turn");
        require(!hasReceivedPayout[msg.sender], "Already received payout");
        
        uint256 payoutAmount = _calculatePayoutAmount();
        escrowVault.withdraw(address(this), msg.sender, payoutAmount);
        
        hasReceivedPayout[msg.sender] = true;
        currentPayoutIndex++;
        
        emit PayoutClaimed(msg.sender, payoutAmount);
    }
    
    /**
     * @dev Withdraw from fixed savings (for fixed savings model)
     */
    function withdrawFixedSavings() external nonReentrant whenNotPaused groupActive onlyMember {
        require(model == IThriftModel.ThriftModel.FIXED_SAVINGS, "Only for fixed savings model");
        require(block.timestamp >= maturityTime, "Lock period not ended");
        require(!hasWithdrawn[msg.sender], "Already withdrawn");
        
        uint256 memberShare = _calculateMemberShare(msg.sender);
        escrowVault.withdraw(address(this), msg.sender, memberShare);
        
        hasWithdrawn[msg.sender] = true;
        
        emit PayoutClaimed(msg.sender, memberShare);
    }
    
    /**
     * @dev Early withdrawal from fixed savings (with penalty)
     */
    function earlyWithdraw() external nonReentrant whenNotPaused groupActive onlyMember {
        require(model == IThriftModel.ThriftModel.FIXED_SAVINGS, "Only for fixed savings model");
        require(block.timestamp < maturityTime, "Lock period ended");
        require(!hasWithdrawn[msg.sender], "Already withdrawn");
        
        uint256 memberShare = _calculateMemberShare(msg.sender);
        uint256 penalty = (memberShare * earlyWithdrawalPenaltyBps) / 10000;
        uint256 netAmount = memberShare - penalty;
        
        escrowVault.withdraw(address(this), msg.sender, netAmount);
        
        // Transfer penalty to insurance pool
        if (penalty > 0) {
            require(usdt.transfer(address(insurancePool), penalty), "Penalty transfer failed");
        }
        
        hasWithdrawn[msg.sender] = true;
        
        emit PayoutClaimed(msg.sender, netAmount);
    }
    
    /**
     * @dev Submit emergency claim (for emergency model)
     */
    function submitEmergencyClaim(uint256 amount, string memory evidenceCID) external nonReentrant whenNotPaused groupActive onlyMember {
        require(model == IThriftModel.ThriftModel.EMERGENCY, "Only for emergency model");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= claimCapPerMember[msg.sender], "Amount exceeds claim cap");
        require(emergencyClaims[msg.sender] + amount <= claimCapPerMember[msg.sender], "Would exceed claim cap");
        
        insurancePool.submitClaim(address(this), amount, evidenceCID);
        emergencyClaims[msg.sender] += amount;
    }
    
    /**
     * @dev Enforce missed payment penalty
     */
    function enforceMissedPayment(address member) external onlyCreator {
        require(isMember[member], "Not a member");
        require(lastContribution[member] < currentCycle, "Member has contributed");
        require(block.timestamp > nextPayoutTime + DEFAULT_GRACE_PERIOD, "Grace period not ended");
        
        uint256 penaltyAmount = stakeRequired > 0 ? stakeRequired : contributionAmount;
        
        if (stakeRequired > 0) {
            stakeManager.penalizeStake(member, address(this), penaltyAmount, "Missed payment");
        }
        
        emit DefaultEnforced(member, penaltyAmount);
    }
    
    /**
     * @dev Complete current cycle
     */
    function _completeCycle() internal {
        currentCycle++;
        
        if (model == IThriftModel.ThriftModel.ROTATIONAL) {
            if (currentPayoutIndex < payoutOrder.length) {
                nextPayoutTime = block.timestamp + cycleInterval;
            }
        }
        
        // Distribute yield if available
        _distributeYield();
        
        emit CycleCompleted(currentCycle);
        
        // Check if group is completed
        if (currentCycle >= groupSize) {
            status = GroupStatus.COMPLETED;
        }
    }
    
    /**
     * @dev Distribute yield to members
     */
    function _distributeYield() internal {
        uint256 yieldAmount = escrowVault.getGroupTotalBalance(address(this)) - 
                             escrowVault.getGroupAvailableBalance(address(this));
        
        if (yieldAmount > 0) {
            escrowVault.distributeYield(address(this), yieldAmount);
            emit YieldDistributed(yieldAmount);
        }
    }
    
    /**
     * @dev Calculate payout amount for current cycle
     */
    function _calculatePayoutAmount() internal view returns (uint256) {
        uint256 groupBalance = escrowVault.getGroupAvailableBalance(address(this));
        uint256 platformFee = (groupBalance * PLATFORM_FEE_BPS) / 10000;
        return groupBalance - platformFee;
    }
    
    /**
     * @dev Calculate member share for fixed savings
     */
    function _calculateMemberShare(address member) internal view returns (uint256) {
        uint256 totalDeposits = 0;
        for (uint256 i = 0; i < members.length; i++) {
            totalDeposits += memberDeposits[members[i]];
        }
        
        if (totalDeposits == 0) return 0;
        
        uint256 groupBalance = escrowVault.getGroupTotalBalance(address(this));
        return (groupBalance * memberDeposits[member]) / totalDeposits;
    }
    
    /**
     * @dev Check if all members have contributed
     */
    function _allMembersContributed() internal view returns (bool) {
        for (uint256 i = 0; i < members.length; i++) {
            if (lastContribution[members[i]] < currentCycle) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Get group information
     */
    function getGroupInfo() external view returns (
        IThriftModel.ThriftModel _model,
        uint256 _contributionAmount,
        uint256 _cycleInterval,
        uint256 _groupSize,
        bool _insuranceEnabled,
        uint256 _stakeRequired,
        GroupStatus _status,
        uint256 _currentCycle,
        uint256 _nextPayoutTime,
        uint256 _memberCount
    ) {
        return (
            model,
            contributionAmount,
            cycleInterval,
            groupSize,
            insuranceEnabled,
            stakeRequired,
            status,
            currentCycle,
            nextPayoutTime,
            members.length
        );
    }
    
    /**
     * @dev Get member information
     */
    function getMemberInfo(address member) external view returns (
        bool _isMember,
        uint256 _lastContribution,
        bool _hasReceivedPayout,
        uint256 _stake,
        uint256 _trustScore
    ) {
        return (
            isMember[member],
            lastContribution[member],
            hasReceivedPayout[member],
            stakeManager.getMemberStake(member, address(this)),
            stakeManager.getTrustScore(member)
        );
    }
    
    /**
     * @dev Get all members
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }
    
    /**
     * @dev Pause group (only creator)
     */
    function pause() external onlyCreator {
        _pause();
    }
    
    /**
     * @dev Unpause group (only creator)
     */
    function unpause() external onlyCreator {
        _unpause();
    }
    
    /**
     * @dev Cancel group (only creator)
     */
    function cancelGroup() external onlyCreator {
        require(status == GroupStatus.ACTIVE, "Group is not active");
        status = GroupStatus.CANCELLED;
    }
}