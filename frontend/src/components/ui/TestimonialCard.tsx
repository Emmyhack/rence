import React from 'react'

interface TestimonialCardProps {
  quote: string
  author: string
  role?: string
  avatar?: string
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  quote, 
  author, 
  role,
  avatar 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start space-x-4">
        {avatar ? (
          <img 
            src={avatar} 
            alt={author}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://dummyimage.com/96x96/e5e7eb/111827.png&text=' + encodeURIComponent(author.charAt(0));
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {author.charAt(0)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <blockquote className="text-gray-700 italic mb-3">
            "{quote}"
          </blockquote>
          
          <div>
            <p className="font-medium text-gray-900">{author}</p>
            {role && <p className="text-sm text-gray-600">{role}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestimonialCard