'use client';

import { useEffect, useRef } from 'react';

// Generic TradingView embed loader. Works reliably in SPAs because we mount
// the script as a child of our own container with the config as its text body
// (this is exactly how TradingView's official snippets work).

type Variant = 'events' | 'timeline';

interface Props {
  variant: Variant;
  height?: number | string;
  className?: string;
  config?: Record<string, unknown>;
}

const SCRIPT_SRC: Record<Variant, string> = {
  events: 'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
  timeline: 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
};

const DEFAULT_CONFIG: Record<Variant, Record<string, unknown>> = {
  events: {
    colorTheme: 'dark',
    isTransparent: true,
    width: '100%',
    height: '100%',
    locale: 'en',
    importanceFilter: '0,1',
    countryFilter: 'us,eu,de,it,fr,gb,jp,cn,au,ca,ch',
  },
  timeline: {
    feedMode: 'all_symbols',
    colorTheme: 'dark',
    isTransparent: true,
    displayMode: 'regular',
    width: '100%',
    height: '100%',
    locale: 'en',
  },
};

export default function TradingEconomicsWidget({ variant, height = 360, className = '', config }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.width = '100%';
    inner.style.height = '100%';
    el.appendChild(inner);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = SCRIPT_SRC[variant];
    script.innerHTML = JSON.stringify({ ...DEFAULT_CONFIG[variant], ...(config || {}) });
    el.appendChild(script);

    return () => { try { el.innerHTML = ''; } catch { /* noop */ } };
  }, [variant, config]);

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container w-full overflow-hidden bg-[#0c1222] rounded-md ${className}`}
      style={{ height }}
    />
  );
}
