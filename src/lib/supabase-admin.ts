/**
 * Service-role Supabase client for server-side operations that bypass RLS.
 *
 * Used by:
 *  - Stripe webhook handler (no user session)
 *  - Subscription sync (writes to public.users)
 *
 * Lazy-initialized to avoid module-load errors when env is missing.
 * NEVER import this from a client component.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
