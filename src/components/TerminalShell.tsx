'use client';

// Koyfin-style terminal shell: dark left sidebar + topbar with global symbol search.
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';
import {
  LayoutDashboard, CandlestickChart, Activity, Dna, Gauge, Briefcase, Globe,
  Star, Newspaper, Bot, Search, Menu, X, ChevronsLeft, ChevronsRight, Home, User,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: 'Markets',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Charts', href: '/market-data', icon: CandlestickChart },
      { label: 'AI Pulse', href: '/ai-pulse', icon: Activity },
      { label: 'Market DNA', href: '/market-dna', icon: Dna },
      { label: 'Extremes', href: '/market-extremes', icon: Gauge },
    ],
  },
  {
    title: 'Research',
    items: [
      { label: 'AI Portfolio', href: '/ai-portfolio', icon: Briefcase },
      { label: 'Visual AI', href: '/visual-ai', icon: Globe },
      { label: 'Top Analysts', href: '/top-analysts', icon: Star },
      { label: 'News', href: '/news', icon: Newspaper },
    ],
  },
  {
    title: 'AI',
    items: [
      { label: 'UpdateAI', href: '/econoai', icon: Bot },
    ],
  },
];

export default function TerminalShell({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('shell:collapsed') === '1'); } catch {}
  }, []);

  // Hide the global site header while a terminal page is mounted.
  useEffect(() => {
    document.documentElement.setAttribute('data-terminal', '1');
    return () => { document.documentElement.removeAttribute('data-terminal'); };
  }, []);
  const toggleCollapsed = () => {
    setCollapsed(c => {
      try { localStorage.setItem('shell:collapsed', c ? '0' : '1'); } catch {}
      return !c;
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (!q) return;
    setQuery('');
    setMobileOpen(false);
    router.push(`/market-data?symbol=${encodeURIComponent(q)}`);
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  const sidebarInner = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-2 h-14 px-3 border-b border-[#1d232e] overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
        <Logo size={24} showText={false} />
        {!collapsed && <span className="text-[13px] font-extrabold tracking-wide text-white whitespace-nowrap">ECONOPULSE</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(section => (
          <div key={section.title}>
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{section.title}</div>
            )}
            <ul className="space-y-0.5">
              {section.items.map(item => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={(e) => { e.preventDefault(); setMobileOpen(false); router.push(item.href); }}
                      title={item.label}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors ${collapsed ? 'justify-center' : ''} ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#1d232e] p-2 space-y-0.5">
        <a href="/dashboard/account" onClick={(e) => { e.preventDefault(); router.push('/dashboard/account'); }}
          title="Account"
          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-slate-400 hover:text-white hover:bg-white/5 ${collapsed ? 'justify-center' : ''}`}>
          <User className="w-4 h-4 shrink-0" />{!collapsed && <span>Account</span>}
        </a>
        <a href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}
          title="Website"
          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-slate-400 hover:text-white hover:bg-white/5 ${collapsed ? 'justify-center' : ''}`}>
          <Home className="w-4 h-4 shrink-0" />{!collapsed && <span>Website</span>}
        </a>
        <button onClick={toggleCollapsed}
          className="hidden lg:flex w-full items-center justify-center rounded-md px-2 py-1.5 text-slate-500 hover:text-white hover:bg-white/5"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#0b0e14] text-slate-200 flex">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:block shrink-0 border-r border-[#1d232e] bg-[#0d1017] transition-[width] duration-150 ${collapsed ? 'w-14' : 'w-52'}`}>
        <div className="sticky top-0 h-[100dvh]">{sidebarInner}</div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 bg-[#0d1017] border-r border-[#1d232e] shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-3.5 text-slate-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 h-14 shrink-0 flex items-center gap-3 px-3 border-b border-[#1d232e] bg-[#0d1017]/95 backdrop-blur">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-400 hover:text-white p-1"><Menu className="w-5 h-5" /></button>
          <h1 className="text-sm font-bold tracking-tight text-white whitespace-nowrap">{title}</h1>
          <form onSubmit={submitSearch} className="flex-1 max-w-md ml-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search symbol… (AAPL, EURUSD, BTC-USD)"
                className="w-full bg-[#141926] border border-[#232a3a] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/60"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
