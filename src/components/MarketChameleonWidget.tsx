'use client';

import { useEffect, useRef } from 'react';

interface Props {
  /** Widget type, e.g. 'ecfull' = full earnings calendar */
  wtype?: string;
  width?: number;
  height?: number | string;
  className?: string;
}

export default function MarketChameleonWidget({
  wtype = 'ecfull',
  width = 1000,
  height = 600,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://marketchameleon.com/Widget?height=${typeof height === 'number' ? height : 800}&width=${width}&wtype=${encodeURIComponent(wtype)}`;
    el.appendChild(script);

    return () => {
      try { el.innerHTML = ''; } catch { /* noop */ }
    };
  }, [wtype, width, height]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-auto bg-[#0c1222] rounded-md ${className}`}
      style={{ height }}
    />
  );
}
