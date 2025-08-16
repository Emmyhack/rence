import { ethers } from 'ethers';
import { getContract } from 'wagmi/actions';

// Contract ABIs - these would typically come from compilation artifacts
export const HEMAT_FACTORY_ABI = [
  // Group creation and management
  "function createGroup(uint8 model, uint256 contributionAmount, uint256 cycleInterval, uint256 groupSize, uint256 lockDuration, uint256 gracePeriod, uint256 stakeRequired, bool insuranceEnabled, uint256 insuranceBps, uint256 platformFeeBps, uint256 earlyWithdrawalPenaltyBps) external returns (uint256)",
  "function getGroup(uint256 groupId) external view returns (address)",
  "function getGroupsByCreator(address creator) external view returns (uint256[])",
  "function getGroupsByMember(address member) external view returns (uint256[])",
  "function getGroupsByModel(uint8 model) external view returns (uint256[])",
  "function totalGroupsCreated() external view returns (uint256)",
  "function totalActiveGroups() external view returns (uint256)",
  "function groupCountByModel(uint8 model) external view returns (uint256)",
  
  // Configuration
  "function maxGroupsPerCreator() external view returns (uint256)",
  "function minContributionAmount() external view returns (uint256)",
  "function maxContributionAmount() external view returns (uint256)",
  "function minGroupSize() external view returns (uint256)",
  "function maxGroupSize() external view returns (uint256)",
  "function groupCreationFee() external view returns (uint256)",
  "function treasuryAddress() external view returns (address)",
  "function PLATFORM_FEE_BPS() external view returns (uint256)",
  
  // Events
  "event GroupCreated(uint256 indexed groupId, address indexed creator, address indexed groupAddress, uint8 model, uint256 contributionAmount, uint256 cycleInterval, uint256 groupSize)",
  "event GroupStatusChanged(uint256 indexed groupId, address indexed groupAddress, uint8 newStatus)",
  "event ConfigurationUpdated(string parameter, uint256 oldValue, uint256 newValue)"
];

export const HEMAT_GROUP_ABI = [
  // Group information
  "function model() external view returns (uint8)",
  "function contributionAmount() external view returns (uint256)",
  "function cycleInterval() external view returns (uint256)",
  "function groupSize() external view returns (uint256)",
  "function lockDuration() external view returns (uint256)",
  "function stakeRequired() external view returns (uint256)",
  "function insuranceEnabled() external view returns (bool)",
  "function creator() external view returns (address)",
  "function status() external view returns (uint8)",
  "function currentCycle() external view returns (uint256)",
  "function cycleStartTime() external view returns (uint256)",
  "function nextPayoutTime() external view returns (uint256)",
  "function currentPayoutIndex() external view returns (uint256)",
  "function maturityTime() external view returns (uint256)",
  
  // Member management
  "function members(uint256 index) external view returns (address)",
  "function isMember(address member) external view returns (bool)",
  "function memberIndex(address member) external view returns (uint256)",
  "function lastContribution(address member) external view returns (uint256)",
  "function hasReceivedPayout(address member) external view returns (bool)",
  "function memberDeposits(address member) external view returns (uint256)",
  "function hasWithdrawn(address member) external view returns (bool)",
  "function emergencyClaims(address member) external view returns (uint256)",
  "function claimCapPerMember(address member) external view returns (uint256)",
  
  // Actions
  "function joinGroup() external",
  "function leaveGroup() external",
  "function contribute() external",
  "function claimPayout() external",
  "function withdrawFixedSavings() external",
  "function submitEmergencyClaim(uint256 amount, string evidenceCID) external",
  "function completeCycle() external",
  "function enforceDefault(address member) external",
  
  // Admin functions
  "function pauseGroup() external",
  "function resumeGroup() external",
  "function cancelGroup() external",
  "function updateGroupConfig(uint256 newContributionAmount, uint256 newCycleInterval, uint256 newGracePeriod) external",
  
  // Events
  "event MemberJoined(address indexed member, uint256 stakeAmount)",
  "event MemberLeft(address indexed member)",
  "event ContributionMade(address indexed member, uint256 amount)",
  "event PayoutClaimed(address indexed member, uint256 amount)",
  "event CycleCompleted(uint256 cycleNumber)",
  "event DefaultEnforced(address indexed member, uint256 penaltyAmount)",
  "event YieldDistributed(uint256 amount)"
];

export const ESCROW_VAULT_ABI = [
  // Vault information
  "function usdtToken() external view returns (address)",
  "function treasuryAddress() external view returns (address)",
  "function totalDeposits() external view returns (uint256)",
  "function totalYield() external view returns (uint256)",
  "function lastHarvestAt() external view returns (uint256)",
  
  // Group deposits
  "function getGroupDeposits(uint256 groupId) external view returns (uint256)",
  "function getGroupYield(uint256 groupId) external view returns (uint256)",
  
  // Actions
  "function deposit(uint256 groupId, uint256 amount) external",
  "function withdraw(uint256 groupId, uint256 amount) external",
  "function harvestYield(uint256 groupId) external",
  "function distributeYield(uint256 groupId, address[] memory recipients, uint256[] memory amounts) external",
  
  // Admin functions
  "function setTreasuryAddress(address newTreasury) external",
  "function setDeFiAdapter(address newAdapter) external",
  "function emergencyWithdraw(address token, uint256 amount) external",
  
  // Events
  "event Deposit(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event Withdrawal(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event YieldHarvested(uint256 indexed groupId, uint256 amount)",
  "event YieldDistributed(uint256 indexed groupId, address indexed recipient, uint256 amount)"
];

