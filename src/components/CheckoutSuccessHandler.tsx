'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Mounted globally. When the user lands on any page with
 * ?checkout=success&session_id=cs_..., this component:
 *  1. Shows a full-screen "Activating subscription..." overlay so the
 *     user doesn't see a transient "Upgrade Required" panel.
 *  2. Calls /api/stripe/sync to immediately pull subscription state.
 *  3. Polls refreshPlan() until plan becomes premium (or timeout).
 *  4. Strips the query params so a manual reload doesn't re-trigger.
 */
export default function CheckoutSuccessHandler() {
  const { refreshPlan, user, plan } = useAuth();
  const handledRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Activating your subscription…');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (handledRef.current) return;
    if (!user) return;

    const url = new URL(window.location.href);
    const checkout = url.searchParams.get('checkout');
    const sessionId = url.searchParams.get('session_id');
    if (checkout !== 'success' || !sessionId) return;

    handledRef.current = true;
    setSyncing(true);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        // 1) Force sync from Stripe
        setStatusMsg('Verifying payment with Stripe…');
        await fetch('/api/stripe/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        // 2) Poll plan until premium (max ~12s)
        setStatusMsg('Activating your premium access…');
        for (let i = 0; i < 8; i++) {
          await refreshPlan();
          // refreshPlan updates context async; small wait
          await new Promise((r) => setTimeout(r, 800));
          // Re-read current value via cookie shortcut (set by /api/me)
          const cookiePlan = document.cookie
            .split('; ')
            .find((c) => c.startsWith('ep_plan='))
            ?.split('=')[1];
          if (cookiePlan === 'premium') break;
          // also call sync again after a couple of failed attempts
          if (i === 3) {
            await fetch('/api/stripe/sync', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      } catch (e) {
        console.warn('subscription sync failed', e);
      } finally {
        // Strip the query params (keep path + hash)
        const cleanUrl = url.origin + url.pathname + url.hash;
        window.history.replaceState({}, '', cleanUrl);
        setSyncing(false);
      }
    })();
  }, [user, refreshPlan]);

  if (!syncing) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div className="max-w-md w-[90%] rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
        <h2 className="text-xl font-semibold text-white mb-2">Payment received 🎉</h2>
        <p className="text-sm text-white/70">{statusMsg}</p>
        <p className="text-xs text-white/40 mt-4">This usually takes just a few seconds.</p>
      </div>
    </div>
  );
}
