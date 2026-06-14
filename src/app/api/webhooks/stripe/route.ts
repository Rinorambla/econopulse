/**
 * Alias route for the Stripe webhook.
 *
 * The canonical handler lives at `/api/stripe/webhook`. This alias exists
 * because the Stripe Dashboard endpoint was configured as
 * `/api/webhooks/stripe`. Re-exporting the same handler keeps a single
 * source of truth while supporting both URLs.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { POST } from '../../stripe/webhook/route';
