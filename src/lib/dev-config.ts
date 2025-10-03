/**
 * Developer Configuration
 * Enable developer mode via NEXT_PUBLIC_DEV_MODE environment variable
 * Only accessible when you set this in Vercel Dashboard
 */

export const DEV_CONFIG = {
  // Check environment variable - only you can enable this on Vercel
  DEVELOPER_MODE: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
  
  // Mock user for developer mode
  DEV_USER: {
    id: 'dev-user-001',
    email: 'dev@econopulse.ai',
    full_name: 'Developer',
    subscription_tier: 'premium',
    subscription_status: 'active',
  }
};
