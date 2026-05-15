-- Idempotent migration to ensure all subscription columns exist
-- Run in Supabase SQL editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- Backfill: copy stripe_subscription_id to subscription_id where missing
UPDATE public.users
SET subscription_id = stripe_subscription_id
WHERE subscription_id IS NULL AND stripe_subscription_id IS NOT NULL;
