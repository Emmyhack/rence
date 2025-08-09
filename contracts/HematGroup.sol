// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

<<<<<<< HEAD
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IThriftModel.sol";
=======
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IHematTypes.sol";
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematGroup
<<<<<<< HEAD
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
=======
 * @dev Core thrift group contract implementing rotational, fixed savings, and emergency liquidity models
 */
contract HematGroup is ReentrancyGuard, Pausable, AccessControl, IHematTypes {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    
    // Group configuration
    uint256 public immutable groupId;
    GroupConfig public config;
    GroupStatus public status;
    
    // Core contracts
    IERC20 public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    
    // Group state
    address public creator;
    address[] public members;
    mapping(address => Member) public memberInfo;
    mapping(address => bool) public isMember;
    
    // Cycle management
    uint256 public currentCycle;
    uint256 public cycleStartTime;
    uint256 public nextPayoutMember; // Index for rotational model
    address[] public payoutOrder;
    mapping(uint256 => mapping(address => Contribution)) public contributions;
    mapping(uint256 => Payout) public payouts;
    
    // Fixed savings specific
    uint256 public maturityTime;
    mapping(address => bool) public hasWithdrawn;
    
    // Emergency liquidity specific
    mapping(address => uint256) public emergencyClaimCount;
    
    // Timing and defaults
    mapping(address => uint256) public lastPaymentTime;
    uint256 public constant DEFAULT_GRACE_PERIOD = 2 days;
    
    // Events
    event MemberJoined(address indexed member, uint256 stakeAmount);
    event ContributionMade(address indexed member, uint256 amount, uint256 cycle);
    event PayoutExecuted(address indexed recipient, uint256 amount, uint256 cycle);
    event CycleAdvanced(uint256 newCycle, uint256 timestamp);
    event GroupCompleted();
    event DefaultHandled(address indexed member, uint256 penaltyAmount);
    event EarlyWithdrawal(address indexed member, uint256 amount, uint256 penalty);
    
    modifier onlyCreator() {
        require(hasRole(CREATOR_ROLE, msg.sender), "HematGroup: caller is not creator");
        _;
    }
    
    modifier onlyMember() {
        require(isMember[msg.sender], "HematGroup: caller is not a member");
        _;
    }
    
    modifier onlyActiveGroup() {
        require(status == GroupStatus.ACTIVE, "HematGroup: group not active");
        _;
    }
    
    modifier validMember(address member) {
        require(member != address(0), "HematGroup: invalid member address");
        require(stakeManager.canMemberJoin(groupId, member), "HematGroup: member cannot join");
        _;
    }
    
    constructor(
        uint256 _groupId,
        GroupConfig memory _config,
        address _creator,
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool,
        address _admin
    ) {
        groupId = _groupId;
        config = _config;
        creator = _creator;
        status = GroupStatus.CREATED;
        
        usdtToken = IERC20(_usdtToken);
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
        
<<<<<<< HEAD
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
=======
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(CREATOR_ROLE, _creator);
        
        // Set maturity time for fixed savings
        if (_config.model == ThriftModel.FIXED_SAVINGS) {
            maturityTime = block.timestamp + _config.lockDuration;
        }
        
        currentCycle = 1;
        cycleStartTime = block.timestamp;
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    }
    
    /**
     * @dev Join the thrift group
     */
<<<<<<< HEAD
    function joinGroup() external nonReentrant whenNotPaused groupActive {
        require(!isMember[msg.sender], "Already a member");
        require(members.length < groupSize, "Group is full");
        require(usdt.balanceOf(msg.sender) >= contributionAmount, "Insufficient USDT balance");
=======
    function joinGroup() external nonReentrant whenNotPaused validMember(msg.sender) {
        require(status == GroupStatus.CREATED, "HematGroup: group not accepting members");
        require(members.length < config.groupSize, "HematGroup: group full");
        require(!isMember[msg.sender], "HematGroup: already a member");
        
        // Handle stake requirement
        if (config.stakeRequired > 0) {
            stakeManager.depositStake(groupId, msg.sender, config.stakeRequired);
        }
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
        
        // Add member
        members.push(msg.sender);
        isMember[msg.sender] = true;
<<<<<<< HEAD
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
=======
        
        memberInfo[msg.sender] = Member({
            memberAddress: msg.sender,
            stakeAmount: config.stakeRequired,
            totalContributed: 0,
            totalReceived: 0,
            trustScore: stakeManager.getMemberTrustScore(groupId, msg.sender),
            joinedAt: block.timestamp,
            isActive: true
        });
        
        emit MemberJoined(msg.sender, config.stakeRequired);
        emit MemberJoined(groupId, msg.sender, config.stakeRequired);
        
        // Activate group if full
        if (members.length == config.groupSize) {
            status = GroupStatus.ACTIVE;
            _initializePayoutOrder();
        }
    }
    
    /**
     * @dev Make a contribution for the current cycle
     */
    function makeContribution() external onlyMember onlyActiveGroup nonReentrant whenNotPaused {
        require(_canMakeContribution(msg.sender), "HematGroup: contribution not allowed");
        
        uint256 contributionAmount = config.contributionAmount;
        uint256 insuranceAmount = 0;
        
        // Calculate insurance premium
        if (config.insuranceEnabled) {
            insuranceAmount = (contributionAmount * config.insuranceBps) / 10000;
            
            // Transfer insurance premium
            usdtToken.safeTransferFrom(msg.sender, address(insurancePool), insuranceAmount);
            insurancePool.depositPremium(groupId, msg.sender, insuranceAmount);
        }
        
        uint256 netContribution = contributionAmount - insuranceAmount;
        
        // Transfer net contribution to escrow
        escrowVault.deposit(groupId, msg.sender, netContribution);
        
        // Record contribution
        contributions[currentCycle][msg.sender] = Contribution({
            member: msg.sender,
            amount: contributionAmount,
            cycleNumber: currentCycle,
            timestamp: block.timestamp,
            status: PaymentStatus.PAID
        });
        
        // Update member info
        memberInfo[msg.sender].totalContributed += contributionAmount;
        lastPaymentTime[msg.sender] = block.timestamp;
        
        // Update trust score
        stakeManager.recordSuccessfulPayment(groupId, msg.sender);
        
        emit ContributionMade(msg.sender, contributionAmount, currentCycle);
        emit ContributionMade(groupId, msg.sender, contributionAmount, currentCycle);
        
        // Check if cycle is complete and execute payout
        if (_isCycleComplete()) {
            _executeCyclePayout();
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
        }
    }
    
    /**
<<<<<<< HEAD
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
=======
     * @dev Execute payout for the current cycle
     */
    function _executeCyclePayout() internal {
        if (config.model == ThriftModel.ROTATIONAL) {
            _executeRotationalPayout();
        } else if (config.model == ThriftModel.FIXED_SAVINGS) {
            // No payouts until maturity
            _advanceCycle();
        } else if (config.model == ThriftModel.EMERGENCY_LIQUIDITY) {
            // Emergency payouts are claim-based, just advance cycle
            _advanceCycle();
        }
    }
    
    /**
     * @dev Execute rotational payout
     */
    function _executeRotationalPayout() internal {
        require(nextPayoutMember < payoutOrder.length, "HematGroup: all payouts completed");
        
        address recipient = payoutOrder[nextPayoutMember];
        uint256 totalPot = config.contributionAmount * members.length;
        
        // Execute payout through escrow
        escrowVault.executePayout(groupId, recipient, totalPot);
        
        // Record payout
        payouts[currentCycle] = Payout({
            recipient: recipient,
            amount: totalPot,
            cycleNumber: currentCycle,
            timestamp: block.timestamp,
            executed: true
        });
        
        memberInfo[recipient].totalReceived += totalPot;
        nextPayoutMember++;
        
        emit PayoutExecuted(recipient, totalPot, currentCycle);
        emit PayoutExecuted(groupId, recipient, totalPot, currentCycle);
        
        // Check if group is complete
        if (nextPayoutMember >= members.length) {
            _completeGroup();
        } else {
            _advanceCycle();
        }
    }
    
    /**
     * @dev Advance to next cycle
     */
    function _advanceCycle() internal {
        currentCycle++;
        cycleStartTime = block.timestamp;
        
        emit CycleAdvanced(currentCycle, block.timestamp);
    }
    
    /**
     * @dev Withdraw from fixed savings pool (after maturity)
     */
    function withdrawFixedSavings() external onlyMember nonReentrant {
        require(config.model == ThriftModel.FIXED_SAVINGS, "HematGroup: not fixed savings");
        require(block.timestamp >= maturityTime, "HematGroup: not yet matured");
        require(!hasWithdrawn[msg.sender], "HematGroup: already withdrawn");
        
        hasWithdrawn[msg.sender] = true;
        
        // Calculate member's share including yield
        uint256 memberContributions = memberInfo[msg.sender].totalContributed;
        uint256 yieldShare = _calculateYieldShare(msg.sender);
        uint256 totalWithdrawal = memberContributions + yieldShare;
        
        if (totalWithdrawal > 0) {
            escrowVault.executePayout(groupId, msg.sender, totalWithdrawal);
            memberInfo[msg.sender].totalReceived += totalWithdrawal;
        }
        
        // Return stake
        if (config.stakeRequired > 0) {
            stakeManager.withdrawStake(groupId, msg.sender);
        }
        
        // Check if all members have withdrawn
        bool allWithdrawn = true;
        for (uint256 i = 0; i < members.length; i++) {
            if (!hasWithdrawn[members[i]]) {
                allWithdrawn = false;
                break;
            }
        }
        
        if (allWithdrawn) {
            _completeGroup();
        }
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    }
    
    /**
     * @dev Early withdrawal from fixed savings (with penalty)
     */
<<<<<<< HEAD
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
=======
    function earlyWithdraw() external onlyMember nonReentrant {
        require(config.model == ThriftModel.FIXED_SAVINGS, "HematGroup: not fixed savings");
        require(block.timestamp < maturityTime, "HematGroup: already matured");
        require(!hasWithdrawn[msg.sender], "HematGroup: already withdrawn");
        
        hasWithdrawn[msg.sender] = true;
        
        uint256 memberContributions = memberInfo[msg.sender].totalContributed;
        uint256 penalty = (memberContributions * config.earlyWithdrawalPenaltyBps) / 10000;
        uint256 netWithdrawal = memberContributions - penalty;
        
        if (netWithdrawal > 0) {
            escrowVault.executePayout(groupId, msg.sender, netWithdrawal);
            memberInfo[msg.sender].totalReceived += netWithdrawal;
        }
        
        // Penalty goes to insurance pool
        if (penalty > 0) {
            insurancePool.depositPremium(groupId, msg.sender, penalty);
        }
        
        emit EarlyWithdrawal(msg.sender, netWithdrawal, penalty);
    }
    
    /**
     * @dev Handle missed payment (called by external scheduler)
     */
    function enforceMissedPayment(address member) external {
        require(isMember[member], "HematGroup: not a member");
        require(_isPaymentOverdue(member), "HematGroup: payment not overdue");
        
        uint256 missedAmount = config.contributionAmount;
        
        // Try to slash stake first
        uint256 slashedAmount = stakeManager.slashStake(groupId, member, missedAmount);
        uint256 shortfall = missedAmount - slashedAmount;
        
        // Cover shortfall with insurance if needed
        if (shortfall > 0 && config.insuranceEnabled) {
            // This would typically be handled by insurance pool logic
            // For simplicity, we mark as covered by insurance
            contributions[currentCycle][member] = Contribution({
                member: member,
                amount: missedAmount,
                cycleNumber: currentCycle,
                timestamp: block.timestamp,
                status: PaymentStatus.COVERED_BY_INSURANCE
            });
        } else {
            contributions[currentCycle][member] = Contribution({
                member: member,
                amount: missedAmount,
                cycleNumber: currentCycle,
                timestamp: block.timestamp,
                status: PaymentStatus.DEFAULTED
            });
        }
        
        emit DefaultHandled(member, slashedAmount);
        emit DefaultHandled(groupId, member, slashedAmount);
    }
    
    /**
     * @dev Complete the group
     */
    function _completeGroup() internal {
        status = GroupStatus.COMPLETED;
        
        // Return remaining stakes for rotational and emergency models
        if (config.model != ThriftModel.FIXED_SAVINGS) {
            for (uint256 i = 0; i < members.length; i++) {
                address member = members[i];
                if (config.stakeRequired > 0 && memberInfo[member].isActive) {
                    stakeManager.withdrawStake(groupId, member);
                }
            }
        }
        
        emit GroupCompleted();
    }
    
    /**
     * @dev Initialize payout order for rotational model
     */
    function _initializePayoutOrder() internal {
        require(config.model == ThriftModel.ROTATIONAL, "HematGroup: not rotational model");
        
        // For simplicity, use member join order. In production, this could be randomized
        for (uint256 i = 0; i < members.length; i++) {
            payoutOrder.push(members[i]);
        }
    }
    
    /**
     * @dev Set custom payout order (creator only, before group starts)
     */
    function setPayoutOrder(address[] calldata _payoutOrder) external onlyCreator {
        require(status == GroupStatus.CREATED, "HematGroup: group already started");
        require(_payoutOrder.length == members.length, "HematGroup: invalid order length");
        
        // Verify all members are included
        for (uint256 i = 0; i < _payoutOrder.length; i++) {
            require(isMember[_payoutOrder[i]], "HematGroup: invalid member in order");
        }
        
        delete payoutOrder;
        for (uint256 i = 0; i < _payoutOrder.length; i++) {
            payoutOrder.push(_payoutOrder[i]);
        }
    }
    
    /**
     * @dev Calculate yield share for fixed savings member
     */
    function _calculateYieldShare(address member) internal view returns (uint256) {
        uint256 memberContributions = memberInfo[member].totalContributed;
        uint256 totalContributions = _getTotalContributions();
        
        if (totalContributions == 0) return 0;
        
        // Get yield from escrow vault
        IHematTypes.YieldInfo memory yieldInfo = escrowVault.getYieldInfo(groupId);
        uint256 totalYield = escrowVault.yieldReserve(groupId);
        
        return (totalYield * memberContributions) / totalContributions;
    }
    
    /**
     * @dev Check if member can make contribution
     */
    function _canMakeContribution(address member) internal view returns (bool) {
        // Check if already contributed this cycle
        return contributions[currentCycle][member].timestamp == 0;
    }
    
    /**
     * @dev Check if current cycle is complete
     */
    function _isCycleComplete() internal view returns (bool) {
        for (uint256 i = 0; i < members.length; i++) {
            if (contributions[currentCycle][members[i]].timestamp == 0) {
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
                return false;
            }
        }
        return true;
    }
    
    /**
<<<<<<< HEAD
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
=======
     * @dev Check if payment is overdue
     */
    function _isPaymentOverdue(address member) internal view returns (bool) {
        uint256 deadline = cycleStartTime + config.cycleInterval + config.gracePeriod;
        return block.timestamp > deadline && contributions[currentCycle][member].timestamp == 0;
    }
    
    /**
     * @dev Get total contributions across all cycles
     */
    function _getTotalContributions() internal view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < members.length; i++) {
            total += memberInfo[members[i]].totalContributed;
        }
        return total;
    }
    
    // Admin functions
    function pauseGroup() external onlyCreator {
        _pause();
    }
    
    function unpauseGroup() external onlyCreator {
        _unpause();
    }
    
    // View functions
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    function getMembers() external view returns (address[] memory) {
        return members;
    }
    
