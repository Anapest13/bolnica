import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Что-то пошло не так. Пожалуйста, попробуйте обновить страницу.";
      
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error?.includes('insufficient permissions')) {
            errorMessage = "Ошибка доступа: У вас недостаточно прав для выполнения этой операции.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
            <div className="inline-block p-4 bg-red-50 rounded-full mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Ой! Произошла ошибка</h2>
            <p className="text-slate-600 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
