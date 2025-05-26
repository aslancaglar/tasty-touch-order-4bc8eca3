
import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { isOnline } from '@/utils/service-worker';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isOnline: boolean;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  private onlineListener: () => void;
  private offlineListener: () => void;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: isOnline()
    };

    // Bind event listeners
    this.onlineListener = () => this.setState({ isOnline: true });
    this.offlineListener = () => this.setState({ isOnline: false });
  }

  componentDidMount() {
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.onlineListener);
    window.removeEventListener('offline', this.offlineListener);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[NetworkErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to monitoring service if available
    if (typeof window !== 'undefined') {
      console.error('React Error Boundary caught an error:', {
        error: error.toString(),
        errorInfo,
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.includes('offline') ||
                            this.state.error?.message?.includes('network') ||
                            this.state.error?.message?.includes('fetch') ||
                            !this.state.isOnline;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                {isNetworkError ? (
                  this.state.isOnline ? (
                    <Wifi className="h-6 w-6 text-red-600" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-red-600" />
                  )
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <CardTitle className="text-xl">
                {isNetworkError ? 'Connexion Interrompue' : 'Une Erreur est Survenue'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {isNetworkError ? (
                <div className="space-y-2">
                  {!this.state.isOnline ? (
                    <p className="text-gray-600">
                      Votre appareil est hors ligne. Vérifiez votre connexion internet.
                    </p>
                  ) : (
                    <p className="text-gray-600">
                      Problème de connexion au serveur. Les données mises en cache sont affichées.
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {this.state.isOnline ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className={this.state.isOnline ? 'text-green-600' : 'text-red-600'}>
                      {this.state.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">
                    Une erreur technique est survenue. Veuillez réessayer.
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <details className="text-left text-xs bg-gray-100 p-2 rounded">
                      <summary className="cursor-pointer">Détails de l'erreur</summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.error?.toString()}
                        {this.state.error?.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Recharger la page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;
