import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode | React.ComponentType<any>
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  change, 
  changeType = 'neutral' 
}) => {
  const changeColorClass = {
    positive: 'text-kaia-primary',
    negative: 'text-red-400',
    neutral: 'text-kaia-text-muted'
  }

  const IconEl = typeof icon === 'function' ? (React.createElement(icon as React.ComponentType<any>, { className: 'w-6 h-6' })) : icon;

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-kaia-text-muted uppercase tracking-wide">{title}</h3>
        {icon && <div className="text-kaia-primary">{IconEl}</div>}
      </div>
      
      <div className="flex items-baseline justify-between">
        <p className="metric-value">{value}</p>
        {change && (
          <p className={`text-sm font-semibold ${changeColorClass[changeType]}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  )
}

export default StatsCard