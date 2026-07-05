import React, { Component, ErrorInfo } from 'react';
import ErrorBanner from './ErrorBanner';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', maxWidth: 600, margin: '0 auto' }}>
          <ErrorBanner
            message={this.props.fallbackTitle || '页面出现错误'}
            description={this.state.error?.message || '未知错误，请刷新页面重试'}
            onRetry={this.handleReset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
