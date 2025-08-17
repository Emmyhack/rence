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
    <div className="glass-card p-6">
      <div className="flex items-start space-x-4">
        {avatar ? (
          <img 
            src={avatar} 
            alt={author}
            className="w-12 h-12 rounded-full object-cover border border-gray-700"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://dummyimage.com/96x96/111827/9ca3af.png&text=' + encodeURIComponent(author.charAt(0));
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-gray-700">
            <span className="text-gray-300 font-medium">
              {author.charAt(0)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <blockquote className="text-gray-300 italic mb-3">
            "{quote}"
          </blockquote>
          
          <div>
            <p className="font-medium text-white">{author}</p>
            {role && <p className="text-sm text-gray-400">{role}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestimonialCard