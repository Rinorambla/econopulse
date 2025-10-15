# Email Configuration for EconoPulse

## Email Addresses

### Official Email Addresses
- **Public Contact**: `info@econopulse.ai` - General inquiries and business contact
- **Customer Support**: `support@econopulse.ai` - User support and technical assistance
- **No-Reply (SMTP)**: `noreply@econopulse.ai` - System emails (auth, notifications, transactional)

## Supabase SMTP Configuration

To configure Supabase to send authentication and transactional emails from `noreply@econopulse.ai`, follow these steps:

### 1. Supabase Dashboard Settings

Navigate to: **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**

Configure the following:

```
SMTP Host: smtp.your-provider.com (e.g., smtp.gmail.com, smtp.sendgrid.net, smtp.mailgun.org)
SMTP Port: 587 (TLS) or 465 (SSL)
SMTP Username: Your SMTP username
SMTP Password: Your SMTP password or API key
Sender Email: noreply@econopulse.ai
Sender Name: EconoPulse
```

### 2. Recommended SMTP Providers

#### Option A: SendGrid
- Free tier: 100 emails/day
- SMTP Host: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey`
- Password: Your SendGrid API Key

#### Option B: Mailgun
- Free tier: 5,000 emails/month
- SMTP Host: `smtp.mailgun.org`
- Port: `587`
- Username: Your Mailgun SMTP username
- Password: Your Mailgun SMTP password

#### Option C: Amazon SES
- Pay-as-you-go: $0.10 per 1,000 emails
- SMTP Host: `email-smtp.region.amazonaws.com`
- Port: `587`
- Username: Your AWS SMTP username
- Password: Your AWS SMTP password

### 3. DNS Configuration

To ensure emails from `noreply@econopulse.ai` are not marked as spam, configure these DNS records:

#### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:_spf.provider.com ~all
```

#### DKIM Record
```
Type: TXT
Host: provider._domainkey
Value: [Provided by your SMTP provider]
```

#### DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@econopulse.ai
```

### 4. Email Templates

Supabase automatically uses these templates for authentication emails:

- **Confirmation Email**: Sent when a user signs up
- **Password Reset**: Sent when a user requests a password reset
- **Magic Link**: Sent for passwordless authentication
- **Email Change**: Sent when a user changes their email

All these emails will be sent from `noreply@econopulse.ai`.

### 5. Environment Variables (Not Required for Supabase SMTP)

Supabase SMTP is configured directly in the Supabase dashboard. However, if you're using custom email sending logic in your app, add these to `.env.local`:

```env
# Custom Email Configuration (if needed)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@econopulse.ai
SMTP_FROM_NAME=EconoPulse

# Public Contact Emails (for display in UI)
NEXT_PUBLIC_CONTACT_EMAIL=info@econopulse.ai
NEXT_PUBLIC_SUPPORT_EMAIL=support@econopulse.ai
```

### 6. Testing

After configuring SMTP in Supabase:

1. Try signing up a new user
2. Check if the confirmation email arrives from `noreply@econopulse.ai`
3. Test password reset functionality
4. Verify all emails land in inbox (not spam)

### 7. Email Usage in Application

The email addresses are already configured in these locations:

- **Footer Component**: Displays `info@econopulse.ai` and `support@econopulse.ai`
- **Help Page**: Uses `support@econopulse.ai` for support inquiries
- **About Page**: Uses `info@econopulse.ai` for general contact
- **Legal Pages** (Privacy, Terms, Disclaimer, Cookies): Uses `info@econopulse.ai`
- **Error Page**: Uses `support@econopulse.ai` for support
- **Work With Us**: Uses `info@econopulse.ai` for job applications

## Summary

- ✅ **noreply@econopulse.ai**: Configure in Supabase SMTP for auth emails
- ✅ **info@econopulse.ai**: General business and contact inquiries
- ✅ **support@econopulse.ai**: Customer support and technical help
- ✅ All email addresses updated across the application
- ✅ Ready for DNS configuration and SMTP provider setup
