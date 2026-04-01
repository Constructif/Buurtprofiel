import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: '#666',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
            Er ging iets mis
          </h2>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            {this.state.error?.message || 'Er is een onverwachte fout opgetreden.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px',
              backgroundColor: '#eb6608',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
