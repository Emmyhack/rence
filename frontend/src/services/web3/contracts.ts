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
  
  // Admin functions
  "function setMaxGroupsPerCreator(uint256 maxGroups) external",
  "function setMinContributionAmount(uint256 minAmount) external",
  "function setMaxContributionAmount(uint256 maxAmount) external",
  "function setMinGroupSize(uint256 minSize) external",
  "function setMaxGroupSize(uint256 maxSize) external",
  "function setGroupCreationFee(uint256 fee) external",
  "function setTreasuryAddress(address newTreasury) external",
  "function pause() external",
  "function unpause() external",
  
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
  "function gracePeriod() external view returns (uint256)",
  "function insuranceBps() external view returns (uint256)",
  "function platformFeeBps() external view returns (uint256)",
  "function earlyWithdrawalPenaltyBps() external view returns (uint256)",
  
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
  "function getMemberCount() external view returns (uint256)",
  "function getActiveMemberCount() external view returns (uint256)",
  
  // Actions
  "function joinGroup() external",
  "function leaveGroup() external",
  "function contribute() external",
  "function claimPayout() external",
  "function withdrawFixedSavings() external",
  "function submitEmergencyClaim(uint256 amount, string evidenceCID) external",
  "function completeCycle() external",
  "function enforceDefault(address member) external",
  "function emergencyWithdraw() external",
  
  // Admin functions
  "function pauseGroup() external",
  "function resumeGroup() external",
  "function cancelGroup() external",
  "function updateGroupConfig(uint256 newContributionAmount, uint256 newCycleInterval, uint256 newGracePeriod) external",
  "function addMember(address member) external",
  "function removeMember(address member) external",
  "function setInsuranceEnabled(bool enabled) external",
  "function setInsuranceBps(uint256 newBps) external",
  
  // Events
  "event MemberJoined(address indexed member, uint256 stakeAmount)",
  "event MemberLeft(address indexed member)",
  "event ContributionMade(address indexed member, uint256 amount)",
  "event PayoutClaimed(address indexed member, uint256 amount)",
  "event CycleCompleted(uint256 cycleNumber)",
  "event DefaultEnforced(address indexed member, uint256 penaltyAmount)",
  "event YieldDistributed(uint256 amount)",
  "event EmergencyClaimSubmitted(address indexed member, uint256 amount, string evidenceCID)",
  "event GroupPaused(address indexed by)",
  "event GroupResumed(address indexed by)",
  "event GroupCancelled(address indexed by)"
];

export const ESCROW_VAULT_ABI = [
  // Vault information
  "function usdtToken() external view returns (address)",
  "function treasuryAddress() external view returns (address)",
  "function totalDeposits() external view returns (uint256)",
  "function totalYield() external view returns (uint256)",
  "function lastHarvestAt() external view returns (uint256)",
  "function defiAdapter() external view returns (address)",
  
  // Group deposits
  "function getGroupDeposits(uint256 groupId) external view returns (uint256)",
  "function getGroupYield(uint256 groupId) external view returns (uint256)",
  "function getGroupTotalValue(uint256 groupId) external view returns (uint256)",
  
  // Actions
  "function deposit(uint256 groupId, uint256 amount) external",
  "function withdraw(uint256 groupId, uint256 amount) external",
  "function harvestYield(uint256 groupId) external",
  "function distributeYield(uint256 groupId, address[] memory recipients, uint256[] memory amounts) external",
  "function reinvestYield(uint256 groupId) external",
  
  // Admin functions
  "function setTreasuryAddress(address newTreasury) external",
  "function setDeFiAdapter(address newAdapter) external",
  "function emergencyWithdraw(address token, uint256 amount) external",
  "function pause() external",
  "function unpause() external",
  
  // Events
  "event Deposit(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event Withdrawal(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event YieldHarvested(uint256 indexed groupId, uint256 amount)",
  "event YieldDistributed(uint256 indexed groupId, address indexed recipient, uint256 amount)",
  "event YieldReinvested(uint256 indexed groupId, uint256 amount)",
  "event DeFiAdapterChanged(address indexed oldAdapter, address indexed newAdapter)"
];

