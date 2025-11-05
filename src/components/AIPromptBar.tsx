"use client";

import React, {useState} from 'react';
import { useRouter } from 'next/navigation';

export default function AIPromptBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('Top momentum LargeCap Tech next week');
  const go = (query: string) => {
    const qp = new URLSearchParams({ q: query });
    router.push(`/ai-pulse?${qp.toString()}`);
  };
  return (
    <div className={compact ? 'mt-2' : 'mt-6'}>
      <div className={`group relative rounded-lg ${compact ? 'border border-white/10' : 'border border-[var(--color-border)]'} bg-[var(--color-panel)]/70 backdrop-blur ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} shadow-[0_0_60px_-30px_rgba(59,130,246,0.6)]`}>
        <div className={`${compact ? 'text-[9px] mb-0.5' : 'text-[10px] mb-1'} text-white/50`}>Ask the AI</div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') go(q); }}
            placeholder="Chiedi all’AI…"
            className={`flex-1 bg-transparent outline-none ${compact ? 'text-[12px]' : 'text-sm'} text-white placeholder-white/40`}
            aria-label="Ask the AI"
          />
          <button onClick={()=>go(q)} className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-3 py-1'} rounded bg-blue-600 hover:bg-blue-700 text-white`}>Invia</button>
        </div>
        <div className={`${compact ? 'mt-1 gap-1' : 'mt-2 gap-2'} flex flex-wrap`}>
          {[
            'Strong buy su Semiconductors',
            'Unusual options flow oggi',
            'Top RS su Energy 1M',
          ].map((s,i)=> (
            <button
              key={i}
              onClick={()=> go(s)}
              className={`${compact ? 'text-[10px] px-2 py-0.5' : 'text-[10px] px-2 py-1'} rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/20`}
            >{s}</button>
          ))}
        </div>
        <div className={`pointer-events-none absolute -inset-px ${compact ? 'rounded-lg' : 'rounded-xl'} bg-gradient-to-r from-blue-600/10 via-fuchsia-500/10 to-cyan-400/10 blur opacity-0 group-hover:opacity-100 transition`} />
      </div>
    </div>
  );
}
