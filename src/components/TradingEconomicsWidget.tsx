'use client';

import { useEffect, useRef } from 'react';

// TradingEconomics widget loader.
// The official script auto-scans .te-embed divs on load and replaces them
// with iframes. In a SPA we re-inject the script after the div is mounted
// so it picks up our container.

interface Props {
  widget: string; // e.g. 'cl-pro', 'ns-pro'
  height?: number | string;
  className?: string;
  theme?: 'Dark' | 'Light';
}

export default function TradingEconomicsWidget({ widget, height = 360, className = '', theme = 'Dark' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Clear any prior render (StrictMode double-invoke / re-render)
    el.innerHTML = '';

    // Build the widget div per TE spec
    const div = document.createElement('div');
    div.className = 'te-embed';
    div.setAttribute('data-widget', widget);
    div.setAttribute('data-color-theme', theme);
    div.style.width = '100%';
    div.style.height = '100%';
    el.appendChild(div);

    // Inject a fresh script tag — TE script scans on each load
    const script = document.createElement('script');
    script.src = 'https://widget.tradingeconomics.com/widget.js';
    script.async = true;
    el.appendChild(script);

    return () => {
      try { el.innerHTML = ''; } catch { /* noop */ }
    };
  }, [widget, theme]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden bg-[#0c1222] rounded-md ${className}`}
      style={{ height }}
    />
  );
}
