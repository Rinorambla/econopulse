import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const SUPABASE_ENABLED = !!(supabaseUrl && supabaseAnonKey)

// Create a no-op proxy when env is missing to avoid runtime crashes
export const supabase = SUPABASE_ENABLED
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // Rely on default storage; disable auto-refresh if it causes fetch storms
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : (new Proxy({} as any, {
      get() {
        throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
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
