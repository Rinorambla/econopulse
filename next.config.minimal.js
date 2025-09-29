// DEPRECATED: Do not use. Consolidated into next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    forceSwcTransforms: true
  },
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    return config
  },
  onDemandEntries: { maxInactiveAge: 25 * 1000, pagesBufferLength: 2 },
  compress: false,
  poweredByHeader: false,
  generateEtags: false,
}
export default nextConfig
