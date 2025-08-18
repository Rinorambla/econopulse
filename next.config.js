import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignora gli errori ESLint durante il build di produzione
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora gli errori TypeScript durante il build se necessario
    ignoreBuildErrors: false,
  }
};

export default withNextIntl(nextConfig);
