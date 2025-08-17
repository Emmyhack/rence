import React from 'react'
import { Link } from 'react-router-dom'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container-kaia text-center">
        <div className="glass-card p-16">
          <h1 className="text-8xl font-bold text-kaia-primary mb-6">404</h1>
          <h2 className="text-3xl font-semibold text-kaia-text-primary mb-6">Page Not Found</h2>
          <p className="text-kaia-text-secondary text-lg mb-12">
            The page you're looking for doesn't exist.
          </p>
          <Link 
            to="/" 
            className="btn-kaia-primary text-lg px-8 py-4"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage