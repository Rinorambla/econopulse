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
  refreshPlan: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
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
  refreshPlan: async () => {},
  signIn: async () => ({ success: false, error: 'Auth unavailable' }),
  signUp: async () => ({ success: false, error: 'Auth unavailable' }),
  signInWithGoogle: async () => ({ success: false, error: 'Auth unavailable' }),
  signOut: async () => {},
  requestReauth: async () => ({ success: false, error: 'Auth unavailable' })
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch plan details for the current authenticated user
  const fetchPlan = useCallback(async () => {
    // Skip if already fetching or no session
    if (!session) return;
    
    // Check sessionStorage cache first (5 min TTL)
    const cacheKey = `plan_cache_${session.user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { plan: cachedPlan, isAdmin: cachedAdmin, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 300000) { // 5 min cache
          setPlan(cachedPlan);
          setIsAdmin(cachedAdmin);
          return;
        }
      } catch {}
    }
    
    try {
      setRefreshingPlan(true);

      const accessToken = session.access_token as any;
      // Helper: fetch with timeout
      const fetchWithTimeout = (ms = 7000) => {
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
          res = await fetchWithTimeout(7000 + attempt * 1000);
          if (res.ok) break;
          lastErr = new Error(`HTTP ${res.status}`);
        } catch (e) {
          lastErr = e;
        }
        // Small backoff before next attempt
        await new Promise(r => setTimeout(r, 200 + attempt * 200));
      }

      if (!res || !res.ok) {
        console.warn('Plan fetch failed after retries:', lastErr);
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
        sessionStorage.setItem(cacheKey, JSON.stringify({ plan: newPlan, isAdmin: newAdmin, timestamp: Date.now() }));
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
    await fetchPlan();
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
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          // Debounce fetchPlan to avoid rapid successive calls
          clearTimeout(fetchTimer);
          fetchTimer = setTimeout(() => fetchPlan(), 200);
        } else {
          setPlan(null);
          sessionStorage.clear(); // Clear cache on logout
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
      // Use Supabase client directly for immediate auth state update
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined // Disable email confirmation temporarily
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
          redirectTo: `${window.location.origin}/en/dashboard`,
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
    refreshPlan,
    signIn,
    signUp,
    signInWithGoogle,
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
