import React from 'react'

type Props = { children: React.ReactNode }

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="glass-card p-6 max-w-md text-center">
            <h2 className="text-white text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm">Please refresh the page. If the problem persists, try switching networks or reconnecting your wallet.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}