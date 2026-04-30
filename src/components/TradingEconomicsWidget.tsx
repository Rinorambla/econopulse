'use client';

import { useEffect, useRef } from 'react';

// Loads TradingEconomics widget script once per page, then mounts a widget container.
// Widgets supported: 'cl-pro' (economic calendar), 'ns-pro' (news), etc.
// Docs: https://tradingeconomics.com/widgets

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-te-widget]');
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('TE script failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://widget.tradingeconomics.com/widget.js';
    s.async = true;
    s.dataset.teWidget = '1';
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); }, { once: true });
    s.addEventListener('error', () => reject(new Error('TE script failed')), { once: true });
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  widget: 'cl-pro' | 'ns-pro' | string;
  height?: number | string;
  className?: string;
}

export default function TradingEconomicsWidget({ widget, height = 360, className = '' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled) return;
      // Re-trigger widget builder if exposed; otherwise the script auto-scans on load.
      const w = window as any;
      try {
        if (w.tradingeconomicsWidgets?.refresh) w.tradingeconomicsWidgets.refresh();
        else if (w.te_widget?.init) w.te_widget.init();
      } catch { /* ignore */ }
    }).catch(() => { /* ignore script failure */ });
    return () => { cancelled = true; };
  }, [widget]);

  return (
    <div
      className={`w-full overflow-auto bg-white/[0.02] rounded-md ${className}`}
      style={{ height }}
    >
      <div ref={ref} className="te-embed" data-widget={widget} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
