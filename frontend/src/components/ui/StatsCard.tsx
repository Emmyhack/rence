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
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400'
  }

  const IconEl = typeof icon === 'function' ? (React.createElement(icon as React.ComponentType<any>, { className: 'w-5 h-5' })) : icon;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && <div className="text-gray-500">{IconEl}</div>}
      </div>
      
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-white">{value}</p>
        {change && (
          <p className={`text-sm ${changeColorClass[changeType]}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  )
}

export default StatsCard