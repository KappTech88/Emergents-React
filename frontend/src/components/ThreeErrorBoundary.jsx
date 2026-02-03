import React from 'react';

/**
 * Error Boundary specifically for Three.js/WebGL components
 * Catches rendering errors and provides a user-friendly fallback
 */
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error for monitoring (can be extended to send to error tracking service)
    console.error('Three.js Error Boundary caught an error:', error);
    console.error('Component Stack:', errorInfo?.componentStack);

    // Check for common WebGL errors
    if (error.message?.includes('WebGL')) {
      console.warn('WebGL error detected. User may have WebGL disabled or unsupported.');
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Check if it's a WebGL-specific error
      const isWebGLError = this.state.error?.message?.includes('WebGL') ||
                          this.state.error?.message?.includes('context') ||
                          this.state.error?.message?.includes('GPU');

      return (
        <div className="three-error-fallback" style={styles.container}>
          <div style={styles.content}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 style={styles.title}>
              {isWebGLError ? '3D Rendering Unavailable' : 'Something went wrong'}
            </h2>

            <p style={styles.message}>
              {isWebGLError
                ? 'WebGL may not be supported or enabled in your browser. Please try enabling hardware acceleration or using a different browser.'
                : 'An error occurred while rendering the 3D scene. This might be a temporary issue.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button
                onClick={this.handleRetry}
                style={styles.retryButton}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={styles.reloadButton}
              >
                Reload Page
              </button>
            </div>

            <div style={styles.tips}>
              <p style={styles.tipsTitle}>Troubleshooting tips:</p>
              <ul style={styles.tipsList}>
                <li>Enable hardware acceleration in browser settings</li>
                <li>Update your graphics drivers</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
                <li>Close other GPU-intensive applications</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: '400px',
    backgroundColor: '#0d0d0d',
    borderRadius: '8px',
    padding: '20px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px',
    color: '#ffffff',
  },
  iconContainer: {
    marginBottom: '20px',
  },
  icon: {
    width: '64px',
    height: '64px',
    color: '#f59e0b',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#ffffff',
  },
  message: {
    fontSize: '14px',
    color: '#a1a1aa',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  details: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  summary: {
    cursor: 'pointer',
    color: '#22d3ee',
    fontSize: '14px',
    marginBottom: '8px',
  },
  errorText: {
    backgroundColor: '#1a1a1a',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '150px',
    color: '#f87171',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  retryButton: {
    padding: '10px 24px',
    backgroundColor: '#22d3ee',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  reloadButton: {
    padding: '10px 24px',
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '1px solid #3f3f46',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  tips: {
    textAlign: 'left',
    backgroundColor: '#1a1a1a',
    padding: '16px',
    borderRadius: '8px',
  },
  tipsTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: '8px',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#71717a',
    lineHeight: '1.8',
  },
};

export default ThreeErrorBoundary;
