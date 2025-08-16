import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import {
  CONTRACT_ADDRESSES,
  HEMAT_FACTORY_ABI,
  HEMAT_GROUP_ABI,
  ESCROW_VAULT_ABI,
  STAKE_MANAGER_ABI,
  INSURANCE_POOL_ABI,
  USDT_ABI,
  getContractInstances
} from './contracts';

// Types
export interface GroupConfig {
  model: number; // 0: ROTATIONAL, 1: FIXED_SAVINGS, 2: EMERGENCY_LIQUIDITY
  contributionAmount: string;
  cycleInterval: string;
  groupSize: string;
  lockDuration: string;
  gracePeriod: string;
  stakeRequired: string;
  insuranceEnabled: boolean;
  insuranceBps: string;
  platformFeeBps: string;
  earlyWithdrawalPenaltyBps: string;
}

export interface GroupInfo {
  id: number;
  address: string;
  model: number;
  contributionAmount: string;
  cycleInterval: string;
  groupSize: string;
  lockDuration: string;
  stakeRequired: string;
  insuranceEnabled: boolean;
  creator: string;
  status: number;
  currentCycle: string;
  cycleStartTime: string;
  nextPayoutTime: string;
  currentPayoutIndex: string;
  maturityTime: string;
  members: string[];
}

export interface MemberInfo {
  address: string;
  stakeAmount: string;
  totalContributed: string;
  totalReceived: string;
  trustScore: string;
  joinedAt: string;
  isActive: boolean;
  lastContribution: string;
  hasReceivedPayout: boolean;
  memberDeposits: string;
  hasWithdrawn: boolean;
}

export interface InsuranceClaim {
  id: number;
  claimant: string;
  amount: string;
  groupId: number;
  evidenceCID: string;
  status: number;
  submittedAt: string;
  processedAt: string;
}

export interface StakeInfo {
  stakeAmount: string;
  trustScore: string;
  totalStakes: string;
  stakeHistory: string[];
}

