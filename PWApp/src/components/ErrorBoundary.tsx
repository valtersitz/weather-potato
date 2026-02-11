import React, { Component, ReactNode } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Clear localStorage and reload
    localStorage.clear();
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-error/20 to-warning/20">
          <Card className="max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-3xl font-bold mb-3 text-error">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                The app encountered an unexpected error. Please try reloading.
              </p>
            </div>

            {this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-xl text-left overflow-auto max-h-48">
                <p className="text-sm font-mono text-error mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button
                size="big"
                onClick={this.handleReload}
                className="w-full"
              >
                🔄 Reload App
              </Button>

              <Button
                variant="secondary"
                onClick={this.handleReset}
                className="w-full"
              >
                🔧 Reset & Start Over
              </Button>
            </div>

            <div className="mt-6 p-4 bg-info/10 rounded-xl">
              <p className="text-xs text-gray-600">
                💡 Tip: If this keeps happening, try clearing your browser cache or reinstalling the app.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
