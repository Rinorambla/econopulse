'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Settings } from 'lucide-react';

interface StatusData {
  supabaseEnabled: boolean;
  providers: {
    stripe: boolean;
    openai: boolean;
    tiingo: boolean;
    resend: boolean;
  };
  devBypass: boolean;
  nodeEnv: string;
}

/**
 * Banner component that shows when core services are unavailable in production.
 * Helps users understand why features might be limited or missing.
 */
export function MissingServicesBanner() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only check on client-side and in production-like environments
    if (typeof window === 'undefined') return;
    
    // Skip in development with bypass
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_BYPASS === 'true') {
      setLoading(false);
      return;
    }

    // Check if user previously dismissed banner
    const dismissed = localStorage.getItem('services-banner-dismissed');
    if (dismissed === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Fetch service status
    fetch('/api/status')
      .then(res => res.json())
      .then((data: StatusData) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('services-banner-dismissed', 'true');
  };

  // Don't show banner if:
  // - Still loading
  // - User dismissed it
  // - In development with bypass
  // - All core services are enabled
  if (loading || dismissed || !status) return null;
  
  const coreServicesOk = status.supabaseEnabled && status.providers.tiingo;
  if (coreServicesOk) return null;

  const missingServices = [];
  if (!status.supabaseEnabled) missingServices.push('Authentication');
  if (!status.providers.tiingo) missingServices.push('Market Data');
  if (!status.providers.openai) missingServices.push('AI Analysis');

  return (
    <div className="relative bg-gradient-to-r from-amber-900/20 via-orange-900/20 to-red-900/20 border border-amber-500/30 rounded-lg p-4 mx-4 mt-4 mb-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-200 mb-1">
            Some features are currently limited
          </h3>
          <p className="text-xs text-amber-100/80 mb-2">
            {missingServices.length === 1 ? (
              <>Missing service: <span className="font-medium text-amber-200">{missingServices[0]}</span></>
            ) : (
              <>Missing services: <span className="font-medium text-amber-200">{missingServices.join(', ')}</span></>
            )}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-100/70">
              {!status.supabaseEnabled && 'Login disabled. '}
              {!status.providers.tiingo && 'Market data unavailable. '}
              {!status.providers.openai && 'AI features limited. '}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Rinorambla/econopulse/blob/main/VERCEL_ENV_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 rounded border border-amber-500/40 transition-colors"
            title="View setup guide"
          >
            <Settings className="h-3 w-3" />
            Setup
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <button
            onClick={handleDismiss}
            className="text-amber-400/60 hover:text-amber-300 text-xs px-2 py-1 rounded hover:bg-amber-900/30 transition-colors"
            title="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}