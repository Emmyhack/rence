import React from 'react'
import { ActivityItem } from '@services/web3/activityService'

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts)
  const mins = Math.floor(diff / 60)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatAmount(amount?: string) {
  if (!amount) return ''
  try {
    // USDT 6 decimals formatting
    const num = Number(amount) / 1e6
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 })
  } catch {
    return amount
  }
}

const labelMap: Record<string, string> = {
  GroupCreated: 'Created group',
  MemberJoined: 'Joined group',
  MemberLeft: 'Left group',
  ContributionMade: 'Contributed',
  PayoutClaimed: 'Claimed payout',
  CycleCompleted: 'Cycle completed',
  DefaultEnforced: 'Default enforced',
  EmergencyClaimSubmitted: 'Emergency claim submitted',
  GroupPaused: 'Group paused',
  GroupResumed: 'Group resumed',
  GroupCancelled: 'Group cancelled',
  VaultDeposit: 'Vault deposit',
  VaultWithdrawal: 'Vault withdrawal',
  YieldHarvested: 'Yield harvested',
  YieldReinvested: 'Yield reinvested',
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="card">
        <div className="p-6 text-gray-400">No on-chain activity yet</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">On-chain Activity</h3>
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={`${it.txHash}-${it.blockNumber}`} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div>
                <div className="text-white text-sm">
                  {labelMap[it.type] || it.type}
                  {it.amount && (
                    <span className="text-gray-400"> · {formatAmount(it.amount)} USDT</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {it.groupId !== undefined && <span>Group #{it.groupId} · </span>}
                  <a
                    href={`https://scope.klaytn.com/tx/${it.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View Tx
                  </a>
                </div>
              </div>
              <div className="text-xs text-gray-400">{timeAgo(it.timestamp)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}