import { Resend } from 'resend';

// Lazy singleton (avoid constructing Resend at module load when key missing)
let _resend: Resend | null | undefined; // undefined = not attempted, null = unavailable

function getResend(): Resend | null {
  if (_resend !== undefined) return _resend; // already resolved (instance or null)
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('📭 RESEND_API_KEY not configured – email sending disabled (using no-op).');
    _resend = null;
    return _resend;
  }
  try {
    _resend = new Resend(key);
  } catch (e) {
    console.warn('📭 Failed to initialize Resend client – disabling email sending.', e);
    _resend = null;
  }
  return _resend;
}

export interface WeeklyNewsletterData {
  marketSummary: {
    sp500Change: number;
    topGainer: { symbol: string; change: number };
    topLoser: { symbol: string; change: number };
    vixLevel: number;
  };
  economicHighlights: string[];
  topETFs: Array<{
    symbol: string;
    name: string;
    weeklyReturn: number;
    volume: number;
  }>;
  aiInsights: string[];
  upcomingEvents: Array<{
    date: string;
    event: string;
    importance: 'high' | 'medium' | 'low';
  }>;
}

export class EmailService {
  static async sendWelcomeEmail(email: string): Promise<boolean> {
    const client = getResend();
    if (!client) {
      console.warn(`✉️ (welcome) Skipping send – Resend not configured for ${email}`);
      return false;
    }
    try {
      const { data, error } = await client.emails.send({
        from: `${process.env.NEWSLETTER_FROM_NAME} <${process.env.NEWSLETTER_FROM_EMAIL}>`,
        to: [email],
        subject: '🎉 Welcome to EconoPulse Newsletter!',
        html: this.getWelcomeEmailTemplate(),
      });

      if (error) {
        console.error('❌ Welcome email error:', error);
        return false;
      }

      console.log('✅ Welcome email sent:', data);
      return true;
    } catch (error) {
      console.error('❌ Welcome email failed:', error);
      return false;
    }
  }

  static async sendReauthEmail(email: string, confirmationUrl: string): Promise<boolean> {
    const client = getResend();
    if (!client) {
      console.warn(`✉️ (reauth) Skipping send – Resend not configured for ${email}`);
      return false;
    }
    try {
      const { data, error } = await client.emails.send({
        from: `${process.env.NEWSLETTER_FROM_NAME} <${process.env.NEWSLETTER_FROM_EMAIL}>`,
        to: [email],
        subject: '🔐 Reauthenticate your EconoPulse session',
        html: this.getReauthEmailTemplate(email, confirmationUrl),
      });

      if (error) {
        console.error('❌ Reauth email error:', error);
        return false;
      }

      console.log('✅ Reauth email sent:', data);
      return true;
    } catch (error) {
      console.error('❌ Reauth email failed:', error);
      return false;
    }
  }

  static async sendWeeklyNewsletter(
    email: string,
    data: WeeklyNewsletterData
  ): Promise<boolean> {
    const client = getResend();
    if (!client) {
      console.warn(`✉️ (weekly) Skipping send – Resend not configured for ${email}`);
      return false;
    }
    try {
      const { data: emailData, error } = await client.emails.send({
        from: `${process.env.NEWSLETTER_FROM_NAME} <${process.env.NEWSLETTER_FROM_EMAIL}>`,
        to: [email],
        subject: `📊 Weekly Market Pulse - ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`,
        html: this.getWeeklyNewsletterTemplate(data),
      });

      if (error) {
        console.error('❌ Weekly newsletter error:', error);
        return false;
      }

      console.log('✅ Weekly newsletter sent:', emailData);
      return true;
    } catch (error) {
      console.error('❌ Weekly newsletter failed:', error);
      return false;
    }
  }

