import React from 'react'

interface FeatureCardProps {
  title: string
  description: string
  icon?: React.ReactNode | React.ComponentType<any>
  action?: {
    label: string
    onClick: () => void
  }
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, 
  description, 
  icon, 
  action 
}) => {
  const IconEl = typeof icon === 'function' ? (React.createElement(icon as React.ComponentType<any>, { className: 'w-6 h-6' })) : icon;
  return (
    <div className="glass-card-hover p-8 transition-all duration-300">
      {icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-kaia-md mb-6 bg-kaia-primary/20 border border-kaia-primary/30">
          <div className="text-kaia-primary">{IconEl}</div>
        </div>
      )}
      
      <h3 className="text-xl font-bold text-kaia-text-primary mb-3">{title}</h3>
      <p className="text-kaia-text-secondary mb-6 leading-relaxed">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="btn-outline text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default FeatureCard