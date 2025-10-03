/**
 * Developer Configuration
 * Admin email with automatic premium access
 * Change ADMIN_EMAIL to your personal email
 */

export const DEV_CONFIG = {
  // Set your admin email here - this email gets automatic premium access
  ADMIN_EMAIL: 'admin@econopulse.ai',
  
  // Admin user gets premium automatically after login
  isAdminEmail: (email: string | undefined) => {
    if (!email) return false;
    return email.toLowerCase() === DEV_CONFIG.ADMIN_EMAIL.toLowerCase();
  }
};
