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
      <div className="glass-card">
        <div className="p-8 text-kaia-text-muted text-center">No on-chain activity yet</div>
      </div>
    )
  }

  return (
    <div className="glass-card">
      <div className="p-8">
        <h3 className="text-2xl font-semibold text-kaia-text-primary mb-6">On-chain Activity</h3>
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={`${it.txHash}-${it.blockNumber}`} className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
              <div>
                <div className="text-kaia-text-primary text-sm font-medium">
                  {labelMap[it.type] || it.type}
                  {it.amount && (
                    <span className="text-kaia-text-muted"> · {formatAmount(it.amount)} USDT</span>
                  )}
                </div>
                <div className="text-xs text-kaia-text-muted mt-1">
                  {it.groupId !== undefined && <span>Group #{it.groupId} · </span>}
                  <a
                    href={`https://scope.klaytn.com/tx/${it.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-kaia-primary hover:text-kaia-primaryLight transition-colors duration-300"
                  >
                    View Tx
                  </a>
                </div>
              </div>
              <div className="text-xs text-kaia-text-muted">{timeAgo(it.timestamp)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}