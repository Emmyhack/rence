// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "./interfaces/IHematTypes.sol";
import "./HematGroup.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematFactorySimple
 * @dev Simplified factory contract for creating Hemat thrift groups (MVP)
 */
contract HematFactorySimple is ReentrancyGuard, Pausable, AccessControlEnumerable, IHematTypes {
    using Counters for Counters.Counter;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Core contract addresses
    address public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    
    // Group management
    Counters.Counter private groupIdCounter;
    mapping(uint256 => address) public groups; // groupId => group contract
    mapping(address => uint256[]) public creatorGroups; // creator => group IDs
    
    // Platform statistics
    uint256 public totalGroupsCreated;
    uint256 public totalActiveGroups;
    mapping(ThriftModel => uint256) public groupCountByModel;
    
    // Platform limits (simplified)
    uint256 public maxGroupsPerCreator = 10;
    uint256 public minContributionAmount = 10 * 10**6; // $10 USDT
    uint256 public maxContributionAmount = 10000 * 10**6; // $10,000 USDT
    uint256 public minGroupSize = 3;
    uint256 public maxGroupSize = 50;
    
    // Events
    // event GroupCreated(uint256 indexed groupId, address indexed creator, ThriftModel model); // Defined in IHematTypes
    event GroupStatusUpdated(uint256 indexed groupId, GroupStatus oldStatus, GroupStatus newStatus);
    
    constructor(
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool,
        address _admin
    ) {
        usdtToken = _usdtToken;
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    /**
     * @dev Create a new thrift group
     */
    function createGroup(GroupConfig memory config) external nonReentrant whenNotPaused returns (uint256 groupId, address groupContract) {
        // Basic validation
        require(config.contributionAmount >= minContributionAmount && 
                config.contributionAmount <= maxContributionAmount, 
                "HematFactory: invalid contribution amount");
        require(config.groupSize >= minGroupSize && 
                config.groupSize <= maxGroupSize, 
                "HematFactory: invalid group size");
        require(creatorGroups[msg.sender].length < maxGroupsPerCreator, 
                "HematFactory: max groups per creator exceeded");
        
        // Generate group ID
        groupIdCounter.increment();
        groupId = groupIdCounter.current();
        
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
        creatorGroups[msg.sender].push(groupId);
        
        // Update statistics
        totalGroupsCreated++;
        groupCountByModel[config.model]++;
        
        // Grant necessary roles
        escrowVault.grantRole(escrowVault.GROUP_ROLE(), groupContract);
        stakeManager.grantRole(stakeManager.GROUP_ROLE(), groupContract);
        insurancePool.grantRole(insurancePool.GROUP_ROLE(), groupContract);
        
        emit GroupCreated(groupId, msg.sender, config.model);
    }
    
    /**
     * @dev Join an existing group
     */
    function joinGroup(uint256 groupId) external nonReentrant whenNotPaused {
        address groupContract = groups[groupId];
        require(groupContract != address(0), "HematFactory: group not found");
        
        HematGroup(groupContract).joinGroup();
    }
    
    /**
     * @dev Update group status (called by group contracts)
     */
    function updateGroupStatus(uint256 groupId, GroupStatus newStatus) external {
        require(groups[groupId] == msg.sender, "HematFactory: unauthorized");
        
        GroupStatus oldStatus = HematGroup(msg.sender).status();
        
        if (oldStatus == GroupStatus.CREATED && newStatus == GroupStatus.ACTIVE) {
            totalActiveGroups++;
        } else if (oldStatus == GroupStatus.ACTIVE && newStatus != GroupStatus.ACTIVE) {
            totalActiveGroups--;
        }
        
        emit GroupStatusUpdated(groupId, oldStatus, newStatus);
    }
    
    /**
     * @dev Get basic group information
     */
    function getGroupInfo(uint256 groupId) external view returns (
        address groupContract,
        address creator,
        ThriftModel model,
        GroupStatus status
    ) {
        groupContract = groups[groupId];
        require(groupContract != address(0), "HematFactory: group not found");
        
        HematGroup group = HematGroup(groupContract);
        creator = group.creator();
        status = group.status();
        
        // Get just the model from config - need to specify all fields
        (
            model,
            ,  // contributionAmount
            ,  // cycleInterval
            ,  // groupSize
            ,  // lockDuration
            ,  // gracePeriod
            ,  // stakeRequired
            ,  // insuranceEnabled
            ,  // insuranceBps
            ,  // platformFeeBps
               // earlyWithdrawalPenaltyBps
        ) = group.config();
    }
    
    /**
     * @dev Get groups created by a user
     */
    function getCreatorGroups(address creator) external view returns (uint256[] memory) {
        return creatorGroups[creator];
    }
    
    /**
     * @dev Get platform statistics
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
}