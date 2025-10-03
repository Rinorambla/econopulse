'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, SUPABASE_ENABLED } from '@/lib/supabase';
import { DEV_CONFIG } from '@/lib/dev-config';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  plan: string | null;
  refreshingPlan: boolean;
  refreshPlan: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  requestReauth: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Developer mode: bypass authentication
  const isDeveloperMode = DEV_CONFIG.DEVELOPER_MODE;
  
  const [user, setUser] = useState<User | null>(isDeveloperMode ? DEV_CONFIG.DEV_USER as any : null);
  const [session, setSession] = useState<Session | null>(isDeveloperMode ? { user: DEV_CONFIG.DEV_USER } as any : null);
  const [loading, setLoading] = useState(!isDeveloperMode);
  const [plan, setPlan] = useState<string | null>(isDeveloperMode ? 'premium' : null);
  const [refreshingPlan, setRefreshingPlan] = useState(false);

  // Fetch plan details for the current authenticated user
  const fetchPlan = useCallback(async () => {
    // Developer mode: always premium
    if (isDeveloperMode) {
      setPlan('premium');
      return;
    }
    
    try {
      setRefreshingPlan(true);
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) throw new Error('me failed');
      const json = await res.json();
      if (json?.authenticated) {
        setPlan(json.plan || 'free');
      } else {
        setPlan('free');
      }
    } catch (e) {
      console.warn('Fetch plan error', e);
      setPlan('free');
    } finally {
      setRefreshingPlan(false);
    }
  }, [isDeveloperMode]);

  const refreshPlan = useCallback(async () => {
    if (!user) return;
    await fetchPlan();
  }, [user, fetchPlan]);

  useEffect(() => {
    // Developer mode: skip auth completely
    if (isDeveloperMode) {
      console.log('🔧 DEVELOPER MODE: Authentication bypassed');
      setLoading(false);
      return;
    }
    
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
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          // Lazy fetch plan after auth state change
          fetchPlan();
        } else {
          setPlan(null);
        }
      }
    );

  return () => subscription.unsubscribe();
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
