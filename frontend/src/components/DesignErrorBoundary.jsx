import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class DesignErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DesignEditor Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // You could send this to an error reporting service
    // reportError(errorDetails);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isFabricError = this.state.error?.message?.includes('fabric') || 
                          this.state.error?.stack?.includes('fabric');

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <AlertTriangle size={48} color="#ef4444" />
            </div>
            
            <h2 className="error-title">
              {isFabricError ? 'Erreur de Canvas' : 'Erreur Inattendue'}
            </h2>
            
            <p className="error-message">
              {isFabricError 
                ? 'Une erreur est survenue avec le canvas de design. Essayez de recharger la page.'
                : 'Une erreur inattendue est survenue dans l\'éditeur de design.'
              }
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Details de l'erreur (Développement)</summary>
                <pre className="error-stack">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button"
                disabled={this.state.retryCount >= 3}
              >
                <RefreshCw size={16} />
                {this.state.retryCount > 0 ? `Réessayer (${this.state.retryCount}/3)` : 'Réessayer'}
              </button>
              
              {this.state.retryCount >= 3 && (
                <button 
                  onClick={this.handleReload}
                  className="reload-button"
                >
                  Recharger la page
                </button>
              )}
            </div>

            {this.state.retryCount >= 3 && (
              <p className="error-help">
                Si le problème persiste, veuillez recharger la page ou contacter le support.
              </p>
            )}
          </div>

          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              background: var(--surface, #ffffff);
              border: 2px solid var(--border, #e2e8f0);
              border-radius: 12px;
              margin: 20px;
            }

            .error-content {
              text-align: center;
              max-width: 500px;
              padding: 32px;
            }

            .error-icon {
              margin-bottom: 16px;
              color: #ef4444;
            }

            .error-title {
              font-size: 24px;
              font-weight: 600;
              color: var(--text, #1e293b);
              margin-bottom: 8px;
            }

            .error-message {
              font-size: 16px;
              color: var(--text-2, #64748b);
              margin-bottom: 24px;
              line-height: 1.5;
            }

            .error-details {
              text-align: left;
              margin: 16px 0;
              padding: 16px;
              background: var(--surface-2, #f8fafc);
              border: 1px solid var(--border, #e2e8f0);
              border-radius: 8px;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              color: var(--text, #1e293b);
              margin-bottom: 8px;
            }

            .error-stack {
              font-size: 12px;
              color: #ef4444;
              background: #fef2f2;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }

            .retry-button, .reload-button {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 20px;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .retry-button {
              background: var(--primary, #6366f1);
              color: white;
            }

            .retry-button:hover:not(:disabled) {
              background: #5558e3;
              transform: translateY(-1px);
            }

            .retry-button:disabled {
              background: var(--muted, #94a3b8);
              cursor: not-allowed;
              opacity: 0.6;
            }

            .reload-button {
              background: var(--surface-2, #f8fafc);
              color: var(--text, #1e293b);
              border: 1px solid var(--border, #e2e8f0);
            }

            .reload-button:hover {
              background: var(--border, #e2e8f0);
              transform: translateY(-1px);
            }

            .error-help {
              font-size: 14px;
              color: var(--text-2, #64748b);
              margin-top: 16px;
              font-style: italic;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DesignErrorBoundary;
