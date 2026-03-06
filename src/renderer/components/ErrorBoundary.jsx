import { Component } from 'react'

/**
 * Error Boundary component voor crash-proof UI
 * Vangt JavaScript errors op in child components en toont een fallback UI
 * Cruciaal voor een uitvaart-app waar crashes onacceptabel zijn
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    
    // Log error naar console en eventueel naar bestand
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack)
    
    // Stuur error naar main process voor logging
    if (window.electronAPI?.logError) {
      window.electronAPI.logError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString()
      })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-slate-800 rounded-2xl p-8 text-center shadow-2xl">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            {/* Titel */}
            <h1 className="text-2xl font-bold text-white mb-3">
              Er is iets misgegaan
            </h1>
            
            {/* Bericht */}
            <p className="text-slate-400 mb-6">
              De presentatie player heeft een onverwachte fout ondervonden. 
              Uw presentatie is veilig opgeslagen.
            </p>
            
            {/* Error details (collapsed) */}
            <details className="text-left mb-6 bg-slate-900 rounded-lg p-4">
              <summary className="text-slate-500 cursor-pointer text-sm hover:text-slate-300">
                Technische details
              </summary>
              <pre className="mt-3 text-xs text-red-400 overflow-auto max-h-32">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            
            {/* Acties */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Probeer opnieuw
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition font-medium"
              >
                Herstart app
              </button>
            </div>
            
            {/* Support info */}
            <p className="text-slate-600 text-xs mt-6">
              Blijft dit probleem zich voordoen? Neem contact op met support.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
