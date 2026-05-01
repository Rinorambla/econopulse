'use client';

import { useEffect, useRef } from 'react';

interface Props {
  /** Widget type, e.g. 'ecfull' = full earnings calendar */
  wtype?: string;
  width?: number;
  height?: number | string;
  className?: string;
  /** When true, applies a CSS filter to invert/dark-tint the widget so it blends with dark UI */
  darkTint?: boolean;
}

export default function MarketChameleonWidget({
  wtype = 'ecfull',
  width = 1000,
  height = 600,
  className = '',
  darkTint = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    const h = typeof height === 'number' ? height : 600;
    script.src = `https://marketchameleon.com/Widget?height=${h}&width=${width}&wtype=${encodeURIComponent(wtype)}`;
    el.appendChild(script);

    return () => {
      try { el.innerHTML = ''; } catch { /* noop */ }
    };
  }, [wtype, width, height]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-auto bg-[#0c1222] rounded-md ${className}`}
      style={{
        height,
        // Invert + slight hue rotation so the white widget blends with the dark site theme
        filter: darkTint ? 'invert(0.92) hue-rotate(180deg) saturate(0.85) brightness(0.95)' : undefined,
      }}
    />
  );
}