export const STAKE_MANAGER_ABI = [
  // Stake information
  "function getMemberStake(uint256 groupId, address member) external view returns (uint256)",
  "function getTrustScore(uint256 groupId, address member) external view returns (uint256)",
  "function getTotalStakes(uint256 groupId) external view returns (uint256)",
  "function getStakeHistory(uint256 groupId, address member) external view returns (uint256[] memory)",
  "function getMemberDefaultCount(uint256 groupId, address member) external view returns (uint256)",
  "function getMemberPaymentHistory(uint256 groupId, address member) external view returns (uint256)",
  "function isMemberBlacklisted(uint256 groupId, address member) external view returns (bool)",
  
  // Actions
  "function depositStake(uint256 groupId, uint256 amount) external",
  "function withdrawStake(uint256 groupId, uint256 amount) external",
  "function slashStake(uint256 groupId, address member, uint256 amount) external",
  "function rewardStake(uint256 groupId, address member, uint256 amount) external",
  "function updateTrustScore(uint256 groupId, address member, uint256 newScore) external",
  "function blacklistMember(uint256 groupId, address member) external",
  "function whitelistMember(uint256 groupId, address member) external",
  
  // Admin functions
  "function setStakePenaltyBps(uint256 newBps) external",
  "function pause() external",
  "function unpause() external",
  
  // Events
  "event StakeDeposited(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event StakeWithdrawn(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event StakeSlashed(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event TrustScoreUpdated(uint256 indexed groupId, address indexed member, uint256 oldScore, uint256 newScore)",
  "event MemberBlacklisted(uint256 indexed groupId, address indexed member)",
  "event MemberWhitelisted(uint256 indexed groupId, address indexed member)"
];

export const INSURANCE_POOL_ABI = [
  // Pool information
  "function totalPremiums() external view returns (uint256)",
  "function totalClaimsPaid() external view returns (uint256)",
  "function totalClaimsDenied() external view returns (uint256)",
  "function reserveRatio() external view returns (uint256)",
  "function minReserveRatio() external view returns (uint256)",
  "function maxReserveRatio() external view returns (uint256)",
  "function usdt() external view returns (address)",
  
  // Claims
  "function getClaim(bytes32 claimId) external view returns (address claimant, uint256 amount, uint256 groupId, string memory evidenceCID, uint8 status, uint256 submittedAt, uint256 processedAt)",
  "function getClaimsByMember(address member) external view returns (bytes32[] memory)",
  "function getClaimsByGroup(uint256 groupId) external view returns (bytes32[] memory)",
  "function getMemberClaims(address member) external view returns (uint256)",
  "function getGroupPremiums(uint256 groupId) external view returns (uint256)",
  
  // Actions
  "function collectPremium(address group, address member, uint256 contributionAmount) external",
  "function submitClaim(uint256 groupId, uint256 amount, string memory evidenceCID) external returns (bytes32)",
  "function approveClaim(bytes32 claimId) external",
  "function rejectClaim(bytes32 claimId, string memory reason) external",
  "function payClaim(bytes32 claimId) external",
  "function emergencyPayout(address member, uint256 amount) external",
  
  // Admin functions
  "function setReserveRatio(uint256 newRatio) external",
  "function setMinReserveRatio(uint256 newRatio) external",
  "function setMaxReserveRatio(uint256 newRatio) external",
  "function addApprover(address approver) external",
  "function removeApprover(address approver) external",
  "function pause() external",
  "function unpause() external",
  
  // Events
  "event PremiumCollected(address indexed group, address indexed member, uint256 amount)",
  "event ClaimSubmitted(bytes32 indexed claimId, address indexed claimant, uint256 amount, uint256 groupId)",
  "event ClaimApproved(bytes32 indexed claimId, uint256 payoutAmount)",
  "event ClaimRejected(bytes32 indexed claimId, string reason)",
  "event ClaimPaid(bytes32 indexed claimId, address indexed claimant, uint256 amount)",
  "event EmergencyPayout(address indexed member, uint256 amount)"
];

