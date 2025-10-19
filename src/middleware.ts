import { NextResponse } from 'next/server';

export default function middleware(req: Request) {
  // Allow public assets like manifest.json, service worker, icons without CSP injection issues
  const url = new URL((req as any).url)
  const pathname = url.pathname
  
  if (pathname === '/manifest.json' || pathname === '/sw.js' || pathname.startsWith('/icons/')) {
    // Bypass middleware for these static assets
    return NextResponse.next()
  }

  const res = NextResponse.next()
  
  // Security headers
  const csp = [
    "default-src 'self'",
    // Allow TradingView embed script
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // Allow Supabase + external APIs (explicitly include Supabase domain)
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https: wss:",
    // Allow embedding TradingView frames
    "frame-src https://s.tradingview.com https://www.tradingview.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  
  return res
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
