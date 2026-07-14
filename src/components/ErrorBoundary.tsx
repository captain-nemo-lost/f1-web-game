import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808] z-50">
          <h1 className="text-4xl font-black text-[#E10600] uppercase tracking-widest mb-4">Engine Stalled</h1>
          <p className="text-white/50 text-sm tracking-widest mb-8">WebGL Context Lost or Render Error</p>
          <button
            className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-[#E10600] hover:text-white transition-colors duration-300"
            onClick={() => window.location.reload()}
          >
            Restart Engine
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
