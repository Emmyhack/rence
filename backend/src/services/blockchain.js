const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Import contract ABIs (these would typically be generated from contract compilation)
const HematFactoryABI = require('../abis/HematFactory.json');
const HematGroupABI = require('../abis/HematGroup.json');
const EscrowVaultABI = require('../abis/EscrowVault.json');
const StakeManagerABI = require('../abis/StakeManager.json');
const InsurancePoolABI = require('../abis/InsurancePool.json');
const MockUSDTABI = require('../abis/MockUSDT.json');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Initialize provider
      const rpcUrl = process.env.RPC_URL || 'https://public-en-kairos.kaia.io';
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      // Initialize signer (for admin operations)
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        logger.info(`Blockchain service initialized with signer: ${this.signer.address}`);
      } else {
        logger.warn('No private key provided - running in read-only mode');
      }

      // Initialize contracts
      await this.initializeContracts();
      
      // Setup event listeners
      await this.setupEventListeners();
      
      this.isInitialized = true;
      logger.info('Blockchain service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async initializeContracts() {
    const contractAddresses = {
      usdtToken: process.env.USDT_ADDRESS,
      hematFactory: process.env.HEMAT_FACTORY_ADDRESS,
      escrowVault: process.env.ESCROW_VAULT_ADDRESS,
      stakeManager: process.env.STAKE_MANAGER_ADDRESS,
      insurancePool: process.env.INSURANCE_POOL_ADDRESS,
    };

    // Validate required addresses
    for (const [key, address] of Object.entries(contractAddresses)) {
      if (!address) {
        throw new Error(`Missing contract address for ${key}`);
      }
    }

    try {
      // Initialize contract instances
      this.contracts.usdtToken = new ethers.Contract(
        contractAddresses.usdtToken,
        MockUSDTABI,
        this.provider
      );

      this.contracts.hematFactory = new ethers.Contract(
        contractAddresses.hematFactory,
        HematFactoryABI,
        this.provider
      );

      this.contracts.escrowVault = new ethers.Contract(
        contractAddresses.escrowVault,
        EscrowVaultABI,
        this.provider
      );

      this.contracts.stakeManager = new ethers.Contract(
        contractAddresses.stakeManager,
        StakeManagerABI,
        this.provider
      );

      this.contracts.insurancePool = new ethers.Contract(
        contractAddresses.insurancePool,
        InsurancePoolABI,
        this.provider
      );

      logger.info('All contracts initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async setupEventListeners() {
    try {
      // Listen to HematFactory events
      this.contracts.hematFactory.on('GroupCreated', async (groupId, creator, model, event) => {
        logger.info(`New group created: ${groupId} by ${creator}`);
        await this.handleGroupCreatedEvent(groupId, creator, model, event);
      });

      // Listen to contribution events (we'll need to set up listeners for individual groups)
      logger.info('Event listeners set up successfully');

    } catch (error) {
      logger.error('Failed to setup event listeners:', error);
    }
  }

  async handleGroupCreatedEvent(groupId, creator, model, event) {
    try {
      // Get group contract address
      const groupContract = await this.contracts.hematFactory.getGroupContract(groupId);
      
      // Store in database
      const groupService = require('./group');
      await groupService.syncGroupFromBlockchain(groupId, groupContract, creator, model);
      
    } catch (error) {
      logger.error('Failed to handle GroupCreated event:', error);
    }
  }

  // Group operations
  async createGroup(config) {
    if (!this.signer) {
      throw new Error('Signer required for creating groups');
    }

    try {
      const factoryWithSigner = this.contracts.hematFactory.connect(this.signer);
      
      const tx = await factoryWithSigner.createGroup(config);
      const receipt = await tx.wait();
      
      // Parse logs to get group ID
      const groupCreatedEvent = receipt.events?.find(e => e.event === 'GroupCreated');
      const groupId = groupCreatedEvent?.args?.groupId;
      
      return {
        groupId: groupId?.toNumber(),
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      logger.error('Failed to create group on blockchain:', error);
      throw error;
    }
  }

  async getGroupInfo(groupId) {
    try {
      const info = await this.contracts.hematFactory.getGroupInfo(groupId);
      return {
        groupContract: info.groupContract,
        creator: info.creator,
        model: info.model,
        status: info.status,
        memberCount: info.memberCount.toNumber(),
        groupSize: info.groupSize.toNumber(),
        contributionAmount: ethers.utils.formatUnits(info.contributionAmount, 6) // Assuming USDT has 6 decimals
      };
    } catch (error) {
      logger.error(`Failed to get group info for ${groupId}:`, error);
      throw error;
    }
  }

  async getGroupContract(groupId) {
    try {
      const contractAddress = await this.contracts.hematFactory.getGroupContract(groupId);
      return new ethers.Contract(contractAddress, HematGroupABI, this.provider);
    } catch (error) {
      logger.error(`Failed to get group contract for ${groupId}:`, error);
      throw error;
    }
  }

  // Member operations
  async joinGroup(groupId, memberAddress) {
    if (!this.signer) {
      throw new Error('Signer required for joining groups');
    }

    try {
      const factoryWithSigner = this.contracts.hematFactory.connect(this.signer);
      
      const tx = await factoryWithSigner.joinGroup(groupId);
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      logger.error(`Failed to join group ${groupId}:`, error);
      throw error;
    }
  }

  async makeContribution(groupId, amount, memberAddress) {
    try {
      const groupContract = await this.getGroupContract(groupId);
      const groupWithSigner = groupContract.connect(this.signer);
      
      // First approve USDT spending
      const usdtWithSigner = this.contracts.usdtToken.connect(this.signer);
      const approveTx = await usdtWithSigner.approve(groupContract.address, amount);
      await approveTx.wait();
      
      // Make contribution
      const tx = await groupWithSigner.makeContribution();
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      logger.error(`Failed to make contribution to group ${groupId}:`, error);
      throw error;
    }
  }

  // Insurance operations
  async submitInsuranceClaim(groupId, amount, evidenceCID) {
    if (!this.signer) {
      throw new Error('Signer required for submitting claims');
    }

    try {
      const insuranceWithSigner = this.contracts.insurancePool.connect(this.signer);
      
      const tx = await insuranceWithSigner.submitClaim(groupId, amount, evidenceCID);
      const receipt = await tx.wait();
      
      // Parse logs to get claim ID
      const claimSubmittedEvent = receipt.events?.find(e => e.event === 'ClaimSubmitted');
      const claimId = claimSubmittedEvent?.args?.claimId;
      
      return {
        claimId: claimId?.toNumber(),
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      logger.error('Failed to submit insurance claim:', error);
      throw error;
    }
  }

  async getInsuranceClaim(claimId) {
    try {
      const claim = await this.contracts.insurancePool.getClaim(claimId);
      return {
        claimant: claim.claimant,
        amount: ethers.utils.formatUnits(claim.amount, 6),
        groupId: claim.groupId.toNumber(),
        evidenceCID: claim.evidenceCID,
        status: claim.status,
        submittedAt: new Date(claim.submittedAt.toNumber() * 1000),
        processedAt: claim.processedAt.toNumber() > 0 ? new Date(claim.processedAt.toNumber() * 1000) : null
      };
    } catch (error) {
      logger.error(`Failed to get insurance claim ${claimId}:`, error);
      throw error;
    }
  }

  // Analytics operations
  async getPlatformStats() {
    try {
      const stats = await this.contracts.hematFactory.getPlatformStats();
      return {
        totalGroups: stats.totalGroups.toNumber(),
        activeGroups: stats.activeGroups.toNumber(),
        rotationalGroups: stats.rotationalGroups.toNumber(),
        fixedSavingsGroups: stats.fixedSavingsGroups.toNumber(),
        emergencyLiquidityGroups: stats.emergencyLiquidityGroups.toNumber()
      };
    } catch (error) {
      logger.error('Failed to get platform stats:', error);
      throw error;
    }
  }

  async getInsurancePoolHealth() {
    try {
      const health = await this.contracts.insurancePool.getPoolHealth();
      return {
        totalBalance: ethers.utils.formatUnits(health.totalBalance, 6),
        reserve: ethers.utils.formatUnits(health.reserve, 6),
        utilizationRate: health.utilizationRate.toNumber()
      };
    } catch (error) {
      logger.error('Failed to get insurance pool health:', error);
      throw error;
    }
  }

  // Utility functions
  async getTransaction(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        transaction: tx,
        receipt: receipt,
        confirmations: await this.provider.getBlockNumber() - receipt.blockNumber
      };
    } catch (error) {
      logger.error(`Failed to get transaction ${txHash}:`, error);
      throw error;
    }
  }

  async getCurrentBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  async getBalance(address) {
    try {
      const balance = await this.contracts.usdtToken.balanceOf(address);
      return ethers.utils.formatUnits(balance, 6);
    } catch (error) {
      logger.error(`Failed to get balance for ${address}:`, error);
      throw error;
    }
  }

  // Event monitoring for missed payments
  async monitorGroupPayments() {
    try {
      // This would be called by the scheduler to check for overdue payments
      const activeGroups = await this.getActiveGroups();
      
      for (const group of activeGroups) {
        await this.checkGroupPaymentDeadlines(group.onChainId);
      }
    } catch (error) {
      logger.error('Failed to monitor group payments:', error);
    }
  }

  async checkGroupPaymentDeadlines(groupId) {
    try {
      const groupContract = await this.getGroupContract(groupId);
      const members = await groupContract.getMembers();
      
      for (const member of members) {
        const isPaymentDue = await groupContract.isPaymentDue(member);
        if (isPaymentDue) {
          logger.info(`Payment overdue for member ${member} in group ${groupId}`);
          // Trigger enforcement if past grace period
          await this.enforcePaymentDeadline(groupId, member);
        }
      }
    } catch (error) {
      logger.error(`Failed to check payment deadlines for group ${groupId}:`, error);
    }
  }

  async enforcePaymentDeadline(groupId, member) {
    if (!this.signer) {
      logger.warn('Cannot enforce payment deadline without signer');
      return;
    }

    try {
      const groupContract = await this.getGroupContract(groupId);
      const groupWithSigner = groupContract.connect(this.signer);
      
      const tx = await groupWithSigner.enforceMissedPayment(member);
      await tx.wait();
      
      logger.info(`Enforced missed payment for ${member} in group ${groupId}`);
    } catch (error) {
      logger.error(`Failed to enforce payment deadline for ${member} in group ${groupId}:`, error);
    }
  }

  // Helper method to get active groups (would typically come from database)
  async getActiveGroups() {
    // This would fetch from database
    const groupService = require('./group');
    return await groupService.getActiveGroups();
  }
}

// Singleton instance
const blockchainService = new BlockchainService();

module.exports = {
  blockchainService,
  initializeBlockchainService: () => blockchainService.initialize()
};