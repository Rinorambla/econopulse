'use client';

import { useEffect, useRef, useState } from 'react';

// Trading Economics embeds (matrix table, news stream, indicator chart) loaded
// through the official loader. The loader scans `.te-embed` placeholders when
// its script executes and swaps each one for an iframe, so the placeholder is
// created imperatively inside a React-owned wrapper: React never reconciles the
// node the loader replaces. Widgets carry no vendor branding in their markup;
// the chart's Highstock credits are masked by a themed cover strip.

const LOADER_SRC = 'https://widgets.tradingeconomics.com/widget.js';

export type TeWidgetKind = 'mt-pro' | 'ns-pro' | 'ec-pro';

export const TE_MATRIX_COLUMNS = [
  'GDP', 'GDP Growth', 'GDP Growth YoY', 'Interest Rate', 'Inflation Rate', 'Unemployment Rate',
  'Government Bond 10Y', 'Bonds Chg YoY', 'Stocks Chg YoY', 'Currency', 'Exchange Rate',
  'Dollar Pair', 'Currency Chg YoY', 'Current Account', 'Current Account to GDP',
  'Government Budget', 'Debt to GDP', 'Population', 'Continent', 'Group',
] as const;

// Site palette (slate / emerald / red) applied to every widget that supports it.
export const TE_DARK_COLORS = {
  containerColor: '#0f172a',
  sectionHeaderColor: '#0b1220',
  outlineColor: '#1e293b',
  borderColor: '#1e293b',
  evenRowColor: '#111a2e',
  hoverColor: '#1e3a5f',
  positiveColor: '#34d399',
  negativeColor: '#f87171',
  activeTabColor: '#0f172a',
  activeTabBorder: '#3b82f6',
  tabHover: '#1e293b',
  text: '#e5e7eb',
};

type Attr = string | number | boolean | object;

const FRAME_TITLE: Record<TeWidgetKind, string> = {
  'mt-pro': 'World economic matrix',
  'ns-pro': 'Economic news',
  'ec-pro': 'Indicator chart',
};

interface Props {
  widget: TeWidgetKind;
  /** Extra `data-*` attributes (camelCase keys), e.g. { url: '/united-states/inflation-cpi' }. */
  attrs?: Record<string, Attr>;
  height?: number | string;
  className?: string;
  /** Opaque patches laid over the frame to mask vendor controls/credits. */
  covers?: React.CSSProperties[];
  loadingLabel?: string;
}

const BASE_ATTRS: Record<TeWidgetKind, Record<string, Attr>> = {
  'mt-pro': {
    colorTheme: 'Dark',
    transparentBackground: true,
    border: { width: 0, radius: 0 },
    darkThemeColors: TE_DARK_COLORS,
    columns: TE_MATRIX_COLUMNS,
  },
  'ns-pro': {
    colorTheme: 'Dark',
    transparentBackground: true,
    border: { width: 0, radius: 0 },
    darkThemeColors: TE_DARK_COLORS,
  },
  'ec-pro': {
    colorTheme: 'Dark',
    useContainerSize: true,
    border: { width: 0, radius: 0 },
    darkThemeColors: TE_DARK_COLORS,
  },
};

export default function TradingEconomicsEmbed({
  widget,
  attrs,
  height = 480,
  className = '',
  covers,
  loadingLabel = 'Loading…',
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Serialized so callers passing fresh object literals don't re-mount the widget.
  const attrsKey = JSON.stringify({ ...BASE_ATTRS[widget], ...(attrs || {}) });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    setStatus('loading');

    host.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'te-embed';
    placeholder.dataset.widget = widget;
    for (const [k, v] of Object.entries(JSON.parse(attrsKey) as Record<string, Attr>)) {
      placeholder.dataset[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    host.appendChild(placeholder);

    // Neutralise the frame the loader swaps in: a generic accessible title and
    // a sandbox without `allow-popups` / top-navigation, so links inside the
    // widgets (headlines, chart title, credits) can't open the data vendor's
    // site. Sandbox flags only apply on navigation, so the srcdoc is re-set.
    const observer = new MutationObserver(() => {
      const frame = host.querySelector('iframe');
      if (!frame || frame.dataset.neutralised) return;
      frame.dataset.neutralised = '1';
      frame.title = FRAME_TITLE[widget];
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
      frame.srcdoc = frame.srcdoc;
    });
    observer.observe(host, { childList: true });

    // A fresh script element re-runs the loader, which only builds widgets at
    // execution time. Guard against a loader that never swaps the placeholder.
    const script = document.createElement('script');
    script.src = LOADER_SRC;
    script.async = true;
    const settle = () => {
      if (!alive) return;
      setStatus(host.querySelector('iframe') ? 'ready' : 'error');
    };
    script.onload = () => setTimeout(settle, 50);
    script.onerror = () => { if (alive) setStatus('error'); };
    document.body.appendChild(script);

    const watchdog = setTimeout(settle, 15_000);
    return () => {
      alive = false;
      clearTimeout(watchdog);
      observer.disconnect();
      script.remove();
      host.innerHTML = '';
    };
  }, [widget, attrsKey]);

  // The chart boots at its default 700px and only reflows on a window resize
  // inside its frame; nudging the host width by 1px propagates that event
  // without touching the cross-origin document.
  useEffect(() => {
    if (status !== 'ready') return;
    const host = hostRef.current;
    if (!host) return;
    const timers = [1500, 4000, 8000].map((ms) =>
      setTimeout(() => {
        host.style.paddingRight = '1px';
        requestAnimationFrame(() => { host.style.paddingRight = ''; });
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [status, attrsKey]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ height }}>
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-white/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          {loadingLabel}
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-gray-500">
          Data is temporarily unavailable. Please refresh in a moment.
        </div>
      )}
      <div ref={hostRef} className="h-full w-full" />
      {status === 'ready' && covers?.map((style, i) => (
        <div key={i} className="pointer-events-none absolute z-20" style={style} />
      ))}
    </div>
  );
}
