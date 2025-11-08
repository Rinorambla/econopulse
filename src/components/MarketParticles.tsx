'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  color: string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const MarketParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const visibleRef = useRef<boolean>(true);
  const reducedMotionRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const onMQ = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    mq.addEventListener?.('change', onMQ);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Keep canvas resolution modest (avoid devicePixelRatio scaling to reduce work)
    const updateCanvasSize = () => {
      const { offsetWidth, offsetHeight } = canvas;
      canvas.width = offsetWidth;
      canvas.height = offsetHeight;
    };
    updateCanvasSize();

    // Compute particle count based on area (cap for performance)
    const computeParticleCount = () => {
      const area = canvas.width * canvas.height;
      const density = 65000; // higher = fewer particles
      const count = Math.round(area / density);
      return clamp(count, 12, 36);
    };

    const initParticles = () => {
      particlesRef.current = [];
      const particleCount = computeParticleCount();
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          opacity: Math.random() * 0.25 + 0.05,
          color: Math.random() > 0.5 ? '#3B82F6' : '#10B981'
        });
      }
    };

    initParticles();

    let last = performance.now();
    const FRAME_MS = 1000 / 30; // ~30 FPS throttle
    const MAX_CONNECTIONS_PER_FRAME = 140;

    const animate = (ts: number) => {
      if (!visibleRef.current || reducedMotionRef.current) {
        // Skip rendering when hidden or reduced motion requested
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const delta = ts - last;
      if (delta < FRAME_MS) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      last = ts;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      ctx.save();
      let connections = 0;
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < 0) p.x = canvas.width; else if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; else if (p.y > canvas.height) p.y = 0;

        // Draw particle (use globalAlpha to avoid string concat for color)
        ctx.beginPath();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fill();

        // Sparse connections: sample a few neighbors ahead only
        // Limit total connections per frame to avoid O(n^2) blowups
        if (connections < MAX_CONNECTIONS_PER_FRAME) {
          const NEIGHBOR_SAMPLE = 6; // check next up to 6 particles
          for (let j = i + 1; j < Math.min(i + 1 + NEIGHBOR_SAMPLE, particlesRef.current.length); j++) {
            const q = particlesRef.current[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 80 * 80) {
              ctx.beginPath();
              ctx.globalAlpha = 0.12; // subtle lines
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 0.5;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
              connections++;
              if (connections >= MAX_CONNECTIONS_PER_FRAME) break;
            }
          }
        }
      }
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Resize (debounced)
    let resizeTimer: number | undefined;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        updateCanvasSize();
        initParticles();
      }, 150);
    };
    window.addEventListener('resize', handleResize);

    // Pause when document hidden / resume on visible
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Pause when not intersecting (offscreen)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        visibleRef.current = e.isIntersecting;
      }
    }, { threshold: 0.01 });
    io.observe(canvas);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
      mq.removeEventListener?.('change', onMQ);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-20"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default MarketParticles;
 
