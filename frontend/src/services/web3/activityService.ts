import { ethers } from 'ethers'
import {
  CONTRACT_ADDRESSES,
  HEMAT_FACTORY_ABI,
  HEMAT_GROUP_ABI,
  ESCROW_VAULT_ABI,
} from './contracts'
import { kaiaTestnet, kaiaMainnet } from './config'
import type { GroupInfo } from './hematService'

export type ActivityType =
  | 'GroupCreated'
  | 'MemberJoined'
  | 'MemberLeft'
  | 'ContributionMade'
  | 'PayoutClaimed'
  | 'CycleCompleted'
  | 'DefaultEnforced'
  | 'EmergencyClaimSubmitted'
  | 'GroupPaused'
  | 'GroupResumed'
  | 'GroupCancelled'
  | 'VaultDeposit'
  | 'VaultWithdrawal'
  | 'YieldHarvested'
  | 'YieldReinvested'

export interface ActivityItem {
  type: ActivityType
  txHash: string
  blockNumber: number
  timestamp: number
  groupId?: number
  groupAddress?: string
  member?: string
  amount?: string
  metadata?: Record<string, any>
}

function getDefaultProvider(): ethers.providers.Provider {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    // Use connected wallet provider if available
    return new ethers.providers.Web3Provider((window as any).ethereum)
  }
  // Fallback to a public RPC (prefer testnet to avoid rate limits)
  const rpcUrl = (kaiaTestnet.rpcUrls as any).default.http[0] || 'https://public-en-kairos.kaia.io'
  return new ethers.providers.JsonRpcProvider(rpcUrl)
}

function getBlockRange(latestBlock: number, lookbackBlocks = 200_000) {
  const fromBlock = Math.max(0, latestBlock - lookbackBlocks)
  return { fromBlock, toBlock: latestBlock }
}

async function withTimestamps(
  provider: ethers.providers.Provider,
  items: Omit<ActivityItem, 'timestamp'>[]
): Promise<ActivityItem[]> {
  const uniqueBlocks = Array.from(new Set(items.map(i => i.blockNumber)))
  const blockMap: Record<number, number> = {}
  await Promise.all(
    uniqueBlocks.map(async (bn) => {
      const block = await provider.getBlock(bn)
      blockMap[bn] = block?.timestamp ?? Math.floor(Date.now() / 1000)
    })
  )
  return items.map(i => ({ ...i, timestamp: blockMap[i.blockNumber] }))
}

