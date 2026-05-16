'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, SUPABASE_ENABLED } from '@/lib/supabase';

/**
 * Globally catches Supabase email confirmation / OAuth callbacks that
 * land on ANY page (homepage, /ai-pulse, etc.) with auth tokens.
 *
 * Two formats are handled:
 *  1) Hash fragment: #access_token=...&refresh_token=...  (implicit flow)
 *  2) Query string : ?code=...                            (PKCE flow)
 *
 * Why: Supabase respects `emailRedirectTo` only if that URL is whitelisted
 * in Auth → URL Configuration → Redirect URLs. If not, it falls back to
 * Site URL — meaning users may land on `/` with tokens in the URL. We catch
 * that here and forward them to /ai-pulse (free tier landing).
 */
export default function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!SUPABASE_ENABLED || typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // --- Implicit flow: tokens in hash ---
    if (hash.includes('access_token=') && hash.includes('refresh_token=')) {
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        supabase.auth
          .setSession({ access_token, refresh_token })
          .then(() => {
            // Clean URL and route to free landing page
            window.history.replaceState(null, '', window.location.pathname);
            router.replace('/ai-pulse');
          })
          .catch((err: unknown) => {
            console.error('[AuthHashHandler] setSession failed:', err);
          });
        return;
      }
    }

    // --- PKCE flow: code in query string (only relevant if NOT already on /auth/callback) ---
    if (
      search.includes('code=') &&
      !window.location.pathname.startsWith('/auth/')
    ) {
      const params = new URLSearchParams(search);
      const code = params.get('code');
      if (code) {
        supabase.auth
          .exchangeCodeForSession(code)
          .then(() => {
            window.history.replaceState(null, '', window.location.pathname);
            router.replace('/ai-pulse');
          })
          .catch((err: unknown) => {
            console.error('[AuthHashHandler] exchangeCodeForSession failed:', err);
          });
      }
    }
  }, [router]);

  return null;
}
