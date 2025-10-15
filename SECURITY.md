# Security Policy

## Supported Versions
We support only the latest deployed production version. Older builds should be redeployed to receive fixes.

## Reporting a Vulnerability
If you discover a vulnerability please email:

security@econopulse.com (placeholder — set up this mailbox)  
Subject: [SECURITY] Vulnerability Report

Include (when possible):
- Affected endpoint / route
- Vulnerability type & impact
- Steps to reproduce / PoC
- Suggested remediation

We will aim to acknowledge critical reports within 48h.

## Security Controls Implemented
- Strict CSP (see `next.config.js`)
- HSTS (2 years + preload)
- X-Frame-Options DENY
- Referrer-Policy strict-origin-when-cross-origin
- Permissions-Policy hardened (camera / mic / geo disabled)
- PWA integrity (versioned SW + offline fallback)
- API rate limiting scaffolding (can be extended in `src/lib/rate-limit.ts`)

## Recommended Operational Additions
- Centralized logging (SIEM or hosted log service)
- Web Application Firewall (Cloudflare or similar)
- Secrets rotation policy (90 days) & scanning (gitleaks)
- Sentry or OpenTelemetry instrumentation for error tracing

## Handling User Data
User subscription & auth session data handled via Supabase. Push subscription records currently stored in a JSON snapshot file for development; move to a secure table with encryption before enabling production push notifications.

## Cryptography Notes
- Add VAPID key pair generation for Web Push (store private key as secret `VAPID_PRIVATE`) and public as `VAPID_PUBLIC`.
- Avoid embedding secrets client-side; only NEXT_PUBLIC_ variables are exposed intentionally.

## Build Integrity
- Use immutable dependency versions (package-lock) in CI to avoid surprise upgrades.
- Consider enabling Dependabot with security-only updates.

## Vulnerability Disclosure Timeline
1. Report received
2. Acknowledgement (≤48h)
3. Triage & severity classification
4. Patch development & internal test
5. Production deploy
6. Public advisory (optional for critical issues)

Thank you for helping keep EconoPulse secure.