<<<<<<< HEAD
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
=======
    function getMemberInfo(address member) external view returns (Member memory) {
        return memberInfo[member];
    }
    
    function getContribution(uint256 cycle, address member) external view returns (Contribution memory) {
        return contributions[cycle][member];
    }
    
    function getPayout(uint256 cycle) external view returns (Payout memory) {
        return payouts[cycle];
    }
    
    function getPayoutOrder() external view returns (address[] memory) {
        return payoutOrder;
    }
    
    function getGroupStatus() external view returns (
        GroupStatus groupStatus,
        uint256 memberCount,
        uint256 cycle,
        uint256 nextPayout,
        uint256 maturity
    ) {
        return (status, members.length, currentCycle, nextPayoutMember, maturityTime);
    }
    
    function isPaymentDue(address member) external view returns (bool) {
        if (!isMember[member] || status != GroupStatus.ACTIVE) return false;
        
        uint256 deadline = cycleStartTime + config.cycleInterval;
        return block.timestamp >= deadline && contributions[currentCycle][member].timestamp == 0;
    }
    
    function getTimeToNextDeadline() external view returns (uint256) {
        if (status != GroupStatus.ACTIVE) return 0;
        
        uint256 deadline = cycleStartTime + config.cycleInterval;
        return deadline > block.timestamp ? deadline - block.timestamp : 0;
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    }
}