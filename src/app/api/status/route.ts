import { NextResponse } from 'next/server';
import { SUPABASE_ENABLED } from '@/lib/supabase';

// Lightweight status endpoint (no secrets) to help diagnose why pages/features may be hidden after deploy.
// Returns ONLY boolean flags – never expose raw keys.
export async function GET() {
  const env = process.env;
  const payload = {
    timestamp: new Date().toISOString(),
    supabaseEnabled: SUPABASE_ENABLED,
    // Core external providers (booleans only)
    providers: {
      stripe: !!env.STRIPE_SECRET_KEY,
      openai: !!env.OPENAI_API_KEY,
      tiingo: !!env.TIINGO_API_KEY,
      resend: !!env.RESEND_API_KEY,
    },
    // Public-facing flags that influence UI gating
    devBypass: env.NEXT_PUBLIC_DEV_BYPASS === 'true',
    nodeEnv: env.NODE_ENV,
    localePrefixExpected: true,
  } as const;

  return NextResponse.json(payload, { status: 200 });
}
