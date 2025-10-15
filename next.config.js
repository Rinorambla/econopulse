import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabilitato per stabilità
  experimental: {
    forceSwcTransforms: true
  },
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  // PWA configurations
  headers: async () => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co https://js.stripe.com https://*.stripe.com https://*.vercel.app",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    const securityHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
    ];
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          ...securityHeaders
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Service-Worker-Allowed', value: '/' },
          ...securityHeaders
        ],
      }
    ];
  },
  // Configurazioni per stabilità del server
  serverExternalPackages: ['mongodb', 'mongoose'],
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Ottimizzazioni per sviluppo
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
  // Ridotto carico del server
  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 2,
  },
  compress: false, // Disabilitato per sviluppo
  poweredByHeader: false,
  generateEtags: false,
};

export default withNextIntl(nextConfig);
