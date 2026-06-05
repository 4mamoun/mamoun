// ============================================================
// Error Boundary — catches React errors and shows fallback UI
// ============================================================

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '' };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo.componentStack);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '/';
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #0c1222 0%, #0f172a 40%, #1a1f3a 100%)' }}>
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">حدث خطأ غير متوقع</h2>
                <p className="text-xs text-gray-400">Unexpected Error</p>
              </div>
            </div>

            <div className="bg-black/30 rounded-xl p-3 mb-4 overflow-auto max-h-40">
              <p className="text-xs text-red-300 font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة تحميل
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all"
              >
                <Home className="w-4 h-4" />
                الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
