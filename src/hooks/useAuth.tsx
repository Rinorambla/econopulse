'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, SUPABASE_ENABLED } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  plan: string | null;
  refreshingPlan: boolean;
  isAdmin: boolean;
  isDevUser: boolean;
  refreshPlan: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  requestReauth: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safe default to avoid hard crashes if a component mounts before the provider
const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: false,
  plan: null,
  refreshingPlan: false,
  isAdmin: false,
  isDevUser: false,
  refreshPlan: async () => {},
  signIn: async () => ({ success: false, error: 'Auth unavailable' }),
  signUp: async () => ({ success: false, error: 'Auth unavailable' }),
  signInWithGoogle: async () => ({ success: false, error: 'Auth unavailable' }),
  signInWithApple: async () => ({ success: false, error: 'Auth unavailable' }),
  signOut: async () => {},
  requestReauth: async () => ({ success: false, error: 'Auth unavailable' })
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Hydrate plan synchronously from non-HttpOnly cookie set by /api/me to
  // avoid the "Upgrade Required" flash while the next /api/me call resolves.
  const readPlanCookie = (): { plan: string | null; isAdmin: boolean } => {
    if (typeof document === 'undefined') return { plan: null, isAdmin: false };
    const cookies = document.cookie.split(';').map(c => c.trim());
    const pc = cookies.find(c => c.startsWith('ep_plan='));
    const ac = cookies.find(c => c.startsWith('ep_admin='));
    return {
      plan: pc ? decodeURIComponent(pc.split('=')[1]) : null,
      isAdmin: ac ? decodeURIComponent(ac.split('=')[1]) === '1' : false,
    };
  };
  const initialCookie = typeof window !== 'undefined' ? readPlanCookie() : { plan: null, isAdmin: false };
  const [plan, setPlan] = useState<string | null>(initialCookie.plan);
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initialCookie.isAdmin);

  // Fetch plan details for the current authenticated user.
  // No sessionStorage cache — /api/me is no-store and fast. The ep_plan cookie
  // (set by /api/me) provides synchronous hydration on first render.
  const fetchPlan = useCallback(async (_force = false) => {
    if (!session) return;

    try {
      setRefreshingPlan(true);
      const accessToken = session.access_token as any;
      const fetchWithTimeout = (ms = 15000) => {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), ms);
        const p = fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          signal: ctrl.signal
        }).finally(() => clearTimeout(id));
        return p;
      };

      // Retry up to 2 times on network errors/timeouts
      let res: Response | null = null;
      let lastErr: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetchWithTimeout(15000 + attempt * 2000);
          if (res.ok) break;
          lastErr = new Error(`HTTP ${res.status}`);
        } catch (e) {
          lastErr = e;
        }
        // Small backoff before next attempt
        await new Promise(r => setTimeout(r, 200 + attempt * 200));
      }

      if (!res || !res.ok) {
        // AbortError on page navigation is expected, don't spam console
        if (lastErr?.name !== 'AbortError') {
          console.warn('Plan fetch failed after retries:', lastErr);
        }
        // Do NOT downgrade immediately on transient failures; keep previous state if any
        // Only set to free if we truly have no cached info
        if (plan == null) {
          setPlan('free');
          setIsAdmin(false);
        }
        return;
      }

      const json = await res.json();
      if (json?.authenticated) {
        const newPlan = json.plan || 'free';
        const newAdmin = json.isAdmin || false;
        setPlan(newPlan);
        setIsAdmin(newAdmin);
      } else {
        setPlan('free');
        setIsAdmin(false);
      }
    } catch (e) {
      console.warn('Plan fetch exception:', e);
      if (plan == null) {
        setPlan('free');
        setIsAdmin(false);
      }
    } finally {
      setRefreshingPlan(false);
    }
  }, [session]);

  const refreshPlan = useCallback(async () => {
    if (!user) return;
    await fetchPlan(true); // force bypass cache
  }, [user, fetchPlan]);

  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      // No Supabase in this environment: treat as logged-out without errors
      setUser(null)
      setSession(null)
      setLoading(false)
      return
    }
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    };

  getInitialSession();

    // Listen for auth changes
  let fetchTimer: NodeJS.Timeout;
  let lastUserId: string | null = null;
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        const newUserId = session?.user?.id ?? null;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          // If a different user just signed in (or first sign-in this tab),
          // wipe any stale ep_plan cookie + local plan so we don't show
          // a previous user's premium access while /api/me is still loading.
          if (event === 'SIGNED_IN' || (lastUserId && lastUserId !== newUserId)) {
            if (typeof document !== 'undefined') {
              document.cookie = 'ep_plan=; Path=/; Max-Age=0; SameSite=Lax';
              document.cookie = 'ep_admin=; Path=/; Max-Age=0; SameSite=Lax';
            }
            setPlan(null);
            setIsAdmin(false);
          }
          lastUserId = newUserId;
          // Debounce fetchPlan to avoid rapid successive calls
          clearTimeout(fetchTimer);
          fetchTimer = setTimeout(() => fetchPlan(), 200);
        } else {
          lastUserId = null;
          setPlan(null);
          setIsAdmin(false);
        }
      }
    );

  // Refresh plan on visibility regain or when back online
  const onVis = () => { if (document.visibilityState === 'visible') fetchPlan(); };
  const onOnline = () => { fetchPlan(); };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVis);
  }

  return () => {
    subscription.unsubscribe();
    clearTimeout(fetchTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVis);
    }
  };
  }, [fetchPlan]);

  // Ensure plan is fetched whenever we have a user but no plan yet.
  // Covers the case where getInitialSession() resolves a session but
  // onAuthStateChange doesn't re-emit (no INITIAL_SESSION event).
  useEffect(() => {
    if (user && plan === null && session) {
      fetchPlan();
    }
  }, [user, plan, session, fetchPlan]);

  const signIn = async (email: string, password: string) => {
    try {
      if (!SUPABASE_ENABLED) return { success: false, error: 'Auth unavailable' }
      // Use Supabase client directly for immediate auth state update
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Auth state will be updated automatically by the listener
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      if (!SUPABASE_ENABLED) return { success: false, error: 'Auth unavailable' }
      // Build the redirect URL used in the confirmation email link
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;
      // Use Supabase client directly for immediate auth state update
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: redirectTo,
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Create user record in our users table via API
      try {
        await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: data.user.id,
            email: data.user.email,
            fullName 
          }),
        });
      } catch (dbError) {
        console.warn('Failed to create user record in database:', dbError);
        // Don't fail signup if database record creation fails
      }

      return { 
        success: true, 
        needsConfirmation: !data.user.email_confirmed_at 
      };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (!SUPABASE_ENABLED) return;
      await supabase.auth.signOut();
      // Clear plan hydration cookies
      if (typeof document !== 'undefined') {
        document.cookie = 'ep_plan=; Path=/; Max-Age=0; SameSite=Lax';
        document.cookie = 'ep_admin=; Path=/; Max-Age=0; SameSite=Lax';
      }
      // The auth state change listener will handle updating the state
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (!SUPABASE_ENABLED) return { success: false, error: 'Auth unavailable' }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/ai-pulse`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to sign in with Google' };
    }
  };

  const signInWithApple = async () => {
    try {
      if (!SUPABASE_ENABLED) return { success: false, error: 'Auth unavailable' };
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/ai-pulse`,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to sign in with Apple' };
    }
  };

  const requestReauth = async (email: string) => {
    try {
      const response = await fetch('/api/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send reauthentication email' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const value = {
    user,
    session,
    loading,
    plan,
    refreshingPlan,
    isAdmin,
    // Developer bypass: allow specific emails to have full access regardless of plan
    // Reads from NEXT_PUBLIC_DEV_ACCESS_EMAILS (comma/space separated). Defaults to info@econopulse.ai
    isDevUser: (() => {
      try {
        const raw = (process.env.NEXT_PUBLIC_DEV_ACCESS_EMAILS || 'info@econopulse.ai') as string;
        const list = raw.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
        const email = (user?.email || '').toLowerCase();
        return !!email && list.includes(email);
      } catch {
        return false;
      }
    })(),
    refreshPlan,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    requestReauth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Avoid crashing the entire app; log and return a safe default
    if (typeof window !== 'undefined') {
      console.warn('useAuth called outside of AuthProvider; returning safe defaults.');
    }
    return defaultAuthContext;
  }
  return context;
}
