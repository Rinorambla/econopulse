'use client';

import { useEffect, useRef } from 'react';

interface Props {
  height?: number | string;
  className?: string;
  /** Tradays mode: "1" = compact, "2" = standard */
  mode?: '1' | '2';
  /** Theme: 1 = dark, 0 = light */
  theme?: 0 | 1;
}

export default function TradaysCalendarWidget({
  height = 360,
  className = '',
  mode = '2',
  theme = 1,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.id = 'economicCalendarWidget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    el.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-type', 'calendar-widget');
    script.src = 'https://www.tradays.com/c/js/widgets/calendar/widget.js?v=15';
    script.text = JSON.stringify({
      width: '100%',
      height: '100%',
      mode,
      fw: 'html',
      theme,
    });
    el.appendChild(script);

    return () => {
      try { el.innerHTML = ''; } catch { /* noop */ }
    };
  }, [mode, theme]);

  return (
    <div className={`relative w-full overflow-hidden bg-[#0c1222] rounded-md ${className}`} style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      {/* Bottom cover: hides the widget's MQL5 footer link with the site's own footer bar. */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex h-7 items-center justify-end bg-[#0c1222] px-3">
        <span className="text-[10px] text-white/30">Powered by EconoPulse.ai</span>
      </div>
    </div>
  );
}
