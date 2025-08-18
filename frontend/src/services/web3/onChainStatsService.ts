import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, HEMAT_FACTORY_ABI } from './contracts';

export interface OnChainPlatformStats {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  totalValueLocked: string; // Formatted USDT amount
}

export interface GroupStatsByModel {
  rotational: number;
  fixedSavings: number;
  emergency: number;
}

/**
 * Get provider - prioritize connected wallet, fallback to public RPC
 */
function getProvider(): ethers.providers.Provider {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }
  // Fallback to Kaia public RPC
  return new ethers.providers.JsonRpcProvider('https://public-en-kairos.kaia.io');
}

/**
 * Fetch real-time platform statistics directly from HematFactory contract
 * Replaces all mock data with blockchain data
 */
export async function fetchOnChainPlatformStats(): Promise<OnChainPlatformStats> {
  try {
    const provider = getProvider();
    
    // Create factory contract instance
    const factory = new ethers.Contract(
      CONTRACT_ADDRESSES.HEMAT_FACTORY,
      HEMAT_FACTORY_ABI,
      provider
    );

    // Fetch platform stats from blockchain
    const [totalGroups, activeGroups, totalMembers, totalValueLocked] = await factory.getPlatformStats();

    // Format USDT value (6 decimals)
    const formattedTVL = ethers.utils.formatUnits(totalValueLocked, 6);

    return {
      totalGroups: totalGroups.toNumber(),
      activeGroups: activeGroups.toNumber(),
      totalMembers: totalMembers.toNumber(),
      totalValueLocked: formattedTVL
    };
  } catch (error) {
    console.error('Error fetching on-chain platform stats:', error);
    
    // Return zeros if blockchain call fails (no mock data)
    return {
      totalGroups: 0,
      activeGroups: 0,
      totalMembers: 0,
      totalValueLocked: '0'
    };
  }
}

/**
 * Get detailed group statistics by thrift model type
 */
export async function fetchGroupStatsByModel(): Promise<GroupStatsByModel> {
  try {
    const provider = getProvider();
    
    const factory = new ethers.Contract(
      CONTRACT_ADDRESSES.HEMAT_FACTORY,
      HEMAT_FACTORY_ABI,
      provider
    );

    // Fetch group counts by model type
    const [rotational, fixedSavings, emergency] = await factory.getGroupStatsByModel();

    return {
      rotational: rotational.toNumber(),
      fixedSavings: fixedSavings.toNumber(),
      emergency: emergency.toNumber(),
    };
  } catch (error) {
    console.error('Error fetching group stats by model:', error);
    return {
      rotational: 0,
      fixedSavings: 0,
      emergency: 0,
    };
  }
}

/**
 * Calculate platform health metrics from on-chain data
 */
export async function calculatePlatformHealth(): Promise<{
  healthScore: number;
  activeRatio: number;
  avgGroupSize: number;
  totalValueUSD: number;
}> {
  try {
    const stats = await fetchOnChainPlatformStats();
    
    // Calculate health metrics
    const activeRatio = stats.totalGroups > 0 ? stats.activeGroups / stats.totalGroups : 0;
    const avgGroupSize = stats.activeGroups > 0 ? stats.totalMembers / stats.activeGroups : 0;
    const totalValueUSD = parseFloat(stats.totalValueLocked);
    
    // Platform health score calculation (0-100)
    // Based on: active ratio (40%), average group size (30%), TVL growth (30%)
    const healthScore = Math.min(100, Math.round(
      (activeRatio * 40) + 
      (Math.min(avgGroupSize / 8, 1) * 30) + // Target avg group size of 8
      (Math.min(totalValueUSD / 1000000, 1) * 30) // Target 1M USDT TVL
    ));

    return {
      healthScore,
      activeRatio: Math.round(activeRatio * 100) / 100,
      avgGroupSize: Math.round(avgGroupSize * 100) / 100,
      totalValueUSD: totalValueUSD
    };
  } catch (error) {
    console.error('Error calculating platform health:', error);
    return {
      healthScore: 0,
      activeRatio: 0,
      avgGroupSize: 0,
      totalValueUSD: 0
    };
  }
}

/**
 * Get platform growth metrics over time
 * Uses blockchain events to track historical data
 */
export async function fetchPlatformGrowthMetrics(daysBack: number = 30): Promise<{
  dailyNewGroups: number[];
  dailyNewMembers: number[];
  dailyVolume: number[];
  labels: string[];
}> {
  try {
    const provider = getProvider();
    const factory = new ethers.Contract(CONTRACT_ADDRESSES.HEMAT_FACTORY, HEMAT_FACTORY_ABI, provider);
    
    // Calculate block range for the past N days
    const currentBlock = await provider.getBlockNumber();
    const blocksPerDay = Math.floor(86400 / 1); // Assuming 1 second block time on Kaia
    const fromBlock = Math.max(0, currentBlock - (daysBack * blocksPerDay));
    
    // Fetch GroupCreated events
    const groupCreatedFilter = factory.filters.GroupCreated();
    const groupEvents = await factory.queryFilter(groupCreatedFilter, fromBlock, currentBlock);
    
    // Process events by day
    const dailyData: Record<string, { groups: number; members: Set<string>; volume: number }> = {};
    
    for (const event of groupEvents) {
      const block = await provider.getBlock(event.blockNumber);
      const date = new Date(block.timestamp * 1000).toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = { groups: 0, members: new Set(), volume: 0 };
      }
      
      dailyData[date].groups++;
      // Note: Would need to track member joins and contributions for complete metrics
    }
    
    // Convert to arrays
    const dates = Object.keys(dailyData).sort();
    const dailyNewGroups = dates.map(date => dailyData[date].groups);
    const dailyNewMembers = dates.map(date => dailyData[date].members.size);
    const dailyVolume = dates.map(date => dailyData[date].volume);
    
    return {
      dailyNewGroups,
      dailyNewMembers,
      dailyVolume,
      labels: dates
    };
  } catch (error) {
    console.error('Error fetching platform growth metrics:', error);
    return {
      dailyNewGroups: [],
      dailyNewMembers: [],
      dailyVolume: [],
      labels: []
    };
  }
}