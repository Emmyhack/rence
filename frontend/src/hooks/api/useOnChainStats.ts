import { useQuery } from '@tanstack/react-query'
import { hematService } from '@services/web3/hematService'

interface OnChainPlatformStats {
  totalGroups: number
  totalMembers: number
  totalValue: string
  activeGroups: number
}

/**
 * Fetch platform statistics directly from blockchain
 * Replaces mock data with real on-chain data
 */
export const useOnChainPlatformStats = () => {
  return useQuery({
    queryKey: ['onChainPlatformStats'],
    queryFn: async (): Promise<OnChainPlatformStats> => {
      try {
        // Get real-time stats from smart contracts
        const stats = await hematService.getPlatformStats()
        
        return {
          totalGroups: stats.totalGroups || 0,
          totalMembers: stats.totalUsers || 0,
          totalValue: stats.totalVolume || '0',
          activeGroups: stats.totalActive || 0
        }
      } catch (error) {
        console.error('Error fetching on-chain platform stats:', error)
        return {
          totalGroups: 0,
          totalMembers: 0,
          totalValue: '0',
          activeGroups: 0
        }
      }
    },
    staleTime: 30 * 1000, // 30 seconds for real-time updates
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  })
}

/**
 * Get detailed group statistics by thrift model
 */
export const useGroupStatsByModel = () => {
  return useQuery({
    queryKey: ['groupStatsByModel'],
    queryFn: async () => {
      try {
        return await hematService.getGroupStatsByModel()
      } catch (error) {
        console.error('Error fetching group stats by model:', error)
        return { 0: 0, 1: 0, 2: 0 }
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  })
}