  /**
   * Trial-ending reminder: sent from the Stripe webhook on
   * `customer.subscription.trial_will_end` (3 days before trial expires).
   */
  static async sendTrialEndingSoon(
    email: string,
    opts: { trialEndDate: Date; planName?: string; amountEur?: number }
  ): Promise<boolean> {
    const client = getResend();
    if (!client) {
      console.warn(`✉️ (trial-end) Skipping send – Resend not configured for ${email}`);
      return false;
    }
    try {
      const { data, error } = await client.emails.send({
        from: `${process.env.NEWSLETTER_FROM_NAME} <${process.env.NEWSLETTER_FROM_EMAIL}>`,
        to: [email],
        subject: '⏰ Your EconoPulse trial ends in 3 days',
        html: this.getTrialEndingTemplate(email, opts),
      });
      if (error) {
        console.error('❌ Trial-ending email error:', error);
        return false;
      }
      console.log('✅ Trial-ending email sent:', data);
      return true;
    } catch (error) {
      console.error('❌ Trial-ending email failed:', error);
      return false;
    }
  }

  /**
   * Subscription confirmation: sent from the Stripe webhook on
   * `checkout.session.completed` (fires exactly once per checkout).
   */
  static async sendSubscriptionConfirmed(
    email: string,
    opts: { amountEur?: number; interval?: 'month' | 'year' | string | null }
  ): Promise<boolean> {
    const client = getResend();
    if (!client) {
      console.warn(`✉️ (sub-confirmed) Skipping send – Resend not configured for ${email}`);
      return false;
    }
    try {
      const { data, error } = await client.emails.send({
        from: `${process.env.NEWSLETTER_FROM_NAME} <${process.env.NEWSLETTER_FROM_EMAIL}>`,
        to: [email],
        subject: '🎉 Welcome to EconoPulse Premium — subscription confirmed',
        html: this.getSubscriptionConfirmedTemplate(email, opts),
      });
      if (error) {
        console.error('❌ Subscription-confirmed email error:', error);
        return false;
      }
      console.log('✅ Subscription-confirmed email sent:', data);
      return true;
    } catch (error) {
      console.error('❌ Subscription-confirmed email failed:', error);
      return false;
    }
  }

  /**
   * Dunning email: sent from the Stripe webhook on `invoice.payment_failed`.
   * The subscription enters `past_due` (grace period) — the user keeps access
   * but must update their card before Stripe gives up retrying.
   */
  static async sendPaymentFailed(
    email: string,
    opts: { amountEur?: number; nextRetryDate?: Date | null }
  ): Promise<boolean> {
    const client = getResend();
    if (!client) {
      console.warn(`✉️ (payment-failed) Skipping send – Resend not configured for ${email}`);
      return false;
    }
    try {
      const { data, error } = await client.emails.send({
        from: `${process.env.NEWSLETTER_FROM_NAME} <${process.env.NEWSLETTER_FROM_EMAIL}>`,
        to: [email],
        subject: '⚠️ Payment failed — update your card to keep EconoPulse Premium',
        html: this.getPaymentFailedTemplate(email, opts),
      });
      if (error) {
        console.error('❌ Payment-failed email error:', error);
        return false;
      }
      console.log('✅ Payment-failed email sent:', data);
      return true;
    } catch (error) {
      console.error('❌ Payment-failed email failed:', error);
      return false;
    }
  }

  static async sendBulkNewsletter(
    emails: string[],
    data: WeeklyNewsletterData
  ): Promise<{ success: number; failed: number; skipped?: number }> {
    const client = getResend();
    if (!client) {
      console.warn('✉️ (bulk) Skipping all sends – Resend not configured');
      return { success: 0, failed: 0, skipped: emails.length };
    }
    const results = { success: 0, failed: 0 };
    for (const email of emails) {
      const sent = await this.sendWeeklyNewsletter(email, data);
      if (sent) results.success++; else results.failed++;
      await new Promise(resolve => setTimeout(resolve, 100)); // simple throttle
    }
    return results;
  }

