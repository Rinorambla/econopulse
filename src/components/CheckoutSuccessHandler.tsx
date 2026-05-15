'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Mounted globally. When the user lands on any page with
 * ?checkout=success&session_id=cs_..., this component:
 *  1. Calls /api/stripe/sync to immediately pull subscription state from
 *     Stripe and write it to the DB (covers cases where the webhook is slow
 *     or not yet configured).
 *  2. Forces a plan refresh in the auth context.
 *  3. Strips the query params so a manual reload doesn't re-trigger.
 */
export default function CheckoutSuccessHandler() {
  const { refreshPlan, user } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (handledRef.current) return;
    if (!user) return;

    const url = new URL(window.location.href);
    const checkout = url.searchParams.get('checkout');
    const sessionId = url.searchParams.get('session_id');
    if (checkout !== 'success' || !sessionId) return;

    handledRef.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        await fetch('/api/stripe/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (e) {
        console.warn('subscription sync failed', e);
      } finally {
        try { await refreshPlan(); } catch {}
        // Strip the query params (keep path + hash)
        const cleanUrl = url.origin + url.pathname + url.hash;
        window.history.replaceState({}, '', cleanUrl);
      }
    })();
  }, [user, refreshPlan]);

  return null;
}
