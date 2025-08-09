// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

<<<<<<< HEAD
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IThriftModel.sol";
=======
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IHematTypes.sol";
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
import "./HematGroup.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematFactory
 * @dev Factory contract for creating and managing Hemat thrift groups
 */
<<<<<<< HEAD
contract HematFactory is Ownable, ReentrancyGuard, Pausable {
    
    // Events
    event GroupCreated(
        address indexed creator,
        address indexed groupAddress,
        uint256 groupId,
        uint256 model,
        uint256 contributionAmount,
        uint256 cycleInterval,
        uint256 groupSize
    );
    
    event GroupPaused(address indexed groupAddress, address indexed pauser);
    event GroupUnpaused(address indexed groupAddress, address indexed unpauser);
    

    
    // State variables
    uint256 public nextGroupId = 1;
    mapping(uint256 => address) public groups;
    mapping(address => uint256[]) public creatorGroups;
    mapping(uint256 => uint256) public modelGroupCount;
    
    // Configuration
    uint256 public maxGroupsPerCreator = 10;
    uint256 public maxGroupsPerModel = 1000;
    uint256 public groupCreationFee = 0.01 ether; // Can be changed by admin
    
    // Contract addresses
    EscrowVault public escrowVault;
    StakeManager public stakeManager;
    InsurancePool public insurancePool;
    
    // Modifiers
    modifier validModel(IThriftModel.ThriftModel model) {
        require(model <= IThriftModel.ThriftModel.EMERGENCY, "Invalid thrift model");
        _;
    }
    
    modifier validGroupSize(uint256 size) {
        require(size >= 2 && size <= 50, "Group size must be between 2 and 50");
        _;
    }
    
    modifier validContributionAmount(uint256 amount) {
        require(amount > 0, "Contribution amount must be greater than 0");
        _;
    }
    
    modifier validCycleInterval(uint256 interval) {
        require(interval >= 1 days && interval <= 365 days, "Cycle interval must be between 1 day and 1 year");
=======
contract HematFactory is ReentrancyGuard, Pausable, AccessControlEnumerable, IHematTypes {
    using Counters for Counters.Counter;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Core system contracts
    address public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    
    // Group management
    Counters.Counter private _groupIdCounter;
    mapping(uint256 => address) public groups;
    mapping(address => uint256[]) public creatorGroups;
    mapping(address => uint256[]) public memberGroups;
    mapping(ThriftModel => uint256[]) public groupsByModel;
    
    // Platform statistics
    uint256 public totalGroupsCreated;
    uint256 public totalActiveGroups;
    mapping(ThriftModel => uint256) public groupCountByModel;
    
    // Platform configuration
    uint256 public maxGroupsPerCreator = 10;
    uint256 public minContributionAmount = 10 * 10**6; // 10 USDT (assuming 6 decimals)
    uint256 public maxContributionAmount = 10000 * 10**6; // 10,000 USDT
    uint256 public minGroupSize = 3;
    uint256 public maxGroupSize = 50;
    uint256 public minCycleInterval = 1 days;
    uint256 public maxCycleInterval = 30 days;
    
    // Events
    event GroupCreated(
        uint256 indexed groupId,
        address indexed creator,
        address groupContract,
        ThriftModel model,
        uint256 contributionAmount,
        uint256 groupSize
    );
    event GroupStatusChanged(uint256 indexed groupId, GroupStatus oldStatus, GroupStatus newStatus);
    event PlatformConfigUpdated(string parameter, uint256 oldValue, uint256 newValue);
    
    modifier validGroupConfig(GroupConfig memory config) {
        require(config.contributionAmount >= minContributionAmount, "HematFactory: contribution too low");
        require(config.contributionAmount <= maxContributionAmount, "HematFactory: contribution too high");
        require(config.groupSize >= minGroupSize, "HematFactory: group too small");
        require(config.groupSize <= maxGroupSize, "HematFactory: group too large");
        require(config.cycleInterval >= minCycleInterval, "HematFactory: cycle too short");
        require(config.cycleInterval <= maxCycleInterval, "HematFactory: cycle too long");
        require(config.gracePeriod <= config.cycleInterval, "HematFactory: grace period too long");
        require(config.platformFeeBps <= 1000, "HematFactory: platform fee too high"); // Max 10%
        require(config.insuranceBps <= 500, "HematFactory: insurance fee too high"); // Max 5%
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
        _;
    }
    
    constructor(
<<<<<<< HEAD
        address _escrowVault,
        address _stakeManager,
        address _insurancePool
    ) Ownable(msg.sender) {
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
    }
    
    /**
     * @dev Creates a new thrift group
     * @param model The thrift model type
     * @param contributionAmount USDT amount for each contribution
     * @param cycleInterval Time between contributions in seconds
     * @param groupSize Maximum number of members
     * @param payoutOrder Array of member addresses in payout order (for rotational)
     * @param insuranceEnabled Whether insurance is enabled
     * @param stakeRequired USDT amount required as stake (0 for no stake)
     * @param lockDuration Duration for fixed savings (0 for other models)
     * @param earlyWithdrawalPenaltyBps Early withdrawal penalty in basis points
     */
    function createGroup(
        IThriftModel.ThriftModel model,
        uint256 contributionAmount,
        uint256 cycleInterval,
        uint256 groupSize,
        address[] memory payoutOrder,
        bool insuranceEnabled,
        uint256 stakeRequired,
        uint256 lockDuration,
        uint256 earlyWithdrawalPenaltyBps
    ) external payable nonReentrant whenNotPaused validModel(model) validGroupSize(groupSize) validContributionAmount(contributionAmount) validCycleInterval(cycleInterval) {
        
        // Check creation limits
        require(creatorGroups[msg.sender].length < maxGroupsPerCreator, "Too many groups per creator");
        require(modelGroupCount[uint256(model)] < maxGroupsPerModel, "Too many groups for this model");
        
        // Check creation fee
        require(msg.value >= groupCreationFee, "Insufficient creation fee");
        
        // Validate payout order for rotational model
        if (model == IThriftModel.ThriftModel.ROTATIONAL) {
            require(payoutOrder.length == groupSize, "Payout order must match group size");
            require(payoutOrder.length > 0, "Payout order cannot be empty");
        }
        
        // Validate lock duration for fixed savings
        if (model == IThriftModel.ThriftModel.FIXED_SAVINGS) {
            require(lockDuration >= 30 days && lockDuration <= 365 days, "Lock duration must be between 30 days and 1 year");
        }
        
        // Validate early withdrawal penalty
        if (earlyWithdrawalPenaltyBps > 0) {
            require(earlyWithdrawalPenaltyBps <= 1000, "Early withdrawal penalty cannot exceed 10%");
        }
        
        // Create new group contract
        HematGroup newGroup = new HematGroup(
            address(this),
            address(escrowVault),
            address(stakeManager),
            address(insurancePool),
            IThriftModel.ThriftModel(model),
            contributionAmount,
            cycleInterval,
            groupSize,
            payoutOrder,
            insuranceEnabled,
            stakeRequired,
            lockDuration,
            earlyWithdrawalPenaltyBps,
            msg.sender
        );
        
        // Register the group
        uint256 groupId = nextGroupId++;
        groups[groupId] = address(newGroup);
        creatorGroups[msg.sender].push(groupId);
        modelGroupCount[uint256(model)]++;
        
        // Transfer excess creation fee back to creator
        if (msg.value > groupCreationFee) {
            payable(msg.sender).transfer(msg.value - groupCreationFee);
        }
        
        emit GroupCreated(
            msg.sender,
            address(newGroup),
            groupId,
            uint256(model),
            contributionAmount,
            cycleInterval,
            groupSize
        );
    }
    
    /**
     * @dev Pause a group (only owner or group creator)
     */
    function pauseGroup(address groupAddress) external {
        HematGroup group = HematGroup(groupAddress);
        require(msg.sender == owner() || msg.sender == group.creator(), "Not authorized to pause");
        group.pause();
        emit GroupPaused(groupAddress, msg.sender);
    }
    
    /**
     * @dev Unpause a group (only owner or group creator)
     */
    function unpauseGroup(address groupAddress) external {
        HematGroup group = HematGroup(groupAddress);
        require(msg.sender == owner() || msg.sender == group.creator(), "Not authorized to unpause");
        group.unpause();
        emit GroupUnpaused(groupAddress, msg.sender);
    }
    
    /**
     * @dev Get groups created by an address
=======
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool,
        address _admin
    ) {
        require(_usdtToken != address(0), "HematFactory: invalid USDT token");
        require(_escrowVault != address(0), "HematFactory: invalid escrow vault");
        require(_stakeManager != address(0), "HematFactory: invalid stake manager");
        require(_insurancePool != address(0), "HematFactory: invalid insurance pool");
        require(_admin != address(0), "HematFactory: invalid admin");
        
        usdtToken = _usdtToken;
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        _groupIdCounter.increment(); // Start from 1
    }
    
    /**
     * @dev Create a new thrift group
     * @param config Group configuration
     * @return groupId The ID of the created group
     * @return groupContract The address of the created group contract
     */
    function createGroup(
        GroupConfig memory config
    ) external nonReentrant whenNotPaused validGroupConfig(config) returns (uint256 groupId, address groupContract) {
        require(
            creatorGroups[msg.sender].length < maxGroupsPerCreator,
            "HematFactory: max groups per creator exceeded"
        );
        
        // Set default values for optional parameters
        if (config.gracePeriod == 0) {
            config.gracePeriod = 2 days;
        }
        if (config.platformFeeBps == 0) {
            config.platformFeeBps = 100; // 1%
        }
        if (config.insuranceBps == 0 && config.insuranceEnabled) {
            config.insuranceBps = 200; // 2%
        }
        
        // Model-specific validations
        if (config.model == ThriftModel.FIXED_SAVINGS) {
            require(config.lockDuration > 0, "HematFactory: lock duration required for fixed savings");
            require(config.lockDuration >= 7 days, "HematFactory: minimum lock duration is 7 days");
        }
        
        if (config.model == ThriftModel.EMERGENCY_LIQUIDITY) {
            require(config.insuranceEnabled, "HematFactory: insurance required for emergency liquidity");
        }
        
        groupId = _groupIdCounter.current();
        _groupIdCounter.increment();
        
        // Deploy new group contract
        HematGroup newGroup = new HematGroup(
            groupId,
            config,
            msg.sender,
            usdtToken,
            address(escrowVault),
            address(stakeManager),
            address(insurancePool),
            getRoleMember(ADMIN_ROLE, 0) // First admin
        );
        
        groupContract = address(newGroup);
        groups[groupId] = groupContract;
        
        // Grant group role to the new contract
        escrowVault.grantRole(escrowVault.GROUP_ROLE(), groupContract);
        stakeManager.grantRole(stakeManager.GROUP_ROLE(), groupContract);
        insurancePool.grantRole(insurancePool.GROUP_ROLE(), groupContract);
        
        // Update tracking
        creatorGroups[msg.sender].push(groupId);
        groupsByModel[config.model].push(groupId);
        totalGroupsCreated++;
        totalActiveGroups++;
        groupCountByModel[config.model]++;
        
        emit GroupCreated(
            groupId,
            msg.sender,
            groupContract,
            config.model,
            config.contributionAmount,
            config.groupSize
        );
        emit GroupCreated(groupId, msg.sender, config.model);
        
        return (groupId, groupContract);
    }
    
    /**
     * @dev Join a group (updates member tracking)
     * @param groupId Group identifier
     */
    function joinGroup(uint256 groupId) external nonReentrant whenNotPaused {
        address groupContract = groups[groupId];
        require(groupContract != address(0), "HematFactory: group not found");
        
        // Call join on the group contract
        HematGroup(groupContract).joinGroup();
        
        // Update member tracking
        memberGroups[msg.sender].push(groupId);
    }
    
    /**
     * @dev Update group status (called by group contracts)
     * @param groupId Group identifier
     * @param newStatus New status
     */
    function updateGroupStatus(uint256 groupId, GroupStatus newStatus) external {
        address groupContract = groups[groupId];
        require(msg.sender == groupContract, "HematFactory: unauthorized");
        
        // This would typically track status changes for analytics
        // For now, we'll emit an event
        emit GroupStatusChanged(groupId, GroupStatus.CREATED, newStatus);
        
        // Update active group count
        if (newStatus == GroupStatus.COMPLETED || newStatus == GroupStatus.CANCELLED) {
            totalActiveGroups--;
        }
    }
    
    /**
     * @dev Get groups created by a specific creator
     * @param creator Creator address
     * @return Array of group IDs
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
     */
    function getCreatorGroups(address creator) external view returns (uint256[] memory) {
        return creatorGroups[creator];
    }
    
    /**
<<<<<<< HEAD
     * @dev Get group address by ID
     */
    function getGroup(uint256 groupId) external view returns (address) {
=======
     * @dev Get groups a member has joined
     * @param member Member address
     * @return Array of group IDs
     */
    function getMemberGroups(address member) external view returns (uint256[] memory) {
        return memberGroups[member];
    }
    
    /**
     * @dev Get groups by thrift model
     * @param model Thrift model
     * @return Array of group IDs
     */
    function getGroupsByModel(ThriftModel model) external view returns (uint256[] memory) {
        return groupsByModel[model];
    }
    
    /**
     * @dev Get group contract address
     * @param groupId Group identifier
     * @return Group contract address
     */
    function getGroupContract(uint256 groupId) external view returns (address) {
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
        return groups[groupId];
    }
    
    /**
<<<<<<< HEAD
     * @dev Update configuration (only owner)
     */
    function updateConfig(
        uint256 _maxGroupsPerCreator,
        uint256 _maxGroupsPerModel,
        uint256 _groupCreationFee
    ) external onlyOwner {
        maxGroupsPerCreator = _maxGroupsPerCreator;
        maxGroupsPerModel = _maxGroupsPerModel;
        groupCreationFee = _groupCreationFee;
    }
    
    /**
     * @dev Pause factory (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause factory (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw accumulated fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Emergency function to recover stuck tokens (only owner)
     */
    function emergencyRecoverToken(address token, address to) external onlyOwner {
        IERC20(token).transfer(to, IERC20(token).balanceOf(address(this)));
=======
     * @dev Get group information
     * @param groupId Group identifier
     * @return groupContract Address of the group contract
     * @return creator Address of the group creator
     * @return model Thrift model of the group
     * @return status Current status of the group
     * @return memberCount Number of current members
     * @return groupSize Maximum group size
     * @return contributionAmount Required contribution amount
     */
    function getGroupInfo(uint256 groupId) external view returns (
        address groupContract,
        address creator,
        ThriftModel model,
        GroupStatus status,
        uint256 memberCount,
        uint256 groupSize,
        uint256 contributionAmount
    ) {
        groupContract = groups[groupId];
        require(groupContract != address(0), "HematFactory: group not found");
        
        HematGroup group = HematGroup(groupContract);
        
        // Get basic info
        creator = group.creator();
        status = group.status();
        memberCount = group.getMembers().length;
        
        // Get config info - all fields must be declared even if not used
        (
            model, 
            contributionAmount, 
            , // cycleInterval
            groupSize, 
            , // lockDuration
            , // gracePeriod
            , // stakeRequired
            , // insuranceEnabled
            , // insuranceBps
            , // platformFeeBps
              // earlyWithdrawalPenaltyBps
        ) = group.config();
    }
    
    /**
     * @dev Get paginated list of groups
     * @param offset Starting index
     * @param limit Number of groups to return
     * @param model Filter by thrift model (optional, use ROTATIONAL for no filter)
     * @return groupIds Array of group IDs
     * @return total Total number of groups matching filter
     */
    function getGroups(
        uint256 offset,
        uint256 limit,
        ThriftModel model
    ) external view returns (uint256[] memory groupIds, uint256 total) {
        uint256[] storage sourceGroups;
        
        if (model == ThriftModel.ROTATIONAL && offset == 0 && limit == 0) {
            // Return all groups (no filter)
            total = totalGroupsCreated;
            uint256 resultLength = limit > 0 && offset + limit < total ? limit : total - offset;
            groupIds = new uint256[](resultLength);
            
            for (uint256 i = 0; i < resultLength; i++) {
                groupIds[i] = i + offset + 1; // Group IDs start from 1
            }
        } else {
            // Return groups by model
            sourceGroups = groupsByModel[model];
            total = sourceGroups.length;
            
            if (offset >= total) {
                return (new uint256[](0), total);
            }
            
            uint256 resultLength = offset + limit < total ? limit : total - offset;
            groupIds = new uint256[](resultLength);
            
            for (uint256 i = 0; i < resultLength; i++) {
                groupIds[i] = sourceGroups[offset + i];
            }
        }
    }
    
    /**
     * @dev Get platform statistics
     * @return totalGroups Total number of groups created
     * @return activeGroups Number of active groups
     * @return rotationalGroups Number of rotational groups
     * @return fixedSavingsGroups Number of fixed savings groups
     * @return emergencyLiquidityGroups Number of emergency liquidity groups
     */
    function getPlatformStats() external view returns (
        uint256 totalGroups,
        uint256 activeGroups,
        uint256 rotationalGroups,
        uint256 fixedSavingsGroups,
        uint256 emergencyLiquidityGroups
    ) {
        return (
            totalGroupsCreated,
            totalActiveGroups,
            groupCountByModel[ThriftModel.ROTATIONAL],
            groupCountByModel[ThriftModel.FIXED_SAVINGS],
            groupCountByModel[ThriftModel.EMERGENCY_LIQUIDITY]
        );
    }
    
    // Admin functions
    function setMaxGroupsPerCreator(uint256 _maxGroups) external onlyRole(ADMIN_ROLE) {
        maxGroupsPerCreator = _maxGroups;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // Emergency pause function
    function emergencyPauseGroup(uint256 groupId) external onlyRole(ADMIN_ROLE) {
        address groupContract = groups[groupId];
        require(groupContract != address(0), "HematFactory: group not found");
        HematGroup(groupContract).pauseGroup();
>>>>>>> origin/cursor/create-hemat-smart-contracts-4071
    }
}