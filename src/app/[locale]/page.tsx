"use client";
import SafeBoundary from '@/components/SafeBoundary';
import AIBackground from '@/components/AIBackground';
import { Link } from '@/i18n/routing';

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden">
      <SafeBoundary fallback={<div className="absolute inset-0" />}> 
        <AIBackground intensity="subtle" />
      </SafeBoundary>
      <div className="relative z-10 flex flex-col items-center px-6">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          EconoPulse
        </h1>
        <p className="text-white/70 max-w-md text-center mb-6 text-sm">
          Diagnostic recovery mode: stiamo reintroducendo i componenti. Se tutto funziona, vedrai l'animazione di sfondo.
        </p>
        <Link href="/pricing" className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 transition text-sm font-semibold shadow">
          Pricing
        </Link>
      </div>
    </div>
  );
}
