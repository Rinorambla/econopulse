"use client";
import React, { useEffect, useState, useCallback } from 'react';

interface SwState {
  waiting: ServiceWorker | null;
  version?: string;
}

export const PWAUpdateAndInstall: React.FC = () => {
  const [swState, setSwState] = useState<SwState>({ waiting: null });
  const [showInstall, setShowInstall] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);

  // Listen to service worker updates
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      // If there's already a waiting SW
      if (reg.waiting) setSwState(s => ({ ...s, waiting: reg.waiting }));

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setSwState(s => ({ ...s, waiting: reg.waiting || newWorker }));
            }
          });
        }
      });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_ACTIVATED') {
        setSwState(s => ({ ...s, version: event.data.version, waiting: null }));
      }
    });
  }, []);

  const activateUpdate = useCallback(() => {
    swState.waiting?.postMessage({ type: 'SKIP_WAITING' });
    // Force reload after a short delay
    setTimeout(() => window.location.reload(), 400);
  }, [swState.waiting]);

  // Install prompt handling (evident style)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShowInstall(false);
      setInstallEvent(null);
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const triggerInstall = () => {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice.finally(() => {
      setTimeout(() => setShowInstall(false), 300);
    });
  };

  if (!swState.waiting && !showInstall) return null;

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[1000] px-4 pb-4 pointer-events-none">
      <div className="max-w-xl mx-auto space-y-3">
        {swState.waiting && (
          <div className="pointer-events-auto bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl shadow-2xl border border-white/15 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-[fadeIn_.4s_ease]">
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide uppercase opacity-90 mb-1">Aggiornamento disponibile</p>
              <p className="text-sm leading-relaxed opacity-95">È pronta una nuova versione dell'app. Ricarica per ottenere le ultime ottimizzazioni e dati.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={activateUpdate} className="px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold text-sm shadow hover:shadow-md transition">
                Aggiorna
              </button>
              <button onClick={() => setSwState(s => ({ ...s, waiting: null }))} className="px-4 py-2 rounded-lg bg-indigo-800/40 text-white text-sm font-medium hover:bg-indigo-800/60 transition">
                Dopo
              </button>
            </div>
          </div>
        )}
        {showInstall && (
          <div className="pointer-events-auto bg-[var(--color-panel,#1e293b)]/95 backdrop-blur-xl border border-cyan-400/30 rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ring-1 ring-cyan-300/20 animate-[fadeIn_.5s_ease]">
            <div className="flex-1">
              <p className="text-sm font-bold tracking-wide text-cyan-300 mb-1">Installa EconoPulse</p>
              <p className="text-sm text-white/80 leading-relaxed">Accedi istantaneamente ai segnali AI dal tuo dispositivo. Funziona anche offline per le parti in cache.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={triggerInstall} className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow hover:shadow-cyan-500/40 transition">
                Installa
              </button>
              <button onClick={() => setShowInstall(false)} className="px-4 py-2 rounded-lg bg-slate-700/60 text-white/80 text-sm font-medium hover:bg-slate-600/60 transition">
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(12px)} to {opacity:1; transform: translateY(0)} }
      `}</style>
    </div>
  );
};

export default PWAUpdateAndInstall;