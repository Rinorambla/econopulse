'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Widget type, e.g. 'ecfull' = full earnings calendar */
  wtype?: string;
  /** Optional fixed width override; if omitted, widget auto-sizes to container */
  width?: number;
  height?: number | string;
  className?: string;
  /** When true, applies a CSS filter to invert/dark-tint the widget so it blends with dark UI */
  darkTint?: boolean;
}

export default function MarketChameleonWidget({
  wtype = 'ecfull',
  width,
  height = 600,
  className = '',
  darkTint = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState<number>(width || 0);

  // Measure container width when no fixed width is provided
  useEffect(() => {
    if (width) {
      setBoxWidth(width);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBoxWidth(Math.max(320, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !boxWidth) return;
    el.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    const h = typeof height === 'number' ? height : 600;
    script.src = `https://marketchameleon.com/Widget?height=${h}&width=${boxWidth}&wtype=${encodeURIComponent(wtype)}`;
    el.appendChild(script);

    return () => {
      try { el.innerHTML = ''; } catch { /* noop */ }
    };
  }, [wtype, boxWidth, height]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-auto bg-[#0c1222] rounded-md ${className}`}
      style={{
        height,
        filter: darkTint ? 'invert(0.92) hue-rotate(180deg) saturate(0.85) brightness(0.95)' : undefined,
      }}
    />
  );
}
