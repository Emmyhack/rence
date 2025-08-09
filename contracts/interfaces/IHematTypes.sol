// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHematTypes
 * @dev Core data structures and enums for the Hemat platform
 */
interface IHematTypes {
    enum ThriftModel {
        ROTATIONAL,           // Classic Ajo/Esusu rotating savings
        FIXED_SAVINGS,        // Fixed-term savings pool
        EMERGENCY_LIQUIDITY   // Emergency fund with claim system
    }
    
    enum GroupStatus {
        CREATED,              // Group created, accepting members
        ACTIVE,               // Group active, contributions ongoing
        COMPLETED,            // All cycles completed
        PAUSED,               // Temporarily paused by admin
        CANCELLED             // Cancelled due to issues
    }
    
    enum PaymentStatus {
        PENDING,              // Payment due but not made
        PAID,                 // Payment made successfully
        LATE,                 // Payment overdue within grace period
        DEFAULTED,            // Payment defaulted, penalties applied
        COVERED_BY_INSURANCE  // Payment covered by insurance pool
    }
    
    enum ClaimStatus {
        SUBMITTED,            // Claim submitted for review
        APPROVED,             // Claim approved for payout
        REJECTED,             // Claim rejected
        PAID                  // Claim paid out
    }
    
    struct GroupConfig {
        ThriftModel model;
        uint256 contributionAmount;    // USDT amount per contribution
        uint256 cycleInterval;         // Time between cycles (seconds)
        uint256 groupSize;             // Number of members
        uint256 lockDuration;          // For fixed savings (seconds)
        uint256 gracePeriod;           // Grace period for late payments
        uint256 stakeRequired;         // Required stake amount (USDT)
        bool insuranceEnabled;         // Whether insurance is enabled
        uint256 insuranceBps;          // Insurance premium (basis points)
        uint256 platformFeeBps;        // Platform fee (basis points)
        uint256 earlyWithdrawalPenaltyBps; // Early withdrawal penalty
    }
    
    struct Member {
        address memberAddress;
        uint256 stakeAmount;           // Stake deposited
        uint256 totalContributed;      // Total USDT contributed
        uint256 totalReceived;         // Total USDT received
        uint256 trustScore;            // Behavioral trust score
        uint256 joinedAt;              // Timestamp of joining
        bool isActive;                 // Member status
    }
    
    struct Contribution {
        address member;
        uint256 amount;
        uint256 cycleNumber;
        uint256 timestamp;
        PaymentStatus status;
    }
    
    struct Payout {
        address recipient;
        uint256 amount;
        uint256 cycleNumber;
        uint256 timestamp;
        bool executed;
    }
    
    struct InsuranceClaim {
        address claimant;
        uint256 amount;
        uint256 groupId;
        string evidenceCID;            // IPFS hash of evidence
        ClaimStatus status;
        uint256 submittedAt;
        uint256 processedAt;
    }
    
    struct YieldInfo {
        uint256 totalDeposited;        // Total deposited to yield strategy
        uint256 totalHarvested;        // Total yield harvested
        uint256 lastHarvestAt;         // Last harvest timestamp
        uint256 pendingYield;          // Pending yield to distribute
    }
    
    // Events
    event GroupCreated(uint256 indexed groupId, address indexed creator, ThriftModel model);
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 stakeAmount);
    event ContributionMade(uint256 indexed groupId, address indexed member, uint256 amount, uint256 cycleNumber);
    event PayoutExecuted(uint256 indexed groupId, address indexed recipient, uint256 amount, uint256 cycleNumber);
    event InsuranceClaimSubmitted(uint256 indexed claimId, address indexed claimant, uint256 amount);
    event InsuranceClaimProcessed(uint256 indexed claimId, bool approved, uint256 payoutAmount);
    event DefaultHandled(uint256 indexed groupId, address indexed member, uint256 penaltyAmount);
    event YieldHarvested(uint256 indexed groupId, uint256 amount);
    event StakeSlashed(uint256 indexed groupId, address indexed member, uint256 amount);
}