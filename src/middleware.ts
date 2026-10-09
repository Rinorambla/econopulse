import { NextResponse } from 'next/server';

export default function middleware(req: Request) {
  // Allow public assets like manifest.json, service worker, icons without CSP injection issues
  const url = new URL((req as any).url)
  const pathname = url.pathname
  
  // Redirect legacy locale-prefixed paths to non-locale equivalents
  // e.g., /en/ai-pulse -> /ai-pulse, /it -> /
  // IMPORTANT: preserve the query string (e.g. ?checkout=success&session_id=...)
  const localeMatch = pathname.match(/^\/(en|it)(?:\/(.*))?$/)
  if (localeMatch) {
    const rest = localeMatch[2] ? `/${localeMatch[2]}` : '/'
    return NextResponse.redirect(new URL(rest + url.search, url.origin), 308)
  }
  
  if (pathname === '/manifest.json' || pathname === '/sw.js' || pathname.startsWith('/icons/')) {
    // Bypass middleware for these static assets
    return NextResponse.next()
  }

  const res = NextResponse.next()
  
  // Security headers
  const csp = [
    "default-src 'self'",
    // Allow TradingView embed script
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com https://widget.tradingeconomics.com https://www.tradays.com https://*.tradays.com https://marketchameleon.com https://*.marketchameleon.com",
    "style-src 'self' 'unsafe-inline' https://www.tradays.com https://*.tradays.com https://marketchameleon.com https://*.marketchameleon.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://www.tradays.com https://*.tradays.com",
    // Allow Supabase + external APIs (explicitly include Supabase domain)
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https: wss:",
    // Allow embedding TradingView + Tradays + MarketChameleon frames
    "frame-src https://s.tradingview.com https://www.tradingview.com https://widget.tradingeconomics.com https://tradingeconomics.com https://www.tradays.com https://*.tradays.com https://marketchameleon.com https://*.marketchameleon.com",
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
