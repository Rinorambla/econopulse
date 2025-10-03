/**
 * Developer Configuration
 * Set DEVELOPER_MODE to true to bypass authentication
 */

export const DEV_CONFIG = {
  // Set to true to enable developer mode (bypass auth)
  DEVELOPER_MODE: true,
  
  // Mock user for developer mode
  DEV_USER: {
    id: 'dev-user-001',
    email: 'dev@econopulse.ai',
    full_name: 'Developer',
    subscription_tier: 'premium',
    subscription_status: 'active',
  }
};
