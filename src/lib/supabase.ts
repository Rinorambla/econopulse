import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const SUPABASE_ENABLED = !!(supabaseUrl && supabaseAnonKey)

// IMPORTANT: in the browser we use `createBrowserClient` from `@supabase/ssr`
// so the session is persisted in COOKIES (not only localStorage). This is
// required so that API routes / Server Components that read cookies via
// `@supabase/ssr` `createServerClient` see the authenticated user.
// On the server (SSR build phase) we fall back to a stateless client; server
// runtime code should always use `src/lib/supabase-server.ts` instead.
export const supabase = SUPABASE_ENABLED
  ? (typeof window !== 'undefined'
      ? createBrowserClient(supabaseUrl as string, supabaseAnonKey as string)
      : createClient(supabaseUrl as string, supabaseAnonKey as string, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }))
  : (new Proxy({} as any, {
      get() {
        // Return mock functions instead of throwing during build
        return () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
      }
    }))

// Database Types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          subscription_status: 'free' | 'pro' | 'premium' | 'corporate'
          subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          subscription_status?: 'free' | 'pro' | 'premium' | 'corporate'
          subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          subscription_status?: 'free' | 'pro' | 'premium' | 'corporate'
          subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'conservative' | 'balanced' | 'aggressive' | 'smart_pick'
          allocation: any
          performance_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'conservative' | 'balanced' | 'aggressive' | 'smart_pick'
          allocation: any
          performance_data?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'conservative' | 'balanced' | 'aggressive' | 'smart_pick'
          allocation?: any
          performance_data?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