export class HematService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: any = {};

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.contracts = getContractInstances(this.signer);
    }
  }

  // Connect wallet
  async connectWallet(): Promise<string | null> {
    try {
      if (!this.provider) {
        await this.initializeContracts();
      }
      
      if (this.provider) {
        const accounts = await this.provider.send('eth_requestAccounts', []);
        const address = accounts[0];
        this.signer = this.provider.getSigner();
        this.contracts = getContractInstances(this.signer);
        return address;
      }
      return null;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
      return null;
    }
  }

  // Get connected address
  async getConnectedAddress(): Promise<string | null> {
    try {
      if (this.signer) {
        return await this.signer.getAddress();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // USDT Operations
  async getUSDTBalance(address: string): Promise<string> {
    try {
      const balance = await this.contracts.usdt.balanceOf(address);
      return ethers.utils.formatUnits(balance, 6); // USDT has 6 decimals
    } catch (error) {
      console.error('Error getting USDT balance:', error);
      return '0';
    }
  }

  async approveUSDT(spender: string, amount: string): Promise<boolean> {
    try {
      const amountWei = ethers.utils.parseUnits(amount, 6);
      const tx = await this.contracts.usdt.approve(spender, amountWei);
      await tx.wait();
      toast.success('USDT approval successful');
      return true;
    } catch (error) {
      console.error('Error approving USDT:', error);
      toast.error('USDT approval failed');
      return false;
    }
  }

  async getUSDTAllowance(owner: string, spender: string): Promise<string> {
    try {
      const allowance = await this.contracts.usdt.allowance(owner, spender);
      return ethers.utils.formatUnits(allowance, 6);
    } catch (error) {
      console.error('Error getting USDT allowance:', error);
      return '0';
    }
  }

  // Group Factory Operations
  async createGroup(config: GroupConfig): Promise<number | null> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return null;
      }

      // Convert values to appropriate units
      const contributionAmount = ethers.utils.parseUnits(config.contributionAmount, 6);
      const cycleInterval = ethers.BigNumber.from(config.cycleInterval);
      const groupSize = ethers.BigNumber.from(config.groupSize);
      const lockDuration = ethers.BigNumber.from(config.lockDuration);
      const gracePeriod = ethers.BigNumber.from(config.gracePeriod);
      const stakeRequired = ethers.utils.parseUnits(config.stakeRequired, 6);
      const insuranceBps = ethers.BigNumber.from(config.insuranceBps);
      const platformFeeBps = ethers.BigNumber.from(config.platformFeeBps);
      const earlyWithdrawalPenaltyBps = ethers.BigNumber.from(config.earlyWithdrawalPenaltyBps);

      const tx = await this.contracts.hematFactory.createGroup(
        config.model,
        contributionAmount,
        cycleInterval,
        groupSize,
        lockDuration,
        gracePeriod,
        stakeRequired,
        config.insuranceEnabled,
        insuranceBps,
        platformFeeBps,
        earlyWithdrawalPenaltyBps
      );

      const receipt = await tx.wait();
      
      // Find the GroupCreated event
      const event = receipt.events?.find(e => e.event === 'GroupCreated');
      if (event) {
        const groupId = event.args?.groupId;
        toast.success(`Group created successfully! ID: ${groupId}`);
        return groupId.toNumber();
      }
      
      return null;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
      return null;
    }
  }

  async getGroupsByCreator(creator: string): Promise<number[]> {
    try {
      const groupIds = await this.contracts.hematFactory.getGroupsByCreator(creator);
      return groupIds.map((id: ethers.BigNumber) => id.toNumber());
    } catch (error) {
      console.error('Error getting creator groups:', error);
      return [];
    }
  }

  async getGroupsByMember(member: string): Promise<number[]> {
    try {
      const groupIds = await this.contracts.hematFactory.getGroupsByMember(member);
      return groupIds.map((id: ethers.BigNumber) => id.toNumber());
    } catch (error) {
      console.error('Error getting member groups:', error);
      return [];
    }
  }

  async getGroupsByModel(model: number): Promise<number[]> {
    try {
      const groupIds = await this.contracts.hematFactory.getGroupsByModel(model);
      return groupIds.map((id: ethers.BigNumber) => id.toNumber());
    } catch (error) {
      console.error('Error getting groups by model:', error);
      return [];
    }
  }

  async getGroupAddress(groupId: number): Promise<string | null> {
    try {
      return await this.contracts.hematFactory.getGroup(groupId);
    } catch (error) {
      console.error('Error getting group address:', error);
      return null;
    }
  }

  async getPlatformStats() {
    try {
      const [totalGroups, totalActive, maxGroupsPerCreator, minContribution, maxContribution, minGroupSize, maxGroupSize] = await Promise.all([
        this.contracts.hematFactory.totalGroupsCreated(),
        this.contracts.hematFactory.totalActiveGroups(),
        this.contracts.hematFactory.maxGroupsPerCreator(),
        this.contracts.hematFactory.minContributionAmount(),
        this.contracts.hematFactory.maxContributionAmount(),
        this.contracts.hematFactory.minGroupSize(),
        this.contracts.hematFactory.maxGroupSize()
      ]);

      return {
        totalGroups: totalGroups.toNumber(),
        totalActive: totalActive.toNumber(),
        maxGroupsPerCreator: maxGroupsPerCreator.toNumber(),
        minContribution: ethers.utils.formatUnits(minContribution, 6),
        maxContribution: ethers.utils.formatUnits(maxContribution, 6),
        minGroupSize: minGroupSize.toNumber(),
        maxGroupSize: maxGroupSize.toNumber()
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return null;
    }
  }

  // Group Operations
  async getGroupInfo(groupAddress: string): Promise<GroupInfo | null> {
    try {
      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.provider);
      
      const [
        model, contributionAmount, cycleInterval, groupSize, lockDuration, stakeRequired,
        insuranceEnabled, creator, status, currentCycle, cycleStartTime, nextPayoutTime,
        currentPayoutIndex, maturityTime
      ] = await Promise.all([
        groupContract.model(),
        groupContract.contributionAmount(),
        groupContract.cycleInterval(),
        groupContract.groupSize(),
        groupContract.lockDuration(),
        groupContract.stakeRequired(),
        groupContract.insuranceEnabled(),
        groupContract.creator(),
        groupContract.status(),
        groupContract.currentCycle(),
        groupContract.cycleStartTime(),
        groupContract.nextPayoutTime(),
        groupContract.currentPayoutIndex(),
        groupContract.maturityTime()
      ]);

      // Get members
      const memberCount = groupSize.toNumber();
      const members = [];
      for (let i = 0; i < memberCount; i++) {
        try {
          const member = await groupContract.members(i);
          if (member !== ethers.constants.AddressZero) {
            members.push(member);
          }
        } catch (error) {
          break;
        }
      }

      return {
        id: 0, // This would need to be passed or looked up
        address: groupAddress,
        model: model.toNumber(),
        contributionAmount: ethers.utils.formatUnits(contributionAmount, 6),
        cycleInterval: cycleInterval.toString(),
        groupSize: groupSize.toString(),
        lockDuration: lockDuration.toString(),
        stakeRequired: ethers.utils.formatUnits(stakeRequired, 6),
        insuranceEnabled,
        creator,
        status: status.toNumber(),
        currentCycle: currentCycle.toString(),
        cycleStartTime: cycleStartTime.toString(),
        nextPayoutTime: nextPayoutTime.toString(),
        currentPayoutIndex: currentPayoutIndex.toString(),
        maturityTime: maturityTime.toString(),
        members
      };
    } catch (error) {
      console.error('Error getting group info:', error);
      return null;
    }
  }

  async joinGroup(groupAddress: string, stakeAmount: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const stakeAmountWei = ethers.utils.parseUnits(stakeAmount, 6);

      // First approve USDT for the group contract
      await this.approveUSDT(groupAddress, stakeAmount);

      const tx = await groupContract.joinGroup();
      await tx.wait();
      
      toast.success('Successfully joined the group!');
      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
      return false;
    }
  }

  async contributeToGroup(groupAddress: string, amount: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const amountWei = ethers.utils.parseUnits(amount, 6);

      // First approve USDT for the group contract
      await this.approveUSDT(groupAddress, amount);

      const tx = await groupContract.contribute();
      await tx.wait();
      
      toast.success('Contribution successful!');
      return true;
    } catch (error) {
      console.error('Error contributing to group:', error);
      toast.error('Failed to contribute');
      return false;
    }
  }

  async claimPayout(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.claimPayout();
      await tx.wait();
      
      toast.success('Payout claimed successfully!');
      return true;
    } catch (error) {
      console.error('Error claiming payout:', error);
      toast.error('Failed to claim payout');
      return false;
    }
  }

  async withdrawFixedSavings(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.withdrawFixedSavings();
      await tx.wait();
      
      toast.success('Fixed savings withdrawn successfully!');
      return true;
    } catch (error) {
      console.error('Error withdrawing fixed savings:', error);
      toast.error('Failed to withdraw fixed savings');
      return false;
    }
  }

  // Insurance Operations
  async submitInsuranceClaim(groupId: number, amount: string, evidenceCID: string): Promise<number | null> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return null;
      }

      const amountWei = ethers.utils.parseUnits(amount, 6);
      const tx = await this.contracts.insurancePool.submitClaim(groupId, amountWei, evidenceCID);
      const receipt = await tx.wait();
      
      // Find the ClaimSubmitted event
      const event = receipt.events?.find(e => e.event === 'ClaimSubmitted');
      if (event) {
        const claimId = event.args?.claimId;
        toast.success(`Insurance claim submitted successfully! ID: ${claimId}`);
        return claimId.toNumber();
      }
      
      return null;
    } catch (error) {
      console.error('Error submitting insurance claim:', error);
      toast.error('Failed to submit insurance claim');
      return null;
    }
  }

  async getInsuranceClaimsByMember(member: string): Promise<number[]> {
    try {
      const claimIds = await this.contracts.insurancePool.getClaimsByMember(member);
      return claimIds.map((id: ethers.BigNumber) => id.toNumber());
    } catch (error) {
      console.error('Error getting member claims:', error);
      return [];
    }
  }

  async getInsuranceClaim(claimId: number): Promise<InsuranceClaim | null> {
    try {
      const claim = await this.contracts.insurancePool.getClaim(claimId);
      
      return {
        id: claimId,
        claimant: claim.claimant,
        amount: ethers.utils.formatUnits(claim.amount, 6),
        groupId: claim.groupId.toNumber(),
        evidenceCID: claim.evidenceCID,
        status: claim.status.toNumber(),
        submittedAt: claim.submittedAt.toString(),
        processedAt: claim.processedAt.toString()
      };
    } catch (error) {
      console.error('Error getting insurance claim:', error);
      return null;
    }
  }

  // Staking Operations
  async stake(amount: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const amountWei = ethers.utils.parseUnits(amount, 6);
      
      // First approve USDT for the stake manager
      await this.approveUSDT(CONTRACT_ADDRESSES.STAKE_MANAGER, amount);

      const tx = await this.contracts.stakeManager.stake(amountWei);
      await tx.wait();
      
      toast.success('Stake deposited successfully!');
      return true;
    } catch (error) {
      console.error('Error staking:', error);
      toast.error('Failed to stake');
      return false;
    }
  }

  async unstake(amount: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const amountWei = ethers.utils.parseUnits(amount, 6);
      const tx = await this.contracts.stakeManager.unstake(amountWei);
      await tx.wait();
      
      toast.success('Stake withdrawn successfully!');
      return true;
    } catch (error) {
      console.error('Error unstaking:', error);
      toast.error('Failed to unstake');
      return false;
    }
  }

  async getStakeInfo(member: string): Promise<StakeInfo | null> {
    try {
      const [stakeAmount, trustScore, totalStakes, stakeHistory] = await Promise.all([
        this.contracts.stakeManager.getMemberStake(member),
        this.contracts.stakeManager.getTrustScore(member),
        this.contracts.stakeManager.getTotalStakes(),
        this.contracts.stakeManager.getStakeHistory(member)
      ]);

      return {
        stakeAmount: ethers.utils.formatUnits(stakeAmount, 6),
        trustScore: trustScore.toString(),
        totalStakes: ethers.utils.formatUnits(totalStakes, 6),
        stakeHistory: stakeHistory.map((stake: ethers.BigNumber) => ethers.utils.formatUnits(stake, 6))
      };
    } catch (error) {
      console.error('Error getting stake info:', error);
      return null;
    }
  }

  // Escrow Vault Operations
  async getGroupDeposits(groupId: number): Promise<string> {
    try {
      const deposits = await this.contracts.escrowVault.getGroupDeposits(groupId);
      return ethers.utils.formatUnits(deposits, 6);
    } catch (error) {
      console.error('Error getting group deposits:', error);
      return '0';
    }
  }

  async getGroupYield(groupId: number): Promise<string> {
    try {
      const yield_ = await this.contracts.escrowVault.getGroupYield(groupId);
      return ethers.utils.formatUnits(yield_, 6);
    } catch (error) {
      console.error('Error getting group yield:', error);
      return '0';
    }
  }

  async harvestYield(groupId: number): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const tx = await this.contracts.escrowVault.harvestYield(groupId);
      await tx.wait();
      
      toast.success('Yield harvested successfully!');
      return true;
    } catch (error) {
      console.error('Error harvesting yield:', error);
      toast.error('Failed to harvest yield');
      return false;
    }
  }

  // Utility functions
  formatUSDT(amount: string): string {
    try {
      return parseFloat(amount).toFixed(2);
    } catch (error) {
      return '0.00';
    }
  }

  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  getThriftModelName(model: number): string {
    const models = ['Rotational Savings', 'Fixed Savings Pool', 'Emergency Liquidity'];
    return models[model] || 'Unknown';
  }

  getGroupStatusName(status: number): string {
    const statuses = ['Created', 'Active', 'Completed', 'Paused', 'Cancelled'];
    return statuses[status] || 'Unknown';
  }

  getClaimStatusName(status: number): string {
    const statuses = ['Submitted', 'Approved', 'Rejected', 'Paid'];
    return statuses[status] || 'Unknown';
  }
}

// Export singleton instance
export const hematService = new HematService();