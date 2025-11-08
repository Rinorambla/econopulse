// Ultra-minimal diagnostic home page to isolate production crash.
// Removed all client components to test pure server rendering path.
export const dynamic = 'force-dynamic';

import SafeBoundary from '@/components/SafeBoundary';
import AIBackground from '@/components/AIBackground';

// Phase 1 restore: add only AIBackground (under SafeBoundary) to confirm stability.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative flex items-center justify-center">
      <SafeBoundary fallback={<div className="absolute inset-0" />}> 
        <AIBackground intensity="subtle" />
      </SafeBoundary>
      <div className="relative z-10 text-center space-y-4 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold">EconoPulse</h1>
        <p className="text-sm text-white/70 max-w-md mx-auto">Homepage progressive restoration: AI background active. Verifica se tutto funziona, poi procediamo con prompt e widgets.</p>
        <p className="text-xs text-white/40">Step 1/4 restore sequence.</p>
      </div>
    </div>
  );
}
