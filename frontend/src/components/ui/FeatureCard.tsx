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
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
          <div className="text-blue-600">{IconEl}</div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default FeatureCard