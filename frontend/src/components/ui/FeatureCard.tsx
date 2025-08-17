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
    <div className="glass-card p-6 hover:shadow-2xl transition-transform duration-300 hover:-translate-y-1">
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20">
          <div className="text-blue-400">{IconEl}</div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-300 mb-4">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default FeatureCard