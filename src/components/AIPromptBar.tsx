"use client";

import React, {useState} from 'react';
import { useRouter } from 'next/navigation';

export default function AIPromptBar() {
  const router = useRouter();
  const [q, setQ] = useState('Top momentum LargeCap Tech next week');
  const go = (query: string) => {
    const qp = new URLSearchParams({ q: query });
    router.push(`/ai-pulse?${qp.toString()}`);
  };
  return (
    <div className="mt-6">
      <div className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]/70 backdrop-blur px-3 py-2 shadow-[0_0_60px_-30px_rgba(59,130,246,0.6)]">
        <div className="text-[10px] text-white/50 mb-1">Ask the AI</div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') go(q); }}
            placeholder="Chiedi all’AI…"
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/40"
            aria-label="Ask the AI"
          />
          <button onClick={()=>go(q)} className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white">Invia</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            'Strong buy su Semiconductors',
            'Unusual options flow oggi',
            'Top RS su Energy 1M',
          ].map((s,i)=> (
            <button
              key={i}
              onClick={()=> go(s)}
              className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/20"
            >{s}</button>
          ))}
        </div>
        <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-blue-600/10 via-fuchsia-500/10 to-cyan-400/10 blur opacity-0 group-hover:opacity-100 transition" />
      </div>
    </div>
  );
}
