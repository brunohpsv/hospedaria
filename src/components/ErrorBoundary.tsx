import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-black font-mono flex items-center justify-center p-4">
          <div className="border border-black max-w-lg w-full bg-white shadow-none">
            <div className="bg-black text-white px-2 py-1 text-xs flex justify-between items-center select-none font-bold">
              <span>BLOCO DE NOTAS - ERRO DE EXECUÇÃO</span>
              <button
                onClick={this.handleReload}
                className="hover:bg-red-600 px-1.5 cursor-pointer text-white font-mono"
              >
                X
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="font-bold bg-[#FFFFCC] p-1 border border-black inline-block">
                Ocorreu uma falha inesperada ao carregar a interface.
              </p>
              <div className="p-2 border border-black bg-gray-50 text-[11px] overflow-auto max-h-36">
                <code>{this.state.error?.message || 'Erro desconhecido'}</code>
              </div>
              <p className="text-gray-600">
                Se esta falha persistir, tente limpar o cache local ou recarregar a página.
              </p>
              <div className="flex gap-2 pt-2 border-t border-black">
                <button
                  onClick={this.handleReload}
                  className="px-3 py-1 bg-[#FFFFCC] border border-black font-bold hover:bg-black hover:text-white cursor-pointer"
                >
                  [RECARREGAR PÁGINA]
                </button>
                <button
                  onClick={this.handleClearStorage}
                  className="px-3 py-1 bg-white border border-black font-bold hover:bg-red-600 hover:text-white cursor-pointer"
                >
                  [LIMPAR CACHE LOCAL]
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
