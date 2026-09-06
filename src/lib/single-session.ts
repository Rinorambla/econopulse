import { supabaseAdmin } from './supabase-admin';

/**
 * Anti account-sharing: "last login wins" single active session per user.
 *
 * Every Supabase JWT carries a session_id (one per sign-in) and iat. We store
 * the most recent session on public.users; API calls from OLDER sessions are
 * rejected, so a shared password only ever works on one device at a time —
 * each new login kicks the previous one out.
 *
 * Requires (run once in the Supabase SQL editor):
 *   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_session_id text;
 *   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_session_iat bigint;
 *
 * Fails OPEN on any error (missing columns, DB hiccup) so it can be deployed
 * before the migration without breaking access.
 */

function decodeJwtPayload(token: string): { session_id?: string; iat?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export async function enforceSingleSession(
  userId: string,
  accessToken: string | null | undefined,
): Promise<{ ok: boolean; reason?: 'session_superseded' }> {
  if (!accessToken) return { ok: true };
  const claims = decodeJwtPayload(accessToken);
  const sessionId = claims?.session_id;
  const iat = claims?.iat ?? 0;
  if (!sessionId) return { ok: true };

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('users')
      .select('active_session_id, active_session_iat')
      .eq('id', userId)
      .maybeSingle();
    if (error) return { ok: true }; // columns missing / DB issue → fail open

    const storedId = (data as any)?.active_session_id as string | null;
    const storedIat = Number((data as any)?.active_session_iat) || 0;

    if (!storedId || storedId === sessionId) {
      if (storedId !== sessionId) {
        await db.from('users').update({ active_session_id: sessionId, active_session_iat: iat }).eq('id', userId);
      }
      return { ok: true };
    }
    if (iat >= storedIat) {
      // Newer sign-in: this device becomes the active session, older ones die.
      await db.from('users').update({ active_session_id: sessionId, active_session_iat: iat }).eq('id', userId);
      return { ok: true };
    }
    // Older session while a newer login exists elsewhere → blocked.
    return { ok: false, reason: 'session_superseded' };
  } catch {
    return { ok: true };
  }
}
