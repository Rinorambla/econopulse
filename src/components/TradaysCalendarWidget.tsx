'use client';

import { useState } from 'react';

interface Props {
  height?: number | string;
  className?: string;
  /** Tradays mode: "1" = compact, "2" = standard */
  mode?: '1' | '2';
  /** Theme: 1 = dark, 0 = light */
  theme?: 0 | 1;
}

// Render the Tradays calendar iframe directly instead of going through their
// script loader: the loader only scans the DOM when its script first executes,
// which races with Next.js client-side navigation and left the calendar blank
// until a full refresh. The iframe URL is what the loader itself builds.
export default function TradaysCalendarWidget({
  height = 360,
  className = '',
  mode = '2',
  theme = 1,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  const src =
    `https://www.tradays.com/en/economic-calendar/widget?mode=${mode}&theme=${theme}&fw=html` +
    (typeof window !== 'undefined' ? `&utm_source=${encodeURIComponent(window.location.hostname)}` : '');

  return (
    <div className={`relative w-full overflow-hidden bg-[#0c1222] rounded-md ${className}`} style={{ height }}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#0c1222] text-sm text-white/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Loading calendar…
        </div>
      )}
      <iframe
        src={src}
        title="Economic Calendar"
        className="h-full w-full border-0"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
      />
      {/* Bottom cover: hides the widget's MQL5 footer link with the site's own footer bar. */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-7 items-center justify-end bg-[#0c1222] px-3">
        <span className="text-[10px] text-white/30">Powered by EconoPulse.ai</span>
      </div>
    </div>
  );
}
