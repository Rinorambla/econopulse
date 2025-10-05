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
  refreshPlan: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  requestReauth: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [refreshingPlan, setRefreshingPlan] = useState(false);

  // Fetch plan details for the current authenticated user
  const fetchPlan = useCallback(async () => {
    try {
      setRefreshingPlan(true);
      
      // Try API first
      const res = await fetch('/api/me', { 
        cache: 'no-store',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('me failed');
      const json = await res.json();
      console.log('📧 /api/me response:', json);
      
      if (json?.authenticated) {
        // Server authenticated successfully
        const finalPlan = json.plan || 'free';
        setPlan(finalPlan);
        
        if (json.isAdmin) {
          console.log('👑 Admin access granted by server!');
        }
        
        console.log('✅ Plan set to:', finalPlan);
      } else {
        // API couldn't authenticate, but we have user session locally
        // Check if admin email on client-side as fallback
        if (user?.email) {
          const adminEmail = 'econopulse.info@econopulse.ai';
          const isAdmin = user.email.toLowerCase().trim() === adminEmail.toLowerCase();
          
          console.log('🔐 Client-side admin check:', {
            userEmail: user.email,
            adminEmail,
            isAdmin
          });
          
          if (isAdmin) {
            setPlan('premium');
            console.log('👑 Admin access granted (client-side fallback)!');
          } else {
            setPlan('free');
            console.log('❌ Not admin, plan set to free');
          }
        } else {
          setPlan('free');
          console.log('❌ Not authenticated, plan set to free');
        }
      }
    } catch (e) {
      console.warn('Fetch plan error', e);
      // Fallback to client-side check
      if (user?.email) {
        const adminEmail = 'econopulse.info@econopulse.ai';
        const isAdmin = user.email.toLowerCase().trim() === adminEmail.toLowerCase();
        setPlan(isAdmin ? 'premium' : 'free');
        console.log('🔄 Fallback to client check:', isAdmin ? 'premium' : 'free');
      } else {
        setPlan('free');
      }
    } finally {
      setRefreshingPlan(false);
    }
  }, [user]);

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
