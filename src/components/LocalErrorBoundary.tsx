'use client';

import React from 'react';
import Link from 'next/link';

type Props = { children: React.ReactNode, fallbackTitle?: string };
type State = { hasError: boolean; lastError?: string };

export default class LocalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, lastError: (error && (error.message || String(error))) };
  }

  componentDidCatch(error: any, info: any) {
    try {
      // eslint-disable-next-line no-console
      console.error('[LocalErrorBoundary]', { message: error?.message || String(error), info });
    } catch {}

    // Auto-recover from stale-deploy chunk errors: a single hard reload usually
    // fixes it. Guard with sessionStorage so we don't loop.
    const msg = error?.message || String(error || '');
    const isChunkError = /Loading chunk \d+ failed|ChunkLoadError|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
    if (isChunkError && typeof window !== 'undefined') {
      try {
        const FLAG = '__chunk_reload_attempted__';
        if (!sessionStorage.getItem(FLAG)) {
          sessionStorage.setItem(FLAG, '1');
          // small delay so the fallback UI doesn't flash
          setTimeout(() => window.location.reload(), 150);
        }
      } catch {}
    }
  }

  private reset = () => this.setState({ hasError: false, lastError: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl p-6 my-6 rounded-lg border border-red-500/30 bg-red-950/20 text-center">
          <h3 className="text-red-300 font-semibold mb-2">{this.props.fallbackTitle || 'Something went wrong'}</h3>
          <p className="text-sm text-red-200/80 mb-4">A local error occurred while rendering this section.</p>
          {this.state.lastError && (
            <p className="text-xs text-red-300/80 mb-4 break-all">{this.state.lastError}</p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button onClick={this.reset} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded">
              Try Again
            </button>
            <button onClick={() => location.reload()} className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded">
              Reload Page
            </button>
            <Link href="/" className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded">
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
