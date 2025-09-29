import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server'

const intl = createMiddleware({
  locales: ['en', 'it'],
  defaultLocale: 'en',
  localePrefix: 'always'
})

export default function middleware(req: Request) {
  const res = intl(req as any) as any
  if (res?.headers) {
    // Security headers
    const csp = [
      "default-src 'self'",
      // Allow TradingView embed script
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
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
  }
  return res as NextResponse
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
