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
    <div className="glass-card p-8">
      <div className="flex items-start space-x-6">
        {avatar ? (
          <img 
            src={avatar} 
            alt={author}
            className="w-16 h-16 rounded-full object-cover border-2 border-kaia-primary/30"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://dummyimage.com/96x96/111827/9ca3af.png&text=' + encodeURIComponent(author.charAt(0));
            }}
          />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-kaia-primary/20 to-kaia-primary/10 border-2 border-kaia-primary/30">
            <span className="text-kaia-primary font-semibold text-lg">
              {author.charAt(0)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <blockquote className="text-kaia-text-secondary italic mb-4 text-lg leading-relaxed">
            "{quote}"
          </blockquote>
          
          <div>
            <p className="font-semibold text-kaia-text-primary text-lg">{author}</p>
            {role && <p className="text-sm text-kaia-text-muted">{role}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestimonialCard