// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IThriftModel.sol";
import "./HematGroup.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematFactory
 * @dev Factory contract for creating and managing Hemat thrift groups
 */
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
        _;
    }
    
    constructor(
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
     */
    function getCreatorGroups(address creator) external view returns (uint256[] memory) {
        return creatorGroups[creator];
    }
    
    /**
     * @dev Get group address by ID
     */
    function getGroup(uint256 groupId) external view returns (address) {
        return groups[groupId];
    }
    
    /**
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
    }
}