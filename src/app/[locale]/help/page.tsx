import { redirect } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

// Server redirect for locale-scoped help. Loosen param typing to satisfy current Next.js PageProps inference.
export default function HelpRedirect({ params }: any) {
  const locale = params?.locale || 'en';
  redirect({ href: '/help', locale });
}
