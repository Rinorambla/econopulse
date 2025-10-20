"use client";

import React from 'react';

type Props = {
  children: React.ReactNode;
  /** Placeholder min height to avoid layout shift before mount */
  minHeight?: string | number;
  /** Root margin for IntersectionObserver (e.g., '200px') */
  rootMargin?: string;
  /** Optional skeleton element while waiting */
  placeholder?: React.ReactNode;
};

export default function LazyVisible({ children, minHeight = 300, rootMargin = '200px', placeholder }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (visible) return; // already revealed
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Fallback: render immediately
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  const minH = typeof minHeight === 'number' ? `${minHeight}px` : String(minHeight);
  return (
    <div ref={ref} style={{ minHeight: minH }}>
      {visible ? (
        <div style={{ width: '100%', height: minH }}>
          {children}
        </div>
      ) : (
        placeholder ?? <div className="w-full h-full bg-white/5 rounded animate-pulse" style={{ minHeight: minH }} />
      )}
    </div>
  );
}
