// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IThriftModel.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

interface IHematFactory {
    function updateMemberStats(address member, uint256 contributionAmount) external;
    function updateActiveGroupCount(int256 change) external;
}

/**
 * @title HematGroup
 * @dev Main contract for managing individual thrift groups
 */
contract HematGroup is Ownable, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    
    enum GroupStatus { CREATED, ACTIVE, COMPLETED, PAUSED, CANCELLED }
    
    struct Member {
        uint256 totalContributed;
        uint256 totalReceived;
        uint256 joinedAt;
        bool isActive;
        uint256 lastContribution;
        bool hasReceivedPayout;
        bool hasWithdrawn;
    }
    
    struct Contribution {
        uint256 amount;
        uint256 timestamp;
        uint256 cycle;
    }
    
    // Events
    event MemberJoined(address indexed member, uint256 stakeAmount);
    event ContributionMade(address indexed member, uint256 amount, uint256 cycle);
    event PayoutClaimed(address indexed member, uint256 amount);
    event CycleCompleted(uint256 cycle, address indexed recipient, uint256 amount);
    event GroupCompleted();
    event GroupPaused();
    event GroupResumed();
    event GroupCancelled();
    event EarlyWithdrawal(address indexed member, uint256 amount, uint256 penalty);
    
    // State variables
    uint256 public immutable groupId;
    IERC20 public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    address public immutable hematFactory;
    
    // Group configuration
    IThriftModel.ThriftModel public model;
    uint256 public contributionAmount;
    uint256 public cycleInterval;
    uint256 public groupSize;
    uint256 public lockDuration;
    uint256 public gracePeriod;
    uint256 public stakeRequired;
    bool public insuranceEnabled;
    uint256 public insuranceBps;
    uint256 public platformFeeBps;
    uint256 public earlyWithdrawalPenaltyBps;
    
    // Group state
    GroupStatus public status;
    address public creator;
    uint256 public currentCycle;
    uint256 public cycleStartTime;
    uint256 public nextPayoutTime;
    uint256 public currentPayoutIndex;
    uint256 public maturityTime;
    
    // Members
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberIndex;
    mapping(address => Member) public memberInfo;
    
    // Contributions
    mapping(uint256 => mapping(address => Contribution)) public contributions; // cycle => member => contribution
    mapping(uint256 => uint256) public cycleTotalContributions; // cycle => total amount
    mapping(uint256 => address) public cyclePayoutRecipient; // cycle => recipient
    
    // Payout tracking
    mapping(address => uint256) public memberPayouts;
    uint256 public totalPayouts;
    
    modifier onlyCreator() {
        require(hasRole(CREATOR_ROLE, msg.sender), "HematGroup: caller is not creator");
        _;
    }
    
    modifier onlyMember() {
        require(isMember[msg.sender], "HematGroup: caller is not a member");
        _;
    }
    
    modifier groupActive() {
        require(status == GroupStatus.ACTIVE, "HematGroup: group is not active");
        _;
    }
    
    modifier validMember(address member) {
        require(stakeManager.canMemberJoin(groupId, member), "HematGroup: member cannot join");
        _;
    }
    
    constructor(
        uint256 _groupId,
        address _creator,
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool,
        address _hematFactory,
        IThriftModel.ThriftModel _model,
        uint256 _contributionAmount,
        uint256 _cycleInterval,
        uint256 _groupSize,
        uint256 _lockDuration,
        uint256 _gracePeriod,
        uint256 _stakeRequired,
        bool _insuranceEnabled,
        uint256 _insuranceBps,
        uint256 _platformFeeBps,
        uint256 _earlyWithdrawalPenaltyBps,
        address _admin
    ) Ownable(_creator) {
        groupId = _groupId;
        usdtToken = IERC20(_usdtToken);
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
        hematFactory = _hematFactory;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(CREATOR_ROLE, _creator);
        
        model = _model;
        contributionAmount = _contributionAmount;
        cycleInterval = _cycleInterval;
        groupSize = _groupSize;
        lockDuration = _lockDuration;
        gracePeriod = _gracePeriod;
        stakeRequired = _stakeRequired;
        insuranceEnabled = _insuranceEnabled;
        insuranceBps = _insuranceBps;
        platformFeeBps = _platformFeeBps;
        earlyWithdrawalPenaltyBps = _earlyWithdrawalPenaltyBps;
        
        status = GroupStatus.CREATED;
        creator = _creator;
        currentCycle = 1;
        cycleStartTime = block.timestamp;
        
        // Set maturity time for fixed savings
        if (_model == IThriftModel.ThriftModel.FIXED_SAVINGS) {
            maturityTime = block.timestamp + _lockDuration;
        }
    }
    
    /**
     * @dev Join the thrift group
     */
    function joinGroup() external nonReentrant whenNotPaused validMember(msg.sender) {
        require(status == GroupStatus.CREATED, "HematGroup: group not accepting members");
        require(members.length < groupSize, "HematGroup: group full");
        require(!isMember[msg.sender], "HematGroup: already a member");
        
        // Handle stake requirement
        if (stakeRequired > 0) {
            stakeManager.depositStake(groupId, msg.sender, stakeRequired);
        }
        
        // Add member
        members.push(msg.sender);
        isMember[msg.sender] = true;
        memberIndex[msg.sender] = members.length - 1;
        
        memberInfo[msg.sender] = Member({
            totalContributed: 0,
            totalReceived: 0,
            joinedAt: block.timestamp,
            isActive: true,
            lastContribution: 0,
            hasReceivedPayout: false,
            hasWithdrawn: false
        });
        
        emit MemberJoined(msg.sender, stakeRequired);
        
        // Report member stats to factory
        IHematFactory(hematFactory).updateMemberStats(msg.sender, contributionAmount);
        
        // Start group if full
        if (members.length == groupSize) {
            status = GroupStatus.ACTIVE;
            cycleStartTime = block.timestamp;
            nextPayoutTime = block.timestamp + cycleInterval;
            
            // Report group activation to factory
            IHematFactory(hematFactory).updateActiveGroupCount(1);
        }
    }
    
    /**
     * @dev Make contribution to the group
     */
    function contribute() external onlyMember nonReentrant whenNotPaused groupActive {
        require(contributions[currentCycle][msg.sender].timestamp == 0, "HematGroup: already contributed this cycle");
        require(block.timestamp <= cycleStartTime + cycleInterval + gracePeriod, "HematGroup: contribution period ended");
        
        // Handle insurance premium
        uint256 totalAmount = contributionAmount;
        if (insuranceEnabled) {
            uint256 premium = (contributionAmount * insuranceBps) / 10000;
            totalAmount += premium;
            
            // Transfer premium to insurance pool
            usdtToken.safeTransferFrom(msg.sender, address(insurancePool), premium);
            insurancePool.collectPremium(groupId, msg.sender, premium);
        }
        
        // Transfer contribution to escrow vault
        usdtToken.safeTransferFrom(msg.sender, address(this), contributionAmount);
        usdtToken.safeTransfer(address(escrowVault), contributionAmount);
        escrowVault.deposit(groupId, msg.sender, contributionAmount);
        
        // Record contribution
        contributions[currentCycle][msg.sender] = Contribution({
            amount: contributionAmount,
            timestamp: block.timestamp,
            cycle: currentCycle
        });
        
        cycleTotalContributions[currentCycle] += contributionAmount;
        memberInfo[msg.sender].totalContributed += contributionAmount;
        memberInfo[msg.sender].lastContribution = currentCycle;
        
        // Update trust score for timely payment
        stakeManager.updateTrustScoreForPayment(groupId, msg.sender);
        
        // Report contribution to factory for TVL tracking
        IHematFactory(hematFactory).updateMemberStats(msg.sender, contributionAmount);
        
        emit ContributionMade(msg.sender, contributionAmount, currentCycle);
        
        // Check if cycle is complete
        if (_isCycleComplete()) {
            _executeCyclePayout();
        }
    }
    
    /**
     * @dev Execute payout for the current cycle
     */
    function _executeCyclePayout() internal {
        if (model == IThriftModel.ThriftModel.ROTATIONAL) {
            _executeRotationalPayout();
        } else if (model == IThriftModel.ThriftModel.FIXED_SAVINGS) {
            _executeFixedSavingsPayout();
        }
    }
    
    /**
     * @dev Execute rotational payout
     */
    function _executeRotationalPayout() internal {
        require(currentPayoutIndex < members.length, "HematGroup: all members have received payout");
        
        address recipient = members[currentPayoutIndex];
        uint256 payoutAmount = cycleTotalContributions[currentCycle];
        
        // Deduct platform fee
        uint256 platformFee = (payoutAmount * platformFeeBps) / 10000;
        uint256 memberPayout = payoutAmount - platformFee;
        
        // Record payout
        cyclePayoutRecipient[currentCycle] = recipient;
        memberPayouts[recipient] += memberPayout;
        memberInfo[recipient].totalReceived += memberPayout;
        memberInfo[recipient].hasReceivedPayout = true;
        totalPayouts += memberPayout;
        
        // Add pending payout to escrow
        escrowVault.addPendingPayout(groupId, memberPayout);
        
        emit CycleCompleted(currentCycle, recipient, memberPayout);
        
        currentPayoutIndex++;
        
        // Check if group is complete
        if (currentPayoutIndex >= members.length) {
            _completeGroup();
        } else {
            _startNextCycle();
        }
    }
    
    /**
     * @dev Execute fixed savings payout (at maturity)
     */
    function _executeFixedSavingsPayout() internal {
        require(block.timestamp >= maturityTime, "HematGroup: not yet matured");
        
        uint256 totalContributions = 0;
        for (uint256 i = 1; i <= currentCycle; i++) {
            totalContributions += cycleTotalContributions[i];
        }
        
        // Harvest any yield
        escrowVault.harvestYield(groupId);
        
        // Calculate equal distribution
        uint256 memberShare = totalContributions / members.length;
        
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            memberPayouts[member] += memberShare;
            memberInfo[member].totalReceived += memberShare;
            memberInfo[member].hasReceivedPayout = true;
            
            // Add pending payout to escrow
            escrowVault.addPendingPayout(groupId, memberShare);
        }
        
        totalPayouts += totalContributions;
        _completeGroup();
    }
    
    /**
     * @dev Start next cycle
     */
    function _startNextCycle() internal {
        currentCycle++;
        cycleStartTime = block.timestamp;
        nextPayoutTime = block.timestamp + cycleInterval;
    }
    
    /**
     * @dev Complete the group
     */
    function _completeGroup() internal {
        status = GroupStatus.COMPLETED;
        
        // Report group completion to factory (decrease active count)
        IHematFactory(hematFactory).updateActiveGroupCount(-1);
        
        emit GroupCompleted();
    }
    
    /**
     * @dev Claim payout
     */
    function claimPayout() external onlyMember nonReentrant {
        uint256 amount = memberPayouts[msg.sender];
        require(amount > 0, "HematGroup: no payout available");
        
        memberPayouts[msg.sender] = 0;
        escrowVault.processPayout(groupId, msg.sender, amount);
        
        emit PayoutClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Early withdrawal from fixed savings (with penalty)
     */
    function earlyWithdraw() external onlyMember nonReentrant {
        require(model == IThriftModel.ThriftModel.FIXED_SAVINGS, "HematGroup: not fixed savings");
        require(!memberInfo[msg.sender].hasWithdrawn, "HematGroup: already withdrawn");
        require(block.timestamp < maturityTime, "HematGroup: group has matured");
        
        uint256 contributed = memberInfo[msg.sender].totalContributed;
        require(contributed > 0, "HematGroup: no contributions");
        
        // Calculate penalty
        uint256 penalty = (contributed * earlyWithdrawalPenaltyBps) / 10000;
        uint256 withdrawAmount = contributed - penalty;
        
        memberInfo[msg.sender].hasWithdrawn = true;
        memberInfo[msg.sender].isActive = false;
        
        // Transfer penalty to insurance pool
        if (penalty > 0) {
            escrowVault.withdraw(groupId, address(insurancePool), penalty);
        }
        
        // Process withdrawal
        escrowVault.withdraw(groupId, msg.sender, withdrawAmount);
        
        emit EarlyWithdrawal(msg.sender, withdrawAmount, penalty);
    }
    
    /**
     * @dev Check if current cycle is complete
     */
    function _isCycleComplete() internal view returns (bool) {
        for (uint256 i = 0; i < members.length; i++) {
            if (contributions[currentCycle][members[i]].timestamp == 0) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Check if payment is overdue
     */
    function isPaymentOverdue(address member) external view returns (bool) {
        if (!isMember[member] || status != GroupStatus.ACTIVE) {
            return false;
        }
        
        if (contributions[currentCycle][member].timestamp > 0) {
            return false; // Already contributed this cycle
        }
        
        return block.timestamp > cycleStartTime + cycleInterval;
    }
    
    /**
     * @dev Get time remaining in current cycle
     */
    function getTimeRemaining() external view returns (uint256) {
        if (status != GroupStatus.ACTIVE) {
            return 0;
        }
        
        uint256 deadline = cycleStartTime + cycleInterval;
        return deadline > block.timestamp ? deadline - block.timestamp : 0;
    }
    
    /**
     * @dev Get group information
     */
    function getGroupInfo() external view returns (
        IThriftModel.ThriftModel groupModel,
        uint256 contribution,
        uint256 interval,
        uint256 size,
        uint256 currentMembers,
        GroupStatus groupStatus,
        uint256 cycle,
        uint256 payoutIndex
    ) {
        return (
            model,
            contributionAmount,
            cycleInterval,
            groupSize,
            members.length,
            status,
            currentCycle,
            currentPayoutIndex
        );
    }
    
    /**
     * @dev Get member information
     */
    function getMemberInfo(address member) external view returns (Member memory) {
        return memberInfo[member];
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
    function pauseGroup() external onlyCreator {
        require(status == GroupStatus.ACTIVE, "HematGroup: group is not active");
        status = GroupStatus.PAUSED;
        _pause();
        emit GroupPaused();
    }
    
    /**
     * @dev Resume group (only creator)
     */
    function resumeGroup() external onlyCreator {
        require(status == GroupStatus.PAUSED, "HematGroup: group is not paused");
        status = GroupStatus.ACTIVE;
        _unpause();
        emit GroupResumed();
    }
    
    /**
     * @dev Cancel group (only creator)
     */
    function cancelGroup() external onlyCreator {
        require(status == GroupStatus.ACTIVE || status == GroupStatus.PAUSED, "HematGroup: cannot cancel");
        status = GroupStatus.CANCELLED;
        emit GroupCancelled();
    }
}