// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
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
    
    // Core contract addresses
    address public immutable usdtToken;
    EscrowVault public immutable escrowVault;
    StakeManager public immutable stakeManager;
    InsurancePool public immutable insurancePool;
    
    // Group management - using simple counter instead of Counters library
    uint256 private groupIdCounter = 1;
    mapping(uint256 => address) public groups; // groupId => group contract
    
    // Platform statistics
    uint256 public totalGroups;
    
    // Events
    event GroupCreated(
        uint256 indexed groupId,
        address indexed creator,
        address indexed groupAddress,
        ThriftModel model
    );
    
    constructor(
        address _usdtToken,
        address _escrowVault,
        address _stakeManager,
        address _insurancePool
    ) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_escrowVault != address(0), "Invalid escrow address");
        require(_stakeManager != address(0), "Invalid stake manager address");
        require(_insurancePool != address(0), "Invalid insurance address");
        
        usdtToken = _usdtToken;
        escrowVault = EscrowVault(_escrowVault);
        stakeManager = StakeManager(_stakeManager);
        insurancePool = InsurancePool(_insurancePool);
    }
    
    /**
     * @dev Create a basic thrift group (simplified for MVP)
     */
    function createGroup(
        ThriftModel model,
        uint256 contributionAmount,
        uint256 groupSize
    ) external nonReentrant returns (uint256 groupId) {
        require(contributionAmount > 0, "Invalid contribution amount");
        require(groupSize >= 3 && groupSize <= 50, "Invalid group size");
        
        groupId = groupIdCounter;
        groupIdCounter++;
        
        // For MVP, use default parameters
        address[] memory emptyPayoutOrder;
        
        HematGroup newGroup = new HematGroup(
            groupId,
            msg.sender,
            usdtToken,
            address(escrowVault),
            address(stakeManager),
            address(insurancePool),
            model,
            contributionAmount,
            7 days, // Default cycle interval
            groupSize,
            emptyPayoutOrder,
            false, // Insurance disabled for MVP
            0, // No stake required for MVP
            0, // No lock duration
            0 // No early withdrawal penalty
        );
        
        groups[groupId] = address(newGroup);
        totalGroups++;
        
        emit GroupCreated(groupId, msg.sender, address(newGroup), model);
        
        return groupId;
    }
    
    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (uint256, uint256) {
        return (totalGroups, totalGroups); // Active = total for MVP
    }
    
    /**
     * @dev Get group address by ID
     */
    function getGroup(uint256 groupId) external view returns (address) {
        return groups[groupId];
    }
}