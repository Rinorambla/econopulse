import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);
 
// DEPRECATED: replaced by unified next.config.js
const nextConfig = {}
export default nextConfig