export async function getUserOnchainActivities(
  userAddress: string,
  userGroups: Pick<GroupInfo, 'id' | 'address'>[],
  options?: { lookbackBlocks?: number }
): Promise<ActivityItem[]> {
  const provider = getDefaultProvider()
  const latestBlock = await provider.getBlockNumber()
  const { fromBlock, toBlock } = getBlockRange(latestBlock, options?.lookbackBlocks)

  const ifaceFactory = new ethers.utils.Interface(HEMAT_FACTORY_ABI)
  const ifaceGroup = new ethers.utils.Interface(HEMAT_GROUP_ABI)
  const ifaceVault = new ethers.utils.Interface(ESCROW_VAULT_ABI)

  const normalizedUser = ethers.utils.getAddress(userAddress)

  // 1) Factory: groups the user created
  const groupCreatedTopic = ifaceFactory.getEventTopic('GroupCreated')
  const factoryLogs = await provider.getLogs({
    address: CONTRACT_ADDRESSES.HEMAT_FACTORY,
    fromBlock,
    toBlock,
    topics: [groupCreatedTopic, null, ethers.utils.hexZeroPad(normalizedUser, 32)], // creator is indexed (2nd arg)
  })

  const factoryActivities: Omit<ActivityItem, 'timestamp'>[] = factoryLogs.map((log) => {
    const parsed = ifaceFactory.parseLog(log)
    const groupId: ethers.BigNumber = parsed.args.groupId
    const groupAddress: string = parsed.args.groupAddress
    return {
      type: 'GroupCreated',
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      groupId: groupId.toNumber(),
      groupAddress,
      metadata: {
        model: parsed.args.model,
        contributionAmount: parsed.args.contributionAmount?.toString?.(),
        cycleInterval: parsed.args.cycleInterval?.toString?.(),
        groupSize: parsed.args.groupSize?.toString?.(),
      },
    }
  })

  // 2) Group-level events for the groups the user is a member/creator of
  const memberJoinedTopic = ifaceGroup.getEventTopic('MemberJoined')
  const memberLeftTopic = ifaceGroup.getEventTopic('MemberLeft')
  const contributionMadeTopic = ifaceGroup.getEventTopic('ContributionMade')
  const payoutClaimedTopic = ifaceGroup.getEventTopic('PayoutClaimed')
  const cycleCompletedTopic = ifaceGroup.getEventTopic('CycleCompleted')
  const defaultEnforcedTopic = ifaceGroup.getEventTopic('DefaultEnforced')
  const emergencyClaimSubmittedTopic = ifaceGroup.getEventTopic('EmergencyClaimSubmitted')
  const groupPausedTopic = ifaceGroup.getEventTopic('GroupPaused')
  const groupResumedTopic = ifaceGroup.getEventTopic('GroupResumed')
  const groupCancelledTopic = ifaceGroup.getEventTopic('GroupCancelled')

  const groupActivities: Omit<ActivityItem, 'timestamp'>[] = []

  for (const g of userGroups) {
    const groupAddr = ethers.utils.getAddress(g.address)

    // Only pull logs where user is the indexed member (when applicable)
    const filters = [
      { topic: memberJoinedTopic, topics: [memberJoinedTopic, ethers.utils.hexZeroPad(normalizedUser, 32)] },
      { topic: memberLeftTopic, topics: [memberLeftTopic, ethers.utils.hexZeroPad(normalizedUser, 32)] },
      { topic: contributionMadeTopic, topics: [contributionMadeTopic, ethers.utils.hexZeroPad(normalizedUser, 32)] },
      { topic: payoutClaimedTopic, topics: [payoutClaimedTopic, ethers.utils.hexZeroPad(normalizedUser, 32)] },
      { topic: cycleCompletedTopic, topics: [cycleCompletedTopic] },
      { topic: defaultEnforcedTopic, topics: [defaultEnforcedTopic, ethers.utils.hexZeroPad(normalizedUser, 32)] },
      { topic: emergencyClaimSubmittedTopic, topics: [emergencyClaimSubmittedTopic, ethers.utils.hexZeroPad(normalizedUser, 32)] },
      { topic: groupPausedTopic, topics: [groupPausedTopic] },
      { topic: groupResumedTopic, topics: [groupResumedTopic] },
      { topic: groupCancelledTopic, topics: [groupCancelledTopic] },
    ]

    for (const f of filters) {
      const logs = await provider.getLogs({ address: groupAddr, fromBlock, toBlock, topics: f.topics })
      for (const log of logs) {
        const parsed = ifaceGroup.parseLog(log)
        const base: Omit<ActivityItem, 'timestamp'> = {
          type: parsed.name as ActivityType,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          groupId: g.id,
          groupAddress: groupAddr,
        }
        switch (parsed.name) {
          case 'MemberJoined':
            groupActivities.push({ ...base, member: parsed.args.member })
            break
          case 'MemberLeft':
            groupActivities.push({ ...base, member: parsed.args.member })
            break
          case 'ContributionMade':
            groupActivities.push({ ...base, member: parsed.args.member, amount: parsed.args.amount.toString() })
            break
          case 'PayoutClaimed':
            groupActivities.push({ ...base, member: parsed.args.member, amount: parsed.args.amount.toString() })
            break
          case 'CycleCompleted':
            groupActivities.push({ ...base, metadata: { cycleNumber: parsed.args.cycleNumber?.toString?.() } })
            break
          case 'DefaultEnforced':
            groupActivities.push({ ...base, member: parsed.args.member, amount: parsed.args.penaltyAmount?.toString?.() })
            break
          case 'EmergencyClaimSubmitted':
            groupActivities.push({ ...base, member: parsed.args.member, amount: parsed.args.amount?.toString?.(), metadata: { evidenceCID: parsed.args.evidenceCID } })
            break
          case 'GroupPaused':
          case 'GroupResumed':
          case 'GroupCancelled':
            groupActivities.push(base)
            break
        }
      }
    }
  }

  // 3) Escrow vault events per groupId
  const depositTopic = ifaceVault.getEventTopic('Deposit')
  const withdrawalTopic = ifaceVault.getEventTopic('Withdrawal')
  const yieldHarvestedTopic = ifaceVault.getEventTopic('YieldHarvested')
  const yieldReinvestedTopic = ifaceVault.getEventTopic('YieldReinvested')

  const vaultActivities: Omit<ActivityItem, 'timestamp'>[] = []
  for (const g of userGroups) {
    // Filter by indexed groupId (topic[1])
    const groupIdHex = ethers.utils.hexZeroPad(ethers.utils.hexlify(g.id), 32)
    const vaultFilters = [
      { topic: depositTopic, topics: [depositTopic, groupIdHex] },
      { topic: withdrawalTopic, topics: [withdrawalTopic, groupIdHex] },
      { topic: yieldHarvestedTopic, topics: [yieldHarvestedTopic, groupIdHex] },
      { topic: yieldReinvestedTopic, topics: [yieldReinvestedTopic, groupIdHex] },
    ]
    for (const f of vaultFilters) {
      const logs = await provider.getLogs({ address: CONTRACT_ADDRESSES.ESCROW_VAULT, fromBlock, toBlock, topics: f.topics })
      for (const log of logs) {
        const parsed = ifaceVault.parseLog(log)
        const base: Omit<ActivityItem, 'timestamp'> = {
          type: parsed.name === 'Deposit'
            ? 'VaultDeposit'
            : parsed.name === 'Withdrawal'
              ? 'VaultWithdrawal'
              : parsed.name as ActivityType,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          groupId: g.id,
        }
        switch (parsed.name) {
          case 'Deposit':
          case 'Withdrawal':
            vaultActivities.push({ ...base, member: parsed.args.member, amount: parsed.args.amount.toString() })
            break
          case 'YieldHarvested':
          case 'YieldReinvested':
            vaultActivities.push({ ...base, amount: parsed.args.amount.toString() })
            break
        }
      }
    }
  }

  const withTimes = await withTimestamps(provider, [
    ...factoryActivities,
    ...groupActivities,
    ...vaultActivities,
  ])

  // Sort newest first
  withTimes.sort((a, b) => b.blockNumber - a.blockNumber || b.timestamp - a.timestamp)
  return withTimes
}