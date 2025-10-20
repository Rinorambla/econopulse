/**
 * Developer Configuration
 * Admin email with automatic premium access
 * Change ADMIN_EMAIL to your personal email
 */

// Admin email - hardcoded for client-side access
const ADMIN_EMAIL = 'info@econopulse.ai';

export const DEV_CONFIG = {
  // Set your admin email here - this email gets automatic premium access
  ADMIN_EMAIL: ADMIN_EMAIL,
  
  // Admin user gets premium automatically after login
  isAdminEmail: (email: string | undefined) => {
    if (!email) return false;
    const adminEmail = ADMIN_EMAIL.toLowerCase();
    const userEmail = email.toLowerCase().trim();
    console.log('🔐 Admin check:', { userEmail, adminEmail, match: userEmail === adminEmail });
    return userEmail === adminEmail;
  }
};