export const DEFI_ADAPTER_ABI = [
  // Strategy information
  "function strategyBalance() external view returns (uint256)",
  "function getAPY() external view returns (uint256)",
  "function getTVL() external view returns (uint256)",
  "function totalDeposited() external view returns (uint256)",
  "function totalHarvested() external view returns (uint256)",
  "function lastHarvestAt() external view returns (uint256)",
  
  // Actions
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function harvest() external returns (uint256)",
  "function emergencyWithdraw() external",
  
  // Admin functions
  "function setStrategy(address newStrategy) external",
  "function setAPY(uint256 newAPY) external",
  "function pause() external",
  "function unpause() external",
  
  // Events
  "event Deposit(uint256 amount)",
  "event Withdrawal(uint256 amount)",
  "event Harvest(uint256 amount)",
  "event EmergencyWithdraw(uint256 amount)",
  "event StrategyChanged(address indexed oldStrategy, address indexed newStrategy)"
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

// Network-specific contract addresses
export const NETWORK_CONFIG = {
  // Kaia Mainnet (8217) - Using real USDT
  8217: {
    name: 'Kaia Mainnet',
    chainId: 8217,
    rpc: 'https://public-en-cypress.kaia.io',
    explorer: 'https://scope.klaytn.com',
    // TODO: Replace with actual USDT contract address on Kaia Mainnet
    // This should be the real USDT token deployed on Kaia Mainnet
    USDT: '0xceE8FAF64bB97a73bb51E115Aa89C17FfA8dD167', // Real USDT on Kaia Mainnet (example - needs verification)
    // Note: Your deployed contracts are on testnet, mainnet would need separate deployment
    ESCROW_VAULT: '0x6dca750C61bea425768AEbfba354C81A4122482d', // Would need mainnet deployment
    STAKE_MANAGER: '0x72a773725845E2F4BBB5b8b2C5C5b06e48B5f4e5', // Would need mainnet deployment
    INSURANCE_POOL: '0x7054347C5fe4B2056fcbC482C32D5617978d9F0a', // Would need mainnet deployment
    HEMAT_FACTORY: '0xCeDfe4FAad227720499F2318F92845b87144d702', // Would need mainnet deployment
    MOCK_DEFI_ADAPTER: '0xB3a49DcFa3df4a28bdac61f98893FC2854319EB7' // Would need mainnet deployment
  },
  // Kaia Testnet (1001) - Using MockUSDT
  1001: {
    name: 'Kaia Testnet Kairos',
    chainId: 1001,
    rpc: 'https://public-en-kairos.kaia.io',
    explorer: 'https://baobab.scope.klaytn.com',
    USDT: '0xFE77673f4BF659ef28bD0b3B66013dB5acFA0eBe', // MockUSDT deployed on Testnet
    ESCROW_VAULT: '0x6dca750C61bea425768AEbfba354C81A4122482d',
    STAKE_MANAGER: '0x72a773725845E2F4BBB5b8b2C5C5b06e48B5f4e5',
    INSURANCE_POOL: '0x7054347C5fe4B2056fcbC482C32D5617978d9F0a',
    HEMAT_FACTORY: '0xCeDfe4FAad227720499F2318F92845b87144d702',
    MOCK_DEFI_ADAPTER: '0xB3a49DcFa3df4a28bdac61f98893FC2854319EB7'
  }
};

// Legacy contract addresses (for backward compatibility) - defaults to testnet
export const CONTRACT_ADDRESSES = NETWORK_CONFIG[1001];

// Get contract addresses for specific network
export const getContractAddresses = (chainId: number) => {
  return NETWORK_CONFIG[chainId] || NETWORK_CONFIG[1001]; // Default to testnet if unknown network
};

// Get USDT token info based on network
export const getUSDTTokenInfo = (chainId: number) => {
  const config = getContractAddresses(chainId);
  return {
    address: config.USDT,
    symbol: chainId === 8217 ? 'USDT' : 'USDT', // Both use USDT symbol
    name: chainId === 8217 ? 'Tether USD' : 'Mock USDT',
    decimals: 6,
    isTestnet: chainId !== 8217,
    image: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  };
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

// Get all contract instances for specific network
export const getContractInstances = (signerOrProvider?: ethers.Signer | ethers.providers.Provider, chainId?: number): ContractInstances => {
  const addresses = chainId ? getContractAddresses(chainId) : CONTRACT_ADDRESSES;
  
  return {
    usdt: getContractInstance(addresses.USDT, USDT_ABI, signerOrProvider),
    escrowVault: getContractInstance(addresses.ESCROW_VAULT, ESCROW_VAULT_ABI, signerOrProvider),
    stakeManager: getContractInstance(addresses.STAKE_MANAGER, STAKE_MANAGER_ABI, signerOrProvider),
    insurancePool: getContractInstance(addresses.INSURANCE_POOL, INSURANCE_POOL_ABI, signerOrProvider),
    hematFactory: getContractInstance(addresses.HEMAT_FACTORY, HEMAT_FACTORY_ABI, signerOrProvider),
    mockDeFiAdapter: getContractInstance(addresses.MOCK_DEFI_ADAPTER, DEFI_ADAPTER_ABI, signerOrProvider)
  };
};