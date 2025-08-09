// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IHematTypes.sol";
import "./HematGroup.sol";
import "./EscrowVault.sol";
import "./StakeManager.sol";
import "./InsurancePool.sol";

/**
 * @title HematFactoryMini
 * @dev Minimal factory contract for creating Hemat thrift groups (MVP)
 */
contract HematFactoryMini is ReentrancyGuard, Ownable, IHematTypes {
    using Counters for Counters.Counter;
    
    // Core contract addresses
    address public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    
    // Group management
    Counters.Counter private groupIdCounter;
    mapping(uint256 => address) public groups; // groupId => group contract
    
    // Platform statistics
    uint256 public totalGroupsCreated;
    
    constructor(
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool
    ) {
        usdtToken = _usdtToken;
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
    }
    
    /**
     * @dev Create a new thrift group
     */
    function createGroup(GroupConfig memory config) external nonReentrant returns (uint256 groupId, address groupContract) {
        // Basic validation
        require(config.contributionAmount >= 10 * 10**6, "Min $10 USDT");
        require(config.contributionAmount <= 10000 * 10**6, "Max $10,000 USDT");
        require(config.groupSize >= 3 && config.groupSize <= 50, "Group size 3-50");
        
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
            owner()
        );
        
        groupContract = address(newGroup);
        groups[groupId] = groupContract;
        totalGroupsCreated++;
        
        // Grant roles
        escrowVault.grantRole(escrowVault.GROUP_ROLE(), groupContract);
        stakeManager.grantRole(stakeManager.GROUP_ROLE(), groupContract);
        insurancePool.grantRole(insurancePool.GROUP_ROLE(), groupContract);
        
        emit GroupCreated(groupId, msg.sender, config.model);
    }
    
    /**
     * @dev Join an existing group
     */
    function joinGroup(uint256 groupId) external nonReentrant {
        require(groups[groupId] != address(0), "Group not found");
        HematGroup(groups[groupId]).joinGroup();
    }
    
    /**
     * @dev Get group address
     */
    function getGroupAddress(uint256 groupId) external view returns (address) {
        return groups[groupId];
    }
    
    /**
     * @dev Get total groups created
     */
    function getTotalGroups() external view returns (uint256) {
        return totalGroupsCreated;
    }
}