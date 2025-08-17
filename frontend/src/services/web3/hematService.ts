import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import {
  CONTRACT_ADDRESSES,
  HEMAT_FACTORY_ABI,
  HEMAT_GROUP_ABI,
  ESCROW_VAULT_ABI,
  STAKE_MANAGER_ABI,
  INSURANCE_POOL_ABI,
  DEFI_ADAPTER_ABI,
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
  gracePeriod: string;
  insuranceBps: string;
  platformFeeBps: string;
  earlyWithdrawalPenaltyBps: string;
  memberCount: string;
  activeMemberCount: string;
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
  defaultCount: string;
  paymentHistory: string;
  isBlacklisted: boolean;
}

export interface InsuranceClaim {
  id: string;
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
  defaultCount: string;
  paymentHistory: string;
  isBlacklisted: boolean;
}

export interface DeFiInfo {
  strategyBalance: string;
  apy: string;
  tvl: string;
  totalDeposited: string;
  totalHarvested: string;
  lastHarvestAt: string;
}

export interface YieldInfo {
  groupDeposits: string;
  groupYield: string;
  groupTotalValue: string;
  totalDeposits: string;
  totalYield: string;
  lastHarvestAt: string;
}

export class HematService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: any = {};
  private subscriptionPricesUSDT: Record<number, string> = {
    // 0: Basic (free), 1: Trust, 2: Super-Trust
    0: '0',
    1: '10',
    2: '25',
  };

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts() {
    if (typeof window !== 'undefined') {
      const anyWindow: any = window as any;
      const injected = anyWindow.ethereum || anyWindow.klaytn;
      if (injected) {
        this.provider = new ethers.providers.Web3Provider(injected);
        this.signer = this.provider.getSigner();
        this.contracts = getContractInstances(this.signer);
      }
    }
  }

  // Connect wallet
  async connectWallet(): Promise<string | null> {
    try {
      if (!this.provider) {
        await this.initializeContracts();
      }
      
      if (this.provider) {
        let accounts: string[] = [];
        try {
          accounts = await this.provider.send('eth_requestAccounts', []);
        } catch (e) {
          // Fallback for Kaikas-specific method names if needed
          const injected: any = (window as any).klaytn || (window as any).ethereum;
          if (injected?.request) {
            accounts = await injected.request({ method: 'eth_requestAccounts' }).catch(async () => {
              return injected.request({ method: 'klaytn_requestAccounts' });
            });
          }
        }
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
  async getTreasuryAddress(): Promise<string | null> {
    try {
      return await this.contracts.hematFactory.treasuryAddress();
    } catch (e) {
      return null;
    }
  }

  async paySubscription(model: number): Promise<boolean> {
    try {
      const price = this.subscriptionPricesUSDT[model] || '0';
      if (price === '0') return true;
      if (!this.signer) return false;
      const treasury = await this.getTreasuryAddress();
      if (!treasury) return false;
      const amountWei = ethers.utils.parseUnits(price, 6);
      const tx = await this.contracts.usdt.transfer(treasury, amountWei);
      await tx.wait();
      return true;
    } catch (e) {
      toast.error('Subscription payment failed');
      return false;
    }
  }

  async getUSDTBalance(address: string): Promise<string> {
    try {
      const balance = await this.contracts.usdt.balanceOf(address);
      return ethers.utils.formatUnits(balance, 6); // USDT has 6 decimals
    } catch (error) {
      console.error('Error getting USDT balance:', error);
      return '0';
    }
  }

  async getPlatformBasicGroupCount(): Promise<number> {
    try {
      const count = await this.contracts.hematFactory.groupCountByModel(0);
      return Number(count.toString());
    } catch {
      return 0;
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
        currentPayoutIndex, maturityTime, gracePeriod, insuranceBps, platformFeeBps,
        earlyWithdrawalPenaltyBps, memberCount, activeMemberCount
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
        groupContract.maturityTime(),
        groupContract.gracePeriod(),
        groupContract.insuranceBps(),
        groupContract.platformFeeBps(),
        groupContract.earlyWithdrawalPenaltyBps(),
        groupContract.getMemberCount(),
        groupContract.getActiveMemberCount()
      ]);

      // Get members
      const members = [];
      for (let i = 0; i < memberCount.toNumber(); i++) {
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
        gracePeriod: gracePeriod.toString(),
        insuranceBps: insuranceBps.toString(),
        platformFeeBps: platformFeeBps.toString(),
        earlyWithdrawalPenaltyBps: earlyWithdrawalPenaltyBps.toString(),
        memberCount: memberCount.toString(),
        activeMemberCount: activeMemberCount.toString(),
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

  async leaveGroup(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.leaveGroup();
      await tx.wait();
      
      toast.success('Successfully left the group!');
      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
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

  async submitEmergencyClaim(groupAddress: string, amount: string, evidenceCID: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const amountWei = ethers.utils.parseUnits(amount, 6);

      const tx = await groupContract.submitEmergencyClaim(amountWei, evidenceCID);
      await tx.wait();
      
      toast.success('Emergency claim submitted successfully!');
      return true;
    } catch (error) {
      console.error('Error submitting emergency claim:', error);
      toast.error('Failed to submit emergency claim');
      return false;
    }
  }

  async completeCycle(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.completeCycle();
      await tx.wait();
      
      toast.success('Cycle completed successfully!');
      return true;
    } catch (error) {
      console.error('Error completing cycle:', error);
      toast.error('Failed to complete cycle');
      return false;
    }
  }

  async enforceDefault(groupAddress: string, member: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.enforceDefault(member);
      await tx.wait();
      
      toast.success('Default enforced successfully!');
      return true;
    } catch (error) {
      console.error('Error enforcing default:', error);
      toast.error('Failed to enforce default');
      return false;
    }
  }

  async emergencyWithdraw(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.emergencyWithdraw();
      await tx.wait();
      
      toast.success('Emergency withdrawal successful!');
      return true;
    } catch (error) {
      console.error('Error emergency withdrawing:', error);
      toast.error('Failed to emergency withdraw');
      return false;
    }
  }

  // Group Admin Operations
  async pauseGroup(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.pauseGroup();
      await tx.wait();
      
      toast.success('Group paused successfully!');
      return true;
    } catch (error) {
      console.error('Error pausing group:', error);
      toast.error('Failed to pause group');
      return false;
    }
  }

  async resumeGroup(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.resumeGroup();
      await tx.wait();
      
      toast.success('Group resumed successfully!');
      return true;
    } catch (error) {
      console.error('Error resuming group:', error);
      toast.error('Failed to resume group');
      return false;
    }
  }

  async cancelGroup(groupAddress: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const groupContract = new ethers.Contract(groupAddress, HEMAT_GROUP_ABI, this.signer);
      const tx = await groupContract.cancelGroup();
      await tx.wait();
      
      toast.success('Group cancelled successfully!');
      return true;
    } catch (error) {
      console.error('Error cancelling group:', error);
      toast.error('Failed to cancel group');
      return false;
    }
  }

  // Insurance Operations
  async submitInsuranceClaim(groupId: number, amount: string, evidenceCID: string): Promise<string | null> {
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
        return claimId;
      }
      
      return null;
    } catch (error) {
      console.error('Error submitting insurance claim:', error);
      toast.error('Failed to submit insurance claim');
      return null;
    }
  }

  async getInsuranceClaimsByMember(member: string): Promise<string[]> {
    try {
      const claimIds = await this.contracts.insurancePool.getClaimsByMember(member);
      return claimIds;
    } catch (error) {
      console.error('Error getting member claims:', error);
      return [];
    }
  }

  async getInsuranceClaim(claimId: string): Promise<InsuranceClaim | null> {
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

  async getInsurancePoolStats() {
    try {
      const [totalPremiums, totalClaimsPaid, totalClaimsDenied, reserveRatio] = await Promise.all([
        this.contracts.insurancePool.totalPremiums(),
        this.contracts.insurancePool.totalClaimsPaid(),
        this.contracts.insurancePool.totalClaimsDenied(),
        this.contracts.insurancePool.reserveRatio()
      ]);

      return {
        totalPremiums: ethers.utils.formatUnits(totalPremiums, 6),
        totalClaimsPaid: ethers.utils.formatUnits(totalClaimsPaid, 6),
        totalClaimsDenied: ethers.utils.formatUnits(totalClaimsDenied, 6),
        reserveRatio: reserveRatio.toString()
      };
    } catch (error) {
      console.error('Error getting insurance pool stats:', error);
      return null;
    }
  }

  // Staking Operations
  async depositStake(groupId: number, amount: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const amountWei = ethers.utils.parseUnits(amount, 6);
      
      // First approve USDT for the stake manager
      await this.approveUSDT(CONTRACT_ADDRESSES.STAKE_MANAGER, amount);

      const tx = await this.contracts.stakeManager.depositStake(groupId, amountWei);
      await tx.wait();
      
      toast.success('Stake deposited successfully!');
      return true;
    } catch (error) {
      console.error('Error depositing stake:', error);
      toast.error('Failed to deposit stake');
      return false;
    }
  }

  async withdrawStake(groupId: number, amount: string): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const amountWei = ethers.utils.parseUnits(amount, 6);
      const tx = await this.contracts.stakeManager.withdrawStake(groupId, amountWei);
      await tx.wait();
      
      toast.success('Stake withdrawn successfully!');
      return true;
    } catch (error) {
      console.error('Error withdrawing stake:', error);
      toast.error('Failed to withdraw stake');
      return false;
    }
  }

  async getStakeInfo(groupId: number, member: string): Promise<StakeInfo | null> {
    try {
      const [stakeAmount, trustScore, totalStakes, stakeHistory, defaultCount, paymentHistory, isBlacklisted] = await Promise.all([
        this.contracts.stakeManager.getMemberStake(groupId, member),
        this.contracts.stakeManager.getTrustScore(groupId, member),
        this.contracts.stakeManager.getTotalStakes(groupId),
        this.contracts.stakeManager.getStakeHistory(groupId, member),
        this.contracts.stakeManager.getMemberDefaultCount(groupId, member),
        this.contracts.stakeManager.getMemberPaymentHistory(groupId, member),
        this.contracts.stakeManager.isMemberBlacklisted(groupId, member)
      ]);

      return {
        stakeAmount: ethers.utils.formatUnits(stakeAmount, 6),
        trustScore: trustScore.toString(),
        totalStakes: ethers.utils.formatUnits(totalStakes, 6),
        stakeHistory: stakeHistory.map((stake: ethers.BigNumber) => ethers.utils.formatUnits(stake, 6)),
        defaultCount: defaultCount.toString(),
        paymentHistory: paymentHistory.toString(),
        isBlacklisted
      };
    } catch (error) {
      console.error('Error getting stake info:', error);
      return null;
    }
  }

  // DeFi Adapter Operations
  async getDeFiInfo(): Promise<DeFiInfo | null> {
    try {
      const [strategyBalance, apy, tvl, totalDeposited, totalHarvested, lastHarvestAt] = await Promise.all([
        this.contracts.mockDeFiAdapter.strategyBalance(),
        this.contracts.mockDeFiAdapter.getAPY(),
        this.contracts.mockDeFiAdapter.getTVL(),
        this.contracts.mockDeFiAdapter.totalDeposited(),
        this.contracts.mockDeFiAdapter.totalHarvested(),
        this.contracts.mockDeFiAdapter.lastHarvestAt()
      ]);

      return {
        strategyBalance: ethers.utils.formatUnits(strategyBalance, 6),
        apy: apy.toString(),
        tvl: ethers.utils.formatUnits(tvl, 6),
        totalDeposited: ethers.utils.formatUnits(totalDeposited, 6),
        totalHarvested: ethers.utils.formatUnits(totalHarvested, 6),
        lastHarvestAt: lastHarvestAt.toString()
      };
    } catch (error) {
      console.error('Error getting DeFi info:', error);
      return null;
    }
  }

  async harvestDeFiYield(): Promise<string | null> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return null;
      }

      const tx = await this.contracts.mockDeFiAdapter.harvest();
      const receipt = await tx.wait();
      
      // Find the Harvest event
      const event = receipt.events?.find(e => e.event === 'Harvest');
      if (event) {
        const amount = event.args?.amount;
        const formattedAmount = ethers.utils.formatUnits(amount, 6);
        toast.success(`Yield harvested successfully! Amount: ${formattedAmount} USDT`);
        return formattedAmount;
      }
      
      return null;
    } catch (error) {
      console.error('Error harvesting DeFi yield:', error);
      toast.error('Failed to harvest yield');
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

  async getGroupTotalValue(groupId: number): Promise<string> {
    try {
      const totalValue = await this.contracts.escrowVault.getGroupTotalValue(groupId);
      return ethers.utils.formatUnits(totalValue, 6);
    } catch (error) {
      console.error('Error getting group total value:', error);
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

  async reinvestYield(groupId: number): Promise<boolean> {
    try {
      if (!this.signer) {
        toast.error('Please connect your wallet first');
        return false;
      }

      const tx = await this.contracts.escrowVault.reinvestYield(groupId);
      await tx.wait();
      
      toast.success('Yield reinvested successfully!');
      return true;
    } catch (error) {
      console.error('Error reinvesting yield:', error);
      toast.error('Failed to reinvest yield');
      return false;
    }
  }

  async getYieldInfo(): Promise<YieldInfo | null> {
    try {
      const [totalDeposits, totalYield, lastHarvestAt] = await Promise.all([
        this.contracts.escrowVault.totalDeposits(),
        this.contracts.escrowVault.totalYield(),
        this.contracts.escrowVault.lastHarvestAt()
      ]);

      return {
        groupDeposits: '0', // This would need to be calculated per group
        groupYield: '0', // This would need to be calculated per group
        groupTotalValue: '0', // This would need to be calculated per group
        totalDeposits: ethers.utils.formatUnits(totalDeposits, 6),
        totalYield: ethers.utils.formatUnits(totalYield, 6),
        lastHarvestAt: lastHarvestAt.toString()
      };
    } catch (error) {
      console.error('Error getting yield info:', error);
      return null;
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
    const models = ['Basic', 'Trust', 'Super-Trust'];
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

  formatTime(seconds: string): string {
    const secs = parseInt(seconds);
    if (secs === 0) return 'No lock';
    if (secs < 86400) return `${secs / 3600} hours`;
    if (secs < 2592000) return `${secs / 86400} days`;
    return `${secs / 2592000} months`;
  }

  formatAPY(bps: string): string {
    const apy = parseInt(bps) / 100;
    return `${apy.toFixed(2)}%`;
  }
}

// Export singleton instance
export const hematService = new HematService();