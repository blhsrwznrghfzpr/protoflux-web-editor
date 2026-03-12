import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0d0d1a',
            color: '#e0e0e0',
            fontFamily: 'monospace',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12, color: '#e74c3c' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8, maxWidth: 480 }}>
            The editor encountered an unexpected error. Your work has been auto-saved to localStorage.
          </p>
          <pre
            style={{
              background: '#1e1e2e',
              border: '1px solid #444',
              borderRadius: 6,
              padding: 16,
              fontSize: 11,
              color: '#e74c3c',
              maxWidth: 600,
              overflow: 'auto',
              marginBottom: 16,
              textAlign: 'left',
              maxHeight: 200,
            }}
          >
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleRecover}
              style={{
                padding: '8px 20px',
                background: '#2a2a3a',
                border: '1px solid #444',
                borderRadius: 6,
                color: '#e0e0e0',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Try to Recover
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 20px',
                background: '#7c3aed',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
