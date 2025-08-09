// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IHematTypes.sol";
import "./HematGroup.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematFactory
 * @dev Factory contract for creating and managing Hemat thrift groups
 * @notice This contract handles the creation and management of thrift groups with multiple models
 */
contract HematFactory is ReentrancyGuard, Pausable, AccessControlEnumerable, IHematTypes {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // Core system contracts
    IERC20 public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    
    // Group management - using simple counter instead of Counters library
    uint256 private _groupIdCounter = 1;
    mapping(uint256 => address) public groups;
    mapping(address => uint256[]) public creatorGroups;
    mapping(address => uint256[]) public memberGroups;
    mapping(ThriftModel => uint256[]) public groupsByModel;
    
    // Platform configuration
    uint256 public maxGroupsPerCreator = 10;
    uint256 public minContributionAmount = 10 * 10**6; // 10 USDT
    uint256 public maxContributionAmount = 10000 * 10**6; // 10,000 USDT
    uint256 public minGroupSize = 3;
    uint256 public maxGroupSize = 50;
    uint256 public groupCreationFee = 0; // Can be set by admin
    
    // Platform statistics
    uint256 public totalGroupsCreated;
    uint256 public totalActiveGroups;
    mapping(ThriftModel => uint256) public groupCountByModel;
    
    // Treasury and fee management
    address public treasuryAddress;
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max
    
    // Events
    event GroupCreated(
        uint256 indexed groupId,
        address indexed creator,
        address indexed groupAddress,
        ThriftModel model,
        uint256 contributionAmount,
        uint256 cycleInterval,
        uint256 groupSize
    );
    
    event GroupStatusChanged(
        uint256 indexed groupId,
        address indexed groupAddress,
        GroupStatus newStatus
    );
    
    event ConfigurationUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue
    );
    
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    
    // Custom errors
    error InvalidThriftModel();
    error InvalidGroupSize(uint256 provided, uint256 min, uint256 max);
    error InvalidContributionAmount(uint256 provided, uint256 min, uint256 max);
    error InvalidCycleInterval(uint256 provided);
    error TooManyGroups(uint256 current, uint256 max);
    error InvalidAddress();
    error InsufficientFee(uint256 provided, uint256 required);
    error GroupCreationFailed();
    error UnauthorizedAccess();
    
    /**
     * @dev Constructor initializes the factory with core system contracts
     * @param _usdtToken Address of the USDT token contract
     * @param _escrowVault Address of the EscrowVault contract
     * @param _stakeManager Address of the StakeManager contract
     * @param _insurancePool Address of the InsurancePool contract
     */
    constructor(
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool
    ) {
        if (_usdtToken == address(0) || _escrowVault == address(0) || 
            _stakeManager == address(0) || _insurancePool == address(0)) {
            revert InvalidAddress();
        }
        
        usdtToken = IERC20(_usdtToken);
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
        treasuryAddress = msg.sender;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Creates a new thrift group with specified parameters
     * @param model The thrift model type
     * @param contributionAmount Amount each member contributes per cycle
     * @param cycleInterval Time between cycles in seconds
     * @param groupSize Maximum number of members
     * @param payoutOrder Array defining payout order for rotational model
     * @param insuranceEnabled Whether insurance is enabled for this group
     * @param stakeRequired Stake amount required from each member
     * @param lockDuration Lock duration for fixed savings model
     * @param earlyWithdrawalPenalty Penalty for early withdrawal (in basis points)
     */
    function createGroup(
        ThriftModel model,
        uint256 contributionAmount,
        uint256 cycleInterval,
        uint256 groupSize,
        address[] memory payoutOrder,
        bool insuranceEnabled,
        uint256 stakeRequired,
        uint256 lockDuration,
        uint256 earlyWithdrawalPenalty
    ) external payable nonReentrant whenNotPaused returns (uint256 groupId) {
        // Validate inputs
        _validateGroupParameters(model, contributionAmount, cycleInterval, groupSize);
        _validateCreatorLimits(msg.sender);
        
        // Check creation fee
        if (msg.value < groupCreationFee) {
            revert InsufficientFee(msg.value, groupCreationFee);
        }
        
        // Get current group ID and increment
        groupId = _groupIdCounter;
        _groupIdCounter++;
        
        // Deploy new group contract
        address groupAddress = _deployGroup(
            groupId,
            model,
            contributionAmount,
            cycleInterval,
            groupSize,
            payoutOrder,
            insuranceEnabled,
            stakeRequired,
            lockDuration,
            earlyWithdrawalPenalty
        );
        
        if (groupAddress == address(0)) {
            revert GroupCreationFailed();
        }
        
        // Update mappings and statistics
        groups[groupId] = groupAddress;
        creatorGroups[msg.sender].push(groupId);
        groupsByModel[model].push(groupId);
        
        totalGroupsCreated++;
        totalActiveGroups++;
        groupCountByModel[model]++;
        
        // Transfer creation fee to treasury
        if (msg.value > 0) {
            payable(treasuryAddress).transfer(msg.value);
        }
        
        emit GroupCreated(
            groupId,
            msg.sender,
            groupAddress,
            model,
            contributionAmount,
            cycleInterval,
            groupSize
        );
        
        return groupId;
    }
    
    /**
     * @dev Internal function to deploy a new group contract
     */
    function _deployGroup(
        uint256 groupId,
        ThriftModel model,
        uint256 contributionAmount,
        uint256 cycleInterval,
        uint256 groupSize,
        address[] memory payoutOrder,
        bool insuranceEnabled,
        uint256 stakeRequired,
        uint256 lockDuration,
        uint256 earlyWithdrawalPenalty
    ) internal returns (address) {
        try new HematGroup(
            groupId,
            msg.sender,
            address(usdtToken),
            address(escrowVault),
            address(stakeManager),
            address(insurancePool),
            model,
            contributionAmount,
            cycleInterval,
            groupSize,
            payoutOrder,
            insuranceEnabled,
            stakeRequired,
            lockDuration,
            earlyWithdrawalPenalty
        ) returns (HematGroup newGroup) {
            return address(newGroup);
        } catch {
            return address(0);
        }
    }
    
    /**
     * @dev Validates group creation parameters
     */
    function _validateGroupParameters(
        ThriftModel model,
        uint256 contributionAmount,
        uint256 cycleInterval,
        uint256 groupSize
    ) internal view {
        if (uint256(model) > uint256(ThriftModel.EMERGENCY)) {
            revert InvalidThriftModel();
        }
        
        if (groupSize < minGroupSize || groupSize > maxGroupSize) {
            revert InvalidGroupSize(groupSize, minGroupSize, maxGroupSize);
        }
        
        if (contributionAmount < minContributionAmount || contributionAmount > maxContributionAmount) {
            revert InvalidContributionAmount(contributionAmount, minContributionAmount, maxContributionAmount);
        }
        
        if (cycleInterval < 1 days || cycleInterval > 365 days) {
            revert InvalidCycleInterval(cycleInterval);
        }
    }
    
    /**
     * @dev Validates creator limits
     */
    function _validateCreatorLimits(address creator) internal view {
        if (creatorGroups[creator].length >= maxGroupsPerCreator) {
            revert TooManyGroups(creatorGroups[creator].length, maxGroupsPerCreator);
        }
    }
    
    /**
     * @dev Gets platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 _totalGroups,
        uint256 _activeGroups,
        uint256 _rotationalGroups,
        uint256 _fixedGroups,
        uint256 _emergencyGroups
    ) {
        return (
            totalGroupsCreated,
            totalActiveGroups,
            groupCountByModel[ThriftModel.ROTATIONAL],
            groupCountByModel[ThriftModel.FIXED],
            groupCountByModel[ThriftModel.EMERGENCY]
        );
    }
    
    /**
     * @dev Gets groups created by a specific creator
     */
    function getCreatorGroups(address creator) external view returns (uint256[] memory) {
        return creatorGroups[creator];
    }
    
    /**
     * @dev Gets groups by model type
     */
    function getGroupsByModel(ThriftModel model) external view returns (uint256[] memory) {
        return groupsByModel[model];
    }
    
    /**
     * @dev Gets group address by ID
     */
    function getGroup(uint256 groupId) external view returns (address) {
        return groups[groupId];
    }
    
    // Admin functions
    
    /**
     * @dev Updates platform configuration (Admin only)
     */
    function updateConfiguration(
        uint256 _maxGroupsPerCreator,
        uint256 _minContributionAmount,
        uint256 _maxContributionAmount,
        uint256 _minGroupSize,
        uint256 _maxGroupSize,
        uint256 _groupCreationFee
    ) external onlyRole(ADMIN_ROLE) {
        require(_maxGroupsPerCreator > 0 && _maxGroupsPerCreator <= 100, "Invalid max groups");
        require(_minContributionAmount > 0, "Invalid min contribution");
        require(_maxContributionAmount > _minContributionAmount, "Invalid max contribution");
        require(_minGroupSize >= 2 && _minGroupSize <= _maxGroupSize, "Invalid group sizes");
        require(_maxGroupSize <= 1000, "Max group size too large");
        
        maxGroupsPerCreator = _maxGroupsPerCreator;
        minContributionAmount = _minContributionAmount;
        maxContributionAmount = _maxContributionAmount;
        minGroupSize = _minGroupSize;
        maxGroupSize = _maxGroupSize;
        groupCreationFee = _groupCreationFee;
        
        emit ConfigurationUpdated("platform_config", 0, block.timestamp);
    }
    
    /**
     * @dev Updates treasury address (Admin only)
     */
    function updateTreasury(address _newTreasury) external onlyRole(ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert InvalidAddress();
        
        address oldTreasury = treasuryAddress;
        treasuryAddress = _newTreasury;
        
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }
    
    /**
     * @dev Emergency pause function (Admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function (Admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal function (Admin only)
     */
    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(treasuryAddress).transfer(balance);
        }
    }
}