  private static getReauthEmailTemplate(email: string, confirmationUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reauthenticate - EconoPulse</title>
    </head>
    <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px; margin:0;">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="600" style="background:#fff; border-radius:8px; padding:30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <tr>
                <td align="center" style="font-size:24px; font-weight:bold; color:#333; padding-bottom:10px;">
                  🔐 Reauthenticate your session
                </td>
              </tr>
              <tr>
                <td style="padding-top:20px; font-size:16px; color:#333; line-height:1.6;">
                  Hi <strong>${email}</strong>,
                  <br><br>
                  For security reasons, we need you to reauthenticate before continuing.
                  <br><br>
                  Click the button below to reauthenticate your account:
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:30px 0;">
                  <a href="${confirmationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; padding:14px 28px; text-decoration:none; border-radius:6px; font-size:16px; font-weight:600; display:inline-block;">
                    🔐 Reauthenticate Now
                  </a>
                </td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#666; padding-top:20px; line-height:1.5; text-align:center;">
                  If you did not request this, you can safely ignore this email.
                  <br>
                  This link will expire in 1 hour for security reasons.
                </td>
              </tr>
              <tr>
                <td style="font-size:12px; color:#999; padding-top:30px; text-align:center; border-top:1px solid #eee; margin-top:20px;">
                  Best regards,<br>
                  <strong>The EconoPulse Team</strong>
                  <br><br>
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #667eea;">EconoPulse.ai</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  private static getWelcomeEmailTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to EconoPulse</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 14px; color: #666; }
            .highlight { background-color: #e0e7ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to EconoPulse!</h1>
                <p>Your gateway to intelligent market insights</p>
            </div>
            <div class="content">
                <h2>Thank you for subscribing!</h2>
                <p>You're now part of an exclusive community of traders, investors, and financial professionals who stay ahead of market trends with our weekly newsletter.</p>
                
                <div class="highlight">
                    <h3>📊 What you'll receive every week:</h3>
                    <ul>
                        <li><strong>Market Summary:</strong> Key movements in major indices and ETFs</li>
                        <li><strong>Economic Highlights:</strong> Important economic events and data releases</li>
                        <li><strong>Top Performing ETFs:</strong> Best and worst performers with detailed analysis</li>
                        <li><strong>AI-Powered Insights:</strong> Machine learning predictions and trends</li>
                        <li><strong>Upcoming Events:</strong> Economic calendar and market-moving events</li>
                    </ul>
                </div>

                <p>Our newsletter is delivered every <strong>Sunday at 8:00 AM EST</strong>, giving you the perfect start to your trading week.</p>

                <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="button">
                        📈 Explore Dashboard
                    </a>
                </div>

                <p>Questions? Simply reply to this email and our team will get back to you within 24 hours.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br><strong>The EconoPulse Team</strong></p>
                <p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #667eea;">EconoPulse.ai</a> | 
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe" style="color: #666;">Unsubscribe</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private static getWeeklyNewsletterTemplate(data: WeeklyNewsletterData): string {
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Market Pulse</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .section { margin-bottom: 30px; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
            .metric { display: inline-block; background: #f1f5f9; padding: 10px 15px; margin: 5px; border-radius: 6px; text-align: center; min-width: 120px; }
            .positive { color: #16a34a; font-weight: 600; }
            .negative { color: #dc2626; font-weight: 600; }
            .neutral { color: #6b7280; font-weight: 600; }
            .etf-card { background: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 6px; border: 1px solid #e2e8f0; }
            .event-item { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .event-date { font-weight: 600; color: #667eea; margin-right: 15px; min-width: 80px; }
            .importance-high { color: #dc2626; }
            .importance-medium { color: #ea580c; }
            .importance-low { color: #16a34a; }
            .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Weekly Market Pulse</h1>
                <p>${date}</p>
            </div>
            <div class="content">
                <!-- Market Summary -->
                <div class="section">
                    <h2>🎯 Market Summary</h2>
                    <div style="text-align: center;">
                        <div class="metric">
                            <div>S&P 500</div>
                            <div class="${data.marketSummary.sp500Change >= 0 ? 'positive' : 'negative'}">
                                ${data.marketSummary.sp500Change >= 0 ? '+' : ''}${data.marketSummary.sp500Change.toFixed(2)}%
                            </div>
                        </div>
                        <div class="metric">
                            <div>VIX Level</div>
                            <div class="neutral">${data.marketSummary.vixLevel}</div>
                        </div>
                    </div>
                    <br>
                    <p><strong>🚀 Top Gainer:</strong> ${data.marketSummary.topGainer.symbol} 
                       <span class="positive">+${data.marketSummary.topGainer.change.toFixed(2)}%</span></p>
                    <p><strong>📉 Top Loser:</strong> ${data.marketSummary.topLoser.symbol} 
                       <span class="negative">${data.marketSummary.topLoser.change.toFixed(2)}%</span></p>
                </div>

                <!-- Economic Highlights -->
                <div class="section">
                    <h2>🏛️ Economic Highlights</h2>
                    <ul>
                        ${data.economicHighlights.map(highlight => `<li>${highlight}</li>`).join('')}
                    </ul>
                </div>

                <!-- Top ETFs -->
                <div class="section">
                    <h2>🏆 Top Performing ETFs</h2>
                    ${data.topETFs.map(etf => `
                        <div class="etf-card">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${etf.symbol}</strong> - ${etf.name}
                                </div>
                                <div class="${etf.weeklyReturn >= 0 ? 'positive' : 'negative'}">
                                    ${etf.weeklyReturn >= 0 ? '+' : ''}${etf.weeklyReturn.toFixed(2)}%
                                </div>
                            </div>
                            <div style="font-size: 14px; color: #666; margin-top: 5px;">
                                Volume: ${etf.volume.toLocaleString()}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- AI Insights -->
                <div class="section">
                    <h2>🤖 AI-Powered Insights</h2>
                    <ul>
                        ${data.aiInsights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>

                <!-- Upcoming Events -->
                <div class="section">
                    <h2>📅 Upcoming Events</h2>
                    ${data.upcomingEvents.map(event => `
                        <div class="event-item">
                            <div class="event-date">${event.date}</div>
                            <div style="flex: 1;">
                                ${event.event}
                                <span class="importance-${event.importance}">●</span>
                            </div>
                        </div>
                    `).join('')}
                    <div style="font-size: 12px; color: #666; margin-top: 10px;">
                        ● <span class="importance-high">High</span> | 
                        ● <span class="importance-medium">Medium</span> | 
                        ● <span class="importance-low">Low</span> Impact
                    </div>
                </div>

                <div style="text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px; margin-top: 30px;">
                    <p><strong>Want more detailed analysis?</strong></p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                        📈 View Full Dashboard
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>Best regards,<br><strong>The EconoPulse Team</strong></p>
                <p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #667eea;">EconoPulse.ai</a> | 
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/newsletter/preferences" style="color: #666;">Preferences</a> | 
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe" style="color: #666;">Unsubscribe</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private static getSubscriptionConfirmedTemplate(
    email: string,
    opts: { amountEur?: number; interval?: 'month' | 'year' | string | null }
  ): string {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.econopulse.ai';
    const priceLine = typeof opts.amountEur === 'number'
      ? `€${opts.amountEur.toFixed(2)}/${opts.interval === 'year' ? 'year' : 'month'}`
      : null;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Subscription confirmed</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6fb;margin:0;padding:24px;color:#1f2937;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
              <tr>
                <td style="background:linear-gradient(135deg,#1e3a8a 0%,#0f172a 100%);color:#ffffff;padding:32px 28px;text-align:center;">
                  <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;">EconoPulse</div>
                  <div style="margin-top:8px;font-size:14px;opacity:0.85;">Premium subscription confirmed</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 28px;">
                  <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">🎉 You're now Premium!</h1>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    Hi <strong>${email}</strong>,
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    Your <strong>EconoPulse Premium</strong> subscription is now active${priceLine ? ` at <strong>${priceLine}</strong>` : ''}.
                    Every premium feature is unlocked on your account, effective immediately.
                  </p>
                  <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:24px 0;">
                    <div style="font-size:14px;font-weight:600;color:#1e3a8a;margin-bottom:6px;">What's now unlocked</div>
                    <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
                      <li>Unlimited AI market analysis &amp; EconoAI chat</li>
                      <li>AI Portfolio Builder with risk-adjusted optimization</li>
                      <li>Options flow, gamma exposure &amp; advanced screeners</li>
                      <li>Real-time alerts on price, earnings, macro events</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${siteUrl}/dashboard"
                      style="display:inline-block;background:#1e40af;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Open your dashboard
                    </a>
                  </div>
                  <p style="font-size:13px;line-height:1.6;color:#64748b;margin:24px 0 0;">
                    Manage your plan, payment method and invoices anytime from
                    <a href="${siteUrl}/dashboard/account" style="color:#1e40af;">your account</a>.
                    You can cancel whenever you want — you'll keep access until the end of the paid period.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  private static getPaymentFailedTemplate(
    email: string,
    opts: { amountEur?: number; nextRetryDate?: Date | null }
  ): string {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.econopulse.ai';
    const amount = typeof opts.amountEur === 'number' ? `€${opts.amountEur.toFixed(2)}` : 'your subscription payment';
    const retryStr = opts.nextRetryDate
      ? opts.nextRetryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Payment failed</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6fb;margin:0;padding:24px;color:#1f2937;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
              <tr>
                <td style="background:linear-gradient(135deg,#7f1d1d 0%,#0f172a 100%);color:#ffffff;padding:32px 28px;text-align:center;">
                  <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;">EconoPulse</div>
                  <div style="margin-top:8px;font-size:14px;opacity:0.85;">Action required on your subscription</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 28px;">
                  <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">⚠️ We couldn't process your payment</h1>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    Hi <strong>${email}</strong>,
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    We tried to charge <strong>${amount}</strong> for your EconoPulse Premium
                    subscription, but the payment didn't go through. This usually happens when a
                    card has expired or has insufficient funds.
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    <strong>Your premium access is still active</strong> for now${retryStr ? ` — we'll retry automatically around <strong>${retryStr}</strong>` : ''}.
                    To avoid losing access, please update your payment method.
                  </p>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${siteUrl}/dashboard/account"
                      style="display:inline-block;background:#b91c1c;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Update payment method
                    </a>
                  </div>
                  <p style="font-size:13px;line-height:1.6;color:#64748b;margin:24px 0 0;">
                    If the payment keeps failing, your subscription will be cancelled automatically
                    and your account will revert to the Free plan. If you've already updated your
                    card, you can ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  private static getTrialEndingTemplate(
    email: string,
    opts: { trialEndDate: Date; planName?: string; amountEur?: number }
  ): string {
    const dateStr = opts.trialEndDate.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const plan = opts.planName || 'Premium';
    const price = typeof opts.amountEur === 'number'
      ? `€${opts.amountEur.toFixed(2)}/month`
      : '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.econopulse.ai';
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Your EconoPulse trial ends soon</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6fb;margin:0;padding:24px;color:#1f2937;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
              <tr>
                <td style="background:linear-gradient(135deg,#1e3a8a 0%,#0f172a 100%);color:#ffffff;padding:32px 28px;text-align:center;">
                  <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;">EconoPulse</div>
                  <div style="margin-top:8px;font-size:14px;opacity:0.85;">Your trial is ending soon</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 28px;">
                  <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">⏰ 3 days left on your free trial</h1>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    Hi <strong>${email}</strong>,
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                    Your <strong>EconoPulse ${plan}</strong> free trial will end on
                    <strong>${dateStr}</strong>. After that, your subscription will renew automatically
                    ${price ? `at <strong>${price}</strong>` : ''} so you can keep using every premium feature without interruption.
                  </p>
                  <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:24px 0;">
                    <div style="font-size:14px;font-weight:600;color:#1e3a8a;margin-bottom:6px;">What you keep with Premium</div>
                    <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
                      <li>Unlimited market analysis &amp; portfolio insights</li>
                      <li>Real-time options flow and gamma exposure</li>
                      <li>Smart portfolio builder with risk-adjusted optimization</li>
                      <li>Real-time alerts on price, earnings, macro events</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
                    Need to make changes? You can review your plan or cancel anytime from your account.
                  </p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="${siteUrl}/dashboard/account"
                      style="display:inline-block;background:#1e40af;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Manage subscription
                    </a>
                  </div>
                  <p style="font-size:13px;line-height:1.6;color:#64748b;margin:24px 0 0;">
                    If you do nothing, your subscription will renew automatically on ${dateStr}.
                    You can cancel anytime before that date and you will not be charged.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:18px 28px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">
                  <div style="margin-bottom:6px;">EconoPulse — global market intelligence</div>
                  <a href="${siteUrl}" style="color:#1e40af;text-decoration:none;">${siteUrl}</a>
                  &nbsp;·&nbsp;
                  <a href="mailto:econopulse.info@econopulse.ai" style="color:#64748b;text-decoration:none;">econopulse.info@econopulse.ai</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }
}