export const STAKE_MANAGER_ABI = [
  // Stake information
  "function getMemberStake(address member) external view returns (uint256)",
  "function getTrustScore(address member) external view returns (uint256)",
  "function getTotalStakes() external view returns (uint256)",
  "function getStakeHistory(address member) external view returns (uint256[] memory)",
  
  // Actions
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function slashStake(address member, uint256 amount) external",
  "function rewardStake(address member, uint256 amount) external",
  "function updateTrustScore(address member, uint256 newScore) external",
  
  // Events
  "event StakeDeposited(address indexed member, uint256 amount)",
  "event StakeWithdrawn(address indexed member, uint256 amount)",
  "event StakeSlashed(address indexed member, uint256 amount)",
  "event TrustScoreUpdated(address indexed member, uint256 newScore)"
];

export const INSURANCE_POOL_ABI = [
  // Pool information
  "function totalPremiums() external view returns (uint256)",
  "function totalClaims() external view returns (uint256)",
  "function reserveRatio() external view returns (uint256)",
  "function minReserveRatio() external view returns (uint256)",
  "function maxReserveRatio() external view returns (uint256)",
  
  // Claims
  "function getClaim(uint256 claimId) external view returns (address claimant, uint256 amount, uint256 groupId, string memory evidenceCID, uint8 status, uint256 submittedAt, uint256 processedAt)",
  "function getClaimsByMember(address member) external view returns (uint256[] memory)",
  "function getClaimsByGroup(uint256 groupId) external view returns (uint256[] memory)",
  
  // Actions
  "function submitClaim(uint256 groupId, uint256 amount, string memory evidenceCID) external returns (uint256)",
  "function approveClaim(uint256 claimId) external",
  "function rejectClaim(uint256 claimId, string memory reason) external",
  "function payClaim(uint256 claimId) external",
  
  // Admin functions
  "function setReserveRatio(uint256 newRatio) external",
  "function setMinReserveRatio(uint256 newRatio) external",
  "function setMaxReserveRatio(uint256 newRatio) external",
  
  // Events
  "event ClaimSubmitted(uint256 indexed claimId, address indexed claimant, uint256 amount, uint256 groupId)",
  "event ClaimApproved(uint256 indexed claimId, uint256 payoutAmount)",
  "event ClaimRejected(uint256 indexed claimId, string reason)",
  "event ClaimPaid(uint256 indexed claimId, address indexed claimant, uint256 amount)"
];

export const USDT_ABI = [
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = {
  USDT: '0xFE77673f4BF659ef28bD0b3B66013dB5acFA0eBe',
  ESCROW_VAULT: '0x6dca750C61bea425768AEbfba354C81A4122482d',
  STAKE_MANAGER: '0x72a773725845E2F4BBB5b8b2C5C5b06e48B5f4e5',
  INSURANCE_POOL: '0x7054347C5fe4B2056fcbC482C32D5617978d9F0a',
  HEMAT_FACTORY: '0xCeDfe4FAad227720499F2318F92845b87144d702',
  MOCK_DEFI_ADAPTER: '0xB3a49DcFa3df4a28bdac61f98893FC2854319EB7'
};

// Contract types
export interface ContractInstances {
  usdt: ethers.Contract;
  escrowVault: ethers.Contract;
  stakeManager: ethers.Contract;
  insurancePool: ethers.Contract;
  hematFactory: ethers.Contract;
  mockDeFiAdapter: ethers.Contract;
}

// Helper function to get contract instance
export const getContractInstance = (
  address: string,
  abi: any[],
  signerOrProvider?: ethers.Signer | ethers.providers.Provider
): ethers.Contract => {
  return new ethers.Contract(address, abi, signerOrProvider);
};

// Get all contract instances
export const getContractInstances = (signerOrProvider?: ethers.Signer | ethers.providers.Provider): ContractInstances => {
  return {
    usdt: getContractInstance(CONTRACT_ADDRESSES.USDT, USDT_ABI, signerOrProvider),
    escrowVault: getContractInstance(CONTRACT_ADDRESSES.ESCROW_VAULT, ESCROW_VAULT_ABI, signerOrProvider),
    stakeManager: getContractInstance(CONTRACT_ADDRESSES.STAKE_MANAGER, STAKE_MANAGER_ABI, signerOrProvider),
    insurancePool: getContractInstance(CONTRACT_ADDRESSES.INSURANCE_POOL, INSURANCE_POOL_ABI, signerOrProvider),
    hematFactory: getContractInstance(CONTRACT_ADDRESSES.HEMAT_FACTORY, HEMAT_FACTORY_ABI, signerOrProvider),
    mockDeFiAdapter: getContractInstance(CONTRACT_ADDRESSES.MOCK_DEFI_ADAPTER, [], signerOrProvider)
  };
};