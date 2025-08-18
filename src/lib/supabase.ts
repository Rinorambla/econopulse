import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
