import { useQuery } from '@tanstack/react-query'

interface PlatformStats {
  totalGroups: number
  totalMembers: number
  totalValue: string
  activeGroups: number
}

export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platformStats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Mock data for now
      return {
        totalGroups: 145,
        totalMembers: 2340,
        totalValue: '1,250,000',
        activeGroups: 89
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}