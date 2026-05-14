/**
 * Generates the Apple Sign in with Apple client_secret JWT for Supabase.
 *
 * Usage (PowerShell):
 *   $env:APPLE_TEAM_ID="4GDG5V64FT"
 *   $env:APPLE_KEY_ID="GBKBH5S7SF"
 *   $env:APPLE_SERVICES_ID="ai.econopulse.login"
 *   $env:APPLE_P8_PATH="C:\path\to\AuthKey_GBKBH5S7SF.p8"
 *   node scripts/generate-apple-client-secret.mjs
 *
 * The script prints the JWT. Copy it into Supabase Dashboard
 * → Authentication → Providers → Apple → Secret Key (for OAuth).
 *
 * NOTE: Apple secrets expire every 6 months (max). Re-run this script before then.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const TEAM_ID = process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const SERVICES_ID = process.env.APPLE_SERVICES_ID; // e.g. ai.econopulse.login
const P8_PATH = process.env.APPLE_P8_PATH;

if (!TEAM_ID || !KEY_ID || !SERVICES_ID || !P8_PATH) {
  console.error('Missing required env vars: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_P8_PATH');
  process.exit(1);
}
if (!fs.existsSync(P8_PATH)) {
  console.error(`Private key not found at: ${P8_PATH}`);
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(P8_PATH, 'utf8');

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const now = Math.floor(Date.now() / 1000);
const sixMonths = 60 * 60 * 24 * 180; // Apple max 6 months

const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + sixMonths,
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
};

const headerB64 = base64url(JSON.stringify(header));
const payloadB64 = base64url(JSON.stringify(payload));
const signingInput = `${headerB64}.${payloadB64}`;

const signer = crypto.createSign('SHA256');
signer.update(signingInput);
signer.end();
// Apple wants ECDSA P-256 signature in JOSE format (r||s), not DER.
const derSignature = signer.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
const signatureB64 = derSignature.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const jwt = `${signingInput}.${signatureB64}`;

console.log('\n--- APPLE CLIENT SECRET JWT ---\n');
console.log(jwt);
console.log('\n--- copy the JWT above into Supabase Auth → Providers → Apple → Secret Key ---');
console.log(`\nExpires: ${new Date((now + sixMonths) * 1000).toISOString()}`);
