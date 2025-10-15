// API Route: /api/health
// Health check endpoint for monitoring and deployment verification

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatency = 0;
    
    try {
      const dbStart = Date.now();
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .single();
      
      dbLatency = Date.now() - dbStart;
      dbStatus = error ? 'error' : 'healthy';
    } catch (error) {
      dbStatus = 'error';
    }

    // Check Stripe configuration
    const stripeConfigured = !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Check Supabase configuration
    const supabaseConfigured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // System information
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      region: process.env.VERCEL_REGION || 'unknown',
    };

    // Service status
    const services = {
      database: {
        status: dbStatus,
        latency: dbLatency,
        configured: supabaseConfigured,
      },
      stripe: {
        status: stripeConfigured ? 'configured' : 'not-configured',
        configured: stripeConfigured,
      },
      openai: {
        status: process.env.OPENAI_ENABLED === 'true' ? 'enabled' : 'disabled',
        configured: !!process.env.OPENAI_API_KEY,
      },
    };

    // Overall health status
    const overallStatus = 
      dbStatus === 'healthy' && stripeConfigured && supabaseConfigured
        ? 'healthy'
        : 'degraded';

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: overallStatus,
      timestamp: systemInfo.timestamp,
      responseTime,
      system: systemInfo,
      services,
      checks: {
        database: dbStatus === 'healthy',
        stripe: stripeConfigured,
        supabase: supabaseConfigured,
      },
    }, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

// Support HEAD requests for basic connectivity checks
export async function HEAD(request: NextRequest) {
  const response = await GET(request);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}